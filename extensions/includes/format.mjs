import { getLanguageCodes } from './language.mjs';
import { InterwikiDataImpl, MetadataImpl } from './metadata.mjs';
import { getLastLanguage } from './session.mjs';
import {
    addPoints,
    getBoolProperty,
    getColorProperty,
    getListProperty,
    getNumberProperty,
    getStringProperty,
    getTiledColor,
    isBoxOverlay,
    isImageBackground,
    isPolylineOverlay,
    setProperty,
    validateTiledPoint,
    validateTiledRectangle
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
 * @param {string?} mapFilePath Path to the Tiled map
 * @returns {Metadata} Map metadata to store in DataMaps
 */
function getDataMapsMetadata(map, mapFilePath = null) {
    const metadata = new MetadataImpl();
    const mapFileName = FileInfo.completeBaseName(FileInfo.fileName(mapFilePath || map.fileName));
    for (const language of getLanguageCodes()) {
        const localizedMapName = getStringProperty(map, 'name', language);
        metadata.interwiki[language] = new InterwikiDataImpl({
            mapName: localizedMapName || mapFileName,
            revision: getNumberProperty(map, 'revision', language) || 0,
        });
    }
    metadata.fileName = mapFileName;
    metadata.tileHeight = map.tileHeight;
    metadata.tileWidth = map.tileWidth;
    return metadata;
}

/**
 * Converts a Tiled map to DataMaps format.
 * @param {TileMap} map Tiled map to convert to DataMaps
 * @param {string} language Language to use for localized properties
 * @param {string?} mapFilePath Path to the Tiled map
 * @returns {DataMap} Converted DataMap object
 */
export function convertTiledToDataMaps(map, language = 'en', mapFilePath = null) {
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
        custom: getDataMapsMetadata(map, mapFilePath),
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
 * @param {string?} mapFilePath Path to the Tiled map
 * @returns {DataMaps} Converted DataMaps object
 */
export function convertTiledToMultipleDataMaps(map, mapFilePath = null) {
    const datamaps = /** @type {DataMaps} */ ({
        en: convertTiledToDataMaps(map, 'en', mapFilePath),
    });
    for (const language of Object.keys(datamaps.en.custom?.interwiki || {})) {
        if (language === 'en') {
            continue;
        }
        datamaps[language] = convertTiledToDataMaps(map, language, mapFilePath);
    }
    return datamaps;
}

/**
 * Checks if a marker description contains a <poem> tag, strips is and returns
 * whether it was multiline.
 * @param {Marker} marker Marker from DataMaps
 * @returns {[string|undefined, boolean]} Marker description without <poem> tags and
 * whether the description is multiline
 */
function splitDescriptionAndMultiline(marker) {
    if (typeof marker.description !== 'string') {
        return [undefined, false];
    }
    // Regex s flag is not available in this environment.
    const match = marker.description.match(/^<poem>([\s\S]*)<\/poem>$/u);
    if (match) {
        return [match[1], true];
    }
    return [marker.description, false];
}

/**
 * Converts a DataMaps map to the Tiled map format.
 * @param {DataMaps} datamaps DataMaps from all wikis to convert
 * @returns {TileMap} Converted Tiled map object
 */
export function convertDataMapsToTiled(datamaps) {
    const datamap = datamaps.en;
    if (!datamap) {
        throw new Error('English map data is required for conversion');
    }
    const metadata = new MetadataImpl(datamap.custom);
    const crsBR = validateTiledPoint(datamap.crs.bottomRight);
    const mapWidth = Math.ceil(crsBR[0] / metadata.tileWidth);
    const mapHeight = Math.ceil(crsBR[1] / metadata.tileHeight);
    const map = new TileMap();
    map.tileWidth = metadata.tileWidth;
    map.tileHeight = metadata.tileHeight;
    map.width = mapWidth;
    map.height = mapHeight;
    const backgrounds = datamap.backgrounds.filter(isImageBackground);
    const /** @type {ImageLayer[]} */ backgroundLayers = [];
    for (const bg of backgrounds) {
        const layer = new ImageLayer(bg.name || bg.image);
        const fileName = metadata.getBackgroundFileName(bg.image);
        const filePath = FileInfo.joinPaths(
            tiled.project.folders[0],
            'images',
            fileName
        );
        layer.imageFileName = filePath;
        layer.setProperty('image', bg.image);
        backgroundLayers.push(layer);
        map.addLayer(layer);
    }
    let annotationLayer = new ObjectGroup(ANNOTATIONS_LAYER);
    map.addLayer(annotationLayer);
    const overlays = datamap.backgrounds.find(isImageBackground)?.overlays || [];
    const boxOverlays = overlays.filter(isBoxOverlay);
    const /** @type {MapObject[]} */ rectangles = [];
    for (const overlay of boxOverlays) {
        const obj = new MapObject(overlay.name);
        obj.shape = MapObject.Rectangle;
        const [[x, y], [x2, y2]] = validateTiledRectangle(overlay.at);
        obj.pos = { x, y };
        obj.width = x2 - x;
        obj.height = y2 - y;
        if (overlay.color) {
            obj.setProperty('fill', getTiledColor(overlay.color));
        }
        if (overlay.borderColor) {
            obj.setProperty('border', getTiledColor(overlay.borderColor));
        }
        rectangles.push(obj);
        annotationLayer.addObject(obj);
    }
    const polylineOverlays = overlays.filter(isPolylineOverlay);
    const /** @type {MapObject[]} */ polylines = [];
    for (const overlay of polylineOverlays) {
        const obj = new MapObject(overlay.name);
        obj.polygon = overlay.path
            .map(p => validateTiledPoint(p))
            .map(p => ({ x: p[1], y: p[0] }));
        obj.pos = { x: 0, y: 0 };
        obj.shape = MapObject.Polyline;
        if (overlay.color) {
            obj.setProperty('color', getTiledColor(overlay.color));
        }
        if (overlay.thickness) {
            obj.setProperty('thickness', overlay.thickness);
        }
        polylines.push(obj);
        annotationLayer.addObject(obj);
    }
    // TODO: Support nested layers
    const /** @type {Record<string, MapObject>} */ points = {};
    for (const [layerName, markers] of Object.entries(datamap.markers).reverse()) {
        const layer = new ObjectGroup(layerName);
        for (const m of markers) {
            if (!m.id) {
                continue;
            }
            const obj = new MapObject(m.name);
            obj.pos = {
                x: m.x,
                y: m.y
            };
            obj.shape = MapObject.Point;
            const [description, multiline] = splitDescriptionAndMultiline(m);
            obj.setProperties({
                page: m.article,
                description,
                image: m.image,
                multiline,
                plain: m.isWikitext === undefined ? undefined : !m.isWikitext
            });
            points[m.id] = obj;
            layer.addObject(obj);
        }
        map.addLayer(layer);
    }
    for (const [language, interwiki] of Object.entries(metadata.interwiki)) {
        setProperty(map, 'name', interwiki.mapName, language);
        setProperty(map, 'revision', interwiki.revision, language);
        const languageMap = datamaps[language];
        if (!languageMap) {
            // Error was already logged during map collection. This is a case of
            // metadata desync.
            continue;
        }
        if (languageMap.disclaimer) {
            setProperty(map, 'disclaimer', languageMap.disclaimer, language);
        }
        if (languageMap.settings && languageMap.settings.leaflet) {
            setProperty(map, 'popzoom', languageMap.settings.leaflet.uriPopupZoom, language);
        }
        if (languageMap.include) {
            setProperty(map, 'include', languageMap.include.join('\n'), language);
        }
        if (language === 'en') {
            // The rest of the properties are only relevant for non-English
            // maps.
            continue;
        }
        const languageBackgrounds = languageMap.backgrounds.filter(isImageBackground);
        if (languageBackgrounds.length === datamap.backgrounds.length) {
            for (const [index, bg] of languageBackgrounds.entries()) {
                const enBg = backgrounds[index];
                if (bg.name !== enBg.name) {
                    setProperty(backgroundLayers[index], 'name', bg.name, language);
                }
                if (bg.image !== enBg.image) {
                    setProperty(backgroundLayers[index], 'image', bg.image, language);
                }
            }
        } else {
            tiled.alert(`Map "${interwiki.mapName}" on the ${language} wiki has a different number of backgrounds than the English map! Please synchronize the backgrounds on the wiki before editing this map.`);
        }
        const languageOverlays = languageBackgrounds[0]?.overlays || [];
        const languageBoxOverlays = languageOverlays.filter(isBoxOverlay);
        if (languageBoxOverlays.length === boxOverlays.length) {
            for (const [index, overlay] of languageBoxOverlays.entries()) {
                const obj = rectangles[index];
                if (overlay.name !== obj.name) {
                    setProperty(obj, 'name', overlay.name, language);
                }
            }
        } else {
            tiled.alert(`Map "${interwiki.mapName}" on the ${language} wiki has a different number of box overlays than the English map! Please synchronize the box overlays on the wiki before editing this map.`);
        }
        const languagePolylineOverlays = languageOverlays.filter(isPolylineOverlay);
        if (languagePolylineOverlays.length === polylineOverlays.length) {
            for (const [index, overlay] of languagePolylineOverlays.entries()) {
                const obj = polylines[index];
                if (overlay.name !== obj.name) {
                    setProperty(obj, 'name', overlay.name, language);
                }
            }
        } else {
            tiled.alert(`Map "${interwiki.mapName}" on the ${language} wiki has a different number of polyline overlays than the English map! Please synchronize the polyline overlays on the wiki before editing this map.`);
        }
        for (const [_, markers] of Object.entries(languageMap.markers).reverse()) {
            for (const m of markers) {
                if (!m.id) {
                    continue;
                }
                const obj = points[m.id];
                if (!obj) {
                    tiled.alert(`Map "${interwiki.mapName}" on the ${language} wiki has a marker with ID "${m.id}" that does not exist in the English map! Please synchronize the markers on the wiki before editing this map.`);
                    continue;
                }
                if (m.name !== obj.name) {
                    setProperty(obj, 'name', m.name, language);
                }
                const [languageDescription, languageMultiline] = splitDescriptionAndMultiline(m);
                if (languageDescription !== getStringProperty(obj, 'description')) {
                    setProperty(obj, 'description', languageDescription, language);
                }
                if (languageMultiline !== getBoolProperty(obj, 'multiline')) {
                    setProperty(obj, 'multiline', languageMultiline, language);
                }
                if (m.article !== getStringProperty(obj, 'page')) {
                    setProperty(obj, 'page', m.article, language);
                }
                if (m.image !== getStringProperty(obj, 'image')) {
                    setProperty(obj, 'image', m.image, language);
                }
                const enPlain = getBoolProperty(obj, 'plain');
                const languagePlain = !m.isWikitext;
                if (enPlain !== languagePlain) {
                    setProperty(obj, 'plain', languagePlain, language);
                }
            }
        }
    }
    return map;
}

/**
 * Checks whether the map is in the DataMaps format.
 * @param {TileMap} map Map to check
 * @returns {boolean} Whether the map is in the DataMaps format
 */
export function mapIsDataMaps(map) {
    return FileInfo.suffix(map.fileName) === 'mw-datamaps';
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
 * @returns {(map: TileMap, mapFilePath: string) => undefined} Function that
 * writes the converted map to a file
 */
function generateWrite(multiple) {
    return (map, mapFilePath) => {
        const convertedMap = multiple ?
            convertTiledToMultipleDataMaps(map, mapFilePath) :
            convertTiledToDataMaps(map, getLastLanguage() || 'en', mapFilePath);
        writeMap(convertedMap, mapFilePath);
    };
}

/**
 * Converts a DataMaps map to the Tiled map format.
 * @param {string} filePath Path to the file with the DataMaps map
 * @returns {TileMap} Tiled map
 */
function read(filePath) {
    const file = new TextFile(filePath, TextFile.ReadOnly);
    const content = file.readAll();
    file.close();
    const datamap = JSON.parse(content);
    const isMultiple = typeof datamap.en === 'object';
    return convertDataMapsToTiled(isMultiple ? datamap : { en: datamap });
}

tiled.registerMapFormat('dataMaps', {
    extension: 'mw-datamaps',
    name: 'DataMaps (all wikis)',
    read,
    write: generateWrite(true)
});

tiled.registerMapFormat('dataMap', {
    extension: 'mw-datamaps',
    name: 'DataMaps (single wiki)',
    read,
    write: generateWrite(false)
});
