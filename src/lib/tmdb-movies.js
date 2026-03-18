import { browseStreamingPlatforms } from '@/lib/movie-constants';
import { movies as localMovies } from '@/data/movies';
import { getTmdbImageUrl, tmdbFetch } from '@/lib/tmdb';
const browseSamplePageSize = 5;
const preferredBrowseLanguageCodes = ['en', 'hi', 'ta', 'te', 'ml', 'bn', 'es', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ar', 'tr', 'th', 'id', 'ru'];
const browseLanguagesCache = { promise: null };
const tmdbLocaleByLanguageCode = {
    ar: 'ar-SA',
    bn: 'bn-BD',
    de: 'de-DE',
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    hi: 'hi-IN',
    id: 'id-ID',
    it: 'it-IT',
    ja: 'ja-JP',
    ko: 'ko-KR',
    ml: 'ml-IN',
    pt: 'pt-BR',
    ru: 'ru-RU',
    ta: 'ta-IN',
    te: 'te-IN',
    th: 'th-TH',
    tr: 'tr-TR',
    zh: 'zh-CN',
};
const countryByLanguageCode = {
    en: 'USA',
    fr: 'France',
    de: 'Germany',
    ja: 'Japan',
    ko: 'South Korea',
    es: 'Spain',
    it: 'Italy',
    pt: 'Brazil',
};
function formatDateOffset({ years = 0, months = 0, days = 0 } = {}) {
    const date = new Date();
    date.setFullYear(date.getFullYear() + years);
    date.setMonth(date.getMonth() + months);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}
const collectionDefinitions = [
    {
        id: 'trending-week',
        title: 'Trending This Week',
        description: 'The titles pulling the strongest attention on TMDB right now.',
        endpoint: '/trending/movie/week',
        category: 'Trending',
        accent: 'Weekly pulse',
        filterSummary: 'TMDB weekly trending feed',
    },
    {
        id: 'trending-day',
        title: 'Trending Today',
        description: 'The fastest-moving movie conversation on TMDB over the last 24 hours.',
        endpoint: '/trending/movie/day',
        category: 'Trending',
        accent: 'Daily spike',
        filterSummary: 'TMDB daily trending feed',
    },
    {
        id: 'now-playing',
        title: 'Now Playing',
        description: 'Live theatrical releases currently moving through the market.',
        endpoint: '/movie/now_playing',
        category: 'Release Radar',
        accent: 'In theaters',
        filterSummary: 'Current theatrical releases',
    },
    {
        id: 'upcoming',
        title: 'Upcoming Releases',
        description: 'Major near-future releases with fresh audience momentum.',
        endpoint: '/movie/upcoming',
        category: 'Release Radar',
        accent: 'Coming soon',
        filterSummary: 'Upcoming release calendar',
    },
    {
        id: 'top-rated',
        title: 'Top Rated',
        description: "TMDB's highest-rated long-run film list.",
        endpoint: '/movie/top_rated',
        category: 'Canonical',
        accent: 'All-time favorites',
        filterSummary: 'TMDB top rated chart',
    },
    {
        id: 'popular',
        title: 'Popular Worldwide',
        description: 'Broad audience favorites ranked by TMDB popularity.',
        endpoint: '/movie/popular',
        category: 'Popular',
        accent: 'Global reach',
        filterSummary: 'TMDB popularity chart',
    },
    {
        id: 'crowd-pleasers',
        title: 'Crowd Pleasers',
        description: 'Highly rated mainstream hits with serious vote volume behind them.',
        endpoint: '/discover/movie',
        query: {
            include_adult: false,
            include_video: false,
            language: 'en-US',
            sort_by: 'vote_average.desc',
            'vote_count.gte': 1800,
            'vote_average.gte': 7.2,
            'primary_release_date.gte': formatDateOffset({ years: -15 }),
        },
        category: 'Smart Filter',
        accent: 'High score + high volume',
        filterSummary: '7.2+ rating, 1.8k+ votes, last 15 years',
    },
    {
        id: 'recent-breakouts',
        title: 'Recent Breakouts',
        description: 'Recent films with strong popularity and above-average reception.',
        endpoint: '/discover/movie',
        query: {
            include_adult: false,
            include_video: false,
            language: 'en-US',
            sort_by: 'popularity.desc',
            'primary_release_date.gte': formatDateOffset({ years: -2 }),
            'vote_average.gte': 6.7,
            'vote_count.gte': 250,
        },
        category: 'Smart Filter',
        accent: 'New and hot',
        filterSummary: 'Last 2 years, 6.7+ rating, 250+ votes',
    },
    {
        id: 'action-pulse',
        title: 'Action Pulse',
        description: 'High-velocity action titles sorted for momentum and recent audience pull.',
        endpoint: '/discover/movie',
        query: {
            include_adult: false,
            include_video: false,
            language: 'en-US',
            sort_by: 'popularity.desc',
            with_genres: '28',
            'primary_release_date.gte': formatDateOffset({ years: -12 }),
            'vote_count.gte': 120,
        },
        category: 'Genre',
        accent: 'Action',
        filterSummary: 'Action, popular, last 12 years',
    },
    {
        id: 'sci-fi-prestige',
        title: 'Sci-Fi Prestige',
        description: 'Science fiction with strong ratings, solid vote counts, and modern relevance.',
        endpoint: '/discover/movie',
        query: {
            include_adult: false,
            include_video: false,
            language: 'en-US',
            sort_by: 'vote_average.desc',
            with_genres: '878',
            'vote_count.gte': 350,
            'vote_average.gte': 6.8,
            'primary_release_date.gte': formatDateOffset({ years: -25 }),
        },
        category: 'Genre',
        accent: 'Science fiction',
        filterSummary: 'Sci-fi, 6.8+ rating, 350+ votes',
    },
    {
        id: 'animation-all-ages',
        title: 'Animation All Ages',
        description: 'Animated films with broad appeal, healthy scores, and strong popularity.',
        endpoint: '/discover/movie',
        query: {
            include_adult: false,
            include_video: false,
            language: 'en-US',
            sort_by: 'popularity.desc',
            with_genres: '16',
            'vote_average.gte': 6.5,
            'vote_count.gte': 150,
            'primary_release_date.gte': formatDateOffset({ years: -20 }),
        },
        category: 'Genre',
        accent: 'Animation',
        filterSummary: 'Animation, 6.5+ rating, 150+ votes',
    },
    {
        id: 'horror-after-dark',
        title: 'Horror After Dark',
        description: 'Recent horror titles filtered for discovery, popularity, and audience response.',
        endpoint: '/discover/movie',
        query: {
            include_adult: false,
            include_video: false,
            language: 'en-US',
            sort_by: 'popularity.desc',
            with_genres: '27',
            'vote_average.gte': 5.8,
            'vote_count.gte': 80,
            'primary_release_date.gte': formatDateOffset({ years: -10 }),
        },
        category: 'Genre',
        accent: 'Horror',
        filterSummary: 'Horror, last 10 years, 80+ votes',
    },
    {
        id: 'spanish-language',
        title: 'Spanish-Language Spotlight',
        description: 'Spanish-language films surfaced by popularity and modern audience interest.',
        endpoint: '/discover/movie',
        query: {
            include_adult: false,
            include_video: false,
            language: 'en-US',
            sort_by: 'popularity.desc',
            with_original_language: 'es',
            'vote_average.gte': 6.4,
            'vote_count.gte': 40,
            'primary_release_date.gte': formatDateOffset({ years: -20 }),
        },
        category: 'Language',
        accent: 'Spanish',
        filterSummary: 'Original language: Spanish',
    },
    {
        id: 'japanese-language',
        title: 'Japanese Cinema Now',
        description: 'Japanese-language films balancing strong ratings with current viewer pull.',
        endpoint: '/discover/movie',
        query: {
            include_adult: false,
            include_video: false,
            language: 'en-US',
            sort_by: 'popularity.desc',
            with_original_language: 'ja',
            'vote_average.gte': 6.6,
            'vote_count.gte': 50,
            'primary_release_date.gte': formatDateOffset({ years: -20 }),
        },
        category: 'Language',
        accent: 'Japanese',
        filterSummary: 'Original language: Japanese',
    },
    {
        id: 'korean-language',
        title: 'Korean Standouts',
        description: 'Korean-language movies with strong audience traction and reliable scores.',
        endpoint: '/discover/movie',
        query: {
            include_adult: false,
            include_video: false,
            language: 'en-US',
            sort_by: 'popularity.desc',
            with_original_language: 'ko',
            'vote_average.gte': 6.5,
            'vote_count.gte': 60,
            'primary_release_date.gte': formatDateOffset({ years: -20 }),
        },
        category: 'Language',
        accent: 'Korean',
        filterSummary: 'Original language: Korean',
    },
];
let genreMapPromise = null;
const detailCache = new Map();
const browseMovieCache = new Map();
const personSearchCache = new Map();
const browsePageCache = new Map();
const trendingCache = new Map();
const listCache = new Map();
const supportedStreamingLabels = new Set(browseStreamingPlatforms.map((platform) => platform.label));
const streamingLabelByProviderId = new Map(browseStreamingPlatforms.map((platform) => [Number(platform.value), platform.label]));
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
    'Amazon Prime': (movie) => `https://www.amazon.com/s?k=${encodeURIComponent(buildProviderQuery(movie))}&i=instant-video`,
    'Apple TV': (movie) => `https://tv.apple.com/search?term=${encodeURIComponent(buildProviderQuery(movie))}`,
    'Apple TV+': (movie) => `https://tv.apple.com/search?term=${encodeURIComponent(buildProviderQuery(movie))}`,
    'Fandango At Home': (movie) => `https://www.vudu.com/content/movies/search?searchString=${encodeURIComponent(buildProviderQuery(movie))}`,
    'Microsoft Store': (movie) => `https://www.microsoft.com/en-us/search/shop/movies?q=${encodeURIComponent(buildProviderQuery(movie))}`,
    'YouTube': (movie) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${buildProviderQuery(movie)} movie`)}`,
};
function toTmdbMovieId(id) {
    return `tmdb-${id}`;
}
function sortStrings(values) {
    return values ? [...values].sort((left, right) => left.localeCompare(right)) : undefined;
}
function sortNumbers(values) {
    return values ? [...values].sort((left, right) => left - right) : undefined;
}
export function serializeBrowseMovieQuery(query = {}) {
    const rest = { ...query };
    delete rest.languageOptions;
    return JSON.stringify({
        ...rest,
        genres: sortStrings(query.genres),
        languages: sortStrings(query.languages),
        verdicts: sortStrings(query.verdicts),
        decades: sortNumbers(query.decades),
        streamingPlatforms: sortStrings(query.streamingPlatforms),
        page: query.page ?? 1,
        sortBy: query.sortBy ?? null,
    });
}
function fromTmdbMovieId(id) {
    if (!id.startsWith('tmdb-'))
        return null;
    const parsed = Number(id.replace('tmdb-', ''));
    return Number.isFinite(parsed) ? parsed : null;
}
function getReleaseYear(date) {
    const year = Number((date ?? '0').slice(0, 4));
    return Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();
}
function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function normalizeString(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function normalizeBrowseLanguageLabel(language) {
    const englishName = normalizeString(language?.english_name);
    const nativeName = normalizeString(language?.name);
    const candidate = englishName || nativeName;
    if (!candidate) {
        return '';
    }
    return candidate.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}
function sortBrowseLanguages(languages) {
    return [...languages].sort((left, right) => {
        const leftPreferredIndex = preferredBrowseLanguageCodes.indexOf(left.value);
        const rightPreferredIndex = preferredBrowseLanguageCodes.indexOf(right.value);
        const leftPreferred = leftPreferredIndex >= 0;
        const rightPreferred = rightPreferredIndex >= 0;
        if (leftPreferred && rightPreferred) {
            return leftPreferredIndex - rightPreferredIndex;
        }
        if (leftPreferred) {
            return -1;
        }
        if (rightPreferred) {
            return 1;
        }
        return left.label.localeCompare(right.label);
    });
}
export async function fetchBrowseLanguages() {
    if (!browseLanguagesCache.promise) {
        browseLanguagesCache.promise = tmdbFetch('/configuration/languages', {
            cacheTtlMs: 24 * 60 * 60 * 1000,
        }).then((languages) => {
            const usableLanguages = (Array.isArray(languages) ? languages : [])
                .map((language) => ({
                value: normalizeString(language?.iso_639_1).toLowerCase(),
                label: normalizeBrowseLanguageLabel(language),
            }))
                .filter((language) => /^[a-z]{2}$/.test(language.value) && language.label)
                .filter((language, index, current) => current.findIndex((entry) => entry.value === language.value) === index);
            return sortBrowseLanguages(usableLanguages);
        }).catch((error) => {
            browseLanguagesCache.promise = null;
            throw error;
        });
    }
    return browseLanguagesCache.promise;
}
function createLanguageCodeByLabel(languages = []) {
    return new Map(languages.map((language) => [language.label, language.value]));
}
function resolveSelectedLanguageCodes(query = {}) {
    const languageCodeByLabel = createLanguageCodeByLabel(query.languageOptions);
    return dedupeStrings((query.languages ?? [])
        .map((entry) => {
        const normalizedEntry = normalizeString(entry).toLowerCase();
        if (/^[a-z]{2}$/.test(normalizedEntry)) {
            return normalizedEntry;
        }
        return languageCodeByLabel.get(entry);
    })
        .filter((code) => Boolean(code)));
}
function getTmdbBrowseLocale(languageCodes = []) {
    if (languageCodes.length !== 1) {
        return 'en-US';
    }
    return tmdbLocaleByLanguageCode[languageCodes[0]] ?? 'en-US';
}
function dedupeStrings(values) {
    return values.filter((value, index, current) => Boolean(value) && current.indexOf(value) === index);
}
function getDecade(year) {
    return Math.floor(year / 10) * 10;
}
function scoreToVerdict(score) {
    if (score >= 8.8)
        return 'Masterpiece';
    if (score >= 7.8)
        return 'Essential';
    if (score >= 6.8)
        return 'Recommended';
    if (score >= 5.5)
        return 'Mixed';
    return 'Skip';
}
function normalizeStreamingLabel(label) {
    const normalized = label.trim().toLowerCase();
    return streamingLabelAliases[normalized] ?? label.trim();
}
function getProviderDisplayName(provider) {
    return provider.provider_id !== undefined
        ? streamingLabelByProviderId.get(provider.provider_id) ?? normalizeStreamingLabel(provider.provider_name)
        : normalizeStreamingLabel(provider.provider_name);
}
function buildProviderQuery(movie) {
    const title = normalizeString(movie?.title, 'movie');
    const year = normalizeNumber(movie?.year, 0);
    return year > 0 ? `${title} ${year}` : title;
}
function getProviderHomepage(provider) {
    if (provider?.provider_id !== undefined) {
        const directById = providerUrlByProviderId.get(Number(provider.provider_id));
        if (directById) {
            return directById;
        }
    }
    const normalizedName = getProviderDisplayName(provider);
    return providerUrlByLabel[normalizedName] ?? '';
}
function getProviderDestination(provider, movie, providerLink) {
    const normalizedName = getProviderDisplayName(provider);
    const titleUrlBuilder = providerTitleUrlBuilderByLabel[normalizedName];
    if (titleUrlBuilder && hasProviderQueryData(movie)) {
        return {
            url: titleUrlBuilder(movie),
            urlType: 'title',
        };
    }
    const homepageUrl = getProviderHomepage(provider);
    if (homepageUrl) {
        return {
            url: homepageUrl,
            urlType: 'homepage',
        };
    }
    if (providerLink) {
        return {
            url: providerLink,
            urlType: 'tmdb',
        };
    }
    return {
        url: '',
        urlType: 'none',
    };
}
function hasProviderQueryData(movie) {
    return Boolean(normalizeString(movie?.title));
}
function mapProviderUrlMetadata(provider, movie, providerLink) {
    const destination = getProviderDestination(provider, movie, providerLink);
    return {
        url: destination.url,
        urlType: destination.urlType,
    };
}
async function getGenreMap() {
    if (!genreMapPromise) {
        genreMapPromise = tmdbFetch('/genre/movie/list').then((response) => {
            return new Map(response.genres.map((genre) => [genre.id, genre.name]));
        });
    }
    return genreMapPromise;
}
async function getGenreIdMap() {
    const genreMap = await getGenreMap();
    return new Map(Array.from(genreMap.entries(), ([id, name]) => [name, id]));
}
function mapCountry(details, movie) {
    if (details?.production_countries?.[0]?.name)
        return details.production_countries[0].name;
    const code = movie?.original_language ?? 'en';
    return countryByLanguageCode[code] ?? normalizeString(code.toUpperCase(), 'Unknown');
}
function mapLanguage(details, movie) {
    if (details?.spoken_languages?.[0]?.english_name)
        return details.spoken_languages[0].english_name;
    const code = movie?.original_language ?? 'en';
    return countryByLanguageCode[code] ?? normalizeString(code.toUpperCase(), 'Unknown');
}
function pickPreferredMovieTitle({ englishTitle, localizedTitle, originalTitle }) {
    return normalizeString(englishTitle) || normalizeString(localizedTitle) || normalizeString(originalTitle) || 'Untitled movie';
}
function mapSummaryMovie(movie, genreMap, options = {}) {
    const year = getReleaseYear(movie.release_date);
    const tmdbRating = Number(normalizeNumber(movie.vote_average).toFixed(1));
    const genres = movie.genre_ids
        ?.map((genreId) => genreMap.get(genreId))
        .filter((genre) => Boolean(genre)) ?? [];
    const localizedTitle = normalizeString(movie.title);
    const originalTitle = normalizeString(movie.original_title, localizedTitle);
    const englishTitle = normalizeString(options.englishTitle);
    return {
        id: toTmdbMovieId(movie.id),
        source: 'tmdb',
        tmdbId: movie.id,
        title: pickPreferredMovieTitle({
            englishTitle,
            localizedTitle,
            originalTitle,
        }),
        englishTitle,
        localizedTitle,
        originalTitle,
        year,
        releaseDate: normalizeString(movie.release_date),
        genres: genres.length ? genres : ['Drama'],
        verdict: scoreToVerdict(tmdbRating),
        score: tmdbRating,
        tmdbRating,
        reviewCount: Math.max(0, Math.round(normalizeNumber(movie.vote_count))),
        popularity: normalizeNumber(movie.popularity),
        poster: movie.poster_path ? getTmdbImageUrl(movie.poster_path, 'w342') : '',
        backdrop: movie.backdrop_path ? getTmdbImageUrl(movie.backdrop_path, 'w1280') : '',
        director: 'Not available',
        cast: [],
        runtime: 0,
        synopsis: normalizeString(movie.overview, 'No synopsis available yet.'),
        country: mapCountry(undefined, movie),
        language: mapLanguage(undefined, movie),
        originalLanguage: normalizeString(movie.original_language, 'en'),
        streaming: [],
        decade: getDecade(year),
    };
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
        score: priority
            + (video.official ? 40 : 0)
            + (isEnglish ? 25 : 0)
            + (name === 'trailer' || name.endsWith(' trailer') ? 10 : 0)
            - (isExcluded ? 500 : 0),
    };
}
function pickBestTrailer(details) {
    const candidates = (details.videos?.results ?? [])
        .map(scoreTrailerCandidate)
        .filter((entry) => entry !== null)
        .sort((left, right) => right.score - left.score);
    const best = candidates[0]?.video;
    return best ? `https://www.youtube.com/watch?v=${best.key}` : undefined;
}
function mapFeaturedCast(details) {
    return (details.credits?.cast ?? [])
        .filter((person) => normalizeString(person.name))
        .slice(0, 10)
        .map((person) => ({
        id: person.id,
        name: normalizeString(person.name),
        role: normalizeString(person.character),
        profile: person.profile_path ? getTmdbImageUrl(person.profile_path, 'w300') : '',
    }));
}
function mapFeaturedCrew(details) {
    const crewPriority = ['Director', 'Writer', 'Screenplay', 'Producer', 'Director of Photography', 'Original Music Composer', 'Editor'];
    const selectedCrew = [];
    crewPriority.forEach((job) => {
        const match = details.credits?.crew.find((person) => person.job === job);
        if (match && normalizeString(match.name) && !selectedCrew.some((entry) => entry.id === match.id && entry.job === match.job)) {
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
function mapWatchProviders(providers, movie) {
    const usProviders = providers.results?.['US'];
    const providerLink = normalizeString(usProviders?.link);
    return [
        ...(usProviders?.flatrate ?? []).map((provider) => ({ ...provider, type: 'Stream' })),
        ...(usProviders?.rent ?? []).map((provider) => ({ ...provider, type: 'Rent' })),
        ...(usProviders?.buy ?? []).map((provider) => ({ ...provider, type: 'Buy' })),
    ]
        .map((provider) => {
        const urlMetadata = mapProviderUrlMetadata(provider, movie, providerLink);
        return {
        id: provider.provider_id,
        name: getProviderDisplayName(provider),
        type: provider.type,
        logo: provider.logo_path ? getTmdbImageUrl(provider.logo_path, 'w185') : '',
        url: urlMetadata.url,
        urlType: urlMetadata.urlType,
    };
    })
        .filter((provider, index, current) => current.findIndex((entry) => entry.id === provider.id && entry.type === provider.type) === index);
}
function mapDetailedMovie(details, genreMap, options = {}) {
    const base = mapSummaryMovie(details, genreMap, options);
    const director = normalizeString(details.credits?.crew.find((person) => person.job === 'Director')?.name, 'Unknown Director');
    const featuredCast = mapFeaturedCast(details);
    const cast = dedupeStrings(featuredCast.slice(0, 5).map((person) => person.name));
    const genres = dedupeStrings(details.genres?.map((genre) => normalizeString(genre.name)).filter(Boolean) ?? []);
    return {
        ...base,
        genres: genres.length ? genres : base.genres,
        runtime: Math.max(0, Math.round(normalizeNumber(details.runtime))),
        director,
        cast,
        castMembers: featuredCast,
        crewMembers: mapFeaturedCrew(details),
        country: mapCountry(details, details),
        language: mapLanguage(details, details),
        originalLanguage: normalizeString(details.original_language, base.originalLanguage),
        synopsis: normalizeString(details.overview, base.synopsis),
        releaseDate: normalizeString(details.release_date, base.releaseDate),
        trailerUrl: pickBestTrailer(details),
    };
}
async function fetchBrowseMovieDetails(tmdbId, genreMap, language, englishTitle) {
    const cacheKey = `${tmdbId}:${language ?? 'default'}:${normalizeString(englishTitle)}`;
    if (!browseMovieCache.has(cacheKey)) {
        browseMovieCache.set(cacheKey, Promise.all([
            tmdbFetch(`/movie/${tmdbId}`, {
                query: {
                    append_to_response: 'credits',
                    language,
                },
            }),
            tmdbFetch(`/movie/${tmdbId}/watch/providers`).catch(() => ({ results: {} })),
        ]).then(([details, providers]) => {
            const usProviders = providers.results?.['US'];
            const providerNames = [
                ...(usProviders?.flatrate ?? []),
                ...(usProviders?.rent ?? []),
                ...(usProviders?.buy ?? []),
            ]
                .map((provider) => {
                if (provider.provider_id !== undefined) {
                    return streamingLabelByProviderId.get(provider.provider_id) ?? normalizeStreamingLabel(provider.provider_name);
                }
                return normalizeStreamingLabel(provider.provider_name);
            })
                .filter((providerName, index, current) => current.indexOf(providerName) === index)
                .filter((providerName) => supportedStreamingLabels.has(providerName));
            return {
                ...mapDetailedMovie(details, genreMap, { englishTitle }),
                streaming: providerNames,
            };
        }));
    }
    return browseMovieCache.get(cacheKey);
}
async function searchPeopleIds(query, department) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery)
        return [];
    const cacheKey = `${department}:${normalizedQuery}`;
    if (!personSearchCache.has(cacheKey)) {
        personSearchCache.set(cacheKey, tmdbFetch('/search/person', {
            query: {
                include_adult: false,
                page: 1,
                query,
            },
        }).then((response) => response.results
            .filter((person) => department === 'Directing'
            ? person.known_for_department === 'Directing'
            : person.known_for_department === 'Acting')
            .slice(0, 5)
            .map((person) => person.id)));
    }
    return personSearchCache.get(cacheKey);
}
async function fetchList(endpoint, limit = 12) {
    const cacheKey = `${endpoint}:${limit}`;
    if (!listCache.has(cacheKey)) {
        listCache.set(cacheKey, Promise.all([getGenreMap(), tmdbFetch(endpoint)]).then(([genreMap, response]) => response.results.slice(0, limit).map((movie) => mapSummaryMovie(movie, genreMap))));
    }
    return listCache.get(cacheKey);
}
function getCollectionDefinition(collectionId) {
    return collectionDefinitions.find((collection) => collection.id === collectionId) ?? null;
}
function serializeExcludeIds(excludeIds = []) {
    return [...new Set(excludeIds)].sort().join(',');
}
function buildCollectionRequest(definition, page) {
    return tmdbFetch(definition.endpoint, {
        query: {
            ...(definition.query ?? {}),
            page,
        },
    });
}
async function fetchCollectionResults(definition, { page = 1, limit = 12, excludeIds = [] } = {}) {
    const cacheKey = `${definition.id}:${page}:${limit}:${serializeExcludeIds(excludeIds)}`;
    if (!listCache.has(cacheKey)) {
        listCache.set(cacheKey, (async () => {
            const [genreMap] = await Promise.all([getGenreMap()]);
            const excludedMovieIds = new Set(excludeIds);
            const seenMovieIds = new Set(excludeIds);
            const movies = [];
            let currentPage = Math.max(1, page);
            let pagesVisited = 0;
            let totalPages = currentPage;
            let tmdbTotalResults = 0;
            while (movies.length < limit && currentPage <= totalPages && pagesVisited < 4) {
                const response = await buildCollectionRequest(definition, currentPage);
                totalPages = Math.max(1, Math.min(500, Number(response.total_pages) || 1));
                tmdbTotalResults = Math.max(tmdbTotalResults, Number(response.total_results) || 0);
                const pageMovies = (response.results ?? [])
                    .filter((movie) => Boolean(movie?.title))
                    .map((movie) => mapSummaryMovie(movie, genreMap))
                    .filter((movie) => {
                    if (seenMovieIds.has(movie.id)) {
                        return false;
                    }
                    seenMovieIds.add(movie.id);
                    return true;
                });
                movies.push(...pageMovies);
                currentPage += 1;
                pagesVisited += 1;
            }
            return {
                movies: movies.slice(0, limit),
                page: Math.max(page, currentPage - 1),
                totalPages,
                totalResults: Math.max(tmdbTotalResults, movies.length),
                tmdbTotalResults: Math.max(tmdbTotalResults, movies.length),
                excludedCount: excludedMovieIds.size,
                hasMore: currentPage <= totalPages,
            };
        })());
    }
    return listCache.get(cacheKey);
}
export async function fetchHomeFeed() {
    const [latestMovies, trendingMovies, topRatedMovies, popularMovies] = await Promise.all([
        fetchList('/movie/now_playing', 8),
        fetchList('/trending/movie/week', 8),
        fetchList('/movie/top_rated', 8),
        fetchList('/movie/popular', 8),
    ]);
    return {
        spotlightMovie: latestMovies[0] ?? trendingMovies[0] ?? topRatedMovies[0] ?? popularMovies[0] ?? null,
        latestMovies,
        trendingMovies,
        topRatedMovies,
        popularMovies,
    };
}
function mapBrowseSort(sortBy) {
    if (sortBy === 'highestRated')
        return 'vote_average.desc';
    if (sortBy === 'mostPopular')
        return 'popularity.desc';
    if (sortBy === 'mostReviewed')
        return 'vote_count.desc';
    if (sortBy === 'releaseDate')
        return 'primary_release_date.asc';
    if (sortBy === 'newest')
        return 'primary_release_date.desc';
    return 'primary_release_date.desc';
}
function greatestCommonDivisor(a, b) {
    let left = Math.abs(a);
    let right = Math.abs(b);
    while (right !== 0) {
        const remainder = left % right;
        left = right;
        right = remainder;
    }
    return left;
}
function buildBrowsePageSequence(totalPages) {
    const limit = Math.max(1, Math.min(totalPages, 500));
    const stepCandidates = [97, 89, 83, 79, 73, 71, 67, 61, 59, 53, 47, 43, 41, 37, 31, 29, 23, 19, 17, 13, 11, 7, 5, 3, 2];
    const step = stepCandidates.find((candidate) => candidate < limit && greatestCommonDivisor(candidate, limit) === 1) ?? 1;
    const pages = [];
    const seen = new Set();
    let current = 0;
    while (pages.length < limit) {
        const page = current + 1;
        if (!seen.has(page)) {
            pages.push(page);
            seen.add(page);
        }
        current = (current + step) % limit;
    }
    return pages;
}
function getBrowseSamplePages(totalPages, logicalPage) {
    const sequence = buildBrowsePageSequence(totalPages);
    const start = Math.max(0, logicalPage - 1) * browseSamplePageSize;
    return sequence.slice(start, start + browseSamplePageSize);
}
function getBrowseSequentialPages(totalPages, logicalPage) {
    const start = Math.max(0, logicalPage - 1) * browseSamplePageSize + 1;
    const end = Math.min(totalPages, start + browseSamplePageSize - 1);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}
function dedupeBrowseMovies(movies) {
    return Array.from(new Map(movies.map((movie) => [movie.id, movie])).values());
}
function needsBrowseDetails(query) {
    return Boolean(query.verdicts?.length ||
        query.streamingPlatforms?.length ||
        query.directorQuery?.trim() ||
        query.castQuery?.trim() ||
        query.minRuntime !== undefined ||
        query.maxRuntime !== undefined);
}
function matchesStreamingPlatforms(movie, selectedPlatforms, options) {
    if (!selectedPlatforms?.length)
        return true;
    if (options?.skipMissingMovieStreaming && !(movie.streaming ?? []).length)
        return true;
    const normalizedSelectedPlatforms = new Set(selectedPlatforms.map(normalizeStreamingLabel));
    const normalizedMoviePlatforms = (movie.streaming ?? []).map(normalizeStreamingLabel);
    return normalizedMoviePlatforms.some((service) => normalizedSelectedPlatforms.has(service));
}
function getDateRange(query) {
    if (query.exactYear) {
        return {
            minDate: `${query.exactYear}-01-01`,
            maxDate: `${query.exactYear}-12-31`,
        };
    }
    const decadeMin = query.decades?.length ? Math.min(...query.decades) : undefined;
    const decadeMax = query.decades?.length ? Math.max(...query.decades.map((decade) => decade + 9)) : undefined;
    const minYear = Math.max(query.releaseYearMin ?? 0, decadeMin ?? 0) || undefined;
    const maxYear = Math.min(query.releaseYearMax ?? 9999, decadeMax ?? 9999);
    return {
        minDate: minYear ? `${minYear}-01-01` : undefined,
        maxDate: Number.isFinite(maxYear) && maxYear < 9999 ? `${maxYear}-12-31` : undefined,
    };
}
async function buildBrowseDiscoverQuery(query) {
    const genreIdMap = await getGenreIdMap();
    const [directorIds, castIds] = await Promise.all([
        query.directorQuery ? searchPeopleIds(query.directorQuery, 'Directing') : Promise.resolve([]),
        query.castQuery ? searchPeopleIds(query.castQuery, 'Acting') : Promise.resolve([]),
    ]);
    const { minDate, maxDate } = getDateRange(query);
    const genreIds = (query.genres ?? [])
        .map((genre) => genreIdMap.get(genre))
        .filter((genreId) => Number.isFinite(genreId));
    const providerIds = (query.streamingPlatforms ?? [])
        .map((label) => browseStreamingPlatforms.find((platform) => platform.label === label)?.value)
        .filter((providerId) => Boolean(providerId));
    const languageCodes = resolveSelectedLanguageCodes(query);
    return {
        include_adult: false,
        include_video: false,
        language: getTmdbBrowseLocale(languageCodes),
        page: query.page ?? 1,
        sort_by: mapBrowseSort(query.sortBy),
        'primary_release_date.gte': minDate,
        'primary_release_date.lte': maxDate,
        'vote_average.gte': query.minRating && query.minRating > 0 ? query.minRating : undefined,
        'vote_count.gte': query.sortBy === 'highestRated' ? 100 : 5,
        with_cast: castIds.length ? castIds.join('|') : undefined,
        with_crew: directorIds.length ? directorIds.join('|') : undefined,
        with_genres: genreIds.length ? genreIds.join(',') : undefined,
        with_original_language: languageCodes.length ? languageCodes.join('|') : undefined,
        'with_runtime.gte': query.minRuntime && query.minRuntime > 0 ? query.minRuntime : undefined,
        'with_runtime.lte': query.maxRuntime && query.maxRuntime < 240 ? query.maxRuntime : undefined,
        with_watch_providers: providerIds.length ? providerIds.join('|') : undefined,
        watch_region: providerIds.length ? 'US' : undefined,
    };
}
function matchesBrowseMovie(movie, query, options) {
    const normalizedSearch = query.query?.trim().toLowerCase() ?? '';
    const normalizedDirectorQuery = query.directorQuery?.trim().toLowerCase() ?? '';
    const normalizedCastQuery = query.castQuery?.trim().toLowerCase() ?? '';
    const selectedLanguageCodes = resolveSelectedLanguageCodes(query);
    return ((!(query.genres?.length) || movie.genres.some((genre) => query.genres?.includes(genre))) &&
        (!(query.verdicts?.length) || query.verdicts.includes(movie.verdict)) &&
        (!(query.decades?.length) || query.decades.includes(movie.decade)) &&
        (!selectedLanguageCodes.length || selectedLanguageCodes.includes(movie.originalLanguage)) &&
        matchesStreamingPlatforms(movie, query.streamingPlatforms, {
            skipMissingMovieStreaming: options?.skipStreamingPlatforms,
        }) &&
        (query.minRating === undefined || movie.score >= query.minRating) &&
        (query.releaseYearMin === undefined || movie.year >= query.releaseYearMin) &&
        (query.releaseYearMax === undefined || movie.year <= query.releaseYearMax) &&
        (query.exactYear === undefined || movie.year === query.exactYear) &&
        (query.minRuntime === undefined || (movie.runtime > 0 && movie.runtime >= query.minRuntime)) &&
        (query.maxRuntime === undefined || (movie.runtime > 0 && movie.runtime <= query.maxRuntime)) &&
        (!normalizedDirectorQuery || movie.director.toLowerCase().includes(normalizedDirectorQuery)) &&
        (!normalizedCastQuery ||
            movie.cast.some((member) => member.toLowerCase().includes(normalizedCastQuery))) &&
        (!normalizedSearch || movie.title.toLowerCase().includes(normalizedSearch)));
}
function clampReleaseDateUpperBound(existingMaxDate, today) {
    if (typeof existingMaxDate !== 'string' || !existingMaxDate) {
        return today;
    }
    return existingMaxDate < today ? existingMaxDate : today;
}
async function fetchBrowsePageResponse(endpoint, requestQuery, page, releaseDateUpperBound) {
    return tmdbFetch(endpoint, {
        query: {
            ...requestQuery,
            page,
            'primary_release_date.lte': releaseDateUpperBound,
        },
    });
}
async function fetchBrowsePageResponses(endpoint, requestQuery, requestedPage, totalPages, primaryResponse, options = {}) {
    const { shouldExpandSearchPages = false, useSampledBrowsePages = false, releaseDateUpperBound } = options;
    const pages = shouldExpandSearchPages
        ? getBrowseSequentialPages(totalPages, requestedPage)
        : useSampledBrowsePages
            ? getBrowseSamplePages(totalPages, requestedPage)
            : [primaryResponse.page];
    return Promise.all(pages.map((page) => page === primaryResponse.page
        ? Promise.resolve(primaryResponse)
        : fetchBrowsePageResponse(endpoint, requestQuery, page, releaseDateUpperBound)));
}
function buildEnglishTitleLookup(pageResponses = []) {
    const englishTitleByTmdbId = new Map();
    pageResponses
        .flatMap((pageResponse) => pageResponse.results ?? [])
        .forEach((movie) => {
        englishTitleByTmdbId.set(movie.id, pickPreferredMovieTitle({
            englishTitle: movie?.title,
            localizedTitle: movie?.title,
            originalTitle: movie?.original_title,
        }));
    });
    return englishTitleByTmdbId;
}
async function fetchBrowseCatalogPage(query) {
    const genreMap = await getGenreMap();
    const today = new Date().toISOString().slice(0, 10);
    const normalizedQuery = query.query?.trim();
    const endpoint = normalizedQuery ? '/search/movie' : '/discover/movie';
    const requestedPage = query.page ?? 1;
    const selectedLanguageCodes = resolveSelectedLanguageCodes(query);
    const browseLocale = getTmdbBrowseLocale(selectedLanguageCodes);
    const shouldExpandSearchPages = Boolean(normalizedQuery &&
        (query.genres?.length ||
            query.verdicts?.length ||
            query.decades?.length ||
            query.minRating !== undefined ||
            query.releaseYearMin !== undefined ||
            query.releaseYearMax !== undefined ||
            query.exactYear !== undefined ||
            query.minRuntime !== undefined ||
            query.maxRuntime !== undefined ||
            query.languages?.length ||
            query.streamingPlatforms?.length ||
            query.directorQuery?.trim() ||
            query.castQuery?.trim()));
    const actualRequestedPage = shouldExpandSearchPages
        ? Math.max(1, (requestedPage - 1) * browseSamplePageSize + 1)
        : requestedPage;
    const requestQuery = normalizedQuery
        ? {
            include_adult: false,
            language: browseLocale,
            page: actualRequestedPage,
            query: normalizedQuery,
            primary_release_year: query.exactYear,
            year: query.exactYear,
        }
        : await buildBrowseDiscoverQuery(query);
    const releaseDateUpperBound = clampReleaseDateUpperBound(requestQuery['primary_release_date.lte'], today);
    const response = await tmdbFetch(endpoint, {
        query: {
            ...requestQuery,
            'primary_release_date.lte': releaseDateUpperBound,
        },
    });
    const useSampledBrowsePages = !normalizedQuery && !query.sortBy && !needsBrowseDetails(query);
    const pageResponses = await fetchBrowsePageResponses(endpoint, requestQuery, requestedPage, response.total_pages, response, {
        shouldExpandSearchPages,
        useSampledBrowsePages,
        releaseDateUpperBound,
    });
    const englishTitleByTmdbId = browseLocale === 'en-US'
        ? new Map()
        : buildEnglishTitleLookup(await fetchBrowsePageResponses(endpoint, {
            ...requestQuery,
            language: 'en-US',
        }, requestedPage, response.total_pages, await fetchBrowsePageResponse(endpoint, {
            ...requestQuery,
            language: 'en-US',
        }, response.page, releaseDateUpperBound), {
            shouldExpandSearchPages,
            useSampledBrowsePages,
            releaseDateUpperBound,
        }));
    const summaryMovies = dedupeBrowseMovies(pageResponses
        .flatMap((pageResponse) => pageResponse.results)
        .map((movie) => mapSummaryMovie(movie, genreMap, {
        englishTitle: englishTitleByTmdbId.get(movie.id),
    })));
    const canTrustTmdbStreamingQuery = endpoint === '/discover/movie' && Boolean(query.streamingPlatforms?.length);
    let movies = summaryMovies.filter((movie) => matchesBrowseMovie(movie, query, { skipStreamingPlatforms: canTrustTmdbStreamingQuery }));
    if (needsBrowseDetails(query)) {
        const detailedMovies = await Promise.all(pageResponses
            .flatMap((pageResponse) => pageResponse.results)
            .map((movie) => fetchBrowseMovieDetails(movie.id, genreMap, browseLocale, englishTitleByTmdbId.get(movie.id)).catch(() => mapSummaryMovie(movie, genreMap, {
            englishTitle: englishTitleByTmdbId.get(movie.id),
        }))));
        const filteredDetailedMovies = dedupeBrowseMovies(detailedMovies.filter((movie) => matchesBrowseMovie(movie, query)));
        if (filteredDetailedMovies.length > 0) {
            movies = filteredDetailedMovies;
        }
        else if (query.streamingPlatforms?.length && !canTrustTmdbStreamingQuery) {
            movies = [];
        }
    }
    return {
        movies,
        page: requestedPage,
        totalPages: useSampledBrowsePages || shouldExpandSearchPages
            ? Math.max(1, Math.ceil(response.total_pages / browseSamplePageSize))
            : response.total_pages,
        totalResults: response.total_results,
        source: 'tmdb',
    };
}
export async function fetchBrowseMovies(query = {}) {
    const cacheKey = serializeBrowseMovieQuery(query);
    if (!browsePageCache.has(cacheKey)) {
        browsePageCache.set(cacheKey, (async () => {
            try {
                return await fetchBrowseCatalogPage(query);
            }
            catch {
                const fallbackMovies = localMovies.filter((movie) => matchesBrowseMovie(movie, query));
                const page = query.page ?? 1;
                const pageSize = 20;
                const start = (page - 1) * pageSize;
                const end = start + pageSize;
                return {
                    movies: fallbackMovies.slice(start, end),
                    page,
                    totalPages: Math.max(1, Math.ceil(fallbackMovies.length / pageSize)),
                    totalResults: fallbackMovies.length,
                    source: 'local',
                };
            }
        })());
    }
    return browsePageCache.get(cacheKey);
}
export async function fetchTrendingMovies(limit = 6) {
    if (!trendingCache.has(limit)) {
        trendingCache.set(limit, Promise.all([getGenreMap(), tmdbFetch('/trending/movie/week')]).then(([genreMap, response]) => response.results.slice(0, limit).map((movie) => mapSummaryMovie(movie, genreMap))));
    }
    return trendingCache.get(limit);
}
export async function fetchTmdbMovieByRouteId(routeId) {
    const tmdbId = fromTmdbMovieId(routeId);
    if (!tmdbId)
        return null;
    if (detailCache.has(tmdbId)) {
        return detailCache.get(tmdbId);
    }
    const promise = (async () => {
        const genreMap = await getGenreMap();
        const [details, providers, similarResponse] = await Promise.all([
            tmdbFetch(`/movie/${tmdbId}`, {
                query: { append_to_response: 'credits,videos,recommendations' },
            }),
            tmdbFetch(`/movie/${tmdbId}/watch/providers`).catch(() => ({ results: {} })),
            tmdbFetch(`/movie/${tmdbId}/similar`).catch(() => ({ results: [] })),
        ]);
        const movie = mapDetailedMovie(details, genreMap);
        const watchProviders = mapWatchProviders(providers, details);
        const similarMovies = (similarResponse.results ?? [])
            .slice(0, 6)
            .map((entry) => mapSummaryMovie(entry, genreMap));
        const recommendations = (details.recommendations?.results ?? [])
            .slice(0, 6)
            .map((entry) => mapSummaryMovie(entry, genreMap));
        return {
            movie: {
                ...movie,
                streaming: watchProviders.map((provider) => provider.name),
                watchProviders,
            },
            review: null,
            similarMovies,
            recommendations,
        };
    })();
    detailCache.set(tmdbId, promise);
    return promise;
}
export async function fetchMoviesByRouteIds(routeIds) {
    const tmdbIds = routeIds.map(fromTmdbMovieId).filter((value) => value !== null);
    if (!tmdbIds.length)
        return [];
    const movies = await Promise.all(tmdbIds.map((id) => fetchTmdbMovieByRouteId(toTmdbMovieId(id))));
    return movies.map((entry) => entry?.movie).filter((movie) => Boolean(movie));
}
export async function fetchTmdbCollections(previewLimit = 8) {
    const claimedMovieIds = new Set();
    const collections = [];
    for (const collection of collectionDefinitions) {
        const page = await fetchCollectionResults(collection, {
            page: 1,
            limit: previewLimit,
            excludeIds: Array.from(claimedMovieIds),
        });
        page.movies.forEach((movie) => claimedMovieIds.add(movie.id));
        collections.push({
            ...collection,
            movies: page.movies,
            currentPage: page.page,
            totalPages: page.totalPages,
            totalResults: page.totalResults,
            tmdbTotalResults: page.tmdbTotalResults,
            uniqueLoadedCount: page.movies.length,
            hasMore: page.hasMore,
        });
    }
    return collections;
}
export async function fetchTmdbCollectionPage(collectionId, options = {}) {
    const definition = getCollectionDefinition(collectionId);
    if (!definition) {
        throw new Error(`Unknown collection: ${collectionId}`);
    }
    return {
        collectionId,
        ...(await fetchCollectionResults(definition, options)),
    };
}
export function isTmdbMovieId(id) {
    return fromTmdbMovieId(id) !== null;
}
