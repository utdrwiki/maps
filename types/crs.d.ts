interface CoordinateSystem {
    order?: 'yx' | 'latlon' | 'xy'
    topLeft?: NamedPoint | [number, number]
    bottomRight?: NamedPoint | [number, number]
    rotation?: number
}
