# tiled-datamaps

Converts [Tiled](https://mapeditor.org/) maps into maps recognized by the
[DataMaps](https://support.wiki.gg/wiki/DataMaps) MediaWiki extension, to the
best of its ability. Currently still in WIP, but suitable for use on the
[Undertale Yellow Wiki](https://undertaleyellow.wiki.gg/).

## Setup
```bash
python -m venv .venv
source .venv/bin/activate # Or the Windows equivalent
pip install -r requirements.txt
```
Make sure you have the DataMaps extension on the wiki you're editing.

## Usage
### Map editor

This is how features of Tiled map to DataMaps:

- Every image layer on the map maps to a an image background in DataMaps.
- All points on the map are used as map markers in DataMaps.
- Rectangles, polylines and polygons are used as background overlays in
  DataMaps.
- Every object layer on the map is used as a marker group name.
    - Every point in that object layer is treated as a marker with the group
      name set to the layer name.
- Every group layer on the map is used as a category name for markers within
  that group.
    - Every point in an object layer inside a group layer is treated as a marker
      with the group name set to the object layer name, and categories set to
      names of all parent group layers.
- Tile layers are not supported yet.
- Layer offsets are (mostly) supported.

#### Custom properties

Modifying certain aspects of DataMaps is only possible through custom properties
in Tiled:

- Custom project properties are used to tell the script where to publish the
  maps:
    - `wiki` (string): Wiki URL
        - For example, `undertaleyellow.wiki.gg`
    - `scriptPath` (string): Wiki's script path
- Custom map properties are used for map-wide configuration:
    - `disclaimer` (string): Disclaimer displayed below the legend in DataMaps
    - `include` (string): Newline-separated list of strings that describe which
      pages should be included as fragments
        - This is intended for including map fragments that define the groups
          and categories used in the map
- Custom point properties are used for marker information:
    - `description` (string): Description of the marker
    - `page` (string): Where should the "Read more" link lead
    - `plain` (boolean): Whether the description should *not* be interpreted as
      wikitext
- Custom rectangle properties:
    - `fill` (color): Rectangle fill color
    - `border` (color): Rectangle border color
- Custom polyline and polygon properties:
    - `color` (color): Polyline color
    - `thickness` (float): Polyline thickness

### Conversion

To convert all maps in the project and publish them to the wiki, you can run
`convert.py`. It takes three optional arguments:

- `--project`: Folder name of the project in the `maps` directory. If there is
  only one directory, you don't need to specify this.
- `--map`: Which map in the project do you want to publish. If you leave this
  out, all maps in the project are published.
- `--log_level`: `info`, `error`, `debug`, all the standard Python logging
  levels.

On the first run, the script will ask you for three pieces of information to log
you in. You need to go to Special:BotPasswords on the wiki you want to edit,
grant it the ability for high-volume editing as well as editing existent pages,
and the page will tell you your username is `Username@BotPasswordName` and your
token is `Token`. In the script, you will input these separately: first
`Username`, then `BotPasswordName`, and finally `Token`.
