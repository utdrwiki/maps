interface NamedPoint {
    x: number;
    y: number;
}
type Point = NamedPoint | [number, number];
type Rectangle = [Point, Point];
type RGBColor = [number, number, number];
type RGBAColor = [number, number, number, number];
type Color = RGBColor | RGBAColor | string;
