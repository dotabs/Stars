import { movies as localMovies } from '@/data/movies';
import { defaultExploreCountry, type ExploreCountryStat } from '@/data/explore';
import { countryCatalogByKey } from '@/lib/country-catalog';
import { getTmdbImageUrl, tmdbFetch } from '@/lib/tmdb';
import type { Movie } from '@/types';

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

type TmdbListResponse = {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbMovieSummary[];
};

type ExploreBucketId = 'popular' | 'acclaimed' | 'recent' | 'classics' | 'hidden';

type ExploreBucketDefinition = {
  id: ExploreBucketId;
  label: string;
  sortBy: string;
  maxPages: number;
  query: Record<string, string | number | boolean | undefined>;
};

export type ExploreCountryDiscovery = {
  country: ExploreCountryStat;
  lineup: Movie[];
  topPicks: Movie[];
  newestPicks: Movie[];
  hiddenGems: Movie[];
  source: 'tmdb' | 'local';
};

const explorePoolCache = new Map<string, Promise<ExploreCountryStat>>();
const genreMapCache = new Map<string, Promise<Map<number, string>>>();
const bucketDefinitions: ExploreBucketDefinition[] = [
  {
    id: 'popular',
    label: 'Top Picks',
    sortBy: 'popularity.desc',
    maxPages: 3,
    query: {
      'vote_count.gte': 100,
      'primary_release_date.gte': '1950-01-01',
    },
  },
  {
    id: 'acclaimed',
    label: 'Standouts',
    sortBy: 'vote_average.desc',
    maxPages: 3,
    query: {
      'vote_count.gte': 250,
      'primary_release_date.gte': '1950-01-01',
    },
  },
  {
    id: 'recent',
    label: 'Newest',
    sortBy: 'primary_release_date.desc',
    maxPages: 3,
    query: {
      'vote_count.gte': 20,
      'primary_release_date.gte': `${Math.max(1950, new Date().getFullYear() - 5)}-01-01`,
    },
  },
  {
    id: 'classics',
    label: 'Classics',
    sortBy: 'vote_average.desc',
    maxPages: 2,
    query: {
      'vote_count.gte': 60,
      'primary_release_date.gte': '1950-01-01',
      'primary_release_date.lte': '2005-12-31',
    },
  },
  {
    id: 'hidden',
    label: 'Hidden Gems',
    sortBy: 'vote_average.desc',
    maxPages: 2,
    query: {
      'vote_count.gte': 15,
      'vote_count.lte': 220,
      'primary_release_date.gte': '1950-01-01',
    },
  },
];

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

function getTopGenres(countryMovies: Movie[]) {
  const genreMap = new Map<string, number>();

  for (const movie of countryMovies) {
    for (const genre of movie.genres) {
      genreMap.set(genre, (genreMap.get(genre) ?? 0) + 1);
    }
  }

  return [...genreMap.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([genre, count]) => ({ genre, count }));
}

function normalizeMovieCountry(countryKey: string) {
  return countryKey === 'USA' ? 'USA' : countryKey === 'UK' ? 'UK' : countryKey;
}

async function getGenreMap() {
  const cacheKey = 'tmdb-movie-genres';

  if (!genreMapCache.has(cacheKey)) {
    genreMapCache.set(
      cacheKey,
      tmdbFetch<{ genres: TmdbGenre[] }>('/genre/movie/list').then(
        (response) => new Map(response.genres.map((genre) => [genre.id, genre.name])),
      ),
    );
  }

  return genreMapCache.get(cacheKey)!;
}

function mapTmdbMovie(movie: TmdbMovieSummary, genreMap: Map<number, string>, countryKey: string): Movie {
  const year = getReleaseYear(movie.release_date);
  const score = Number(movie.vote_average.toFixed(1));
  const genres =
    movie.genre_ids
      ?.map((genreId) => genreMap.get(genreId))
      .filter((genre): genre is string => Boolean(genre)) ?? [];

  return {
    id: `tmdb-${movie.id}`,
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
    director: 'TMDB discovery',
    cast: [],
    runtime: 0,
    synopsis: movie.overview || 'No synopsis available yet.',
    country: normalizeMovieCountry(countryKey),
    language: movie.original_language?.toUpperCase() ?? 'N/A',
    streaming: [],
    decade: getDecade(year),
  };
}

