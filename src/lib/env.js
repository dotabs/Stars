const DEFAULT_TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DEFAULT_TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
function normalizeTmdbCredentials(apiKey, readAccessToken) {
    const normalizedApiKey = apiKey?.trim() || '';
    const normalizedReadAccessToken = readAccessToken?.trim() || '';
    // Accept either TMDB format even if pasted into the wrong env var.
    if (normalizedApiKey.startsWith('eyJ') && !normalizedReadAccessToken) {
        return {
            tmdbApiKey: '',
            tmdbReadAccessToken: normalizedApiKey,
        };
    }
    return {
        tmdbApiKey: normalizedApiKey,
        tmdbReadAccessToken: normalizedReadAccessToken,
    };
}
function normalizeBasePath(value) {
    if (!value || value === '/')
        return '/';
    const trimmed = value.trim();
    if (!trimmed)
        return '/';
    const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}
const tmdbCredentials = normalizeTmdbCredentials(import.meta.env.VITE_TMDB_API_KEY, import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN);
export const appEnv = {
    appName: import.meta.env.VITE_APP_NAME?.trim() || 'STARS',
    routerMode: import.meta.env.VITE_ROUTER_MODE === 'hash' ? 'hash' : 'browser',
    basePath: normalizeBasePath(import.meta.env.VITE_BASE_PATH),
    tmdbApiKey: tmdbCredentials.tmdbApiKey,
    tmdbReadAccessToken: tmdbCredentials.tmdbReadAccessToken,
    tmdbBaseUrl: import.meta.env.VITE_TMDB_BASE_URL?.trim() || DEFAULT_TMDB_BASE_URL,
    tmdbImageBaseUrl: import.meta.env.VITE_TMDB_IMAGE_BASE_URL?.trim() || DEFAULT_TMDB_IMAGE_BASE_URL,
    firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() || '',
    firebaseAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || '',
    firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || '',
    firebaseStorageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || '',
    firebaseMessagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
    firebaseAppId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() || '',
};
export const hasTmdbCredentials = Boolean(appEnv.tmdbApiKey || appEnv.tmdbReadAccessToken);
export const hasFirebaseConfig = Boolean(appEnv.firebaseApiKey && appEnv.firebaseAuthDomain && appEnv.firebaseProjectId && appEnv.firebaseAppId);
export const hasFirebaseStorageConfig = Boolean(hasFirebaseConfig && appEnv.firebaseStorageBucket);
