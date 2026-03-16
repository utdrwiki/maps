import {
    getDefaultLanguageIndex,
    getLanguageNames,
    selectLanguage,
} from './include/language.mjs';
import {
    getBoolProperty,
    getStringProperty,
    setProperty,
} from './include/util.mjs';

/**
 * Creates a popup for point editing.
 * @param {MapObject} object Map object being edited by the popup
 * @param {Dialog} dialog Dialog to create for editing
 * @returns {MarkerPopupHandlerReturn}
 */
function pointPopupHandler(object, dialog) {
    const nameInput = dialog.addTextInput('Name:');
    const nameEn = dialog.addLabel(object.name);
    dialog.addNewRow();
    const descriptionInput = dialog.addTextEdit('Description:');
    const descriptionEn = dialog.addTextEdit(undefined);
    descriptionEn.readOnly = true;
    descriptionEn.plainText = getStringProperty(object, 'description') || '';
    dialog.addNewRow();
    const pageInput = dialog.addTextInput('Page:');
    const pageEn = dialog.addLabel(getStringProperty(object, 'page') || '');
    dialog.addNewRow();
    const imageInput = dialog.addTextInput('Image:');
    const imageEn = dialog.addLabel(getStringProperty(object, 'image') || '');
    dialog.addNewRow();
    const multilineInput = dialog.addCheckBox('Line breaks render verbatim instead of like in wikitext (enable this for multi-line signs)', false);
    dialog.addNewRow();
    return {
        updateLanguage: language => {
            const name = getStringProperty(object, 'name', language) || object.name;
            const description = getStringProperty(object, 'description', language);
            const page = getStringProperty(object, 'page', language);
            const multiline = getBoolProperty(object, 'multiline', language);
            const image = getStringProperty(object, 'image', language);
            if (name) {
                nameInput.text = name;
            }
            if (description) {
                descriptionInput.plainText = description;
            }
            if (page) {
                pageInput.text = page;
            }
            if (multiline) {
                multilineInput.checked = multiline;
            }
            if (image) {
                imageInput.text = image;
            }
            const isNotEn = language !== 'en';
            nameEn.visible = isNotEn;
            descriptionEn.visible = isNotEn;
            pageEn.visible = isNotEn;
            imageEn.visible = isNotEn;
        },
        performChanges: language => {
            setProperty(object, 'name', nameInput.text, language);
            setProperty(object, 'description', descriptionInput.plainText, language);
            setProperty(object, 'page', pageInput.text, language);
            setProperty(object, 'multiline', multilineInput.checked, language);
            setProperty(object, 'image', imageInput.text, language);
        },
    }
}

/**
 * Creates a popup for rectangle editing.
 * @param {MapObject} object Map object being edited by the popup
 * @param {Dialog} dialog Dialog to create for editing
 * @returns {MarkerPopupHandlerReturn}
 */
function rectanglePopupHandler(object, dialog) {
    const nameInput = dialog.addTextInput('Name:');
    const nameEn = dialog.addLabel(object.name);
    dialog.addNewRow();
    const fillLabel = dialog.addLabel('Fill color:');
    const fillInput = dialog.addColorButton();
    dialog.addNewRow();
    const borderLabel = dialog.addLabel('Border color:');
    const borderInput = dialog.addColorButton();
    dialog.addNewRow();
    return {
        updateLanguage: language => {
            const name = getStringProperty(object, 'name', language) || object.name;
            const fill = object.property('fill');
            const border = object.property('border');
            if (name) {
                nameInput.text = name;
            }
            if (fill) {
                fillInput.color = fill;
            }
            if (border) {
                borderInput.color = border;
            }
            const isEn = language === 'en';
            nameEn.visible = !isEn;
            fillLabel.visible = isEn;
            fillInput.visible = isEn;
            borderLabel.visible = isEn;
            borderInput.visible = isEn;
        },
        performChanges: language => {
            setProperty(object, 'name', nameInput.text, language);
            setProperty(object, 'fill', fillInput.color, language);
            setProperty(object, 'border', borderInput.color, language);
        },
    }
}