function getLocalCountryFallback(countryKey: string) {
  const fallbackMovies = localMovies.filter((movie) => movie.country === normalizeMovieCountry(countryKey));
  const genreCounts = getTopGenres(fallbackMovies);
  const averageScore =
    fallbackMovies.length === 0
      ? 0
      : Number((fallbackMovies.reduce((total, movie) => total + movie.score, 0) / fallbackMovies.length).toFixed(1));
  const entry = countryCatalogByKey.get(countryKey) ?? countryCatalogByKey.get(defaultExploreCountry.key)!;

  return {
    key: entry.key,
    label: entry.label,
    globeName: entry.globeName,
    flag: entry.flag,
    region: entry.region,
    filmCount: fallbackMovies.length,
    averageScore,
    topGenres: genreCounts.slice(0, 4).map(({ genre }) => genre),
    genreCounts,
    topFilms: [...fallbackMovies].sort((left, right) => right.score - left.score || right.year - left.year).slice(0, 5),
    posterFilms: fallbackMovies.filter((movie) => movie.poster).slice(0, 4),
    movies: [...fallbackMovies].sort((left, right) => right.year - left.year || right.score - left.score),
    explored: false,
    totalPoolResults: fallbackMovies.length,
    source: 'local' as const,
    standoutTitles: fallbackMovies.slice(0, 4).map((movie) => movie.title),
  } satisfies ExploreCountryStat;
}

function createSeedFromCountry(countryKey: string) {
  let seed = 0;

  for (let index = 0; index < countryKey.length; index += 1) {
    seed = (seed * 33 + countryKey.charCodeAt(index)) >>> 0;
  }

  return seed || 1;
}

