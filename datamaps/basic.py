from dataclasses import dataclass
from typing import Tuple, Union
from dataclasses_json import dataclass_json

@dataclass_json
@dataclass
class NamedPoint:
    """Represents a point on the map. Can be used alternatively to a tuple of
    floats.

    Attributes:
        x (float): X coordinate of the point.
        y (float): Y coordinate of the point.
    """
    x: float
    y: float


Point = Union[Tuple[float, float], NamedPoint]
Rectangle = Tuple[Point, Point]
RGBColor = Tuple[int, int, int]
RGBAColor = Tuple[int, int, int, float]
Color = Union[RGBColor, RGBAColor, str]
