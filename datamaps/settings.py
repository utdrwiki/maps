from dataclasses import dataclass
from dataclasses_json import dataclass_json
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from datamaps.basic import Color

class EnableSearch(Enum):
    disabled = False
    enabled = True
    tabberWide = 'tabberWide'


class HideLegend(Enum):
    show = False
    hide = True
    collapsed = 'collapsed'


class InteractionModel(Enum):
    keybinds = 'keybinds'
    sleep = 'sleep'


class IconRenderer(Enum):
    """Renderer preference for graphical icons using images from this wiki (not
    circular icons or pins).

    Pins always use the DOM renderer.

    - DOM renderer provides best reactivity for a small data set (roughly 500
      icons), but performance degrades with more markers. However, it comes with
      animation support for GIFs.
    - Canvas renderer provides best performance at a cost of zoom update
      latency, and supports only static icons. This works best for bigger data
      sets (above 500 icons), and is automatically enabled for such sets (if
      this option is set to 'auto').
    """
    auto = 'auto'
    DOM = 'DOM'
    canvas = 'canvas'


class SortChecklistsBy(Enum):
    groupDeclaration = 'groupDeclaration'
    amount = 'amount'


@dataclass_json
@dataclass
class ZoomSettings:
    tryFitEverything: Optional[bool] = True
    min: Optional[float] = 0.05
    max: Optional[float] = 6
    lock: Optional[bool] = False
    scrollSpeed: Optional[float] = 1.0


@dataclass_json
@dataclass
class Settings:
    allowFullscreen: Optional[bool] = True
    backdropColor: Optional[Color] = None
    enableTooltipPopups: Optional[bool] = False
    enableSearch: Optional[EnableSearch] = EnableSearch.enabled
    hideLegend: Optional[HideLegend] = HideLegend.show
    interactionModel: Optional[InteractionModel] = InteractionModel.keybinds
    iconRenderer: Optional[IconRenderer] = IconRenderer.auto
    requireCustomMarkerIDs: Optional[bool] = False
    showCoordinates: Optional[bool] = True
    sortChecklistsBy: Optional[SortChecklistsBy] = SortChecklistsBy.groupDeclaration
    zoom: Optional[ZoomSettings] = None
    leaflet: Union[Dict[str, Any], None, Literal[False]] = False
