from dataclasses import dataclass, field
from dataclasses_json import dataclass_json
from enum import Enum
from typing import List, Optional, Tuple, Union

from datamaps.basic import NamedPoint

class Order(Enum):
    yx = 'yx'
    latlon = 'latlon'
    xy = 'xy'


@dataclass_json
@dataclass
class CoordinateSystem:
    order: Optional[Order] = Order.yx
    topLeft: Optional[Union[List, NamedPoint]] = field(default_factory=lambda: [0, 0])
    bottomRight: Optional[Union[Tuple[int, int], NamedPoint]] = field(
        default_factory=lambda: (100, 100)
    )
    rotation: Optional[float] = None
