import { getBoolProperty, getStringProperty } from './util.mjs';

/**
 * 
 * @param {MapObject} object Map object whose property to change
 * @param {string} name Property name
 * @param {TiledObjectPropertyValue} value Property value
 * @param {string} language Current language
 */
function setProperty(object, name, value, language) {
    if (!value) {
        // If a text field is empty or a checkbox is unchecked, no need to set
        // the property.
        return;
    }
    if (name === 'name' && language === 'en') {
        object.name = String(value);
        return;
    }
    const propertyName = language === 'en' ? name : `${language}_${name}`;
    if (language !== 'en' && object.property(name) === value) {
        // If the English value is the same as the localized value, no need to
        // set it because it will be inherited.
        return;
    }
    object.setProperty(propertyName, value);
}

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
    const fillInput = dialog.addColorButton('Fill color:');
    dialog.addNewRow();
    const borderInput = dialog.addColorButton('Border color:');
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
            nameEn.visible = language !== 'en';
            fillInput.visible = isEn;
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
    const colorInput = dialog.addColorButton('Color:');
    dialog.addNewRow();
    const thicknessInput = dialog.addNumberInput('Thickness:');
    dialog.addNewRow();
    return {
        updateLanguage: language => {
            const name = getStringProperty(object, 'name', language) || object.name;
            const color = object.property('color');
            const thickness = object.property('thickness');
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
            nameEn.visible = language !== 'en';
            colorInput.visible = isEn;
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

/**
 * Called when the currently selected objects on the map change.
 * @param {MapObject[]} objects Currently selected map objects
 */
export default function selectedObjectsChanged(objects) {
    if (objects.length !== 1) {
        return;
    }
    const object = objects[0];
    const handlerFunc = handlers[object.shape];
    tiled.log(JSON.stringify(handlerFunc));
    if (typeof handlerFunc !== 'function') {
        tiled.alert('This object cannot be converted to DataMaps on the wiki!');
        return;
    }
    const languagesStr = getStringProperty(tiled.project, 'languages') || 'en';
    const languages = languagesStr.split(',').map(lang => lang.trim());
    const dialog = new Dialog('Editing map marker');
    dialog.minimumWidth = 600;
    const languageSelect = dialog.addComboBox('Wiki language:', languages);
    languageSelect.visible = languages.length > 1;
    dialog.addNewRow();
    const handler = handlerFunc(object, dialog);
    languageSelect.currentIndexChanged.connect(index => {
        handler.updateLanguage(languages[index]);
    });
    dialog.addButton('OK').clicked.connect(() => {
        handler.performChanges(languages[languageSelect.currentIndex]);
        dialog.done(Dialog.Accepted);
    });
    dialog.addButton('Cancel').clicked.connect(() => {
        dialog.done(Dialog.Rejected);
    });
    handler.updateLanguage(languages[languageSelect.currentIndex]);
    dialog.show();
}
