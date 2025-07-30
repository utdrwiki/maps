interface ImageOverlay {
    name?: string
    image: string
    at: Rectangle
    pixelated?: boolean
    reduceGaps?: boolean
}

interface PolylineOverlay {
    name?: string
    path: Point[]
    color?: Color
    thickness?: number
}

interface BoxOverlay {
    name?: string
    at: Rectangle
    color?: Color
    borderColor?: Color
}

type Overlay = ImageOverlay | PolylineOverlay | BoxOverlay;
