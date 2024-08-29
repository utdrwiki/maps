#!/usr/bin/env python
from argparse import ArgumentParser
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Literal, NamedTuple, Optional, Set, Tuple, Type, TypeVar, Union

from mwcleric import AuthCredentials, WikiClient
import pytiled_parser as tiled
import pytiled_parser.tiled_object as objects

from datamaps import CoordinateSystem, DataMap, ImageBackground, Order, Marker
from datamaps.background import TiledBackground
from datamaps.basic import Color, Point
from datamaps.markers import Marker
from datamaps.overlays import BoxOverlay, Overlay, PolylineOverlay

T = TypeVar('T')


def get_property(
    properties: Optional[tiled.Properties],
    name: str,
    property_type: Type[T]
) -> Optional[T]:
    if properties is None:
        return None
    prop = properties.get(name)
    if isinstance(prop, property_type):
        return prop
    return None


def get_list_property(
    properties: Optional[tiled.Properties],
    name: str
) -> List[str]:
    property_list_str = (properties or {}).get(name)
    if not isinstance(property_list_str, str):
        return []
    property_list = property_list_str.strip().split('\n')
    return [element.strip() for element in property_list if element.strip() != '']


def get_color_property(
    properties: Optional[tiled.Properties],
    name: str,
    format: Union[Literal['rgb'], Literal['rgba']] = 'rgba'
) -> Optional[Color]:
    color = get_property(properties, name, tiled.Color)
    if color is None:
        return None
    if format == 'rgb':
        return (color.red, color.green, color.blue)
    return (color.red, color.green, color.blue, color.alpha / 255)


def add_points(p1: NamedTuple, p2: NamedTuple) -> tiled.OrderedPair:
    return tiled.OrderedPair(p1[0] + p2[0], p1[1] + p2[1])


def convert_layer(
    layer: tiled.Layer,
    datamap: DataMap,
    converted_layers: Set[Optional[int]],
    parent_layers: List[str] = [],
    offset: tiled.OrderedPair = tiled.OrderedPair(0, 0)
):
    offset = add_points(offset, layer.offset)
    if layer.id in converted_layers:
        # map.layers is a list of all layers in the map, so we need to check if
        # we've already converted this layer in the context of a layer group.
        return
    logging.debug('Converting layer %s (ID %d)', layer.name, layer.id)
    overlays: List[Overlay] = []
    if isinstance(layer, tiled.ImageLayer):
        bg = ImageBackground(f'{layer.name}.png', name=layer.name)
        if datamap.backgrounds[0].name == '<default>':
            bg.overlays = datamap.backgrounds[0].overlays
            datamap.backgrounds[0] = bg
        else:
            datamap.backgrounds.append(bg)
    elif isinstance(layer, tiled.ObjectLayer):
        markers: List[Marker] = []
        for obj in layer.tiled_objects:
            coords = add_points(obj.coordinates, offset)
            if isinstance(obj, objects.Point):
                description = get_property(obj.properties, 'description', str)
                if get_property(obj.properties, 'multiline', bool):
                    description = f'<poem>{description}</poem>'
                markers.append(Marker(coords.x, coords.y,
                    name=None if len(obj.name) == 0 else obj.name,
                    description=description,
                    isWikitext=not obj.properties.get('plain', False),
                    article=get_property(obj.properties, 'page', str)))
            elif isinstance(obj, objects.Rectangle):
                overlays.append(BoxOverlay(
                    at=(coords, add_points(coords, obj.size)),
                    name=obj.name,
                    color=get_color_property(obj.properties, 'fill'),
                    borderColor=get_color_property(obj.properties, 'border', 'rgb')))
            elif isinstance(obj, objects.Polyline) or isinstance(obj, objects.Polygon):
                # FIXME: Once DataMaps fixes the bug with CRS not being
                # respected here we need to swap the coordinates.
                path: List[Point] = [
                    (coords.y + point.y, coords.x + point.x)
                    for point in obj.points
                ]
                if isinstance(obj, objects.Polygon):
                    path.append(path[0])
                overlays.append(PolylineOverlay(
                    path=path,
                    name=obj.name,
                    color=get_color_property(obj.properties, 'color'),
                    thickness=get_property(obj.properties, 'thickness', float)
                ))
        layer_association_id = ' '.join([layer.name] + parent_layers)
        if len(markers) > 0:
            datamap.markers[layer_association_id] = markers
    elif isinstance(layer, tiled.LayerGroup):
        for child_layer in layer.layers or []:
            convert_layer(child_layer, datamap, converted_layers,
                parent_layers + [layer.name], offset)
    elif isinstance(layer, tiled.TileLayer):
        raise ValueError('Tile layers are not yet supported!')
    else:
        raise ValueError('Unknown layer type!')
    datamap.backgrounds[0].overlays += overlays
    converted_layers.add(layer.id)


