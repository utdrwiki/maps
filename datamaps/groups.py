from dataclasses import dataclass
from enum import Enum
from typing import Optional, Union
from dataclasses_json import dataclass_json
from datamaps.basic import Color, Point


class IsCollectible(Enum):
    notCollectible = False
    collectible = True
    individual = 'individual'
    group = 'group'
    globalGroup = 'globalGroup'


@dataclass_json
@dataclass(kw_only=True)
class BaseMarkerGroup:
    name: str
    description: Optional[str] = None
    static: Optional[bool] = False
    article: Optional[str] = None
    isDefault: Optional[bool] = True
    isCollectible: Optional[IsCollectible] = IsCollectible.notCollectible
    isSwitchable: Optional[bool] = True
    autoNumberInChecklist: Optional[bool] = False
    canSearchFor: Optional[bool] = True


@dataclass_json
@dataclass
class CircularMarkerGroup(BaseMarkerGroup):
    """Represents
    """
    fillColor: Color
    icon: Optional[str] = None
    size: Optional[float] = 12.5
    extraMinZoomSize: Optional[float] = None
    strokeColor: Optional[Color] = None
    strokeWidth: Optional[float] = 1


@dataclass_json
@dataclass
class PinMarkerGroup(BaseMarkerGroup):
    pinColor: Color
    icon: Optional[str] = None
    size: Optional[float] = 32
    strokeColor: Optional[Color] = None
    strokeWidth: Optional[float] = 1


@dataclass_json
@dataclass
class IconMarkerGroup(BaseMarkerGroup):
    icon: str
    size: Optional[Union[float, Point]] = 32


MarkerGroup = Union[CircularMarkerGroup, PinMarkerGroup, IconMarkerGroup]
