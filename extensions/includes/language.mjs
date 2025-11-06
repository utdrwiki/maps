import { getLastLanguage, storeLastLanguage } from './session.mjs';
import { getStringProperty } from './util.mjs';

/**
 * Gets all wiki language codes for the current Tiled project.
 * @returns {string[]} Available wiki language codes
 */
function getLanguageCodes() {
    const languagesStr = getStringProperty(tiled.project, 'languages') || 'en';
    return languagesStr.split(',').map(lang => lang.trim());
}

export function getLanguageNames() {
    return getLanguageCodes().map(code => Qt.locale(code).nativeLanguageName);
}

/**
 * Gets the index in the list of languages selected by default.
 * @returns {number} Language index selected by default
 */
export function getDefaultLanguageIndex() {
    const lastLanguage = getLastLanguage();
    if (!lastLanguage) {
        return 0;
    }
    const languages = getLanguageCodes();
    const languageIndex = languages.indexOf(lastLanguage);
    if (languageIndex === -1) {
        return 0;
    }
    return languageIndex;
}

/**
 * Finds the language at a specified index and saves it as the last used
 * language.
 * @param {number} index Selected index in the list
 * @returns {string} Language code that was selected
 */
export function selectLanguage(index) {
    const language = getLanguageCodes()[index];
    if (language) {
        storeLastLanguage(language);
        return language;
    }
    return 'en';
}