def convert_tiled_to_datamap(map: tiled.TiledMap) -> DataMap:
    datamap = DataMap()
    map_width = map.map_size.width * map.tile_size.width
    map_height = map.map_size.height * map.tile_size.height
    datamap.crs = CoordinateSystem(order=Order.xy, topLeft=[0, 0],
        bottomRight=[map_width, map_height])
    datamap.custom.map_name = map.map_file.name.replace('.tmx', '')
    datamap.disclaimer = get_property(map.properties, 'disclaimer', str)
    datamap.include = get_list_property(map.properties, 'include')
    # We need a background to insert the overlays into.
    datamap.backgrounds.append(TiledBackground(tileSize=map.tile_size,
        tiles=[],
        name="<default>"))

    converted_layers: Set[Optional[int]] = set()
    for layer in reversed(map.layers):
        convert_layer(layer, datamap, converted_layers)
    return datamap


def find_project_property(properties: List[Dict[str, Any]], name: str) -> Optional[str]:
    for prop in properties:
        if prop['name'] == name and prop['type'] == 'string':
            return prop['value']


def get_wiki(project_name: str) -> Optional[Tuple[str, str]]:
    with open(Path('maps') / project_name / f'{project_name}.tiled-project') as project_file:
        project_data = json.load(project_file)
        project_properties = project_data['properties']
    host = find_project_property(project_properties, 'wiki')
    path = find_project_property(project_properties, 'scriptPath')
    if host is None or path is None:
        return None
    return host, path


def log_in_to_wiki(project_name: str) -> WikiClient:
    wiki = get_wiki(project_name)
    credentials = AuthCredentials(user_file='tiled-datamaps')
    if wiki is None:
        raise ValueError('Could not find wiki information in project file')
    return WikiClient(*wiki, credentials, max_retries=0)


def get_script_dir() -> Path:
    return Path(os.path.dirname(os.path.realpath(__file__)))


def get_project(
    project: Optional[str],
    mappath: Optional[str]
) -> Tuple[str, Path]:
    if mappath is not None:
        project_path = Path(mappath).parent
        project = project_path.name
        if not project_path.is_dir():
            raise ValueError(f'Project at {project_path} is not a directory.')
        return project, project_path
    script_dir = get_script_dir()
    maps_dir = script_dir / 'maps'
    projects = os.listdir(maps_dir)
    if len(projects) == 0:
        raise ValueError('No projects exist! You might be placing your maps in the wrong directory.')
    elif len(projects) == 1:
        project = projects[0]
    else:
        project_list_str = ', '.join(projects)
        if project is None:
            raise ValueError(f'Multiple projects exist, please specify which project to convert using the --project flag: {project_list_str}')
        if project not in projects:
            raise ValueError(f'Project {project} not found, available projects are: {project_list_str}')
    project_path = Path(maps_dir / project)
    if not project_path.is_dir():
        raise ValueError(f'Project at {project_path} is not a directory.')
    return project, project_path


def get_maps_to_convert(
    project_path: Path,
    map: Optional[str],
    mappath: Optional[str]
) -> List[tiled.TiledMap]:
    map_file = None
    if mappath is not None:
        map_file = Path(mappath)
    elif map is not None:
        map_file = project_path / f'{map}.tmx'
    if map_file is not None:
        if not map_file.is_file():
            raise ValueError(f'Map file {map_file} does not exist or is not a file.')
        return [tiled.parse_map(map_file)]
    return [tiled.parse_map(project_path / map_file)
        for map_file in os.listdir(project_path)
        if map_file.endswith('.tmx')]


def publish_datamap_to_wiki(datamap: DataMap, wiki: WikiClient) -> None:
    title = f'Map:{datamap.custom.map_name}'
    text = datamap.to_json(indent=4)
    logging.info('Editing %s...', title)
    logging.debug(text)
    wiki.save_title(title, text, 'Updating map using tiled-datamaps.', bot=True)


if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('--project', type=str, help='project whose maps should be converted', required=False)
    parser.add_argument('--map', type=str, help='map to convert, if not specified all maps are converted', required=False)
    parser.add_argument('--mappath', type=str, help='full path to the map file to convert, can be used instead of both --project and --map, for Tiled integration', required=False)
    parser.add_argument('--log_level', type=str, help='log level', default='INFO')
    args = parser.parse_args()
    logging.basicConfig(level=logging.getLevelNamesMapping()[args.log_level.upper()])

    project_name, project_path = get_project(args.project, args.mappath)
    wiki = log_in_to_wiki(project_name)
    maps = get_maps_to_convert(project_path, args.map, args.mappath)
    for map in maps:
        datamap = convert_tiled_to_datamap(map)
        publish_datamap_to_wiki(datamap, wiki)
    logging.info('All maps converted successfully!')
