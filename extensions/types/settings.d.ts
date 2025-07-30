interface Settings {
    /**
     * Whether full-screen toggle will be shown to the user on this map.
     *
     * TODO: "whether the option to view the map in fullscreen will be offered"
     */
    allowFullscreen?: boolean
    /**
     * The backdrop colour, i.e. the one filling areas with no background image over them.
     *
     * TODO: wording
     */
    backdropColor?: Color
    /**
     * Whether simply moving mouse cursor over a marker should cause its popup to become visible.
     *
     * Such popup will be partially translucent. The user still has to click on the marker for the address bar to update with a
     * permanent link.
     */
    enableTooltipPopups?: boolean
    /**
     * Whether marker search will be enabled for this map.
     *
     * TODO: document modes
     */
    enableSearch?: boolean | 'tabberWide'
    /**
     * Forces the legend (collectible checklists and marker filters) to not be loaded on this map.
     *
     * If set to 'collapsed', the legend will be loaded, but will not be expanded on load.
     */
    hideLegend?: boolean | 'collapsed'
    /**
     * Changes interaction delay model. Keybinds require extra keys to be held to zoom in (CTRL/Super), sleep is primarily
     * time-based.
     */
    interactionModel?: 'keybinds' | 'sleep'
    /**
     * Renderer preference for graphical icons using images from this wiki (not circular icons or pins).
     *
     * - DOM renderer provides best reactivity for a small data set (roughly 500 icons), but performance degrades with
     *     more markers. However, it comes with animation support for GIFs.
     * - Canvas renderer provides best performance at a cost of zoom update latency, and supports only static icons. This works
     *     best for bigger data sets (above 500 icons), and is automatically enabled for such sets (if this option is set to
     *     'auto').
     *
     * Pins always use the DOM renderer.
     */
    iconRenderer?: 'auto' | 'DOM' | 'canvas'
    /**
     * Makes data validation disallow automatically generated marker IDs - the `id` property will need to be specified for each
     * marker manually.
     *
     * These identifiers are used for persistent links and collectible progress tracking. By default, group and layers the marker
     * is attached to along with its location on map are used to generate the identifier.
     */
    requireCustomMarkerIDs?: boolean
    /**
     * Whether coordinates from under the mouse cursor will be shown on this map in the bottom-left corner.
     */
    showCoordinates?: boolean
    /**
     * Specifies marker group checklist sort order.
     *
     * - 'groupDeclaration': Follows the order in which marker groups are declared in source data.
     * - 'amount':                     Follows the number of markers inside each group.
     */
    sortChecklistsBy?: 'groupDeclaration' | 'amount'
    zoom?: ZoomSettings
    leaflet?: Record<string, any>
}

interface ZoomSettings {
    tryFitEverything?: boolean
    min?: number
    max?: number
    /**
     * If set to `true`, zoom level will be fixed at the specified `min` value. All zoom controls on the viewer's
     * side will be disabled.
     */
    lock?: boolean
    scrollSpeed?: number
}
