import {
    addPoints,
    getBoolProperty,
    getColorProperty,
    getListProperty,
    getNumberProperty,
    getStringProperty
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
        const /** @type {ImageBackground} */ bg = {
            image: `${layer.name}.png`,
            name: layer.name
        };
        const /** @type {ImageLayer} */ imageLayer = layer;
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
        }
    } else if (layer.isObjectLayer) {
        const /** @type {Marker[]} */ markers = [];
        const /** @type {ObjectGroup} */ objectLayer = layer;
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
        const /** @type {GroupLayer} */ groupLayer = layer;
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
 * Converts a Tiled map to DataMaps format.
 * @param {TileMap} map Tiled map to convert to DataMaps
 * @param {string} mapName Filename of the Tiled map
 * @param {string} language Language to use for localized properties
 * @returns {DataMap} Converted DataMap object
 */
export function convertMap(map, mapName, language = 'en') {
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
        custom: {
            mapName: getStringProperty(map, 'name', language) || mapName
        },
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

/**
 * Converts a Tiled map to DataMaps format.
 * @param {TileMap} map Tiled map to convert to DataMaps
 * @param {string} filePath Path of the Tiled map
 * @returns {undefined}
 */
function write(map, filePath) {
    const mapName = FileInfo.completeBaseName(FileInfo.fileName(filePath));
    const convertedMap = convertMap(map, mapName);
    const file = new TextFile(filePath, TextFile.WriteOnly);
    file.write(`${JSON.stringify(convertedMap, null, 4)}\n`);
    file.commit();
}

export default /** @type {ScriptedMapFormat} */ {
    extension: 'json',
    name: 'DataMaps',
    write
};
