from dataclasses import dataclass, field
from dataclasses_json import dataclass_json, config
from enum import Enum
from typing import List, Optional, Union


@dataclass_json
@dataclass
class Marker:
    x: float
    y: float
    id: Optional[Union[str, int]] = None
    icon: Optional[str] = None
    scale: Optional[float] = 1.0
    name: Optional[str] = None
    description: Optional[Union[List[str], str]] = None
    isWikitext: Optional[bool] = None
    image: Optional[str] = None
    article: Optional[str] = None
    canSearchFor: Optional[bool] = True
    searchKeywords: Optional[Union[List[List], str]] = field(default_factory=lambda: [])
