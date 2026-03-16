/**
 * Retrieves a custom property from a Tiled object.
 * @param {TiledObject} object Object to retrieve custom properties from
 * @param {string} property Custom property to retrieve
 * @param {string} language Current language in use
 * @returns {TiledObjectPropertyValue} Property value, if found
 */
export function getProperty(object, property, language = 'en') {
    const englishProperty = object.property(property);
    const localizedProperty = object.property(`${language}_${property}`);
    return localizedProperty || englishProperty;
}

/**
 * Retrieves a custom property from a Tiled object as a number.
 * @param {TiledObject} object Object to retrieve custom properties from
 * @param {string} property Custom property to retrieve
 * @param {string} language Current language in use
 * @returns {number|undefined} Property value, if found as a number
 */
export function getNumberProperty(object, property, language = 'en') {
    const value = getProperty(object, property, language);
    return typeof value === 'number' ? value : undefined;
}

/**
 * Retrieves a custom property from a Tiled object as a string.
 * @param {TiledObject} object Object to retrieve custom properties from
 * @param {string} property Custom property to retrieve
 * @param {string} language Current language in use
 * @returns {string|undefined} Property value, if found as a string
 */
export function getStringProperty(object, property, language = 'en') {
    const value = getProperty(object, property, language);
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Retrieves a custom property from a Tiled object as a boolean.
 * @param {TiledObject} object Object to retrieve custom properties from
 * @param {string} property Custom property to retrieve
 * @param {string} language Current language in use
 * @returns {boolean|undefined} Property value, if found as a boolean
 */
export function getBoolProperty(object, property, language = 'en') {
    const value = getProperty(object, property, language);
    return typeof value === 'boolean' ? value : undefined;
}

/**
 * Retrieves a custom property from a Tiled object as a color.
 * @param {TiledObject} object Object to retrieve custom properties from
 * @param {string} property Custom property to retrieve
 * @param {string} language Current language in use
 * @param {'rgba'|'rgb'} format Color format to return, either 'rgba' or 'rgb'
 * @returns {Color|undefined} Property value, if found as a string
 */
export function getColorProperty(
    object, property, format = 'rgba', language = 'en'
) {
    const colorStr = String(getProperty(object, property, language));
    if (!colorStr.startsWith('#')) {
        return undefined;
    }
    let r, g, b, a;
    if (colorStr.length === 7) {
        r = parseInt(colorStr.slice(1, 3), 16);
        g = parseInt(colorStr.slice(3, 5), 16);
        b = parseInt(colorStr.slice(5, 7), 16);
        a = 255;
    } else if (colorStr.length === 9) {
        r = parseInt(colorStr.slice(1, 3), 16);
        g = parseInt(colorStr.slice(3, 5), 16);
        b = parseInt(colorStr.slice(5, 7), 16);
        a = parseInt(colorStr.slice(7, 9), 16);
    } else {
        return undefined;
    }
    if (format === 'rgb') {
        return [r, g, b];
    }
    return [r, g, b, a / 255];
}

/**
 * Retrieves a custom property from a Tiled object as a list of strings.
 * @param {TiledObject} object Object to retrieve custom properties from
 * @param {string} property Custom property to retrieve
 * @param {string} language Current language in use
 * @returns {string[]|undefined} Property value's trimmed non-empty lines, if
 * found as a string
 */
export function getListProperty(object, property, language = 'en') {
    const value = getProperty(object, property, language);
    return typeof value === 'string' ?
        value.split('\n').map(line => line.trim()).filter(Boolean) :
        undefined;
}

/**
 * Sets a property of a Tiled object.
 * @param {TiledObject} object Map object whose property to change
 * @param {string} name Property name
 * @param {TiledObjectPropertyValue} value Property value
 * @param {string} language Current language
 */
export function setProperty(object, name, value, language) {
    if (!value) {
        // If a text field is empty or a checkbox is unchecked, no need to set
        // the property.
        return;
    }
    const hasNameProperty = name === 'name' && !('isTileMap' in object);
    const enValue = hasNameProperty ?
        (/** @type {MapObject} */ (object)).name :
        object.property(name);
    if (hasNameProperty && language === 'en') {
        if (enValue !== value) {
            (/** @type {MapObject} */ (object)).name = String(value);
        }
        return;
    }
    const propertyName = language === 'en' ? name : `${language}_${name}`;
    if (enValue === value) {
        // If the value is unchanged, or the English value is the same as the
        // localized value, no need to set it because it will be inherited.
        return;
    }
    object.setProperty(propertyName, value);
}

/**
 * Adds two Tiled points.
 * @param {point} a First point
 * @param {point} b Second point
 */
export function addPoints(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
    };
}

/**
 * Retrieves the wiki URL from the project properties.
 * @param {string} language Language code for the wiki
 * @returns Wiki URL
 */
