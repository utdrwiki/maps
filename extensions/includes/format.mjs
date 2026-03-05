import { getLanguageCodes } from './language.mjs';
import { InterwikiDataImpl, MetadataImpl } from './metadata.mjs';
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
    validateTiledPoint,
    validateTiledRectangle
} from './util.mjs';

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
 * Converts a single layer from a Tiled map to DataMaps format.
 * @param {Layer} layer Layer to convert
 * @param {DataMap} datamap DataMap that the layer belongs to
 * @param {Set<number>} convertedLayers Already converted layers
 * @param {string} language Language to use for localized properties
 */
function convertLayer(layer, datamap, convertedLayers, language) {
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
            image: getStringProperty(layer, 'image', language) || `${layer.name}.png`,
            name: layer.name
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
    } else if (layer.isObjectLayer) {
        const /** @type {Marker[]} */ markers = [];
        const objectLayer = /** @type {ObjectGroup} */ (layer);
        for (const obj of objectLayer.objects) {
            const {x, y} = addPoints(obj.pos, offset);
            const name = getStringProperty(obj, 'name', language) || obj.name;
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
                })
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
        if (markers.length > 0) {
            datamap.markers[layerAssociationId] = markers;
        }
    } else if (layer.isGroupLayer) {
        const groupLayer = /** @type {GroupLayer} */ (layer);
        for (const childLayer of groupLayer.layers || []) {
            convertLayer(childLayer, datamap, convertedLayers, language);
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
 * @returns {MetadataImpl} Map metadata to store in DataMaps
 */
function getDataMapsMetadata(map, mapName) {
    const metadata = new MetadataImpl();
    for (const language of getLanguageCodes()) {
        const localizedMapName = getStringProperty(map, 'name', language);
        if (!localizedMapName && language !== 'en') {
            continue;
        }
        metadata.interwiki[language] = new InterwikiDataImpl({
            mapName: localizedMapName || mapName
        });
    }
    metadata.fileName = mapName;
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
    for (const layer of map.layers.slice().reverse()) {
        convertLayer(layer, datamap, convertedLayers, language);
    }
    return datamap;
}

const TILE_SIZE = 32;

/**
 * Converts a DataMaps map to the Tiled map format.
 * @param {DataMap} datamap DataMap to convert
 * @returns {TileMap} Converted Tiled map object
 */
export function convertDataMapsToTiled(datamap) {
    const primaryBg = datamap.backgrounds.find(isImageBackground);
    if (!primaryBg) {
        throw new Error('At least one background with an image is required to convert to Tiled format');
    }
    const crsBR = validateTiledPoint(datamap.crs.bottomRight);
    const mapWidth = Math.ceil(crsBR[0] / TILE_SIZE);
    const mapHeight = Math.ceil(crsBR[1] / TILE_SIZE);
    const map = new TileMap();
    map.tileWidth = TILE_SIZE;
    map.tileHeight = TILE_SIZE;
    map.width = mapWidth;
    map.height = mapHeight;
    if (datamap.disclaimer) {
        map.setProperty('disclaimer', datamap.disclaimer);
    }
    if (datamap.settings && datamap.settings.leaflet) {
        map.setProperty('popzoom', datamap.settings.leaflet.uriPopupZoom);
    }
    if (datamap.include) {
        map.setProperty('include', datamap.include.join('\n'));
    }
    const /** @type {[string, ImageLayer][]} */ imageFiles = [];
    for (const bg of datamap.backgrounds.filter(isImageBackground)) {
        const layer = new ImageLayer();
        // TODO: Support custom image property
        layer.name = bg.image.replace(/\.png$/, '');
        imageFiles.push([bg.image, layer]);
        map.addLayer(layer);
    }
    let annotationLayer = new ObjectGroup('annotations');
    map.addLayer(annotationLayer);
    for (const overlay of (primaryBg.overlays || [])) {
        const obj = new MapObject(overlay.name);
        if (isBoxOverlay(overlay)) {
            obj.shape = MapObject.Rectangle;
            const [[x1, y1], [x2, y2]] = validateTiledRectangle(overlay.at);
            obj.pos = { x: x1, y: y1 };
            obj.width = x2 - x1;
            obj.height = y2 - y1;
            if (overlay.color) {
                obj.setProperty('fill', getTiledColor(overlay.color));
            }
            if (overlay.borderColor) {
                obj.setProperty('border', getTiledColor(overlay.borderColor));
            }
        } else if (isPolylineOverlay(overlay)) {
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
        }
        annotationLayer.addObject(obj);
    }
    // TODO: Support nested layers
    for (const [layerName, markers] of Object.entries(datamap.markers).reverse()) {
        const layer = new ObjectGroup(layerName);
        for (const m of markers) {
            const obj = new MapObject(m.name);
            obj.pos = {
                x: m.x,
                y: m.y
            };
            obj.shape = MapObject.Point;
            obj.setProperties({
                page: m.article,
                description: m.description,
                image: m.image,
                plain: m.isWikitext === undefined ? undefined : !m.isWikitext
            });
            layer.addObject(obj);
        }
        map.addLayer(layer);
    }
    return map;
}

/**
 * Converts a Tiled map to DataMaps format.
 * @param {TileMap} map Tiled map to convert to DataMaps
 * @param {string} filePath Path of the Tiled map
 * @returns {undefined}
 */
function write(map, filePath) {
    const mapName = FileInfo.completeBaseName(FileInfo.fileName(filePath));
    const convertedMap = convertTiledToDataMaps(map, mapName);
    const file = new TextFile(filePath, TextFile.WriteOnly);
    file.write(`${JSON.stringify(convertedMap, null, 4)}\n`);
    file.commit();
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
    return convertDataMapsToTiled(datamap.en);
}

export default /** @type {ScriptedMapFormat} */ {
    extension: 'mw-datamaps',
    name: 'DataMaps',
    read,
    write
};
