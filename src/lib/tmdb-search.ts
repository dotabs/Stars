import { hasTmdbCredentials } from '@/lib/env';
import { getTmdbImageUrl, tmdbFetch } from '@/lib/tmdb';
import type { PersonCredit, PersonDetails, SearchResult, SearchResultType, TvShowDetails } from '@/types';

type TmdbMultiSearchItem = {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  popularity?: number;
  vote_average?: number;
  profile_path?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  known_for_department?: string;
  known_for?: Array<{
    media_type?: 'movie' | 'tv';
    title?: string;
    name?: string;
  }>;
};

type TmdbMultiSearchResponse = {
  page: number;
  results: TmdbMultiSearchItem[];
  total_pages: number;
  total_results: number;
};

type TmdbTvDetailsResponse = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date?: string;
  last_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  genres?: Array<{ id: number; name: string }>;
  created_by?: Array<{ id: number; name: string }>;
  networks?: Array<{ id: number; name: string }>;
  aggregate_credits?: {
    cast?: Array<{ id: number; name: string; total_episode_count?: number }>;
  };
};

type TmdbPersonDetailsResponse = {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  place_of_birth?: string;
  known_for_department?: string;
  profile_path?: string | null;
  combined_credits?: {
    cast?: TmdbPersonCredit[];
    crew?: TmdbPersonCredit[];
  };
};

type TmdbPersonCredit = {
  id: number;
  media_type?: 'movie' | 'tv';
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  popularity?: number;
  vote_count?: number;
};

type GlobalSearchOptions = {
  limit?: number;
  maxPages?: number;
};

const DEFAULT_GLOBAL_SEARCH_LIMIT = 48;
const DEFAULT_GLOBAL_SEARCH_PAGES = 2;
const searchCache = new Map<string, Promise<SearchResult[]>>();
const tvDetailCache = new Map<number, Promise<TvShowDetails>>();
const personDetailCache = new Map<number, Promise<PersonDetails>>();

