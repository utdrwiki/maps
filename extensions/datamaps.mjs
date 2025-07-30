import dataMapsFormat from './includes/format.mjs';
import publishToWiki from './includes/publish.mjs';

tiled.registerMapFormat('dataMaps', dataMapsFormat);
const action = tiled.registerAction('PublishToWiki', publishToWiki);
action.text = 'Publish to wiki';
action.icon = 'wiki.svg';
action.shortcut = 'Ctrl+Shift+U';
tiled.extendMenu('File', [
    {
        action: 'PublishToWiki'
    }
]);
