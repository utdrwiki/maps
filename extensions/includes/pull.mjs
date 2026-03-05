import { downloadFile, getAllMaps, getFileUrls, getMap } from './api.mjs';
import { convertTiledToDataMaps, mapIsDataMaps, writeMap } from './format.mjs';
import { getLanguageCodes } from './language.mjs';
import { MetadataImpl } from './metadata.mjs';
import { addToPromise, isImageBackground } from './util.mjs';

// Conflict with the DOM File type.
const TiledFile = /** @type {any} */ (File);

const PROJECT_FOLDER = tiled.project.folders[0];
const IMAGES_FOLDER = FileInfo.joinPaths(PROJECT_FOLDER, 'images');

/**
 * Gets the path to a map file based on its metadata.
 * @param {DataMaps} map Map for which to get the path
 * @returns {string} Path to the map file
 */
function getMapPath(map) {
    return FileInfo.joinPaths(PROJECT_FOLDER, `${
        map.en.custom?.fileName ||
        map.en.custom?.interwiki?.en.mapName
    }.mw-datamaps`);
}

/**
 * Gets the path to the background with specified filename.
 * Creates the images directory if it doesn't already exist.
 * @param {string} fileName Background file name
 * @returns {string} Path to the background image
 */
function getBackgroundPath(fileName) {
    return FileInfo.joinPaths(IMAGES_FOLDER, fileName);
}

/**
 * Gets the MD5 hash of a background file.
 * @param {string} fileName Background file name
 * @returns {string|null} MD5 hash of the file
 */
function getBackgroundMD5(fileName) {
    const backgroundPath = getBackgroundPath(fileName);
    if (!TiledFile.exists(backgroundPath)) {
        return null;
    }
    const file = new BinaryFile(getBackgroundPath(fileName), BinaryFile.ReadOnly);
    const md5 = Qt.md5(file.readAll());
    file.close();
    return md5;
}

/**
 * Compares two JSON entities (numbers, booleans, strings, objects or arrays)
 * for deep equality. If there is special JSON stringification logic for the
 * object, it respects that.
 * @param {any} a First entity
 * @param {any} b Second entity
 * @returns {boolean} Whether the entities are equal
 */
function compareJSON(a, b) {
    if (Array.isArray(a)) {
        return Array.isArray(b) &&
            a.length === b.length &&
            a.every((item, index) => compareJSON(item, b[index]));
    }
    if (typeof a === 'object' && a !== null) {
        if (typeof b !== 'object' || b === null) {
            return false;
        }
        if ('toJSON' in a && typeof a.toJSON === 'function') {
            a = a.toJSON();
        }
        if ('toJSON' in b && typeof b.toJSON === 'function') {
            b = b.toJSON();
        }
        const ka = Object.keys(a);
        const kb = Object.keys(b);
        if (!ka.every(key => kb.includes(key)) || !kb.every(key => ka.includes(key))) {
            return false;
        }
        return Object.entries(a).every(([key, value]) => compareJSON(value, b[key]));
    }
    return a === b;
}

/**
 * Connects maps from different language maps into a single object.
 * @param {[DataMap[], string][]} mapsByLanguage List of maps on all language
 * wikis which have them
 * @returns {DataMaps[]} Connected language maps
 */
function collectMaps(mapsByLanguage) {
    const /** @type {Record<string, DataMaps>} */ allMaps = {};
    for (const [maps, language] of mapsByLanguage) {
        for (const map of maps) {
            const mapName = map.custom?.interwiki?.en?.mapName;
            if (!mapName) {
                tiled.log(`Map '${map.custom?.interwiki?.[language].mapName}' is missing an English map name in its metadata, skipping it.`);
                continue;
            }
            allMaps[mapName] = allMaps[mapName] || {};
            allMaps[mapName][language] = map;
        }
    }
    return Object.values(allMaps);
}

/**
 * Gets the maps which have differences from the local filesystem.
 * @param {DataMaps[]} maps Maps to check for differences
 * @returns {[DataMaps, string][]} Maps which have differences from the local
 * filesystem and their corresponding status
 */
function getDiffMaps(maps) {
    return maps.map(wikiMap => {
        const localMapPath = getMapPath(wikiMap);
        if (!TiledFile.exists(localMapPath)) {
            return /** @type {[DataMaps, string]} */ ([wikiMap, 'Missing locally']);
        }
        const file = new TextFile(localMapPath, TextFile.ReadOnly);
        const /** @type {DataMaps} */ localMap = JSON.parse(file.readAll());
        file.close();
        const localLanguages = Object.keys(localMap);
        const wikiLanguages = Object.keys(wikiMap);
        const missingLocally = wikiLanguages.filter(language => !localLanguages.includes(language));
        const missingOnWiki = localLanguages.filter(language => !wikiLanguages.includes(language));
        if (missingLocally.length > 0) {
            return /** @type {[DataMaps, string]} */ ([wikiMap, `Languages missing locally: ${missingLocally.join(', ')}`]);
        }
        if (missingOnWiki.length > 0) {
            return /** @type {[DataMaps, string]} */ ([wikiMap, `Languages missing on wiki: ${missingOnWiki.join(', ')}`]);
        }
        for (const language of wikiLanguages) {
            wikiMap[language].custom = new MetadataImpl(wikiMap[language].custom);
            localMap[language].custom = new MetadataImpl(localMap[language].custom);
            if (!compareJSON(wikiMap[language], localMap[language])) {
                return /** @type {[DataMaps, string]} */ ([wikiMap, `Differs (${language})`]);
            }
        }
        return /** @type {[DataMaps, string]} */ ([wikiMap, 'Same']);
    }).filter(([_, status]) => status !== 'Same');
}

