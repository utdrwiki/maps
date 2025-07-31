import { edit, getLoggedInUser } from "./api.mjs";
import { generateCodeChallenge, generateOAuthUrl, getAccessToken, getStoredToken, storeToken } from "./auth.mjs";
import { convertMap } from "./format.mjs";
import { getStringProperty } from "./util.mjs";

/**
 * Opens a URL in the user's default web browser.
 * @param {string} url URL to open
 */
function openUrl(url) {
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

${url}.

If that does not work for you, you can also copy the URL from the console instead.`);
        tiled.log(url);
    }
}

/**
 * Displays a dialog for picking the language of the wiki to publish to, and the
 * edit summary to use.
 * @returns {Promise<[string, string]>} Selected language code
 */
function getEditInfo() {
    const languagesStr = getStringProperty(tiled.project, 'languages') || 'en';
    const languages = languagesStr.split(',').map(lang => lang.trim());
    const dialog = new Dialog('Publishing map to the wiki');
    dialog.minimumWidth = 600;
    const languageSelect = dialog.addComboBox('Wiki language:', languages);
    dialog.addNewRow();
    const summary = dialog.addTextInput('Edit summary:', 'Published with Tiled DataMaps extension');
    dialog.addNewRow();
    return new Promise((resolve, reject) => {
        dialog.addButton('OK').clicked.connect(() => {
            resolve([languages[languageSelect.currentIndex], summary.text]);
            dialog.done(Dialog.Accepted);
        });
        dialog.addButton('Cancel').clicked.connect(() => {
            reject(true);
            dialog.done(Dialog.Rejected);
        });
        dialog.show();
    });
}

/**
 * Interactively retrieves the user's access token.
 * @param {string} language Wiki language
 * @returns {Promise<string>} Access token if login is successful
 */
function performLogin(language) {
    const codeChallenge = generateCodeChallenge();
    openUrl(generateOAuthUrl(codeChallenge, language));
    const code = tiled.prompt('Follow the authorization flow on the web page that just opened, then paste the code you received here:');
    if (!code) {
        return Promise.reject(true);
    }
    try {
        return getAccessToken(code, codeChallenge, language).then(token => {
            storeToken(token);
            return token;
        });
    } catch (error) {
        tiled.alert('Failed to retrieve access token! Have you copied the code correctly?');
        return Promise.reject(true);
    }
}

/**
 * Gets the user's access token from storage, or performs login if not available
 * or invalid.
 * @param {string} language Wiki language
 * @returns {Promise<string>} Access token for the user
 */
function getToken(language) {
    const accessToken = getStoredToken();
    if (accessToken) {
        return getLoggedInUser(accessToken, language).then(currentUser => {
            if (currentUser) {
                tiled.log(`Logged in as ${currentUser}.`);
                return accessToken;
            } else {
                tiled.log('Access token invalid, initiating login again.');
                return performLogin(language);
            }
        });
    }
    tiled.log('No access token found, initiating login.');
    return Promise.resolve(performLogin(language));
}

/**
 * Publishes the map to the wiki.
 * @param {string} accessToken User's access token
 * @param {string} summary Edit summary
 * @param {TileMap} map Current map being published
 * @param {string} language Wiki language
 * @returns {Promise<void>} Response after publishing the map
 */
function publishMap(accessToken, summary, map, language) {
    const mapName = FileInfo.completeBaseName(FileInfo.fileName(map.fileName));
    const datamap = convertMap(map, mapName, language);
    return edit(
        `Map:${datamap.custom?.mapName}`,
        JSON.stringify(datamap),
        summary,
        accessToken,
        language
    );
}

/**
 * Publishes the current map to the wiki.
 */
export default function run() {
    if (!tiled.activeAsset || !tiled.activeAsset.isTileMap) {
        tiled.alert('Please open the map you want to publish first.');
        return;
    }
    const /** @type {TileMap} */ map = tiled.activeAsset;
    getEditInfo()
        .then(([language, summary]) =>
            getToken(language).then(token => [language, summary, token]))
        .then(([language, summary, token]) =>
            publishMap(token, summary, map, language))
        .then(() => tiled.alert(`Map published successfully!`))
        .catch(error => {
            if (error === true) {
                // User cancelled the operation.
                return;
            }
            tiled.alert('Failed to publish! Please check the console for details.');
            tiled.log(`Error details: ${error.message || error}`)
        });
}
