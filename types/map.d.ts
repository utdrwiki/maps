interface DataMap {
    $schema: string;
    $fragment?: boolean;
    /**
     * List of fragments that must be imported.
     */
    include?: string[]
    crs: CoordinateSystem
    settings?: Settings
    backgrounds: Background[]
    groups?: Record<string, MarkerGroup>;
    categories?: Record<string, MarkerCategory>
    disclaimer?: string
    markers: Record<string, Marker[]>
    custom?: Metadata
}

type DataMaps = Record<string, DataMap>;
