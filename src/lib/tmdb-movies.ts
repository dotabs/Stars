import { browseCountryCodeByLabel, normalizeBrowseCountry, browseStreamingPlatforms } from '@/lib/movie-constants';
import { movies as localMovies } from '@/data/movies';
import type { Movie, Review, SortOption, Verdict } from '@/types';
import { getTmdbImageUrl, tmdbFetch } from '@/lib/tmdb';

type TmdbGenre = {
  id: number;
  name: string;
};

type TmdbMovieSummary = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids?: number[];
  release_date?: string;
  vote_average: number;
  vote_count: number;
  popularity?: number;
  original_language?: string;
};

type TmdbMovieDetails = TmdbMovieSummary & {
  genres?: TmdbGenre[];
  runtime?: number | null;
  production_countries?: { iso_3166_1: string; name: string }[];
  spoken_languages?: { english_name: string; iso_639_1: string }[];
  credits?: {
    cast: { id: number; name: string }[];
    crew: { id: number; name: string; job: string }[];
  };
  videos?: {
    results: { key: string; site: string; type: string }[];
  };
  recommendations?: {
    results: TmdbMovieSummary[];
  };
};

type TmdbListResponse = {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbMovieSummary[];
};

type TmdbPersonSearchResponse = {
  page: number;
  results: Array<{ id: number; name: string; known_for_department?: string }>;
};

type BrowsePage = {
  movies: Movie[];
  page: number;
  totalPages: number;
  totalResults: number;
  source: 'tmdb' | 'local';
};

export type BrowseMovieQuery = {
  page?: number;
  query?: string;
  genres?: string[];
  verdicts?: Verdict[];
  decades?: number[];
  minRating?: number;
  releaseYearMin?: number;
  releaseYearMax?: number;
  exactYear?: number;
  minRuntime?: number;
  maxRuntime?: number;
  country?: string;
  streamingPlatforms?: string[];
  directorQuery?: string;
  castQuery?: string;
  sortBy?: SortOption | null;
};

type TmdbWatchProviderResponse = {
  results?: Partial<Record<
    string,
    {
      flatrate?: Array<{ provider_id?: number; provider_name: string }>;
      rent?: Array<{ provider_id?: number; provider_name: string }>;
      buy?: Array<{ provider_id?: number; provider_name: string }>;
    }
  >>;
};

type TmdbQueryParams = Record<string, string | number | boolean | undefined>;

type HomeFeed = {
  spotlightMovie: Movie | null;
  latestMovies: Movie[];
  trendingMovies: Movie[];
  topRatedMovies: Movie[];
  popularMovies: Movie[];
};

type TmdbCollection = {
  id: string;
  title: string;
  description: string;
  endpoint: string;
};

const browseSamplePageSize = 5;

const countryByLanguageCode: Record<string, string> = {
  en: 'USA',
  fr: 'France',
  de: 'Germany',
  ja: 'Japan',
  ko: 'South Korea',
  es: 'Spain',
  it: 'Italy',
  pt: 'Brazil',
};

const collectionDefinitions: TmdbCollection[] = [
  {
    id: 'trending-week',
    title: 'Trending This Week',
    description: 'The titles pulling the strongest attention on TMDB right now.',
    endpoint: '/trending/movie/week',
  },
  {
    id: 'now-playing',
    title: 'Now Playing',
    description: 'Live theatrical releases currently moving through the market.',
    endpoint: '/movie/now_playing',
  },
  {
    id: 'top-rated',
    title: 'Top Rated',
    description: "TMDB's highest-rated long-run film list.",
    endpoint: '/movie/top_rated',
  },
  {
    id: 'popular',
    title: 'Popular Worldwide',
    description: 'Broad audience favorites ranked by TMDB popularity.',
    endpoint: '/movie/popular',
  },
];

