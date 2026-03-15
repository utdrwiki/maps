import { getLanguageCodes } from './language.mjs';
import { InterwikiDataImpl, MetadataImpl } from './metadata.mjs';
import { getLastLanguage } from './session.mjs';
import {
    addPoints,
    getBoolProperty,
    getColorProperty,
    getListProperty,
    getNumberProperty,
    getStringProperty
} from './util.mjs';

const ANNOTATIONS_LAYER = 'annotations';

/**
 * Determines a unique marker ID for the current marker.
 * @param {Layer} layer Current map layer
 * @param {string[]} parentNames Layer names of parent layers
 * @param {string} name Marker name
 * @param {Marker[]} markers All other markers in the layer
 * @returns {string} Unique marker ID
 */
function findMarkerId(layer, parentNames, name, markers) {
    const idBase = [layer.name, ...parentNames, name]
        .join('-')
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    const markerIds = new Set(markers.map(marker => marker.id).filter(Boolean));
    let id = idBase;
    let index = 1;
    while (true) {
        if (!markerIds.has(id)) {
            return id;
        }
        id = `${idBase}-${index++}`;
        index += 1;
    }
}

/**
 * Marks languages as used based on the properties of a map object.
 * @param {TiledObject} object Object whose properties to check
 * @param {string[]} properties Property names to check
 * @param {Set<string>} usedLanguages Used languages so far
 */
function markUsedLanguages(object, properties, usedLanguages) {
    for (const language of getLanguageCodes()) {
        for (const property of properties) {
            if (object.property(`${language}_${property}`)) {
                usedLanguages.add(language);
            }
        }
    }
}

/**
 * Converts a single layer from a Tiled map to DataMaps format.
 * @param {Layer} layer Layer to convert
 * @param {DataMap} datamap DataMap that the layer belongs to
 * @param {Set<number>} convertedLayers Already converted layers
 * @param {Set<string>} usedLanguages Languages used in the map so far
 * @param {string} language Language to use for localized properties
 */
