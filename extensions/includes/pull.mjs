import { downloadFile, getAllMaps, getFileUrls } from "./api.mjs";
import { getLanguageCodes } from "./language.mjs";
import { isImageBackground } from "./util.mjs";

export default function run() {
    const languages = getLanguageCodes();
    Promise.all(languages
        .map(language => getAllMaps(language)))
        .then(maps => {
            /** @type {Record<string, Record<string, DataMap>>} */
            const allMaps = {};
            const /** @type {string[]} */ backgrounds = [];
            for (const [index, language] of languages.entries()) {
                for (const map of maps[index]) {
                    const mapName = map.custom?.interwiki?.en?.mapName;
                    if (!mapName) {
                        tiled.log(`Map "${map.custom?.interwiki?.[language].mapName}" is missing an English map name in its metadata, skipping it.`);
                        continue;
                    }
                    allMaps[mapName] = allMaps[mapName] || {};
                    allMaps[mapName][language] = map;
                    backgrounds.push(...map.backgrounds
                        .filter(isImageBackground)
                        .map(bg => bg.image));
                }
            }
            const baseDir = FileInfo.path(tiled.projectFilePath);
            for (const map of Object.values(allMaps)) {
                const mapName = map.en.custom?.interwiki?.en.mapName;
                if (!mapName) {
                    continue;
                }
                const textFile = new TextFile(
                    FileInfo.joinPaths(baseDir, `${mapName}.mw-datamaps`),
                    TextFile.WriteOnly
                );
                textFile.write(JSON.stringify(map));
                textFile.commit();
            }
            const backgroundFiles = [...new Set(backgrounds)];
            return getFileUrls(backgroundFiles, 'en')
                .then(urls => Promise.all(urls.map(url => downloadFile(url))))
                .then(files => files.forEach((file, index) => {
                    const filename = backgroundFiles[index];
                    const binaryFile = new BinaryFile(
                        FileInfo.joinPaths(baseDir, 'images', filename),
                        BinaryFile.WriteOnly
                    );
                    binaryFile.write(file);
                    binaryFile.commit();
                }));
        })
        .catch(error => {
            tiled.alert(`An error occurred while pulling maps from the wiki: ${error.message}`);
            tiled.log(`Error details: ${error.stack}`);
        });
}