function getYearLabel(date?: string) {
  const year = date?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? year : 'Date TBD';
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenizeQuery(query: string) {
  return Array.from(new Set(normalizeSearchText(query).split(/\s+/).filter((token) => token.length >= 2)));
}

function getSearchImage(item: TmdbMultiSearchItem) {
  if (item.media_type === 'person') {
    return item.profile_path ? getTmdbImageUrl(item.profile_path, 'w185') : '';
  }

  return item.poster_path ? getTmdbImageUrl(item.poster_path, 'w342') : '';
}

function buildPersonKnownForTitles(item: TmdbMultiSearchItem) {
  return (item.known_for ?? [])
    .map((entry) => (entry.title ?? entry.name ?? '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildPersonSubtitle(item: TmdbMultiSearchItem) {
  const department = item.known_for_department?.trim() || 'Person';
  const knownForTitles = buildPersonKnownForTitles(item);
  return knownForTitles.length > 0 ? `${department} • ${knownForTitles.join(' • ')}` : department;
}

function buildSearchText(result: Omit<SearchResult, 'relevanceScore'>) {
  return normalizeSearchText(
    [
      result.title,
      result.subtitle,
      result.metadataLine,
      result.knownForDepartment,
      ...(result.knownForTitles ?? []),
      result.overview,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function getTitleMatchScore(title: string, normalizedQuery: string) {
  if (!normalizedQuery) return 0;
  if (title === normalizedQuery) return 1200;
  if (title.startsWith(normalizedQuery)) return 800;
  if (title.includes(normalizedQuery)) return 520;
  return 0;
}

function getTokenScore(text: string, title: string, tokens: string[]) {
  return tokens.reduce((score, token) => {
    if (title.startsWith(token)) return score + 180;
    if (title.includes(token)) return score + 110;
    if (text.includes(token)) return score + 48;
    return score;
  }, 0);
}

function isRelevantResult(result: Omit<SearchResult, 'relevanceScore'>, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTitle = normalizeSearchText(result.title);
  const tokens = tokenizeQuery(query);
  const searchableText = buildSearchText(result);

  if (!normalizedQuery) return false;
  if (normalizedTitle.includes(normalizedQuery)) return true;

  const titleTokenMatches = tokens.filter((token) => normalizedTitle.includes(token)).length;
  const anyTokenInSearchText = tokens.some((token) => searchableText.includes(token));

  if (tokens.length <= 1) {
    return anyTokenInSearchText;
  }

  return titleTokenMatches > 0 || tokens.filter((token) => searchableText.includes(token)).length >= Math.min(2, tokens.length);
}

function scoreResult(result: Omit<SearchResult, 'relevanceScore'>, query: string) {
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

function mapSearchResult(item: TmdbMultiSearchItem, query: string): SearchResult | null {
  if (item.media_type === 'movie') {
    const yearLabel = getYearLabel(item.release_date);
    const resultBase = {
      id: item.id,
      mediaType: 'movie' as const,
      title: item.title?.trim() || 'Untitled movie',
      subtitle: yearLabel,
      yearLabel,
      metadataLine: yearLabel,
      imageUrl: getSearchImage(item),
      overview: item.overview?.trim() || 'No synopsis available yet.',
      score: item.vote_average ? Number(item.vote_average.toFixed(1)) : undefined,
      popularity: item.popularity ?? 0,
    };

    if (!isRelevantResult(resultBase, query)) return null;
    return { ...resultBase, relevanceScore: scoreResult(resultBase, query) };
  }

  if (item.media_type === 'tv') {
    const yearLabel = getYearLabel(item.first_air_date);
    const resultBase = {
      id: item.id,
      mediaType: 'tv' as const,
      title: item.name?.trim() || 'Untitled series',
      subtitle: yearLabel,
      yearLabel,
      metadataLine: yearLabel,
      imageUrl: getSearchImage(item),
      overview: item.overview?.trim() || 'No series overview available yet.',
      score: item.vote_average ? Number(item.vote_average.toFixed(1)) : undefined,
      popularity: item.popularity ?? 0,
    };

    if (!isRelevantResult(resultBase, query)) return null;
    return { ...resultBase, relevanceScore: scoreResult(resultBase, query) };
  }

  if (item.media_type === 'person') {
    const knownForDepartment = item.known_for_department?.trim() || 'Person';
    const knownForTitles = buildPersonKnownForTitles(item);
    const resultBase = {
      id: item.id,
      mediaType: 'person' as const,
      title: item.name?.trim() || 'Unknown person',
      subtitle: buildPersonSubtitle(item),
      metadataLine: buildPersonSubtitle(item),
      knownForDepartment,
      knownForTitles,
      imageUrl: getSearchImage(item),
      overview: 'Open profile for credits, biography, and known-for titles.',
      popularity: item.popularity ?? 0,
    };

    if (!isRelevantResult(resultBase, query)) return null;
    return { ...resultBase, relevanceScore: scoreResult(resultBase, query) };
  }

  return null;
}

function compareSearchResults(left: SearchResult, right: SearchResult) {
  const scoreDelta = right.relevanceScore - left.relevanceScore;
  if (scoreDelta !== 0) return scoreDelta;

  const popularityDelta = right.popularity - left.popularity;
  if (popularityDelta !== 0) return popularityDelta;

  const ratingDelta = (right.score ?? 0) - (left.score ?? 0);
  if (ratingDelta !== 0) return ratingDelta;

  return left.title.localeCompare(right.title);
}

export function getSearchResultTypeLabel(type: SearchResultType) {
  if (type === 'movie') return 'Movie';
  if (type === 'tv') return 'TV Show';
  return 'Person';
}

export function getSearchResultHref(result: Pick<SearchResult, 'id' | 'mediaType'>) {
  if (result.mediaType === 'movie') return `/review/tmdb-${result.id}`;
  if (result.mediaType === 'tv') return `/tv/${result.id}`;
  return `/person/${result.id}`;
}

export async function searchTitlesAndPeople(query: string, limit = 8) {
  return searchGlobal(query, { limit, maxPages: 1 });
}

export async function searchGlobal(query: string, options: GlobalSearchOptions = {}) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery || !hasTmdbCredentials) return [];

  const limit = options.limit ?? DEFAULT_GLOBAL_SEARCH_LIMIT;
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_GLOBAL_SEARCH_PAGES);
  const cacheKey = `${normalizedQuery.toLowerCase()}:${limit}:${maxPages}`;

  if (!searchCache.has(cacheKey)) {
    searchCache.set(
      cacheKey,
      (async () => {
        const firstPage = await tmdbFetch<TmdbMultiSearchResponse>('/search/multi', {
          query: {
            include_adult: false,
            language: 'en-US',
            page: 1,
            query: normalizedQuery,
          },
        });

        const pagesToLoad = Math.min(maxPages, Math.max(1, firstPage.total_pages));
        const extraPages =
          pagesToLoad > 1
            ? await Promise.all(
                Array.from({ length: pagesToLoad - 1 }, (_, index) =>
                  tmdbFetch<TmdbMultiSearchResponse>('/search/multi', {
                    query: {
                      include_adult: false,
                      language: 'en-US',
                      page: index + 2,
                      query: normalizedQuery,
                    },
                  }),
                ),
              )
            : [];

        return [firstPage, ...extraPages]
          .flatMap((response) => response.results)
          .filter((item) => item.media_type === 'movie' || item.media_type === 'tv' || item.media_type === 'person')
          .map((item) => mapSearchResult(item, normalizedQuery))
          .filter((item): item is SearchResult => Boolean(item))
          .filter(
            (item, index, items) =>
              items.findIndex((candidate) => candidate.id === item.id && candidate.mediaType === item.mediaType) === index,
          )
          .sort(compareSearchResults)
          .slice(0, limit);
      })(),
    );
  }

  return searchCache.get(cacheKey)!;
}

function buildTvSummary(details: TmdbTvDetailsResponse) {
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

export async function fetchTvShowById(id: number) {
  if (!tvDetailCache.has(id)) {
    tvDetailCache.set(
      id,
      tmdbFetch<TmdbTvDetailsResponse>(`/tv/${id}`, {
        query: { append_to_response: 'aggregate_credits' },
      }).then((details) => ({
        ...buildTvSummary(details),
        firstAirDate: details.first_air_date,
        lastAirDate: details.last_air_date,
        seasons: details.number_of_seasons ?? 0,
        episodes: details.number_of_episodes ?? 0,
        status: details.status?.trim() || 'Status unavailable',
        creators: details.created_by?.map((creator) => creator.name) ?? [],
        networks: details.networks?.map((network) => network.name) ?? [],
        cast:
          details.aggregate_credits?.cast
            ?.slice()
            .sort((left, right) => (right.total_episode_count ?? 0) - (left.total_episode_count ?? 0))
            .slice(0, 8)
            .map((person) => person.name) ?? [],
      })),
    );
  }

  return tvDetailCache.get(id)!;
}

function mapPersonCredit(credit: TmdbPersonCredit): PersonCredit | null {
  if (credit.media_type !== 'movie' && credit.media_type !== 'tv') return null;

  const title = credit.title?.trim() || credit.name?.trim();
  if (!title) return null;

  const date = credit.media_type === 'movie' ? credit.release_date : credit.first_air_date;

  return {
    id: credit.id,
    mediaType: credit.media_type,
    title,
    subtitle: getYearLabel(date),
    imageUrl: credit.poster_path
      ? getTmdbImageUrl(credit.poster_path, 'w342')
      : credit.backdrop_path
        ? getTmdbImageUrl(credit.backdrop_path, 'w780')
        : '',
  };
}

export async function fetchPersonById(id: number) {
  if (!personDetailCache.has(id)) {
    personDetailCache.set(
      id,
      tmdbFetch<TmdbPersonDetailsResponse>(`/person/${id}`, {
        query: { append_to_response: 'combined_credits' },
      }).then((details) => {
        const credits = [...(details.combined_credits?.cast ?? []), ...(details.combined_credits?.crew ?? [])]
          .sort((left, right) => {
            const popularityDelta = (right.popularity ?? 0) - (left.popularity ?? 0);
            if (popularityDelta !== 0) return popularityDelta;
            return (right.vote_count ?? 0) - (left.vote_count ?? 0);
          })
          .map(mapPersonCredit)
          .filter((credit): credit is PersonCredit => Boolean(credit));

        return {
          id: details.id,
          name: details.name,
          knownForDepartment: details.known_for_department?.trim() || 'Screen credits',
          biography: details.biography?.trim() || 'Biography not available yet.',
          birthday: details.birthday,
          placeOfBirth: details.place_of_birth?.trim() || 'Not available',
          imageUrl: details.profile_path ? getTmdbImageUrl(details.profile_path, 'h632') : '',
          backdropUrl: credits[0]?.imageUrl ?? '',
          knownFor: Array.from(new Map(credits.map((credit) => [`${credit.mediaType}-${credit.id}`, credit])).values()).slice(0, 10),
        } satisfies PersonDetails;
      }),
    );
  }

  return personDetailCache.get(id)!;
}
