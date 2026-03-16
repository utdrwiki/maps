import { getRestUrl, httpPost } from './api.mjs';
import { getStringProperty } from './util.mjs';

/**
 * Generates a code challenge.
 *
 * This is the most insecure thing ever, but the Tiled environment doesn't
 * exactly give us a lot of options for cryptography.
 */
export function generateCodeChallenge() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    return Base64
        .encode(Array(43)
            .fill('')
            .map(() => characters
                .charAt(Math.floor(Math.random() * characters.length)))
            .join(''))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Generates an OAuth autorization URL for the wiki.
 * @param {string} codeChallenge Code challenge for OAuth
 * @param {string} language Wiki's language
 * @returns {string} OAuth URL to redirect the user for login
 */
export function generateOAuthUrl(codeChallenge, language = 'en') {
    const clientId = getStringProperty(tiled.project, 'oauthClientId');
    if (!clientId) {
        throw new Error('OAuth client ID not set in project properties!');
    }
    return `${getRestUrl(language)}/oauth2/authorize?${new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        code_challenge: codeChallenge,
        code_challenge_method: 'plain'
    })}`;
}

/**
 * Retrieves an access token from a OAuth2 authorization code.
 * @param {string} code OAuth2 authorization code
 * @param {string} codeVerifier PKCE code verifier (same as code challenge)
 * @param {string} language Wiki language
 * @returns {Promise<string>} Access token for the wiki
 */
export function getAccessToken(code, codeVerifier, language = 'en') {
    const clientId = getStringProperty(tiled.project, 'oauthClientId');
    if (!clientId) {
        throw new Error('OAuth client ID not set in project properties!');
    }
    return httpPost(`${getRestUrl(language)}/oauth2/access_token`, {
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        client_id: clientId,
        code_challenge_method: 'plain'
    }).then(({access_token}) => access_token);
}
