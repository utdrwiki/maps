interface BaseMarkerGroup {
    name: string
    /**
     * Shown in the legend right under.
     */
    description?: string
    /**
     * If set to true, these circles will not change size when zooming in or out.
     */
    static?: boolean
    /**
     * If set, all markers in this group will link to this article.
     */
    article?: string
    isDefault?: boolean
    isCollectible?: boolean | 'individual' | 'group' | 'globalGroup'
    /**
     * If set to false, this group will not be shown in the legend.
     */
    isSwitchable?: boolean
    /**
     * If set to false, this group will not be shown in the legend.
     */
    autoNumberInChecklist?: boolean
    canSearchFor?: boolean
}

interface CircularMarkerGroup extends BaseMarkerGroup {
    /**
     * Shown in the legend.
     */
    icon?: string
    fillColor: Color
    size?: number
    extraMinZoomSize?: number
    strokeColor?: Color
    strokeWidth?: number
}

interface PinMarkerGroup {
    /**
     * Shown in the legend.
     */
    icon?: string
    pinColor: Color
    size?: number
    strokeColor?: Color
    strokeWidth?: number
}

interface IconMarkerGroup {
    /**
     * Shown in the legend.
     */
    icon: string
    size?: number | Point
}

type MarkerGroup = CircularMarkerGroup | PinMarkerGroup | IconMarkerGroup;
