interface DataMap {
    $schema: string
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
    custom?: Record<string, any>
}
