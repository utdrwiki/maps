const CURRENT_VERSION = 0;
const DEFAULT_TILE_SIZE = 32;

/**
 * @implements {Metadata}
 */
export class MetadataImpl {
    /**
     * Class constructor.
     * @param {Metadata|undefined} metadata Metadata
     */
    constructor(metadata = undefined) {
        /** @type {Record<string, string>|undefined} */
        this.backgroundFileNameMap = metadata?.backgroundFileNameMap;
        /** @type {Record<string, InterwikiDataImpl>} */
        this.interwiki = {};
        /** @type {number} */
        this.tileHeight = metadata?.tileHeight || DEFAULT_TILE_SIZE;
        /** @type {number} */
        this.tileWidth = metadata?.tileWidth || DEFAULT_TILE_SIZE;
        /** @type {number} */
        this.version = metadata?.version || CURRENT_VERSION;
        /** @type {string|undefined} */
        this.fileName = metadata?.fileName;
        if (metadata?.interwiki) {
            for (const [key, value] of Object.entries(metadata.interwiki)) {
                this.interwiki[key] = new InterwikiDataImpl(value);
            }
        }
    }
    /**
     * Serializes the metadata to JSON.
     * @returns {object} Metadata with unneeded properties removed.
     */
    toJSON() {
        return {
            backgroundFileNameMap: this.backgroundFileNameMap,
            fileName: this.fileName,
            interwiki: this.interwiki,
            tileHeight: this.tileHeight,
            tileWidth: this.tileWidth,
            version: this.version,
        };
    }
    /**
     * Gets the local image file name for a given wiki image file name.
     * @param {string} wikiFileName Image file name as stored on the wiki
     * @returns {string} Local image file name
     */
    getBackgroundFileName(wikiFileName) {
        return this.backgroundFileNameMap?.[wikiFileName] || wikiFileName;
    }
}

/**
 * @implements {InterwikiData}
 */
export class InterwikiDataImpl {
    /**
     * Class constructor.
     * @param {InterwikiData} data Interwiki data
     */
    constructor(data) {
        /** @type {string} */
        this.mapName = data.mapName;
        /** @type {number} */
        this.revision = 0;
    }
    /**
     * Serializes the interwiki data to JSON.
     * @returns {object} Interwiki data with unneeded properties removed.
     */
    toJSON() {
        return {
            mapName: this.mapName,
        };
    }
}