/**
 * Creates a popup for polygon editing.
 * @param {MapObject} object Map object being edited by the popup
 * @param {Dialog} dialog Dialog to create for editing
 * @returns {MarkerPopupHandlerReturn}
 */
function polygonPopupHandler(object, dialog) {
    const nameInput = dialog.addTextInput('Name:');
    const nameEn = dialog.addLabel(object.name);
    dialog.addNewRow();
    const colorLabel = dialog.addLabel('Color:');
    const colorInput = dialog.addColorButton();
    dialog.addNewRow();
    const thicknessLabel = dialog.addLabel('Thickness:');
    const thicknessInput = dialog.addNumberInput('');
    dialog.addNewRow();
    return {
        updateLanguage: language => {
            const name = getStringProperty(object, 'name', language) || object.name;
            const color = object.property('color');
            const thickness = object.property('thickness') || 3.0;
            if (name) {
                nameInput.text = name;
            }
            if (color) {
                colorInput.color = color;
            }
            if (typeof thickness === 'number') {
                thicknessInput.value = thickness;
            }
            const isEn = language === 'en';
            nameEn.visible = !isEn;
            colorLabel.visible = isEn;
            colorInput.visible = isEn;
            thicknessLabel.visible = isEn;
            thicknessInput.visible = isEn;
        },
        performChanges: language => {
            setProperty(object, 'name', nameInput.text, language);
            setProperty(object, 'color', colorInput.color, language);
            setProperty(object, 'thickness', thicknessInput.value, language);
        },
    }
}

const /** @type {Record<MapObjectShape, MarkerPopupHandler|undefined>} */ handlers = {
    [MapObject.Point]: pointPopupHandler,
    [MapObject.Rectangle]: rectanglePopupHandler,
    [MapObject.Polygon]: polygonPopupHandler,
    [MapObject.Polyline]: polygonPopupHandler,
    [MapObject.Ellipse]: undefined,
    [MapObject.Text]: undefined,
};

const enablePopup = tiled.registerAction('WikiMarkerPopup', () => {});
enablePopup.checkable = true;
enablePopup.checked = true;
enablePopup.icon = 'images/wiki.svg';
enablePopup.iconVisibleInMenu = false;
enablePopup.text = 'Enable wiki marker popup';
enablePopup.shortcut = 'Ctrl+Shift+M';

/**
 * Activates the popup markers on the currently open assets.
 * @param {Asset} asset Currently open asset
 */
function activatePopupMarkers(asset) {
    if (!asset.isTileMap) {
        return;
    }
    const tileMap = /** @type {TileMap} */ (asset);
    tileMap.selectedObjectsChanged.connect(() => {
        if (!enablePopup.checked || tileMap.selectedObjects.length !== 1) {
            return;
        }
        const object = tileMap.selectedObjects[0];
        const handlerFunc = handlers[object.shape];
        if (typeof handlerFunc !== 'function') {
            tiled.alert('This object cannot be converted to DataMaps on the wiki!');
            return;
        }
        const dialog = new Dialog('Editing map marker');
        dialog.minimumWidth = 600;
        const languageNames = getLanguageNames();
        const hasLanguages = languageNames.length > 1;
        const languageSelect = dialog.addComboBox(
            hasLanguages ? 'Wiki language:' : '',
            languageNames
        );
        languageSelect.currentIndex = getDefaultLanguageIndex();
        languageSelect.visible = hasLanguages;
        dialog.addNewRow();
        const handler = handlerFunc(object, dialog);
        languageSelect.currentIndexChanged.connect(index => {
            handler.updateLanguage(selectLanguage(index));
        });
        dialog.addButton('OK').clicked.connect(() => {
            handler.performChanges(selectLanguage(languageSelect.currentIndex));
            dialog.done(Dialog.Accepted);
        });
        dialog.addButton('Cancel').clicked.connect(() => {
            dialog.done(Dialog.Rejected);
        });
        handler.updateLanguage(selectLanguage(languageSelect.currentIndex));
        dialog.show();
    });
}

tiled.extendMenu('Edit', [
    {
        action: 'WikiMarkerPopup'
    }
]);

tiled.openAssets.forEach(activatePopupMarkers);
tiled.assetOpened.connect(activatePopupMarkers);
