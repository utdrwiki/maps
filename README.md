# tiled-datamaps

[Tiled](https://mapeditor.org/) extension to allow converting Tiled maps into
maps recognized by the [DataMaps](https://support.wiki.gg/wiki/DataMaps)
MediaWiki extension, to the best of its ability. Currently in use on
[Undertale Wiki](https://undertale.wiki/),
[Deltarune Wiki](https://deltarune.wiki/), and the
[Undertale Yellow Wiki](https://undertaleyellow.wiki.gg/).

## Setup
### Prerequisites

On the wiki that you are editing, you need to have the
[DataMaps](https://www.mediawiki.org/wiki/Extension:DataMaps) and
[OAuth](https://www.mediawiki.org/wiki/Extension:OAuth) extensions installed.

If cloning using Git, you need Git LFS installed in order to pull the map
images.

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
        - For example, `undertale.wiki`
    - `scriptPath` (string): Wiki's script path
    - `languageWiki` (string): URL to language wikis, with $1 left as the
      language code.
        - For example, `$1.undertale.wiki`
    - `oauthClientId` (string): OAuth client ID for the application used to
      authenticate users to the wiki.
        - To obtain this, visit `Special:OAuthConsumerRegistration/propose` on
          the wiki you are editing, set the client to non-confidential, allow
          the application to "edit existing pages" and "create, edit and move
          pages", and as a callback URL you can use
          `https://maps.undertale.wiki`, which displays the page you can find
          under `auth/index.html` in this repository.
- Custom map properties are used for map-wide configuration:
    - `disclaimer` (string): Disclaimer displayed below the legend in DataMaps
    - `include` (string): Newline-separated list of strings that describe which
      pages should be included as fragments
        - This is intended for including map fragments that define the groups
          and categories used in the map
    - `popzoom` (float): Default map zoom level used when the map is embedded
      in a page and set to open a specific marker.
- Custom point properties are used for marker information:
    - `description` (string): Description of the marker
    - `page` (string): Where should the "Read more" link lead
    - `plain` (boolean): Whether the description should *not* be interpreted as
      wikitext
    - `multiline` (boolean): Wraps the description in a `<poem>`, to allow
      newlines to directly map to newlines in the rendered wikitext.
- Custom rectangle properties:
    - `fill` (color): Rectangle fill color
    - `border` (color): Rectangle border color
- Custom polyline and polygon properties:
    - `color` (color): Polyline color
    - `thickness` (float): Polyline thickness

### Conversion

To convert the map, use File > Publish to wiki or use the keybind Ctrl+Shift+U.
It will prompt you to log in for the first time, and after every hour of using
the editor. Follow the prompts to log in.

## License

Licensed under the MIT license. The file under `extensions/wiki.svg` is borrowed
from [Wikipedia](https://en.wikipedia.org/wiki/File:Wiki_letter_w.svg) and
licensed under GFDL and CC-BY-SA 3.0.
