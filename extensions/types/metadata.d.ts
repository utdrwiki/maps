interface InterwikiData {
    mapName: string;
    [key: string]: any;
}

interface Metadata {
    interwiki?: Record<string, InterwikiData>;
    fileName?: string;
    version: number;
    [key: string]: any;
}