function convertLayer(layer, datamap, convertedLayers, usedLanguages, language) {
    let offset = { x: 0, y: 0 };
    let parent = layer.parentLayer;
    const /** @type {string[]} */ parentNames = [];
    while (parent) {
        parentNames.push(parent.name);
        offset = addPoints(offset, parent.offset);
        parent = parent.parentLayer;
    }
    if (convertedLayers.has(layer.id)) {
        // map.layers is a list of all layers in the map, so we need to check if
        // we've already converted this layer in the context of a layer group.
        return;
    }
    const /** @type {Overlay[]} */ overlays = [];
    if (layer.isImageLayer) {
        const imageLayer = /** @type {ImageLayer} */ (layer);
        const image = getStringProperty(layer, 'image', language) || `${layer.name}.png`;
        const /** @type {ImageBackground} */ bg = {
            at: [
                [
                    layer.offset.x + offset.x,
                    layer.offset.y + offset.y
                ],
                [
                    layer.offset.x + offset.x + imageLayer.image.width,
                    layer.offset.y + offset.y + imageLayer.image.height
                ]
            ],
            image,
            name: getStringProperty(layer, 'name', language) || layer.name
        };
        if (datamap.backgrounds[0].name === '<default>') {
            bg.overlays = datamap.backgrounds[0].overlays;
            datamap.backgrounds[0] = bg;
            // Main background image size is more accurate to use for the map
            // size than what we set for the Tiled map size, otherwise markers
            // may be offset.
            datamap.crs.bottomRight = [
                imageLayer.image.width,
                imageLayer.image.height
            ];
        } else {
            datamap.backgrounds.push(bg);
            const mapSize = /** @type {[number, number]} */ (datamap.crs.bottomRight);
            if (imageLayer.image.width > mapSize[0]) {
                mapSize[0] = imageLayer.image.width;
            }
            if (imageLayer.image.height > mapSize[1]) {
                mapSize[1] = imageLayer.image.height;
            }
        }
        const fileName = FileInfo.fileName(imageLayer.imageFileName);
        if (fileName !== image && datamap.custom) {
            if (!datamap.custom.backgroundFileNameMap) {
                datamap.custom.backgroundFileNameMap = {};
            }
            datamap.custom.backgroundFileNameMap[image] = fileName;
        }
        markUsedLanguages(layer, ['name', 'image'], usedLanguages);
    } else if (layer.isObjectLayer) {
        const /** @type {Marker[]} */ markers = [];
        const objectLayer = /** @type {ObjectGroup} */ (layer);
        for (const obj of objectLayer.objects) {
            const {x, y} = addPoints(obj.pos, offset);
            const name = getStringProperty(obj, 'name', language) || obj.name;
            markUsedLanguages(obj, ['name'], usedLanguages);
            if (obj.shape === MapObject.Point) {
                const id = findMarkerId(layer, parentNames, obj.name, markers);
                let description = getStringProperty(obj, 'description', language);
                if (getBoolProperty(obj, 'multiline', language)) {
                    description = `<poem>${description}</poem>`;
                }
                markers.push({
                    article: getStringProperty(obj, 'page', language),
                    id,
                    name: name.length === 0 ? undefined : name,
                    description,
                    image: getStringProperty(obj, 'image', language),
                    isWikitext: !getBoolProperty(obj, 'plain', language),
                    x,
                    y
                });
                markUsedLanguages(obj, [
                    'description',
                    'page',
                    'image',
                    'plain',
                    'multiline'
                ], usedLanguages);
            } else if (obj.shape === MapObject.Rectangle) {
                overlays.push({
                    at: [[x, y], [x + obj.width, y + obj.height]],
                    borderColor: getColorProperty(obj, 'border', 'rgb'),
                    color: getColorProperty(obj, 'fill'),
                    name
                });
            } else if (
                obj.shape === MapObject.Polygon ||
                obj.shape === MapObject.Polyline
            ) {
                // FIXME: Once DataMaps fixes the bug with CRS not being
                // respected here we need to swap the coordinates.
                overlays.push({
                    color: getColorProperty(obj, 'color'),
                    name,
                    path: obj.polygon.map(point => [
                        point.y + y,
                        point.x + x
                    ]),
                    thickness: getNumberProperty(obj, 'thickness')
                });
            }
        }
        const layerAssociationId = [layer.name, ...parentNames].join(' ');
        if (markers.length > 0 || layer.name !== ANNOTATIONS_LAYER) {
            datamap.markers[layerAssociationId] = markers;
        }
    } else if (layer.isGroupLayer) {
        const groupLayer = /** @type {GroupLayer} */ (layer);
        for (const childLayer of groupLayer.layers || []) {
            convertLayer(childLayer, datamap, convertedLayers, usedLanguages, language);
        }
    }
    if (datamap.backgrounds[0].overlays) {
        datamap.backgrounds[0].overlays.push(...overlays);
    } else {
        datamap.backgrounds[0].overlays = overlays;
    }
    convertedLayers.add(layer.id);
}

/**
 * Retrieves map metadata to store in DataMaps for two-way conversion.
 * @param {TileMap} map Tiled map being converted to DataMaps
 * @param {string} mapName Filename of the Tiled map
 * @returns {Metadata} Map metadata to store in DataMaps
 */
function getDataMapsMetadata(map, mapName) {
    const metadata = new MetadataImpl();
    for (const language of getLanguageCodes()) {
        const localizedMapName = getStringProperty(map, 'name', language);
        metadata.interwiki[language] = new InterwikiDataImpl({
            mapName: localizedMapName || mapName,
            revision: getNumberProperty(map, 'revision', language) || 0,
        });
    }
    metadata.fileName = mapName;
    metadata.tileHeight = map.tileHeight;
    metadata.tileWidth = map.tileWidth;
    return metadata;
}

/**
 * Converts a Tiled map to DataMaps format.
 * @param {TileMap} map Tiled map to convert to DataMaps
 * @param {string} mapName Filename of the Tiled map
 * @param {string} language Language to use for localized properties
 * @returns {DataMap} Converted DataMap object
 */
