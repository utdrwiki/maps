# tiled-datamaps

[Tiled](https://mapeditor.org/) extension to allow editing interactive wiki maps displayed using the [DataMaps](https://support.wiki.gg/wiki/DataMaps) MediaWiki extension from Tiled. If you're looking for an introduction to interactive maps editing using this extension, look at the [Interactive Maps Project](https://undertale.wiki/d/t/interactive-maps-project/318) post on Undertale/Deltarune Wiki Discussions, or join the [Undertale/Deltarune Wiki Discord server](https://discord.gg/HkdrcMbvDg) if you need more help.

The extension is currently in use on:

- [Undertale Wiki](https://undertale.wiki/)
- [Deltarune Wiki](https://deltarune.wiki/)
- [Undertale Yellow Wiki](https://undertaleyellow.wiki.gg/)

## Setup
### Prerequisites

On the wiki that you are editing, you need to have the [DataMaps](https://www.mediawiki.org/wiki/Extension:DataMaps) and [OAuth](https://www.mediawiki.org/wiki/Extension:OAuth) extensions installed.

On your local system, you need [Tiled 1.11 or newer](https://thorbjorn.itch.io/tiled), for 64-bit Windows, macOS or Linux.

## Usage

### Starting map editing

This repository comes with Tiled projects set up for editing Undertale, Deltarune and Undertale Yellow wikis. If you're looking to edit some other wiki, please ask the maintainers for guidance.

To start editing maps on one of the aforementioned wikis, install Tiled, download this repository, extract it, then open the project you want to edit from the `maps` folder. Upon initial start, it will download all maps from the wiki and show you a notice, after which you can restart Tiled or use Project > Refresh Folders for maps to show up in the file view.

### Map editor

This is how features of Tiled map to DataMaps:

- Every image layer on the map maps to a an image background in DataMaps.
- All points on the map are used as map markers in DataMaps.
- Rectangles, polylines and polygons are used as background overlays in DataMaps.
- Every object layer on the map is used as a marker group name.
- Every point in an object layer is treated as a marker within that marker group.

Attempting to use unsupported features, such as ellipses or text, may show a warning about the feature being unsupported.

### Marker popup

When you place or select a point, polyline, polygon or rectangle on the map, a popup showing you possible properties you can edit (such as the marker name, marker description, rectangle color, etc.) appears. You can use it to change various properties of map markers or annotations.

If you want to turn the marker popup off, use Edit > Enable wiki marker popup.

### Conversion

To convert the map, use File > Publish to wiki or use the keybind Ctrl+Shift+U. It will prompt you to log in for the first time, and after every hour of using the editor. Follow the prompts to log in, and after publishing your change a popup allowing you to see your edits on the wiki will appear.

### Synchronization

Maps on the wiki may be edited by other editors. If a map on your local system is different from a map on the wiki, you will get a popup telling you that upon opening the map, allowing you to pull the changes from the wiki (but be careful, because you may overwrite your own changes). If you want to pull all changes from the wiki, use the File > Pull from wiki menu and check the maps or map backgrounds that you want to pull.

## Development

If you're looking to develop this extension, you will preferably need Node.js to install the TypeScript types for Tiled, and a TypeScript extension in your IDE. To run TypeScript type checking on the entire repository, use `npm run typecheck`.

## License

Licensed under the MIT license. The file under `extensions/images/wiki.svg` is borrowed from [Wikipedia](https://en.wikipedia.org/wiki/File:Wiki_letter_w.svg) and licensed under GFDL and CC-BY-SA 3.0. The file under `extensions/images/discord.svg` is from [Discord's branding page](https://discord.com/branding), copyrighted by Discord.
