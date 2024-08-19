from dataclasses import dataclass, field
from dataclasses_json import dataclass_json
from typing import List, Optional, Tuple, Union

from datamaps.basic import NamedPoint, Rectangle
from datamaps.overlays import Overlay


@dataclass_json
@dataclass(kw_only=True)
class BaseBackground:
    name: Optional[str] = None
    associatedLayer: Optional[str] = None
    pixelated: Optional[bool] = False
    overlays: List[Overlay] = field(default_factory=lambda: [])


@dataclass_json
@dataclass
class Tile:
    position: Union[float, List, NamedPoint]
    image: str


@dataclass_json
@dataclass
class TiledBackground(BaseBackground):
    tileSize: Union[float, Tuple[float, float], NamedPoint]
    tiles: List[Tile]
    at: Optional[Union[List, NamedPoint]] = field(default_factory=lambda: [0, 0])


@dataclass_json
@dataclass
class ImageBackground(BaseBackground):
    image: str
    at: Optional[Rectangle] = None


Background = Union[ImageBackground, TiledBackground]
