from dataclasses import dataclass, field
from dataclasses_json import dataclass_json, config, DataClassJsonMixin
from typing import Dict, List, Optional, Union

from datamaps.background import Background
from datamaps.basic import Rectangle
from datamaps.categories import MarkerCategory
from datamaps.crs import CoordinateSystem
from datamaps.groups import MarkerGroup
from datamaps.markers import Marker
from datamaps.settings import Settings

@dataclass_json
@dataclass
class CustomProperties:
    map_name: str


@dataclass
class DataMap(DataClassJsonMixin):
    _schema: str = field(
        metadata=config(field_name='$schema'),
        default_factory=lambda: '/extensions/DataMaps/schemas/v17.3.json'
    )
    include: List[str] = field(default_factory=lambda: [])
    crs: Optional[Union[CoordinateSystem, Rectangle]] = None
    settings: Optional[Settings] = None
    backgrounds: List[Background] = field(default_factory=lambda: [])
    groups: Dict[str, MarkerGroup] = field(default_factory=lambda: {})
    categories: Dict[str, MarkerCategory] = field(default_factory=lambda: {})
    disclaimer: Optional[str] = None
    markers: Dict[str, List[Marker]] = field(default_factory=lambda: {})
    custom: CustomProperties = field(default_factory=lambda: CustomProperties(
        map_name=''
    ))
