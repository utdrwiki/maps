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
