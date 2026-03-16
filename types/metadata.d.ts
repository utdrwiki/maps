interface InterwikiData {
    mapName: string;
    [key: string]: any;
}

interface Metadata {
    backgroundFileNameMap?: Record<string, string>;
    interwiki?: Record<string, InterwikiData>;
    fileName?: string;
    tileWidth?: number;
    version: number;
    [key: string]: any;
}
