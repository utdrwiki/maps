import { APIError, edit, getLoggedInUser } from './api.mjs';
import {
    generateCodeChallenge,
    generateOAuthUrl,
    getAccessToken
} from './auth.mjs';
import { convertTiledToDataMaps, mapIsDataMaps } from './format.mjs';
import { getDefaultLanguageIndex, getLanguageNames, selectLanguage } from './language.mjs';
import { getStoredToken, storeToken } from './session.mjs';
import { addToPromise, getWikiUrl, openUrl } from './util.mjs';

/**
 * Displays a dialog for picking the language of the wiki to publish to, and the
 * edit summary to use.
 * @param {boolean} languageVisible Whether the language selection should be
 * shown in the dialog
 * @returns {Promise<[string, string]>} Selected language code
 */
function getEditInfo(languageVisible) {
    const dialog = new Dialog('Publishing map to the wiki');
    dialog.minimumWidth = 600;
    const languageNames = getLanguageNames();
    const languageSelectText = languageNames.length > 1 ?
        languageVisible ?
            'Wiki language:' :
            'This map will be published to all language wikis that it has been translated to.' :
        '';
    const languageSelect = dialog.addComboBox(languageSelectText, languageNames);
    languageSelect.currentIndex = getDefaultLanguageIndex();
    languageSelect.visible = languageVisible && languageNames.length > 1;
    dialog.addNewRow();
    const summary = dialog.addTextInput('Edit summary:', 'Published with Tiled DataMaps extension');
    dialog.addNewRow();
    return new Promise((resolve, reject) => {
        dialog.addButton('OK').clicked.connect(() => {
            resolve([selectLanguage(languageSelect.currentIndex), summary.text]);
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
function getToken(language = 'en') {
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
 * @returns {Promise<any>} Response after publishing the map
 */
function publishMap(accessToken, summary, map, language) {
    const datamap = convertTiledToDataMaps(map, language);
    const interwiki = datamap.custom?.interwiki?.[language];
    if (!interwiki) {
        throw new Error('Map does not appear to be translated to the language of the wiki you selected!');
    }
    return edit(
        `Map:${interwiki.mapName}`,
        JSON.stringify(datamap),
        summary,
        accessToken,
        language
    );
}

/**
 * Handles successful publishing of the map to the wiki.
 * @param {any} response API response from editing
 * @param {string} language Current wiki language
 */
function handlePublishSuccess(response, language) {
    if (response.nochange) {
        tiled.alert('Map is already up to date, no changes made!');
    } else {
        const userConfirmed = tiled.confirm('Map published successfully! Do you want to view the changes?');
        if (userConfirmed) {
            openUrl(`${getWikiUrl(language)}/?diff=${response.newrevid}`);
        }
    }
}

/**
 * Handles successful publishing of the map to all language wikis.
 * @param {[any, string][]} responses API responses from editing the wikis
 */
function handlePublishSuccessMultiple(responses) {
    const nochange = responses.every(([response]) => response.nochange);
    if (nochange) {
        tiled.alert('All maps are already up to date, no changes made!');
    } else {
        const changedWikis = responses
            .filter(([response]) => !response.nochange);
        if (tiled.confirm(`Maps have been updated on the following wikis: ${changedWikis.map(r => r[1]).join(', ')}! Do you want to view all the changes?`)) {
            for (const [response, language] of changedWikis) {
                openUrl(`${getWikiUrl(language)}/?diff=${response.newrevid}`);
            }
        }
    }
}

/**
 * Handles errors that occur during publishing of the map to the wiki.
 * @param {any} error Error returned during publishing
 */
function handlePublishError(error) {
    if (error === true) {
        // User cancelled the operation.
        return;
    }
    if (error instanceof APIError) {
        if (error.code === 'datamap-validate-constraint-requiredfile') {
            const regex = /\[\S+ ([^\]]+)\]/g;
            const files = [];
            while (true) {
                const match = regex.exec(error.info);
                if (!match) {
                    break;
                }
                files.push(match[1]);
            }
            tiled.alert(`The following files are missing from the wiki: ${files.join(', ')}. Please upload them and try publishing again.`);
            return;
        }
        if (error.code === 'datamap-validate-constraint-groupexists') {
            tiled.alert(`${error.info}\n\nDid you forget to add the "include" property to the map? Click Map > Map Properties, then add a "include" custom property with the type string, and put "Map:Common Data" as the value. If the map fragment defining marker groups is called differently on your wiki, change "Common Data" to whatever it is called.`);
            return;
        }
        tiled.alert(`Failed to publish! API returned error: ${error.info} (code: ${error.code})`);
        return;
    }
    tiled.alert(`Failed to publish! ${error.message || error}`);
    if (error.stack) {
        tiled.log(`Error details: ${error.stack}`);
    }
}

const publishAction = tiled.registerAction('PublishToWiki', () => {
    if (!tiled.activeAsset || !tiled.activeAsset.isTileMap) {
        tiled.alert('Please open the map you want to publish first.');
        return;
    }
    const map = /** @type {TileMap} */ (tiled.activeAsset);
    if (!map.save()) {
        tiled.alert('Failed to save the current map! Please save it before publishing.');
        return;
    }
    if (mapIsDataMaps(map)) {
        const languages = Object.keys(convertTiledToDataMaps(map).custom?.interwiki || {});
        getEditInfo(false)
            .then(([_, summary]) => addToPromise(getToken(), summary))
            .then(([token, summary]) =>
                Promise.all(languages.map(lang => addToPromise(publishMap(token, summary, map, lang), lang))))
            .then(handlePublishSuccessMultiple)
            .catch(handlePublishError);
    } else {
        getEditInfo(true)
            .then(([language, summary]) =>
                addToPromise(getToken(language), language, summary))
            .then(([token, language, summary]) =>
                addToPromise(publishMap(token, summary, map, language), language))
            .then(([response, language]) => handlePublishSuccess(response, language))
            .catch(handlePublishError);
    }
});
publishAction.text = 'Publish to wiki';
publishAction.icon = 'wiki.svg';
publishAction.shortcut = 'Ctrl+Shift+U';

tiled.extendMenu('File', [
    {
        action: 'PublishToWiki',
        before: 'Close'
    }
]);