/**
 * Collects a list of background file names on the wiki and on the file system.
 * @param {DataMaps[]} maps Maps to collect backgrounds from
 * @returns {[string[], string[]]} Background file names on the wiki, and on the
 * file system
 */
function collectBackgrounds(maps) {
    const /** @type {string[]} */ backgrounds = [];
    const /** @type {Record<string, string>} */ fileNameMap = {};
    for (const map of maps) {
        Object.assign(fileNameMap, map.en.custom?.backgroundFileNameMap);
        backgrounds.push(...map.en.backgrounds
            .filter(isImageBackground)
            .map(bg => bg.image));
    }
    const wikiFileNames = [...new Set(backgrounds)];
    const localFileNames = wikiFileNames.map(file => fileNameMap[file] || file);
    return [wikiFileNames, localFileNames];
}

/**
 * Downloads backgrounds from the wiki and filters them to only include those
 * which are different from the local files.
 * @param {string[]} wikiFileNames File names to be downloaded from the wiki
 * @param {string[]} localFileNames File names in the local file system
 * @returns {Promise<[ArrayBuffer, string][]>} List of downloaded files and
 * their corresponding local file names
 */
function getDiffBackgrounds(wikiFileNames, localFileNames) {
    return addToPromise(getFileUrls(wikiFileNames), localFileNames)
        .then(([urls, filenames]) => addToPromise(
            Promise.all(urls.map(url => downloadFile(url))),
            filenames
        ))
        .then(([files, filenames]) => files
            .map((file, index) => /** @type {[ArrayBuffer, string]} */ ([file, filenames[index]]))
            .filter(([file, filename]) => getBackgroundMD5(filename) !== Qt.md5(file)))
}

/**
 * Writes background files to the local file system.
 * @param {[ArrayBuffer, string][]} backgrounds Background files and their
 * filenames
 */
function writeBackgrounds(backgrounds) {
    for (const [file, filename] of backgrounds) {
        const binaryFile = new BinaryFile(getBackgroundPath(filename), BinaryFile.WriteOnly);
        binaryFile.write(file);
        binaryFile.commit();
    }
}

/**
 * For a single map, gets the map's differences from the wiki and which
 * backgrounds are different.
 * @param {TileMap} map Map to get the differences for
 * @returns {Promise<[[ArrayBuffer, string][], [DataMaps, string]?]>} Map and
 * backgrounds with differences
 */
export function getMapAndBackgroundDiff(map) {
    return Promise.all(Object.entries(convertTiledToDataMaps(map).custom?.interwiki || {})
        .map(([language, interwiki]) => addToPromise(getMap(interwiki.mapName, language), language)))
        .then(mapsByLanguage => {
            const map = collectMaps(mapsByLanguage.map(([maps, language]) => [[maps], language]))[0];
            const diff = getDiffMaps([map])[0];
            return addToPromise(getDiffBackgrounds(...collectBackgrounds([diff ? diff[0] : map])), diff);
        });
}

/**
 * Checks whether the currently opened asset has differences from the wiki.
 * @param {Asset} asset Asset that opened
 */
function checkOnAssetOpened(asset) {
    if (!asset.isTileMap) {
        return;
    }
    const map = /** @type {TileMap} */ (asset);
    if (!mapIsDataMaps(map)) {
        return;
    }
    getMapAndBackgroundDiff(map)
        .then(([backgrounds, mapDiff]) => {
            if (mapDiff && tiled.confirm(`Map "${map.fileName}" differs from the version on the wiki (${mapDiff[1]}). Do you want to load the wiki version? All your local changes will be lost!`)) {
                writeMap(mapDiff[0], getMapPath(mapDiff[0]));
            }
            for (const [file, filename] of backgrounds) {
                const localPath = getBackgroundPath(filename);
                if (!TiledFile.exists(localPath) || tiled.confirm(`Background "${filename}" differs from the version on the wiki. Do you want to replace the local file with the wiki version (all your local changes will be lost)?`)) {
                    writeBackgrounds([[file, filename]]);
                }
            }
        })
        .catch(error => {
            tiled.alert(`An error occurred while fetching the map from the wiki: ${error.message}`);
            tiled.log(`Error details: ${error.stack}`);
        });
}