function mulberry32(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let next = Math.imul(value ^ (value >>> 15), value | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function choosePages(totalPages: number, maxPages: number, seed: number) {
  const cappedTotalPages = Math.max(1, Math.min(totalPages, 500));
  const targetCount = Math.min(cappedTotalPages, maxPages);
  const random = mulberry32(seed);
  const pages = new Set<number>([1]);

  while (pages.size < targetCount) {
    pages.add(Math.max(1, Math.floor(random() * cappedTotalPages) + 1));
  }

  return [...pages];
}

async function fetchBucketMovies(countryKey: string, definition: ExploreBucketDefinition, genreMap: Map<number, string>) {
  const country = countryCatalogByKey.get(countryKey);
  if (!country) return { movies: [] as Movie[], totalResults: 0 };

  const baseQuery = {
    include_adult: false,
    include_video: false,
    language: 'en-US',
    sort_by: definition.sortBy,
    with_origin_country: country.code,
    ...definition.query,
  };

  const firstPage = await tmdbFetch<TmdbListResponse>('/discover/movie', {
    query: {
      ...baseQuery,
      page: 1,
    },
  });

  const seed = createSeedFromCountry(`${countryKey}-${definition.id}`);
  const pages = choosePages(firstPage.total_pages, definition.maxPages, seed);
  const extraPages = await Promise.all(
    pages
      .filter((page) => page !== 1)
      .map((page) =>
        tmdbFetch<TmdbListResponse>('/discover/movie', {
          query: {
            ...baseQuery,
            page,
          },
        }),
      ),
  );

  const movies = [firstPage, ...extraPages]
    .flatMap((response) => response.results)
    .filter((movie) => Boolean(movie.title))
    .map((movie) => mapTmdbMovie(movie, genreMap, countryKey));

  return {
    movies,
    totalResults: firstPage.total_results,
  };
}

function dedupeMovies(movies: Movie[]) {
  return Array.from(new Map(movies.map((movie) => [movie.id, movie])).values());
}

function buildCountryPool(countryKey: string, movies: Movie[], totalPoolResults: number, source: 'tmdb' | 'local') {
  const entry = countryCatalogByKey.get(countryKey) ?? countryCatalogByKey.get(defaultExploreCountry.key)!;
  const sortedMovies = dedupeMovies(movies).sort((left, right) => {
    const popularityDelta = (right.popularity ?? 0) - (left.popularity ?? 0);
    if (Math.abs(popularityDelta) > 0.001) return popularityDelta;
    return right.score - left.score || right.year - left.year;
  });
  const genreCounts = getTopGenres(sortedMovies);
  const averageScore =
    sortedMovies.length === 0
      ? 0
      : Number((sortedMovies.reduce((total, movie) => total + movie.score, 0) / sortedMovies.length).toFixed(1));

  return {
    key: entry.key,
    label: entry.label,
    globeName: entry.globeName,
    flag: entry.flag,
    region: entry.region,
    filmCount: sortedMovies.length,
    averageScore,
    topGenres: genreCounts.slice(0, 4).map(({ genre }) => genre),
    genreCounts,
    topFilms: [...sortedMovies].sort((left, right) => right.score - left.score || right.year - left.year).slice(0, 5),
    posterFilms: sortedMovies.filter((movie) => movie.poster).slice(0, 4),
    movies: [...sortedMovies].sort((left, right) => right.year - left.year || right.score - left.score),
    explored: false,
    totalPoolResults,
    source,
    standoutTitles: [...sortedMovies]
      .sort((left, right) => (right.popularity ?? 0) - (left.popularity ?? 0) || right.score - left.score)
      .slice(0, 4)
      .map((movie) => movie.title),
  } satisfies ExploreCountryStat;
}

function bucketizeMovies(movies: Movie[]) {
  const currentYear = new Date().getFullYear();

  return {
    topPicks: [...movies].sort(
      (left, right) =>
        (right.popularity ?? 0) - (left.popularity ?? 0) ||
        (right.reviewCount ?? 0) - (left.reviewCount ?? 0) ||
        right.score - left.score,
    ),
    newestPicks: [...movies].sort(
      (left, right) =>
        (right.releaseDate ?? `${right.year}-01-01`).localeCompare(left.releaseDate ?? `${left.year}-01-01`) ||
        right.score - left.score,
    ),
    hiddenGems: [...movies]
      .filter((movie) => (movie.popularity ?? 0) < 60 || (movie.reviewCount ?? 0) < 600)
      .sort((left, right) => right.score - left.score || right.year - left.year),
    classics: [...movies]
      .filter((movie) => movie.year <= 2005)
      .sort((left, right) => right.score - left.score || right.year - left.year),
    recent: [...movies]
      .filter((movie) => movie.year >= currentYear - 4)
      .sort((left, right) => right.year - left.year || right.score - left.score),
  };
}

function pickFreshMovies(
  source: Movie[],
  count: number,
  usedIds: Set<string>,
  recentIds: Set<string>,
  genreCooldown: Set<string>,
) {
  const fresh = source.filter(
    (movie) =>
      !usedIds.has(movie.id) &&
      !recentIds.has(movie.id) &&
      movie.genres.every((genre) => !genreCooldown.has(genre)),
  );
  const softFresh = source.filter((movie) => !usedIds.has(movie.id) && !recentIds.has(movie.id));
  const fallback = source.filter((movie) => !usedIds.has(movie.id));
  const pool = fresh.length >= count ? fresh : softFresh.length >= count ? softFresh : fallback;
  const selected = pool.slice(0, count);

  for (const movie of selected) {
    usedIds.add(movie.id);
    for (const genre of movie.genres.slice(0, 2)) {
      genreCooldown.add(genre);
    }
  }

  return selected;
}

export async function fetchExploreCountryPool(countryKey: string, options?: { refresh?: boolean }) {
  const cacheKey = countryKey;

  if (!options?.refresh && explorePoolCache.has(cacheKey)) {
    return explorePoolCache.get(cacheKey)!;
  }

  const poolPromise = (async () => {
    try {
      const genreMap = await getGenreMap();
      const bucketResults = await Promise.all(
        bucketDefinitions.map((definition) => fetchBucketMovies(countryKey, definition, genreMap)),
      );
      const allMovies = dedupeMovies(bucketResults.flatMap((bucket) => bucket.movies));
      const totalPoolResults = Math.max(...bucketResults.map((bucket) => bucket.totalResults), allMovies.length);

      if (allMovies.length === 0) {
        return getLocalCountryFallback(countryKey);
      }

      return buildCountryPool(countryKey, allMovies, totalPoolResults, 'tmdb');
    } catch {
      return getLocalCountryFallback(countryKey);
    }
  })();

  explorePoolCache.set(cacheKey, poolPromise);
  return poolPromise;
}

export function buildExploreDiscovery(
  country: ExploreCountryStat,
  options?: { recentMovieIds?: string[]; shuffleSeed?: number },
) {
  const recentIds = new Set(options?.recentMovieIds ?? []);
  const shuffledMovies = [...country.movies];

  if (options?.shuffleSeed !== undefined) {
    const random = mulberry32(options.shuffleSeed);
    shuffledMovies.sort(() => random() - 0.5);
  }

  const buckets = bucketizeMovies(shuffledMovies);
  const usedIds = new Set<string>();
  const genreCooldown = new Set<string>();
  const lineup = [
    ...pickFreshMovies(buckets.topPicks, 3, usedIds, recentIds, genreCooldown),
    ...pickFreshMovies(buckets.hiddenGems, 2, usedIds, recentIds, genreCooldown),
    ...pickFreshMovies(buckets.recent, 2, usedIds, recentIds, genreCooldown),
    ...pickFreshMovies(buckets.classics, 1, usedIds, recentIds, genreCooldown),
  ];

  if (lineup.length < 8) {
    lineup.push(...pickFreshMovies(shuffledMovies, 8 - lineup.length, usedIds, recentIds, genreCooldown));
  }

  return {
    country,
    lineup: lineup.slice(0, 8),
    topPicks: buckets.topPicks.slice(0, 6),
    newestPicks: buckets.newestPicks.slice(0, 6),
    hiddenGems: (buckets.hiddenGems.length > 0 ? buckets.hiddenGems : shuffledMovies).slice(0, 6),
    source: country.source ?? 'local',
  } satisfies ExploreCountryDiscovery;
}

export function prefetchExploreCountryPool(countryKeys: string[]) {
  void Promise.all(
    countryKeys
      .filter((countryKey) => countryCatalogByKey.has(countryKey))
      .map((countryKey) => fetchExploreCountryPool(countryKey).catch(() => null)),
  );
}