let genreMapPromise: Promise<Map<number, string>> | null = null;
const detailCache = new Map<number, Promise<{ movie: Movie; review: Review; similarMovies: Movie[] }>>();
const browseMovieCache = new Map<number, Promise<Movie>>();
const personSearchCache = new Map<string, Promise<number[]>>();
const browsePageCache = new Map<string, Promise<BrowsePage>>();
const trendingCache = new Map<number, Promise<Movie[]>>();
const listCache = new Map<string, Promise<Movie[]>>();

const supportedStreamingLabels = new Set(browseStreamingPlatforms.map((platform) => platform.label));
const streamingLabelByProviderId = new Map(
  browseStreamingPlatforms.map((platform) => [Number(platform.value), platform.label] as const),
);

const streamingLabelAliases: Record<string, string> = {
  'amazon prime': 'Amazon Prime',
  'amazon prime video': 'Amazon Prime',
  'amazon video': 'Amazon Prime',
  'apple tv+': 'Apple TV+',
  'apple tv plus': 'Apple TV+',
  'disney+': 'Disney+',
  'disney plus': 'Disney+',
  'hbo max': 'Max',
  hulu: 'Hulu',
  max: 'Max',
  mubi: 'MUBI',
  netflix: 'Netflix',
  peacock: 'Peacock',
  'peacock premium': 'Peacock',
  'peacock premium plus': 'Peacock',
  'paramount+': 'Paramount+',
  'paramount plus': 'Paramount+',
};

function toTmdbMovieId(id: number) {
  return `tmdb-${id}`;
}

function sortStrings(values: string[] | undefined) {
  return values ? [...values].sort((left, right) => left.localeCompare(right)) : undefined;
}

function sortNumbers(values: number[] | undefined) {
  return values ? [...values].sort((left, right) => left - right) : undefined;
}

export function serializeBrowseMovieQuery(query: BrowseMovieQuery = {}) {
  return JSON.stringify({
    ...query,
    genres: sortStrings(query.genres),
    verdicts: sortStrings(query.verdicts),
    decades: sortNumbers(query.decades),
    streamingPlatforms: sortStrings(query.streamingPlatforms),
    page: query.page ?? 1,
    sortBy: query.sortBy ?? null,
  });
}

