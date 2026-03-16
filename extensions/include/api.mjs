import { InterwikiDataImpl, MetadataImpl } from './metadata.mjs';
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
 * @param {boolean} isArrayBuffer Whether the request expects a binary response
 * @returns {() => void} Ready state change handler
 */
const readyStateChange = (xhr, resolve, reject, isArrayBuffer = false) => () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
            try {
                if (isArrayBuffer) {
                    resolve(xhr.response);
                } else {
                    resolve(JSON.parse(xhr.responseText));
                }
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
 * @returns {Promise<any>} Resolves on edit completion
 */
export function edit(title, text, summary, accessToken, language = 'en') {
    return getCsrfToken(accessToken, language).then(token =>
        httpPost(getApiUrl(language), {
            action: 'edit',
            title,
            text,
            summary,
            format: 'json',
            formatversion: '2',
            token
        }, accessToken)
    ).then(response => {
        if (response.error) {
            throw new APIError(response.error);
        }
        return response.edit;
    });
}

/**
 * Retrieves maps from the wiki under specific criteria.
 * @param {object} options Options for retrieving maps
 * @param {string} language Wiki language
 * @returns {Promise<DataMap[]>} List of maps on the wiki
 */
function getMaps(options, language = 'en') {
    return httpGet(getApiUrl(language), Object.assign({
        action: 'query',
        prop: 'revisions',
        rvprop: 'ids|content',
        rvslots: 'main',
        format: 'json',
        formatversion: '2',
    }, options)).then(data => data.query.pages
        .filter((/** @type {any} */ page) =>
            page.revisions &&
            page.revisions.length > 0 &&
            page.revisions[0].slots &&
            page.revisions[0].slots.main &&
            page.revisions[0].slots.main.contentmodel === 'datamap'
        )
        .map((/** @type {any} */ page) => {
            const {slots, revid} = page.revisions[0];
            const /** @type {DataMap} */ datamap = JSON.parse(slots.main.content);
            datamap.custom = datamap.custom || new MetadataImpl();
            datamap.custom.interwiki = datamap.custom.interwiki || {};
            datamap.custom.interwiki[language] = new InterwikiDataImpl({
                mapName: page.title.split(':').slice(1).join(':'),
            });
            datamap.custom.interwiki[language].revision = revid;
            return datamap;
        })
        .filter((/** @type {DataMap} */ datamap) => !datamap.$fragment)
    );
}

/**
 * Retrieves all maps from the wiki.
 * @param {string} language Wiki language
 * @returns {Promise<DataMap[]>} List of maps on the wiki
 */
export function getAllMaps(language = 'en') {
    return getMaps({
        generator: 'allpages',
        gapnamespace: '2900',
        gapfilterredir: 'nonredirects',
        gaplimit: 'max',
    }, language);
}

/**
 * Retrieves a single map from the wiki.
 * @param {string} name Map name
 * @param {string} language Wiki language
 * @returns {Promise<DataMap>} Specified map from the wiki
 */
export function getMap(name, language = 'en') {
    return getMaps({
        titles: `Map:${name}`
    }, language).then(maps => maps[0]);
}

/**
 * Returns the URLs of the given map files on the wiki.
 * @param {string[]} filenames Map file names
 * @param {string} language Wiki language
 * @returns {Promise<string[]>} URLs of the given map files on the wiki
 */
export function getFileUrls(filenames, language = 'en') {
    return httpGet(getApiUrl(language), {
        action: 'query',
        titles: filenames.map(name => `File:${name}`).join('|'),
        prop: 'imageinfo',
        iiprop: 'url',
        format: 'json',
        formatversion: '2'
    }).then(data => filenames.map(filename => data.query.pages
        .find((/** @type {any} */ page) => page.title === `File:${
            data.query.normalized
                ?.find((/** @type {any} */ n) => n.from === filename)
                ?.to ||
            filename
        }`)
        ?.imageinfo[0].url)
        .filter(Boolean));
}

/**
 * Downloads a file from a URL and returns it as an ArrayBuffer.
 * @param {string} url URL to download the file from
 * @returns {Promise<ArrayBuffer>} Downloaded file data
 */
export function downloadFile(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onreadystatechange = readyStateChange(xhr, resolve, reject, true);
        xhr.setRequestHeader('User-Agent', USER_AGENT);
        xhr.send();
    });
}