export function convertTiledToDataMaps(map, mapName, language = 'en') {
    const /** @type {DataMap} */ datamap = {
        $schema: '/extensions/DataMaps/schemas/v17.3.json',
        backgrounds: [{
            name: '<default>',
            tileSize: [map.tileWidth, map.tileHeight],
            tiles: [],
        }],
        crs: {
            order: 'xy',
            topLeft: [0, 0],
            bottomRight: [
                map.width * map.tileWidth,
                map.height * map.tileHeight
            ]
        },
        custom: getDataMapsMetadata(map, mapName),
        disclaimer: getStringProperty(map, 'disclaimer', language),
        include: getListProperty(map, 'include', language),
        markers: {},
        settings: {
            enableSearch: true,
            leaflet: {
                uriPopupZoom: getNumberProperty(map, 'popzoom', language),
            },
            showCoordinates: false
        }
    };
    const convertedLayers = new Set();
    const usedLanguages = new Set(['en']);
    markUsedLanguages(map, [
        'name',
        'revision',
        'disclaimer',
        'include',
        'popzoom'
    ], usedLanguages);
    for (const layer of map.layers.slice().reverse()) {
        convertLayer(layer, datamap, convertedLayers, usedLanguages, language);
    }
    // As we switch to a new system where the wiki is the source of truth
    // rather than the repository, we need to publish the map to all wikis that
    // the map is translated to, rather than just a single wiki a user
    // specifies.
    // This raises the question of which wikis to publish to - so instead of
    // requiring users to check a box "map should be published to wiki X", we
    // determine wikis to publish to based on which languages are actually used
    // in the map.
    // As a side effect, this does not allow publishing entirely untranslated
    // maps. The flow for publishing from DataMaps files will just ignore those
    // wikis completely, and the flow for publishing from TMX files will error.
    if (datamap.custom?.interwiki) {
        for (const language of Object.entries(datamap.custom.interwiki)) {
            if (!usedLanguages.has(language[0])) {
                delete datamap.custom.interwiki[language[0]];
            }
        }
    }
    return datamap;
}

/**
 * Converts a Tiled map to multiple DataMaps format for each language.
 * @param {TileMap} map Tiled map to convert to DataMaps
 * @param {string} mapName Filename of the Tiled map
 * @returns {DataMaps} Converted DataMaps object
 */
export function convertTiledToMultipleDataMaps(map, mapName) {
    const datamaps = /** @type {DataMaps} */ ({});
    for (const language of getLanguageCodes()) {
        datamaps[language] = convertTiledToDataMaps(map, mapName, language);
    }
    return datamaps;
}

/**
 * Writes map data in DataMaps format to a file.
 * @param {DataMap|DataMaps} map Map data to write
 * @param {string} filePath File to write map data to
 */
export function writeMap(map, filePath) {
    const file = new TextFile(filePath, TextFile.WriteOnly);
    MetadataImpl.unhideSpecialMetadata();
    file.write(`${JSON.stringify(map, null, 4)}\n`);
    MetadataImpl.hideSpecialMetadata();
    file.commit();
}

/**
 * Converts a Tiled map to DataMaps format.
 * @param {boolean} multiple Whether to generate a single or multiple maps
 * @returns {(map: TileMap, filePath: string) => undefined} Function that writes the
 * converted map to a file
 */
function generateWrite(multiple) {
    return (map, filePath) => {
        const mapName = FileInfo.completeBaseName(FileInfo.fileName(filePath));
        const convertedMap = multiple ?
            convertTiledToMultipleDataMaps(map, mapName) :
            convertTiledToDataMaps(map, mapName, getLastLanguage() || 'en');
        writeMap(convertedMap, filePath);
    };
}

tiled.registerMapFormat('dataMaps', {
    extension: 'mw-datamaps',
    name: 'DataMaps (all wikis)',
    write: generateWrite(true)
});

tiled.registerMapFormat('dataMap', {
    extension: 'mw-datamaps',
    name: 'DataMaps (single wiki)',
    write: generateWrite(false)
});
