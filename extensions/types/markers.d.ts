interface Marker {
    id?: string | number
    icon?: string
    scale?: number
    name?: string
    description?: string | string[]
    isWikitext?: boolean
    image?: string
    article?: string
    canSearchFor?: boolean
    searchKeywords?: [string, number][] | string
    x: number
    y: number
}
