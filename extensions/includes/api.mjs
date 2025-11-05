import { getStringProperty, getWikiUrl } from './util.mjs';

const USER_AGENT = `tiled-datamaps/1.0 (https://github.com/utdrwiki/maps; admin@undertale.wiki) tiled/${tiled.version}`;

/**
 * Retrieves the URL to the wiki's Action API from project properties.
 * @param {string} language Language code for the wiki
 * @returns URL to the wiki's Action API
 */
export function getApiUrl(language = 'en') {
    const scriptPath = getStringProperty(tiled.project, 'scriptPath') || '/';
    return `${getWikiUrl(language)}${scriptPath}api.php`;
}

/**
 * Retrieves the URL to the wiki's REST API from project properties.
 * @param {string} language Language code for the wiki
 * @returns URL to the wiki's Action API
 */
export function getRestUrl(language = 'en') {
    const scriptPath = getStringProperty(tiled.project, 'scriptPath') || '/';
    return `${getWikiUrl(language)}${scriptPath}rest.php`;
}

/**
 * Generates a ready state change handler for a given XMLHttpRequest.
 * @param {XMLHttpRequest} xhr Associated XMLHttpRequest
 * @param {(value: any|PromiseLike<any>) => void} resolve Promise
 * resolution function
 * @param {(reason: any?) => void} reject Promise rejection function
 * @returns {() => void} Ready state change handler
 */
const readyStateChange = (xhr, resolve, reject) => () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
            try {
                resolve(JSON.parse(xhr.responseText));
            } catch (error) {
                reject(new Error(`Failed to parse response: ${xhr.responseText}`));
            }
        } else {
            reject(new Error(`Request failed with ${xhr.status}: ${xhr.responseText}`));
        }
    }
};

/**
 * Send a GET request with query string parameters.
 * @param {string} baseUrl API URL
 * @param {Record<string, string>} params Request parameters
 * @param {string?} accessToken Optional access token for authorization
 * @returns {Promise<any>} Parsed JSON response
 */
export function httpGet(baseUrl, params = {}, accessToken = null) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${baseUrl}?${new URLSearchParams(params)}`, true);
        if (accessToken) {
            xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        }
        xhr.onreadystatechange = readyStateChange(xhr, resolve, reject);
        xhr.setRequestHeader('User-Agent', USER_AGENT);
        xhr.send();
    });
}

/**
 * Send a POST request with application/x-www-form-urlencoded body.
 * @param {string} baseUrl API URL
 * @param {Record<string, string>} params Request parameters
 * @param {string?} accessToken Optional access token for authorization
 * @returns {Promise<any>} Parsed JSON response
 */
export function httpPost(baseUrl, params = {}, accessToken = null) {
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', baseUrl, true);
        if (accessToken) {
            xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        }
        xhr.onreadystatechange = readyStateChange(xhr, resolve, reject);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.setRequestHeader('User-Agent', USER_AGENT);
        xhr.send(new URLSearchParams(params).toString());
    });
}

/**
 * Validates an access token and returns the currently logged in user's
 * username.
 * @param {string} accessToken Access token for the current user
 * @param {string} language Wiki language
 * @returns {Promise<string|null>} Currently logged in user's username
 */
export function getLoggedInUser(accessToken, language = 'en') {
    return httpGet(
        `${getRestUrl(language)}/oauth2/resource/profile`,
        {},
        accessToken
    ).then(({username}) => username).catch(() => null);
}

/**
 * Retrieves a CSRF token for the current user.
 * @param {string} accessToken Access token for the wiki
 * @param {string} language Wiki language
 * @returns {Promise<string>} CSRF token for the current user
 */
function getCsrfToken(accessToken, language = 'en') {
    return httpGet(getApiUrl(language), {
        action: 'query',
        meta: 'tokens',
        type: 'csrf',
        format: 'json'
    }, accessToken).then(data => data.query.tokens.csrftoken);
}

/**
 * Custom error class for errors returned from the MediaWiki API.
 */
export class APIError extends Error {
    /**
     * Constructs an error object from the MediaWiki API error response.
     * @param {object} error Error object from the MediaWiki API
     * @param {string} error.code Error code
     * @param {string} error.info Error information
     */
    constructor(error) {
        super(`API error: ${error.info}`);
        this.name = 'APIError';
        this.code = error.code;
        this.info = error.info;
    }
}

/**
 * Edits a wiki page.
 * @param {string} title Wiki page title
 * @param {string} text Wiki page content
 * @param {string} summary Summary to use when editing the page
 * @param {string} accessToken Access token for the wiki
 * @param {string} language Wiki language
 * @returns {Promise<void>} Resolves on edit completion
 */
export function edit(title, text, summary, accessToken, language = 'en') {
    return getCsrfToken(accessToken, language).then(token =>
        httpPost(getApiUrl(language), {
            action: 'edit',
            title,
            text,
            summary,
            format: 'json',
            token
        }, accessToken).then(response => {
            if (response.error) {
                throw new APIError(response.error);
            }
            return response;
        })
    );
}
