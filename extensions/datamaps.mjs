import { DATAMAPS_SINGLE, DATAMAPS_MULTIPLE } from './includes/format.mjs';
import selectedObjectsChanged from './includes/popup.mjs';
import publishToWiki from './includes/publish.mjs';

tiled.registerMapFormat('dataMaps', DATAMAPS_MULTIPLE);
tiled.registerMapFormat('dataMap', DATAMAPS_SINGLE);
const publishAction = tiled.registerAction('PublishToWiki', publishToWiki);
publishAction.text = 'Publish to wiki';
publishAction.icon = 'wiki.svg';
publishAction.shortcut = 'Ctrl+Shift+U';
const enablePopup = tiled.registerAction('WikiMarkerPopup', () => {});
enablePopup.checkable = true;
enablePopup.checked = true;
enablePopup.iconVisibleInMenu = false;
enablePopup.text = 'Enable marker popup';
enablePopup.shortcut = 'Ctrl+Shift+M';
tiled.extendMenu('File', [
    {
        action: 'PublishToWiki'
    }
]);
tiled.extendMenu('Edit', [
    {
        action: 'WikiMarkerPopup'
    }
]);
tiled.assetOpened.connect(asset => {
    if (asset.isTileMap) {
        const tileMap = /** @type {TileMap} */ (asset);
        tileMap.selectedObjectsChanged.connect(() => {
            if (enablePopup.checked) {
                selectedObjectsChanged(tileMap.selectedObjects);
            }
        });
    }
})

export default {};
