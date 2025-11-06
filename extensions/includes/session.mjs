const ACCESS_TOKEN_PROPERTY = 'wikiAccessToken';
const LAST_LANGUAGE_PROPERTY = 'wikiLastLanguage';

/**
 * Retrieves the path to the Tiled session file.
 * @returns {string} Path to the Tiled session file
 */
function getSessionFilePath() {
    return tiled.projectFilePath.replace('.tiled-project', '.tiled-session');
}

/**
 * Retrieves a property from the Tiled session file.
 * @param {string} name Name of the property to retrieve
 * @returns {any} Property value
 */
function getSessionProperty(name) {
    try {
        const sessionFile = new TextFile(getSessionFilePath(), TextFile.ReadOnly);
        const data = JSON.parse(sessionFile.readAll());
        sessionFile.close();
        return data[name];
    } catch (error) {
        return;
    }
}

/**
 * Writes a property to the Tiled session file.
 * @param {string} name Name of the property to store
 * @param {any} value Value of the property
 */
function setSessionProperty(name, value) {
    try {
        const sessionFile = new TextFile(getSessionFilePath(), TextFile.ReadWrite);
        const data = JSON.parse(sessionFile.readAll());
        data[name] = value;
        sessionFile.truncate();
        sessionFile.write(JSON.stringify(data, null, 4));
        sessionFile.commit();
    } catch (error) {
        tiled.log('Failed to write access token!');
    }
}

/**
 * Retrieves wiki access token from the Tiled session file.
 * @returns {string|undefined} Wiki access token, if found
 */
export function getStoredToken() {
    return getSessionProperty(ACCESS_TOKEN_PROPERTY);
}

/**
 * Writes wiki access token to the Tiled session file.
 * @param {string} token Wiki access token
 */
export function storeToken(token) {
    setSessionProperty(ACCESS_TOKEN_PROPERTY, token);
}

/**
 * Retrieves the last language used from the Tiled session file.
 * @returns {string|undefined} Last language used, if found
 */
export function getLastLanguage() {
    return getSessionProperty(LAST_LANGUAGE_PROPERTY);
}

/**
 * Writes the last language used to the Tiled session file.
 * @param {string} language Last language used
 */
export function storeLastLanguage(language) {
    setSessionProperty(LAST_LANGUAGE_PROPERTY, language);
}

