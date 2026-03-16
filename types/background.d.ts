interface BaseBackground {
    /**
     * This name will be shown to a viewer in the background selection dropdown.
     */
    name?: string
    associatedLayer?: string
    pixelated?: boolean
    overlays?: Overlay[]
}

interface ImageBackground extends BaseBackground {
    image: string
    /**
     * Bounds to fit the image in.
     */
    at?: Rectangle
}

interface TiledBackground extends BaseBackground {
    at?: Point
    tileSize: number | Point
    tiles: Tile[]
}

interface Tile {
    /**
     * Position in this tile in the grid.
     *
     * 1 unit is one tile as big as the size specified.
     */
    position: number | Point
    image: string
}

type Background = ImageBackground | TiledBackground;
