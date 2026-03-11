import { appEnv } from '@/lib/env';

type TmdbRequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
  cacheTtlMs?: number;
  skipCache?: boolean;
};

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map<string, { expiresAt: number; promise: Promise<unknown> }>();

function buildTmdbUrl(path: string, query: TmdbRequestOptions['query'] = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${appEnv.tmdbBaseUrl}${normalizedPath}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  if (appEnv.tmdbApiKey) {
    url.searchParams.set('api_key', appEnv.tmdbApiKey);
  }

  return url.toString();
}

export function getTmdbImageUrl(path: string, size = 'w780') {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${appEnv.tmdbImageBaseUrl}/${size}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function tmdbFetch<T>(path: string, options: TmdbRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (appEnv.tmdbReadAccessToken) {
    headers.set('Authorization', `Bearer ${appEnv.tmdbReadAccessToken}`);
  }

  const requestUrl = buildTmdbUrl(path, options.query);
  const method = options.method?.toUpperCase() ?? 'GET';
  const canCache = !options.skipCache && method === 'GET' && !options.body;
  const cacheKey = `${method}:${requestUrl}`;
  const now = Date.now();

  if (canCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.promise as Promise<T>;
    }
  }

  const promise = fetch(requestUrl, {
    ...options,
    headers,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`TMDB request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  });

  if (canCache) {
    responseCache.set(cacheKey, {
      expiresAt: now + (options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS),
      promise,
    });
  }

  try {
    return await promise;
  } catch (error) {
    if (canCache) {
      responseCache.delete(cacheKey);
    }
    throw error;
  }
}
