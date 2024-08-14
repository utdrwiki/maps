from dataclasses import dataclass
from typing import List, Optional, Union
from dataclasses_json import dataclass_json
from datamaps.basic import Color, Point, Rectangle


@dataclass_json
@dataclass
class BoxOverlay:
    """Represents a box overlay on the map.

    Attributes:
        at (Rectangle): The rectangle where the box is drawn.
        name (Optional[str]): The name of the box overlay.
        color (Optional[Union[List, str]]): The color of the box overlay.
        borderColor (Optional[Union[List, str]]): The border color of the box
            overlay.
    """
    at: Rectangle
    name: Optional[str] = None
    color: Optional[Color] = None
    borderColor: Optional[Color] = None


@dataclass_json
@dataclass
class ImageOverlay:
    image: str
    at: Rectangle
    name: Optional[str] = None
    pixelated: Optional[bool] = False
    reduceGaps: Optional[bool] = False


@dataclass_json
@dataclass
class PolylineOverlay:
    path: List[Point]
    name: Optional[str] = None
    color: Optional[Color] = None
    thickness: Optional[float] = None


Overlay = Union[BoxOverlay, ImageOverlay, PolylineOverlay]
