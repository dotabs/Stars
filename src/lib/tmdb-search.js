import { hasTmdbCredentials } from '@/lib/env';
import { getTmdbImageUrl, tmdbFetch } from '@/lib/tmdb';
const DEFAULT_GLOBAL_SEARCH_LIMIT = 48;
const DEFAULT_GLOBAL_SEARCH_PAGES = 2;
const searchCache = new Map();
const tvDetailCache = new Map();
const personDetailCache = new Map();
const streamingLabelByProviderId = new Map([
    [8, 'Netflix'],
    [9, 'Amazon Prime'],
    [11, 'MUBI'],
    [15, 'Hulu'],
    [337, 'Disney+'],
    [350, 'Apple TV+'],
    [386, 'Peacock'],
    [531, 'Paramount+'],
    [1899, 'Max'],
]);
const providerUrlByProviderId = new Map([
    [2, 'https://tv.apple.com/'],
    [3, 'https://play.google.com/store/movies'],
    [8, 'https://www.netflix.com/'],
    [9, 'https://www.amazon.com/gp/video/storefront/'],
    [10, 'https://www.amazon.com/gp/video/storefront/'],
    [11, 'https://mubi.com/'],
    [15, 'https://www.hulu.com/'],
    [68, 'https://www.microsoft.com/en-us/store/movies-and-tv'],
    [78, 'https://www.amazon.com/gp/video/storefront/'],
    [97, 'https://www.crunchyroll.com/'],
    [188, 'https://www.youtube.com/feed/storefront'],
    [337, 'https://www.disneyplus.com/'],
    [350, 'https://tv.apple.com/'],
    [386, 'https://www.peacocktv.com/'],
    [389, 'https://www.vudu.com/'],
    [531, 'https://www.paramountplus.com/'],
    [614, 'https://www.max.com/'],
    [1920, 'https://www.hbomax.com/'],
]);
const streamingLabelAliases = {
    'amazon prime': 'Amazon Prime',
    'amazon prime video': 'Amazon Prime',
    'amazon video': 'Amazon Prime',
    'apple tv': 'Apple TV',
    'apple tv+': 'Apple TV+',
    'apple tv plus': 'Apple TV+',
    'disney+': 'Disney+',
    'disney plus': 'Disney+',
    'fandango at home': 'Fandango At Home',
    'google play movies': 'Google Play Movies',
    'hbo max': 'Max',
    hulu: 'Hulu',
    max: 'Max',
    'microsoft store': 'Microsoft Store',
    mubi: 'MUBI',
    netflix: 'Netflix',
    peacock: 'Peacock',
    'peacock premium': 'Peacock',
    'peacock premium plus': 'Peacock',
    'paramount+': 'Paramount+',
    'paramount plus': 'Paramount+',
    'vudu': 'Fandango At Home',
    'youtube': 'YouTube',
    'youtube movies': 'YouTube',
};
const providerUrlByLabel = {
    'Amazon Prime': 'https://www.amazon.com/gp/video/storefront/',
    'Apple TV': 'https://tv.apple.com/',
    'Apple TV+': 'https://tv.apple.com/',
    'Crunchyroll': 'https://www.crunchyroll.com/',
    'Disney+': 'https://www.disneyplus.com/',
    'Fandango At Home': 'https://www.vudu.com/',
    'Google Play Movies': 'https://play.google.com/store/movies',
    'Hulu': 'https://www.hulu.com/',
    'MUBI': 'https://mubi.com/',
    'Max': 'https://www.max.com/',
    'Microsoft Store': 'https://www.microsoft.com/en-us/store/movies-and-tv',
    'Netflix': 'https://www.netflix.com/',
    'Paramount+': 'https://www.paramountplus.com/',
    'Peacock': 'https://www.peacocktv.com/',
    'YouTube': 'https://www.youtube.com/feed/storefront',
};
const providerTitleUrlBuilderByLabel = {
    'Amazon Prime': (show) => `https://www.amazon.com/s?k=${encodeURIComponent(buildProviderQuery(show))}&i=instant-video`,
    'Apple TV': (show) => `https://tv.apple.com/search?term=${encodeURIComponent(buildProviderQuery(show))}`,
    'Apple TV+': (show) => `https://tv.apple.com/search?term=${encodeURIComponent(buildProviderQuery(show))}`,
    'Fandango At Home': (show) => `https://www.vudu.com/content/movies/search?searchString=${encodeURIComponent(buildProviderQuery(show))}`,
    'Microsoft Store': (show) => `https://www.microsoft.com/en-us/search/shop/movies?q=${encodeURIComponent(buildProviderQuery(show))}`,
    'YouTube': (show) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${buildProviderQuery(show)} series`)}`,
};
function getYearLabel(date) {
    const year = date?.slice(0, 4);
    return year && /^\d{4}$/.test(year) ? year : 'Date TBD';
}
function normalizeString(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function normalizeStreamingLabel(label) {
    const normalized = normalizeString(label).toLowerCase();
    return streamingLabelAliases[normalized] ?? normalizeString(label);
}
function getProviderDisplayName(provider) {
    return provider.provider_id !== undefined
        ? streamingLabelByProviderId.get(provider.provider_id) ?? normalizeStreamingLabel(provider.provider_name)
        : normalizeStreamingLabel(provider.provider_name);
}
function buildProviderQuery(show) {
    const title = normalizeString(show?.name || show?.title, 'series');
    const year = getYearLabel(show?.first_air_date);
    return year !== 'Date TBD' ? `${title} ${year}` : title;
}
function getProviderHomepage(provider) {
    if (provider?.provider_id !== undefined) {
        const directById = providerUrlByProviderId.get(Number(provider.provider_id));
        if (directById) {
            return directById;
        }
    }
    return providerUrlByLabel[getProviderDisplayName(provider)] ?? '';
}
function hasProviderQueryData(show) {
    return Boolean(normalizeString(show?.name || show?.title));
}
function getProviderDestination(provider, show, providerLink) {
    const providerName = getProviderDisplayName(provider);
    const exactBuilder = providerTitleUrlBuilderByLabel[providerName];
    if (exactBuilder && hasProviderQueryData(show)) {
        return { url: exactBuilder(show), urlType: 'title' };
    }
    const homepageUrl = getProviderHomepage(provider);
    if (homepageUrl) {
        return { url: homepageUrl, urlType: 'homepage' };
    }
    if (providerLink) {
        return { url: providerLink, urlType: 'tmdb' };
    }
    return { url: '', urlType: 'none' };
}
function mapWatchProviders(providers, show) {
    const usProviders = providers.results?.['US'];
    const providerLink = normalizeString(usProviders?.link);
    return [
        ...(usProviders?.flatrate ?? []).map((provider) => ({ ...provider, type: 'Stream' })),
        ...(usProviders?.rent ?? []).map((provider) => ({ ...provider, type: 'Rent' })),
        ...(usProviders?.buy ?? []).map((provider) => ({ ...provider, type: 'Buy' })),
    ]
        .map((provider) => {
        const destination = getProviderDestination(provider, show, providerLink);
        return {
            id: provider.provider_id,
            name: getProviderDisplayName(provider),
            type: provider.type,
            logo: provider.logo_path ? getTmdbImageUrl(provider.logo_path, 'w185') : '',
            url: destination.url,
            urlType: destination.urlType,
        };
    })
        .filter((provider, index, current) => Boolean(provider.url) && current.findIndex((entry) => entry.id === provider.id && entry.type === provider.type) === index);
}
function scoreTrailerCandidate(video) {
    const name = normalizeString(video.name).toLowerCase();
    const type = normalizeString(video.type).toLowerCase();
    const iso = normalizeString(video.iso_639_1).toLowerCase();
    const site = normalizeString(video.site);
    const isEnglish = !iso || iso === 'en';
    const isExcluded = ['american sign language', 'asl', 'dub', 'dubbed', 'commentary', 'recap', 'clip', 'featurette'].some((token) => name.includes(token));
    if (site !== 'YouTube' || !normalizeString(video.key)) {
        return null;
    }
    let priority = -1;
    if (type === 'trailer' && name.includes('official trailer')) {
        priority = 400;
    }
    else if (type === 'trailer') {
        priority = 300;
    }
    else if (type === 'teaser') {
        priority = 200;
    }
    else if (!isExcluded) {
        priority = 100;
    }
    if (priority < 0) {
        return null;
    }
    return {
        video,
        score: priority + (video.official ? 40 : 0) + (isEnglish ? 25 : 0) + (name === 'trailer' || name.endsWith(' trailer') ? 10 : 0) - (isExcluded ? 500 : 0),
    };
}
function pickBestTrailer(details) {
    const candidates = (details.videos?.results ?? [])
        .map(scoreTrailerCandidate)
        .filter((entry) => entry !== null)
        .sort((left, right) => right.score - left.score);
    const best = candidates[0]?.video;
    return best ? `https://www.youtube.com/watch?v=${best.key}` : '';
}
function mapTvCast(details) {
    return (details.aggregate_credits?.cast ?? [])
        .filter((person) => normalizeString(person.name))
        .sort((left, right) => (right.total_episode_count ?? 0) - (left.total_episode_count ?? 0))
        .slice(0, 12)
        .map((person) => ({
        id: person.id,
        name: normalizeString(person.name),
        role: normalizeString(person.roles?.[0]?.character),
        profile: person.profile_path ? getTmdbImageUrl(person.profile_path, 'w300') : '',
    }));
}
function mapTvCrew(details) {
    const selectedCrew = [];
    (details.created_by ?? []).forEach((creator) => {
        if (!selectedCrew.some((entry) => entry.id === creator.id && entry.job === 'Creator')) {
            selectedCrew.push({
                id: creator.id,
                name: normalizeString(creator.name),
                job: 'Creator',
                profile: creator.profile_path ? getTmdbImageUrl(creator.profile_path, 'w300') : '',
            });
        }
    });
    ['Executive Producer', 'Producer', 'Writer', 'Screenplay', 'Original Music Composer'].forEach((job) => {
        const match = (details.aggregate_credits?.crew ?? []).find((person) => person.job === job && normalizeString(person.name));
        if (match && !selectedCrew.some((entry) => entry.id === match.id && entry.job === match.job)) {
            selectedCrew.push({
                id: match.id,
                name: normalizeString(match.name),
                job: normalizeString(match.job),
                profile: match.profile_path ? getTmdbImageUrl(match.profile_path, 'w300') : '',
            });
        }
    });
    return selectedCrew;
}
function normalizeSearchText(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function tokenizeQuery(query) {
    return Array.from(new Set(normalizeSearchText(query).split(/\s+/).filter((token) => token.length >= 2)));
}
function getSearchImage(item) {
    if (item.media_type === 'person') {
        return item.profile_path ? getTmdbImageUrl(item.profile_path, 'w185') : '';
    }
    return item.poster_path ? getTmdbImageUrl(item.poster_path, 'w342') : '';
}
function buildPersonKnownForTitles(item) {
    return (item.known_for ?? [])
        .map((entry) => (entry.title ?? entry.name ?? '').trim())
        .filter(Boolean)
        .slice(0, 3);
}
function buildPersonSubtitle(item) {
    const department = item.known_for_department?.trim() || 'Person';
    const knownForTitles = buildPersonKnownForTitles(item);
    return knownForTitles.length > 0 ? `${department} • ${knownForTitles.join(' • ')}` : department;
}
function buildSearchText(result) {
    return normalizeSearchText([
        result.title,
        result.subtitle,
        result.metadataLine,
        result.knownForDepartment,
        ...(result.knownForTitles ?? []),
        result.overview,
    ]
        .filter(Boolean)
        .join(' '));
}
function getTitleMatchScore(title, normalizedQuery) {
    if (!normalizedQuery)
        return 0;
    if (title === normalizedQuery)
        return 1200;
    if (title.startsWith(normalizedQuery))
        return 800;
    if (title.includes(normalizedQuery))
        return 520;
    return 0;
}
function getTokenScore(text, title, tokens) {
    return tokens.reduce((score, token) => {
        if (title.startsWith(token))
            return score + 180;
        if (title.includes(token))
            return score + 110;
        if (text.includes(token))
            return score + 48;
        return score;
    }, 0);
}
function isRelevantResult(result, query) {
    const normalizedQuery = normalizeSearchText(query);
    const normalizedTitle = normalizeSearchText(result.title);
    const tokens = tokenizeQuery(query);
    const searchableText = buildSearchText(result);
    if (!normalizedQuery)
        return false;
    if (normalizedTitle.includes(normalizedQuery))
        return true;
    const titleTokenMatches = tokens.filter((token) => normalizedTitle.includes(token)).length;
    const anyTokenInSearchText = tokens.some((token) => searchableText.includes(token));
    if (tokens.length <= 1) {
        return anyTokenInSearchText;
    }
    return titleTokenMatches > 0 || tokens.filter((token) => searchableText.includes(token)).length >= Math.min(2, tokens.length);
}
function scoreResult(result, query) {
    const normalizedQuery = normalizeSearchText(query);
    const tokens = tokenizeQuery(query);
    const normalizedTitle = normalizeSearchText(result.title);
    const searchableText = buildSearchText(result);
    const exactScore = getTitleMatchScore(normalizedTitle, normalizedQuery);
    const tokenScore = getTokenScore(searchableText, normalizedTitle, tokens);
    const popularityScore = Math.log10((result.popularity ?? 0) + 1) * 28;
    const ratingScore = (result.score ?? 0) * 2;
    return Math.round(exactScore + tokenScore + popularityScore + ratingScore);
}
function mapSearchResult(item, query) {
    if (item.media_type === 'movie') {
        const yearLabel = getYearLabel(item.release_date);
        const resultBase = {
            id: item.id,
            mediaType: 'movie',
            title: item.title?.trim() || 'Untitled movie',
            subtitle: yearLabel,
            yearLabel,
            metadataLine: yearLabel,
            imageUrl: getSearchImage(item),
            overview: item.overview?.trim() || 'No synopsis available yet.',
            score: item.vote_average ? Number(item.vote_average.toFixed(1)) : undefined,
            popularity: item.popularity ?? 0,
        };
        if (!isRelevantResult(resultBase, query))
            return null;
        return { ...resultBase, relevanceScore: scoreResult(resultBase, query) };
    }
    if (item.media_type === 'tv') {
        const yearLabel = getYearLabel(item.first_air_date);
        const resultBase = {
            id: item.id,
            mediaType: 'tv',
            title: item.name?.trim() || 'Untitled series',
            subtitle: yearLabel,
            yearLabel,
            metadataLine: yearLabel,
            imageUrl: getSearchImage(item),
            overview: item.overview?.trim() || 'No series overview available yet.',
            score: item.vote_average ? Number(item.vote_average.toFixed(1)) : undefined,
            popularity: item.popularity ?? 0,
        };
        if (!isRelevantResult(resultBase, query))
            return null;
        return { ...resultBase, relevanceScore: scoreResult(resultBase, query) };
    }
    if (item.media_type === 'person') {
        const knownForDepartment = item.known_for_department?.trim() || 'Person';
        const knownForTitles = buildPersonKnownForTitles(item);
        const resultBase = {
            id: item.id,
            mediaType: 'person',
            title: item.name?.trim() || 'Unknown person',
            subtitle: buildPersonSubtitle(item),
            metadataLine: buildPersonSubtitle(item),
            knownForDepartment,
            knownForTitles,
            imageUrl: getSearchImage(item),
            overview: 'Open profile for credits, biography, and known-for titles.',
            popularity: item.popularity ?? 0,
        };
        if (!isRelevantResult(resultBase, query))
            return null;
        return { ...resultBase, relevanceScore: scoreResult(resultBase, query) };
    }
    return null;
}
function compareSearchResults(left, right) {
    const scoreDelta = right.relevanceScore - left.relevanceScore;
    if (scoreDelta !== 0)
        return scoreDelta;
    const popularityDelta = right.popularity - left.popularity;
    if (popularityDelta !== 0)
        return popularityDelta;
    const ratingDelta = (right.score ?? 0) - (left.score ?? 0);
    if (ratingDelta !== 0)
        return ratingDelta;
    return left.title.localeCompare(right.title);
}
export function getSearchResultTypeLabel(type) {
    if (type === 'movie')
        return 'Movie';
    if (type === 'tv')
        return 'TV Show';
    return 'Person';
}
export function getSearchResultHref(result) {
    if (result.mediaType === 'movie')
        return `/review/tmdb-${result.id}`;
    if (result.mediaType === 'tv')
        return `/tv/${result.id}`;
    return `/person/${result.id}`;
}
export async function searchTitlesAndPeople(query, limit = 8) {
    return searchGlobal(query, { limit, maxPages: 1 });
}
export async function searchGlobal(query, options = {}) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || !hasTmdbCredentials)
        return [];
    const limit = options.limit ?? DEFAULT_GLOBAL_SEARCH_LIMIT;
    const maxPages = Math.max(1, options.maxPages ?? DEFAULT_GLOBAL_SEARCH_PAGES);
    const cacheKey = `${normalizedQuery.toLowerCase()}:${limit}:${maxPages}`;
    if (!searchCache.has(cacheKey)) {
        searchCache.set(cacheKey, (async () => {
            const firstPage = await tmdbFetch('/search/multi', {
                query: {
                    include_adult: false,
                    language: 'en-US',
                    page: 1,
                    query: normalizedQuery,
                },
            });
            const pagesToLoad = Math.min(maxPages, Math.max(1, firstPage.total_pages));
            const extraPages = pagesToLoad > 1
                ? await Promise.all(Array.from({ length: pagesToLoad - 1 }, (_, index) => tmdbFetch('/search/multi', {
                    query: {
                        include_adult: false,
                        language: 'en-US',
                        page: index + 2,
                        query: normalizedQuery,
                    },
                })))
                : [];
            return [firstPage, ...extraPages]
                .flatMap((response) => response.results)
                .filter((item) => item.media_type === 'movie' || item.media_type === 'tv' || item.media_type === 'person')
                .map((item) => mapSearchResult(item, normalizedQuery))
                .filter((item) => Boolean(item))
                .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id && candidate.mediaType === item.mediaType) === index)
                .sort(compareSearchResults)
                .slice(0, limit);
        })());
    }
    return searchCache.get(cacheKey);
}
function buildTvSummary(details) {
    return {
        id: details.id,
        title: details.name,
        yearLabel: getYearLabel(details.first_air_date),
        posterUrl: details.poster_path ? getTmdbImageUrl(details.poster_path, 'w500') : '',
        backdropUrl: details.backdrop_path ? getTmdbImageUrl(details.backdrop_path, 'w1280') : '',
        overview: details.overview?.trim() || 'No overview available yet.',
        score: Number((details.vote_average ?? 0).toFixed(1)),
        genres: details.genres?.map((genre) => genre.name) ?? [],
    };
}
export async function fetchTvShowById(id) {
    if (!tvDetailCache.has(id)) {
        tvDetailCache.set(id, tmdbFetch(`/tv/${id}`, {
            query: { append_to_response: 'aggregate_credits,videos,recommendations' },
        }).then(async (details) => {
            const providers = await tmdbFetch(`/tv/${id}/watch/providers`).catch(() => ({ results: {} }));
            const castMembers = mapTvCast(details);
            const crewMembers = mapTvCrew(details);
            return {
                ...buildTvSummary(details),
                firstAirDate: details.first_air_date,
                lastAirDate: details.last_air_date,
                firstAirYear: getYearLabel(details.first_air_date),
                seasons: details.number_of_seasons ?? 0,
                episodes: details.number_of_episodes ?? 0,
                episodeRuntime: details.episode_run_time?.find((value) => Number.isFinite(value) && value > 0) ?? 0,
                status: details.status?.trim() || 'Status unavailable',
                creators: details.created_by?.map((creator) => creator.name?.trim()).filter(Boolean) ?? [],
                creatorMembers: (details.created_by ?? []).map((creator) => ({
                    id: creator.id,
                    name: normalizeString(creator.name),
                    job: 'Creator',
                    profile: creator.profile_path ? getTmdbImageUrl(creator.profile_path, 'w300') : '',
                })),
                networks: details.networks?.map((network) => network.name?.trim()).filter(Boolean) ?? [],
                cast: castMembers.map((person) => person.name),
                castMembers,
                crewMembers,
                trailerUrl: pickBestTrailer(details),
                watchProviders: mapWatchProviders(providers, details),
                recommendations: (details.recommendations?.results ?? []).slice(0, 6).map((entry) => ({
                    id: entry.id,
                    title: entry.name?.trim() || 'Untitled series',
                    year: getYearLabel(entry.first_air_date),
                    poster: entry.poster_path ? getTmdbImageUrl(entry.poster_path, 'w500') : '',
                    genres: [],
                })),
            };
        }));
    }
    return tvDetailCache.get(id);
}
function mapPersonCredit(credit) {
    if (credit.media_type !== 'movie' && credit.media_type !== 'tv')
        return null;
    const title = credit.title?.trim() || credit.name?.trim();
    if (!title)
        return null;
    const date = credit.media_type === 'movie' ? credit.release_date : credit.first_air_date;
    return {
        id: credit.id,
        mediaType: credit.media_type,
        title,
        subtitle: getYearLabel(date),
        date,
        role: credit.character?.trim() || '',
        job: credit.job?.trim() || '',
        imageUrl: credit.poster_path
            ? getTmdbImageUrl(credit.poster_path, 'w342')
            : credit.backdrop_path
                ? getTmdbImageUrl(credit.backdrop_path, 'w780')
                : '',
    };
}
export async function fetchPersonById(id) {
    if (!personDetailCache.has(id)) {
        personDetailCache.set(id, tmdbFetch(`/person/${id}`, {
            query: { append_to_response: 'combined_credits' },
        }).then((details) => {
            const castCredits = (details.combined_credits?.cast ?? [])
                .sort((left, right) => {
                const popularityDelta = (right.popularity ?? 0) - (left.popularity ?? 0);
                if (popularityDelta !== 0)
                    return popularityDelta;
                return (right.vote_count ?? 0) - (left.vote_count ?? 0);
            })
                .map(mapPersonCredit)
                .filter((credit) => Boolean(credit));
            const crewCredits = (details.combined_credits?.crew ?? [])
                .sort((left, right) => {
                const popularityDelta = (right.popularity ?? 0) - (left.popularity ?? 0);
                if (popularityDelta !== 0)
                    return popularityDelta;
                return (right.vote_count ?? 0) - (left.vote_count ?? 0);
            })
                .map(mapPersonCredit)
                .filter((credit) => Boolean(credit));
            const credits = [...castCredits, ...crewCredits];
            const dedupedCredits = Array.from(new Map(credits.map((credit) => [`${credit.mediaType}-${credit.id}`, credit])).values());
            return {
                id: details.id,
                name: details.name,
                knownForDepartment: details.known_for_department?.trim() || 'Screen credits',
                biography: details.biography?.trim() || 'Biography not available yet.',
                birthday: details.birthday,
                placeOfBirth: details.place_of_birth?.trim() || 'Not available',
                imageUrl: details.profile_path ? getTmdbImageUrl(details.profile_path, 'h632') : '',
                backdropUrl: dedupedCredits[0]?.imageUrl ?? '',
                knownFor: dedupedCredits.slice(0, 10),
                popularMovies: dedupedCredits.filter((credit) => credit.mediaType === 'movie').slice(0, 12),
                castCredits,
                crewCredits,
                primaryRole: castCredits[0]?.role || crewCredits[0]?.job || details.known_for_department?.trim() || 'Screen credits',
            };
        }));
    }
    return personDetailCache.get(id);
}