const pullAction = tiled.registerAction('PullFromWiki', () => {
    const dialog = new Dialog('Pull from wiki');
    const descriptionLabel = dialog.addLabel('Fetching maps and backgrounds from the wiki...');
    const tempCancelButton = dialog.addButton('Cancel');
    let cancelDiff = false;
    tempCancelButton.clicked.connect(() => {
        cancelDiff = true;
        dialog.done(Dialog.Rejected);
    });
    dialog.show();
    let /** @type {[DataMaps, string][]} */ diffMaps = [];
    let /** @type {[ArrayBuffer, string][]} */ diffBackgrounds = [];
    Promise.all(getLanguageCodes()
        .map(language => addToPromise(getAllMaps(language), language)))
        .then(mapsByLanguage => {
            if (cancelDiff) {
                return;
            }
            const maps = collectMaps(mapsByLanguage);
            diffMaps = getDiffMaps(maps);
            return getDiffBackgrounds(...collectBackgrounds(maps));
        })
        .then(backgrounds => {
            if (!backgrounds) {
                return;
            }
            diffBackgrounds = backgrounds;
            if (diffMaps.length === 0 && diffBackgrounds.length === 0) {
                descriptionLabel.text = 'All maps and backgrounds are up to date!';
                return;
            }
            descriptionLabel.text = `The following maps and backgrounds have differences from the local files and will be updated.`;
            tempCancelButton.visible = false;
            dialog.addSeparator('List');
            dialog.addLabel('Name');
            dialog.addLabel('Type');
            dialog.addLabel('Status');
            dialog.addNewRow();
            for (const [map, status] of diffMaps) {
                const mapName = map.en.custom?.interwiki?.en.mapName || '';
                dialog.addCheckBox(mapName, true).stateChanged.connect(checked => {
                    if (checked) {
                        diffMaps.push([map, status]);
                    } else {
                        diffMaps = diffMaps.filter(([m, _]) => m.en.custom?.interwiki?.en.mapName !== mapName);
                    }
                });
                dialog.addLabel('Map');
                dialog.addLabel(status);
                dialog.addNewRow();
            }
            for (const [file, filename] of diffBackgrounds) {
                dialog.addCheckBox(filename, true).stateChanged.connect(checked => {
                    if (checked) {
                        diffBackgrounds.push([file, filename]);
                    } else {
                        diffBackgrounds = diffBackgrounds.filter(([_, name]) => name !== filename);
                    }
                });
                dialog.addLabel('Background');
                if (TiledFile.exists(getBackgroundPath(filename))) {
                    dialog.addLabel('Differs');
                } else {
                    dialog.addLabel('Missing locally');
                }
                dialog.addNewRow();
            }
            dialog.addSeparator();
            dialog.addButton('OK').clicked.connect(() => {
                for (const [map] of diffMaps) {
                    writeMap(map, getMapPath(map));
                }
                writeBackgrounds(diffBackgrounds);
                dialog.done(Dialog.Accepted);
            });
            dialog.addButton('Cancel').clicked.connect(() => {
                dialog.done(Dialog.Rejected);
            });
        })
        .catch(error => {
            tiled.alert(`An error occurred while pulling maps from the wiki: ${error.message}`);
            tiled.log(`Error details: ${error.stack}`);
        });
});
pullAction.text = 'Pull from wiki';
pullAction.icon = 'wiki.svg';

tiled.extendMenu('File', [
    {
        action: 'PullFromWiki',
        before: 'Close'
    },
    {
        separator: true
    },
]);

tiled.openAssets.forEach(checkOnAssetOpened);
tiled.assetOpened.connect(checkOnAssetOpened);

if (!TiledFile.exists(PROJECT_FOLDER)) {
    tiled.alert(`Looks like you are just setting up this Tiled project. Welcome! This is a message from the Tiled-DataMaps extension that allows for easy publishing of interactive maps to MediaWiki wikis from Tiled.

Maps from the wiki will download in a few seconds - please use Project > Refresh Folders or restart Tiled to see them in the map sidebar.

If you have any questions, under the Help menu you can find the "Wiki extension help" option! You can leave any questions over there, or at the Undertale/Deltarune Wiki Discord server, which you can also find under the Help menu.

This extension is primarily meant for Undertale, Deltarune and Undertale Yellow wikis. You can ask for support over Discord or Discussions even if you're editing some other wiki, but when implementing features or fixes our own wikis take priority.
`);
}

TiledFile.makePath(PROJECT_FOLDER);
TiledFile.makePath(IMAGES_FOLDER);

Promise.all(getLanguageCodes().map(language => addToPromise(getAllMaps(language), language)))
    .then(mapsByLanguage => {
        const allMaps = collectMaps(mapsByLanguage);
        const diffMaps = getDiffMaps(allMaps)
            .filter(([_, status]) => status === 'Missing locally');
        diffMaps.forEach(([map]) => writeMap(map, getMapPath(map)));
        return getDiffBackgrounds(...collectBackgrounds(allMaps));
    })
    .then(backgrounds => {
        writeBackgrounds(backgrounds
            .filter(([_, bg]) => !TiledFile.exists(getBackgroundPath(bg))));
    })
    .catch(error => {
        tiled.alert(`An error occurred while refreshing the project from the wiki: ${error.message}`);
        tiled.log(`Error details: ${error.stack}`);
    });
