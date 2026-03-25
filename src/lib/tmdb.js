// TMDB client: shared request and image helpers for every movie, TV, and person feature.
// Why it exists: central caching and auth headers prevent each feature from rebuilding API logic.
// Connection: higher-level helpers in tmdb-movies.js and tmdb-search.js call into this module.
import { appEnv } from '@/lib/env';
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
// Lightweight in-memory cache to reduce repeat TMDB requests while users move around the app.
const responseCache = new Map();
function buildTmdbUrl(path, query = {}) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${appEnv.apiBaseUrl}/api/tmdb${normalizedPath}`);
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });
    return url.toString();
}
export function getTmdbImageUrl(path, size = 'w342') {
    if (!path)
        return '';
    if (path.startsWith('http'))
        return path;
    return `${appEnv.tmdbImageBaseUrl}/${size}${path.startsWith('/') ? path : `/${path}`}`;
}
export async function tmdbFetch(path, options = {}) {
    const headers = new Headers(options.headers);
    const requestUrl = buildTmdbUrl(path, options.query);
    const method = options.method?.toUpperCase() ?? 'GET';
    const canCache = !options.skipCache && method === 'GET' && !options.body;
    const cacheKey = `${method}:${requestUrl}`;
    const now = Date.now();
    if (canCache) {
        const cached = responseCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached.promise;
        }
    }
    const promise = fetch(requestUrl, {
        ...options,
        headers,
    }).then(async (response) => {
        if (!response.ok) {
            throw new Error(`TMDB request failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    });
    if (canCache) {
        responseCache.set(cacheKey, {
            expiresAt: now + (options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS),
            promise,
        });
    }
    try {
        return await promise;
    }
    catch (error) {
        if (canCache) {
            responseCache.delete(cacheKey);
        }
        throw error;
    }
}