function fromTmdbMovieId(id: string) {
  if (!id.startsWith('tmdb-')) return null;
  const parsed = Number(id.replace('tmdb-', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function getReleaseYear(date?: string) {
  const year = Number((date ?? '0').slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();
}

function getDecade(year: number) {
  return Math.floor(year / 10) * 10;
}

function scoreToVerdict(score: number): Movie['verdict'] {
  if (score >= 8.8) return 'Masterpiece';
  if (score >= 7.8) return 'Essential';
  if (score >= 6.8) return 'Recommended';
  if (score >= 5.5) return 'Mixed';
  return 'Skip';
}

function normalizeStreamingLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  return streamingLabelAliases[normalized] ?? label.trim();
}

async function getGenreMap() {
  if (!genreMapPromise) {
    genreMapPromise = tmdbFetch<{ genres: TmdbGenre[] }>('/genre/movie/list').then((response) => {
      return new Map(response.genres.map((genre) => [genre.id, genre.name]));
    });
  }

  return genreMapPromise;
}

async function getGenreIdMap() {
  const genreMap = await getGenreMap();
  return new Map(Array.from(genreMap.entries(), ([id, name]) => [name, id]));
}

function mapCountry(details?: TmdbMovieDetails, movie?: TmdbMovieSummary) {
  if (details?.production_countries?.[0]?.name) return details.production_countries[0].name;
  const code = movie?.original_language ?? 'en';
  return countryByLanguageCode[code] ?? code.toUpperCase();
}

function mapLanguage(details?: TmdbMovieDetails, movie?: TmdbMovieSummary) {
  if (details?.spoken_languages?.[0]?.english_name) return details.spoken_languages[0].english_name;
  const code = movie?.original_language ?? 'en';
  return countryByLanguageCode[code] ?? code.toUpperCase();
}

function mapSummaryMovie(movie: TmdbMovieSummary, genreMap: Map<number, string>): Movie {
  const year = getReleaseYear(movie.release_date);
  const score = Number(movie.vote_average.toFixed(1));
  const genres =
    movie.genre_ids
      ?.map((genreId) => genreMap.get(genreId))
      .filter((genre): genre is string => Boolean(genre)) ?? [];

  return {
    id: toTmdbMovieId(movie.id),
    source: 'tmdb',
    tmdbId: movie.id,
    title: movie.title,
    year,
    releaseDate: movie.release_date,
    genres: genres.length ? genres : ['Drama'],
    verdict: scoreToVerdict(score),
    score,
    reviewCount: movie.vote_count,
    popularity: movie.popularity,
    poster: movie.poster_path ? getTmdbImageUrl(movie.poster_path, 'w780') : '',
    backdrop: movie.backdrop_path ? getTmdbImageUrl(movie.backdrop_path, 'w1280') : '',
    director: 'Not available',
    cast: [],
    runtime: 0,
    synopsis: movie.overview || 'No synopsis available yet.',
    country: mapCountry(undefined, movie),
    language: mapLanguage(undefined, movie),
    streaming: [],
    decade: getDecade(year),
  };
}

function buildTrailerUrl(details: TmdbMovieDetails) {
  const trailer = details.videos?.results.find((video) => video.site === 'YouTube' && video.type === 'Trailer');
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined;
}

function mapDetailedMovie(details: TmdbMovieDetails, genreMap: Map<number, string>): Movie {
  const base = mapSummaryMovie(details, genreMap);
  const director = details.credits?.crew.find((person) => person.job === 'Director')?.name ?? 'Unknown Director';
  const cast = details.credits?.cast.slice(0, 5).map((person) => person.name) ?? [];

  return {
    ...base,
    genres: details.genres?.map((genre) => genre.name) ?? base.genres,
    runtime: details.runtime ?? 0,
    director,
    cast,
    country: mapCountry(details, details),
    language: mapLanguage(details, details),
    trailerUrl: buildTrailerUrl(details),
  };
}

async function fetchBrowseMovieDetails(tmdbId: number, genreMap: Map<number, string>) {
  if (!browseMovieCache.has(tmdbId)) {
    browseMovieCache.set(
      tmdbId,
      Promise.all([
        tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, {
          query: { append_to_response: 'credits' },
        }),
        tmdbFetch<TmdbWatchProviderResponse>(`/movie/${tmdbId}/watch/providers`).catch(
          (): TmdbWatchProviderResponse => ({ results: {} }),
        ),
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
          ...mapDetailedMovie(details, genreMap),
          streaming: providerNames,
        };
      }),
    );
  }

  return browseMovieCache.get(tmdbId)!;
}

async function searchPeopleIds(query: string, department: 'Directing' | 'Acting') {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const cacheKey = `${department}:${normalizedQuery}`;
  if (!personSearchCache.has(cacheKey)) {
    personSearchCache.set(
      cacheKey,
      tmdbFetch<TmdbPersonSearchResponse>('/search/person', {
        query: {
          include_adult: false,
          page: 1,
          query,
        },
      }).then((response) =>
        response.results
          .filter((person) =>
            department === 'Directing'
              ? person.known_for_department === 'Directing'
              : person.known_for_department === 'Acting',
          )
          .slice(0, 5)
          .map((person) => person.id),
      ),
    );
  }

  return personSearchCache.get(cacheKey)!;
}

function buildSyntheticReview(movie: Movie): Review {
  return {
    id: `${movie.id}-review`,
    movieId: movie.id,
    author: 'STARS Editorial Desk',
    date: new Date().toISOString().slice(0, 10),
    summary: movie.synopsis,
    pros: [
      `${movie.title} is coming directly from TMDB live data.`,
      `Audience score currently sits at ${movie.score.toFixed(1)}/10.`,
      movie.cast.length
        ? `Main cast includes ${movie.cast.slice(0, 3).join(', ')}.`
        : 'Cast metadata is available when TMDB provides credits.',
    ],
    cons: [
      'This page uses generated editorial copy until a custom review is written.',
      'Watch-provider data is not wired yet, so streaming badges stay minimal.',
    ],
    sections: {
      story: movie.synopsis,
      performances: movie.cast.length
        ? `${movie.cast.join(', ')} make up the principal cast listed in TMDB.`
        : 'Cast detail is limited for this title.',
      direction: `${movie.director} is credited as director in TMDB metadata.`,
      visuals: movie.backdrop
        ? 'Backdrop and poster art are being rendered directly from TMDB image assets.'
        : 'Poster and backdrop data are limited for this title.',
      sound: 'Sound commentary is generated placeholder copy pending authored review content.',
      themes: `${movie.genres.join(', ')} define the current genre and thematic profile for this title.`,
    },
    scoreBreakdown: {
      story: movie.score,
      performances: Math.max(5, Math.min(10, movie.score - 0.1)),
      direction: Math.max(5, Math.min(10, movie.score)),
      visuals: Math.max(5, Math.min(10, movie.score + 0.2)),
      sound: Math.max(5, Math.min(10, movie.score - 0.2)),
    },
  };
}

async function fetchList(endpoint: string, limit = 12) {
  const cacheKey = `${endpoint}:${limit}`;
  if (!listCache.has(cacheKey)) {
    listCache.set(
      cacheKey,
      Promise.all([getGenreMap(), tmdbFetch<TmdbListResponse>(endpoint)]).then(([genreMap, response]) =>
        response.results.slice(0, limit).map((movie) => mapSummaryMovie(movie, genreMap)),
      ),
    );
  }

  return listCache.get(cacheKey)!;
}

export async function fetchHomeFeed(): Promise<HomeFeed> {
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

function mapBrowseSort(sortBy: SortOption | null | undefined) {
  if (sortBy === 'highestRated') return 'vote_average.desc';
  if (sortBy === 'mostPopular') return 'popularity.desc';
  if (sortBy === 'mostReviewed') return 'vote_count.desc';
  if (sortBy === 'releaseDate') return 'primary_release_date.asc';
  if (sortBy === 'newest') return 'primary_release_date.desc';
  return 'primary_release_date.desc';
}

function greatestCommonDivisor(a: number, b: number) {
  let left = Math.abs(a);
  let right = Math.abs(b);

  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }

  return left;
}

function buildBrowsePageSequence(totalPages: number) {
  const limit = Math.max(1, Math.min(totalPages, 500));
  const stepCandidates = [97, 89, 83, 79, 73, 71, 67, 61, 59, 53, 47, 43, 41, 37, 31, 29, 23, 19, 17, 13, 11, 7, 5, 3, 2];
  const step = stepCandidates.find((candidate) => candidate < limit && greatestCommonDivisor(candidate, limit) === 1) ?? 1;
  const pages: number[] = [];
  const seen = new Set<number>();
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

function getBrowseSamplePages(totalPages: number, logicalPage: number) {
  const sequence = buildBrowsePageSequence(totalPages);
  const start = Math.max(0, logicalPage - 1) * browseSamplePageSize;
  return sequence.slice(start, start + browseSamplePageSize);
}

function getBrowseSequentialPages(totalPages: number, logicalPage: number) {
  const start = Math.max(0, logicalPage - 1) * browseSamplePageSize + 1;
  const end = Math.min(totalPages, start + browseSamplePageSize - 1);

  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function dedupeBrowseMovies(movies: Movie[]) {
  return Array.from(new Map(movies.map((movie) => [movie.id, movie])).values());
}

function needsBrowseDetails(query: BrowseMovieQuery) {
  return Boolean(
    query.verdicts?.length ||
      query.streamingPlatforms?.length ||
      query.directorQuery?.trim() ||
      query.castQuery?.trim() ||
      query.minRuntime !== undefined ||
      query.maxRuntime !== undefined,
  );
}

function matchesStreamingPlatforms(
  movie: Movie,
  selectedPlatforms: string[] | undefined,
  options?: { skipMissingMovieStreaming?: boolean },
) {
  if (!selectedPlatforms?.length) return true;
  if (options?.skipMissingMovieStreaming && !(movie.streaming ?? []).length) return true;

  const normalizedSelectedPlatforms = new Set(selectedPlatforms.map(normalizeStreamingLabel));
  const normalizedMoviePlatforms = (movie.streaming ?? []).map(normalizeStreamingLabel);

  return normalizedMoviePlatforms.some((service) => normalizedSelectedPlatforms.has(service));
}

function getDateRange(query: BrowseMovieQuery) {
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

async function buildBrowseDiscoverQuery(query: BrowseMovieQuery) {
  const genreIdMap = await getGenreIdMap();
  const [directorIds, castIds] = await Promise.all([
    query.directorQuery ? searchPeopleIds(query.directorQuery, 'Directing') : Promise.resolve([]),
    query.castQuery ? searchPeopleIds(query.castQuery, 'Acting') : Promise.resolve([]),
  ]);
  const { minDate, maxDate } = getDateRange(query);
  const genreIds = (query.genres ?? [])
    .map((genre) => genreIdMap.get(genre))
    .filter((genreId): genreId is number => Number.isFinite(genreId));
  const providerIds = (query.streamingPlatforms ?? [])
    .map((label) => browseStreamingPlatforms.find((platform) => platform.label === label)?.value)
    .filter((providerId): providerId is string => Boolean(providerId));

  return {
    include_adult: false,
    include_video: false,
    language: 'en-US',
    page: query.page ?? 1,
    sort_by: mapBrowseSort(query.sortBy),
    'primary_release_date.gte': minDate,
    'primary_release_date.lte': maxDate,
    'vote_average.gte': query.minRating && query.minRating > 0 ? query.minRating : undefined,
    'vote_count.gte': query.sortBy === 'highestRated' ? 100 : 5,
    with_cast: castIds.length ? castIds.join('|') : undefined,
    with_crew: directorIds.length ? directorIds.join('|') : undefined,
    with_genres: genreIds.length ? genreIds.join(',') : undefined,
    with_origin_country: query.country ? browseCountryCodeByLabel[query.country] : undefined,
    'with_runtime.gte': query.minRuntime && query.minRuntime > 0 ? query.minRuntime : undefined,
    'with_runtime.lte': query.maxRuntime && query.maxRuntime < 240 ? query.maxRuntime : undefined,
    with_watch_providers: providerIds.length ? providerIds.join('|') : undefined,
    watch_region: providerIds.length ? 'US' : undefined,
  } satisfies TmdbQueryParams;
}

function matchesBrowseMovie(
  movie: Movie,
  query: BrowseMovieQuery,
  options?: { skipStreamingPlatforms?: boolean },
) {
  const normalizedSearch = query.query?.trim().toLowerCase() ?? '';
  const normalizedDirectorQuery = query.directorQuery?.trim().toLowerCase() ?? '';
  const normalizedCastQuery = query.castQuery?.trim().toLowerCase() ?? '';
  const normalizedCountry = query.country ? normalizeBrowseCountry(query.country) : '';

  return (
    (!(query.genres?.length) || movie.genres.some((genre) => query.genres?.includes(genre))) &&
    (!(query.verdicts?.length) || query.verdicts.includes(movie.verdict)) &&
    (!(query.decades?.length) || query.decades.includes(movie.decade)) &&
    matchesStreamingPlatforms(movie, query.streamingPlatforms, {
      skipMissingMovieStreaming: options?.skipStreamingPlatforms,
    }) &&
    (query.minRating === undefined || movie.score >= query.minRating) &&
    (query.releaseYearMin === undefined || movie.year >= query.releaseYearMin) &&
    (query.releaseYearMax === undefined || movie.year <= query.releaseYearMax) &&
    (query.exactYear === undefined || movie.year === query.exactYear) &&
    (query.minRuntime === undefined || (movie.runtime > 0 && movie.runtime >= query.minRuntime)) &&
    (query.maxRuntime === undefined || (movie.runtime > 0 && movie.runtime <= query.maxRuntime)) &&
    (!normalizedCountry || normalizeBrowseCountry(movie.country) === normalizedCountry) &&
    (!normalizedDirectorQuery || movie.director.toLowerCase().includes(normalizedDirectorQuery)) &&
    (!normalizedCastQuery ||
      movie.cast.some((member) => member.toLowerCase().includes(normalizedCastQuery))) &&
    (!normalizedSearch || movie.title.toLowerCase().includes(normalizedSearch))
  );
}

function clampReleaseDateUpperBound(existingMaxDate: string | number | boolean | undefined, today: string) {
  if (typeof existingMaxDate !== 'string' || !existingMaxDate) {
    return today;
  }

  return existingMaxDate < today ? existingMaxDate : today;
}

async function fetchBrowseCatalogPage(query: BrowseMovieQuery) {
  const genreMap = await getGenreMap();
  const today = new Date().toISOString().slice(0, 10);
  const normalizedQuery = query.query?.trim();
  const endpoint = normalizedQuery ? '/search/movie' : '/discover/movie';
  const requestedPage = query.page ?? 1;
  const shouldExpandSearchPages = Boolean(
    normalizedQuery &&
      (query.genres?.length ||
        query.verdicts?.length ||
        query.decades?.length ||
        query.minRating !== undefined ||
        query.releaseYearMin !== undefined ||
        query.releaseYearMax !== undefined ||
        query.exactYear !== undefined ||
        query.minRuntime !== undefined ||
        query.maxRuntime !== undefined ||
        query.country ||
        query.streamingPlatforms?.length ||
        query.directorQuery?.trim() ||
        query.castQuery?.trim()),
  );
  const actualRequestedPage = shouldExpandSearchPages
    ? Math.max(1, (requestedPage - 1) * browseSamplePageSize + 1)
    : requestedPage;
  const requestQuery: TmdbQueryParams = normalizedQuery
    ? {
        include_adult: false,
        language: 'en-US',
        page: actualRequestedPage,
        query: normalizedQuery,
        primary_release_year: query.exactYear,
        year: query.exactYear,
      }
    : await buildBrowseDiscoverQuery(query);
  const releaseDateUpperBound = clampReleaseDateUpperBound(requestQuery['primary_release_date.lte'], today);
  const response = await tmdbFetch<TmdbListResponse>(endpoint, {
    query: {
      ...requestQuery,
      'primary_release_date.lte': releaseDateUpperBound,
    },
  });

  const useSampledBrowsePages = !normalizedQuery && !query.sortBy && !needsBrowseDetails(query);
  const pageResponses = shouldExpandSearchPages
    ? await Promise.all(
        getBrowseSequentialPages(response.total_pages, requestedPage).map((page) =>
          page === response.page
            ? Promise.resolve(response)
            : tmdbFetch<TmdbListResponse>(endpoint, {
                query: {
                  ...requestQuery,
                  page,
                  'primary_release_date.lte': releaseDateUpperBound,
                },
              }),
        ),
      )
    : useSampledBrowsePages
    ? await Promise.all(
        getBrowseSamplePages(response.total_pages, requestedPage).map((page) =>
          page === response.page
            ? Promise.resolve(response)
            : tmdbFetch<TmdbListResponse>(endpoint, {
                query: {
                  ...requestQuery,
                  page,
                  'primary_release_date.lte': releaseDateUpperBound,
                },
              }),
        ),
      )
    : [response];

  const summaryMovies = dedupeBrowseMovies(
    pageResponses.flatMap((pageResponse) => pageResponse.results).map((movie) => mapSummaryMovie(movie, genreMap)),
  );
  const canTrustTmdbStreamingQuery = endpoint === '/discover/movie' && Boolean(query.streamingPlatforms?.length);

  let movies = summaryMovies.filter((movie) =>
    matchesBrowseMovie(movie, query, { skipStreamingPlatforms: canTrustTmdbStreamingQuery }),
  );

  if (needsBrowseDetails(query)) {
    const detailedMovies = await Promise.all(
      pageResponses
        .flatMap((pageResponse) => pageResponse.results)
        .map((movie) => fetchBrowseMovieDetails(movie.id, genreMap).catch(() => mapSummaryMovie(movie, genreMap))),
    );
    const filteredDetailedMovies = dedupeBrowseMovies(detailedMovies.filter((movie) => matchesBrowseMovie(movie, query)));

    if (filteredDetailedMovies.length > 0) {
      movies = filteredDetailedMovies;
    } else if (query.streamingPlatforms?.length && !canTrustTmdbStreamingQuery) {
      movies = [];
    }
  }

  return {
    movies,
    page: requestedPage,
    totalPages:
      useSampledBrowsePages || shouldExpandSearchPages
        ? Math.max(1, Math.ceil(response.total_pages / browseSamplePageSize))
        : response.total_pages,
    totalResults: response.total_results,
    source: 'tmdb',
  } satisfies BrowsePage;
}

export async function fetchBrowseMovies(query: BrowseMovieQuery = {}) {
  const cacheKey = serializeBrowseMovieQuery(query);

  if (!browsePageCache.has(cacheKey)) {
    browsePageCache.set(
      cacheKey,
      (async () => {
        try {
          return await fetchBrowseCatalogPage(query);
        } catch {
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
          } satisfies BrowsePage;
        }
      })(),
    );
  }

  return browsePageCache.get(cacheKey)!;
}

export async function fetchTrendingMovies(limit = 6) {
  if (!trendingCache.has(limit)) {
    trendingCache.set(
      limit,
      Promise.all([getGenreMap(), tmdbFetch<TmdbListResponse>('/trending/movie/week')]).then(
        ([genreMap, response]) => response.results.slice(0, limit).map((movie) => mapSummaryMovie(movie, genreMap)),
      ),
    );
  }

  return trendingCache.get(limit)!;
}

export async function fetchTmdbMovieByRouteId(routeId: string) {
  const tmdbId = fromTmdbMovieId(routeId);
  if (!tmdbId) return null;

  if (detailCache.has(tmdbId)) {
    return detailCache.get(tmdbId)!;
  }

  const promise = (async () => {
    const genreMap = await getGenreMap();
    const details = await tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, {
      query: { append_to_response: 'credits,videos,recommendations' },
    });

    const movie = mapDetailedMovie(details, genreMap);
    const similarMovies = (details.recommendations?.results ?? [])
      .slice(0, 6)
      .map((entry) => mapSummaryMovie(entry, genreMap));

    return {
      movie,
      review: buildSyntheticReview(movie),
      similarMovies,
    };
  })();

  detailCache.set(tmdbId, promise);
  return promise;
}

export async function fetchMoviesByRouteIds(routeIds: string[]) {
  const tmdbIds = routeIds.map(fromTmdbMovieId).filter((value): value is number => value !== null);
  if (!tmdbIds.length) return [];

  const movies = await Promise.all(tmdbIds.map((id) => fetchTmdbMovieByRouteId(toTmdbMovieId(id))));
  return movies.map((entry) => entry?.movie).filter((movie): movie is Movie => Boolean(movie));
}

export async function fetchTmdbCollections() {
  const collections = await Promise.all(
    collectionDefinitions.map(async (collection) => {
      const movies = await fetchList(collection.endpoint, 12);
      return { ...collection, movies };
    }),
  );

  return collections;
}

export function isTmdbMovieId(id: string) {
  return fromTmdbMovieId(id) !== null;
}