export function getWikiUrl(language = 'en') {
    const enWikiUrl = getStringProperty(tiled.project, 'wiki');
    const langWikiUrl = getStringProperty(tiled.project, 'languageWiki');
    if (!enWikiUrl || !langWikiUrl) {
        throw new Error('Wiki URLs not set in project properties!');
    }
    if (language !== 'en') {
        return `https://${langWikiUrl.replace('$1', language)}`;
    }
    return `https://${enWikiUrl}`;
}

/**
 * Adds data to the resolved value of a promise.
 * @template T
 * @template {unknown[]} D
 * @param {Promise<T>} promise Promise to add data to
 * @param  {D} data Data to add to the resolved value
 * @returns {Promise<[T, ...D]>} Promise resolving to an array of the original
 * resolved value and the added data
 */
export function addToPromise(promise, ...data) {
    return promise.then(result => [result, ...data]);
}

/**
 * Opens a URL in the user's default web browser.
 * @param {string} url URL to open
 */
export function openUrl(url) {
    const process = new Process();
    let successful = false;
    switch (tiled.platform) {
        case 'windows':
            successful = process.start('cmd.exe', [
                '/c',
                'start',
                '',
                url.replace(/&/g, '^&')
            ]);
            break;
        case 'macos':
            successful = process.start('open', [url]);
            break;
        case 'linux':
            successful = process.start('xdg-open', [url]);
            break;
        default:
            successful = false;
            return;
    }
    if (!successful) {
        tiled.alert(`Failed to open URL in browser. Please copy and paste this URL directly into your browser:

${url}

If that does not work for you, you can also copy the URL from the console instead.`);
        tiled.log(url);
    }
}

/**
 * Checks whether the background is an image background.
 * @param {Background} bg Background to check
 * @returns {bg is ImageBackground} Whether the background is an image background
 */
export function isImageBackground(bg) {
    return 'image' in bg && typeof bg.image === 'string';
}

/**
 * Checks whether the overlay is a box overlay.
 * @param {Overlay} overlay Overlay to check
 * @returns {overlay is BoxOverlay} Whether the overlay is a box overlay
 */
export function isBoxOverlay(overlay) {
    return 'at' in overlay &&
        Array.isArray(overlay.at) &&
        overlay.at.length === 2 &&
        Array.isArray(overlay.at[0]) &&
        Array.isArray(overlay.at[1]) &&
        overlay.at[0].length === 2 &&
        overlay.at[1].length === 2;
}

/**
 * Checks whether the overlay is a polyline overlay.
 * @param {Overlay} overlay Overlay to check
 * @returns {overlay is PolylineOverlay} Whether the overlay is a polyline overlay
 */
export function isPolylineOverlay(overlay) {
    return 'path' in overlay &&
        Array.isArray(overlay.path) &&
        overlay.path.every(point =>
            Array.isArray(point) &&
            point.length === 2 &&
            typeof point[0] === 'number' &&
            typeof point[1] === 'number'
        );
}

/**
 * Validates a point object and returns it as an [x, y] array.
 * @param {Point|undefined} point Point to validate
 * @returns {[number, number]} Validated point as [x, y]
 * @throws {Error} If the point is invalid
 */
export function validateTiledPoint(point) {
    if (!point) {
        throw new Error('Not a valid point');
    }
    if ('x' in point && 'y' in point && typeof point.x === 'number' && typeof point.y === 'number') {
        return [point.x, point.y];
    }
    if (Array.isArray(point) && point.length === 2 && typeof point[0] === 'number' && typeof point[1] === 'number') {
        return point;
    }
    throw new Error('Not a valid point');
}

/**
 * Validates a rectangle object and returns it as [[x1, y1], [x2, y2]].
 * @param {Rectangle|undefined} rectangle Rectangle to validate
 * @returns {[[number, number], [number, number]]} Validated rectangle
 * @throws {Error} If the rectangle is invalid
 */
export function validateTiledRectangle(rectangle) {
    if (!rectangle) {
        throw new Error('Not a valid rectangle');
    }
    return [validateTiledPoint(rectangle[0]), validateTiledPoint(rectangle[1])];
}

/**
 * Validates a color as a RGBA color array.
 * @param {Color|undefined} color Color to validate
 * @returns {color} Validated RGBA color
 */
export function getTiledColor(color) {
    if (!Array.isArray(color)) {
        throw new Error('Not a valid color');
    }
    const [r, g, b] = color;
    if (
        typeof r !== 'number' || r < 0 || r > 255 ||
        typeof g !== 'number' || g < 0 || g > 255 ||
        typeof b !== 'number' || b < 0 || b > 255
    ) {
        throw new Error('Not a valid RGBA color');
    }
    if (color.length === 4) {
        const a = color[3];
        if (typeof a !== 'number' || a < 0 || a > 1) {
            throw new Error('Not a valid RGBA color');
        }
        return tiled.color(r / 255, g / 255, b / 255, a);
    }
    return tiled.color(r / 255, g / 255, b / 255);
}
