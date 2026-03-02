const CURRENT_VERSION = 0;

/**
 * @implements {Metadata}
 */
export class MetadataImpl {
    /**
     * Class constructor.
     * @param {Metadata|undefined} metadata Metadata
     */
    constructor(metadata = undefined) {
        /** @type {Record<string, InterwikiDataImpl>} */
        this.interwiki = {};
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
            fileName: this.fileName,
            interwiki: this.interwiki,
            version: this.version,
        };
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
