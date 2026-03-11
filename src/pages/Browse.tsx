import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Film,
  Grid3X3,
  List,
  MessageSquareText,
  SlidersHorizontal,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterChips, MovieCard, PosterImage, VerdictBadge } from '@/components/ui-custom';
import { browseCountries, browseDecades, browseGenres, browseStreamingPlatforms } from '@/lib/movie-constants';
import { fetchBrowseMovies, fetchTrendingMovies, serializeBrowseMovieQuery } from '@/lib/tmdb-movies';
import { getUserLibrary, toggleLibraryItem } from '@/lib/user-library';
import type { BrowseMovieQuery } from '@/lib/tmdb-movies';
import type { Movie, SortOption, Verdict } from '@/types';

const yearBounds = [1940, new Date().getFullYear()] as const;
const initialCatalogPages = 1;
const initialRenderCount = {
  grid: 20,
  list: 10,
} as const;
const renderBatchSize = {
  grid: 20,
  list: 8,
} as const;

type CatalogState = {
  movies: Movie[];
  totalResults: number;
  totalPages: number;
  loadedPage: number;
  source: 'tmdb' | 'local';
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  loadError: string;
};

function dedupeMovies(movies: Movie[]) {
  return Array.from(new Map(movies.map((movie) => [movie.id, movie])).values());
}

function hashMovieOrderSeed(movie: Movie) {
  const seedSource = `${movie.id}:${movie.title}:${movie.year}`;
  let hash = 0;

  for (let index = 0; index < seedSource.length; index += 1) {
    hash = (hash * 31 + seedSource.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function mixBrowseMovies(movies: Movie[]) {
  return [...movies].sort((a, b) => hashMovieOrderSeed(a) - hashMovieOrderSeed(b));
}

function compareReleaseDate(a: Movie, b: Movie) {
  const aDate = a.releaseDate ?? `${a.year}-01-01`;
  const bDate = b.releaseDate ?? `${b.year}-01-01`;
  return bDate.localeCompare(aDate);
}

function sortMovies(movies: Movie[], sortBy: SortOption) {
  const sorted = [...movies];

  sorted.sort((a, b) => {
    if (sortBy === 'highestRated') {
      return b.score - a.score || compareReleaseDate(a, b);
    }

    if (sortBy === 'mostPopular') {
      return (b.popularity ?? 0) - (a.popularity ?? 0) || compareReleaseDate(a, b);
    }

    if (sortBy === 'mostReviewed') {
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || compareReleaseDate(a, b);
    }

    if (sortBy === 'releaseDate') {
      const aDate = a.releaseDate ?? `${a.year}-01-01`;
      const bDate = b.releaseDate ?? `${b.year}-01-01`;
      return aDate.localeCompare(bDate) || b.score - a.score;
    }

    return compareReleaseDate(a, b) || b.score - a.score;
  });

  return sorted;
}

function BrowseCardSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="flex gap-4 rounded-[1.35rem] border border-white/[0.06] bg-white/[0.03] p-4">
        <Skeleton className="h-32 w-24 rounded-xl bg-white/10" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-40 bg-white/10" />
          <Skeleton className="h-4 w-56 bg-white/10" />
          <Skeleton className="h-4 w-28 bg-white/10" />
          <Skeleton className="h-16 w-full bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[2/3] rounded-[1.45rem] bg-white/10" />
      <Skeleton className="h-5 w-3/4 bg-white/10" />
      <Skeleton className="h-4 w-1/2 bg-white/10" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-16 rounded-full bg-white/10" />
        <Skeleton className="h-7 w-24 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

type GridMovieCardProps = {
  movie: Movie;
  isInWatchlist: boolean;
  isLiked: boolean;
  showRank?: number;
  openMovie: (movieId: string) => void;
  openCompose: (movieId: string) => void;
  toggleWatchlist: (movieId: string) => void;
  toggleLike: (movieId: string) => void;
  onGenreClick: (genre: string) => void;
};

const BrowseGridMovieCard = memo(function BrowseGridMovieCard({
  movie,
  isInWatchlist,
  isLiked,
  showRank,
  openMovie,
  openCompose,
  toggleWatchlist,
  toggleLike,
  onGenreClick,
}: GridMovieCardProps) {
  return (
    <MovieCard
      movie={movie}
      variant="compact"
      showRank={showRank}
      onClick={() => openMovie(movie.id)}
      onViewDetails={() => openMovie(movie.id)}
      onWriteReview={() => openCompose(movie.id)}
      onToggleWatchlist={() => toggleWatchlist(movie.id)}
      onToggleLike={() => toggleLike(movie.id)}
      isInWatchlist={isInWatchlist}
      isLiked={isLiked}
      onGenreClick={onGenreClick}
    />
  );
});

type ListMovieRowProps = {
  movie: Movie;
  isInWatchlist: boolean;
  isLiked: boolean;
  openMovie: (movieId: string) => void;
  toggleWatchlist: (movieId: string) => void;
  toggleLike: (movieId: string) => void;
  onGenreClick: (genre: string) => void;
};

const BrowseListMovieRow = memo(function BrowseListMovieRow({
  movie,
  isInWatchlist,
  isLiked,
  openMovie,
  toggleWatchlist,
  toggleLike,
  onGenreClick,
}: ListMovieRowProps) {
  return (
    <div
      onClick={() => openMovie(movie.id)}
      className="flex cursor-pointer gap-4 rounded-[1.35rem] border border-white/[0.06] bg-[rgba(20,20,28,0.8)] p-4 transition-colors hover:bg-[rgba(24,24,34,0.88)]"
    >
      <div className="group relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-xl sm:h-36">
        <PosterImage
          src={movie.poster}
          title={movie.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          width={160}
          height={240}
          sizes="160px"
        />
        <div className="absolute inset-x-2 bottom-2 flex justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleWatchlist(movie.id);
            }}
            className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
              isInWatchlist
                ? 'border-[#d26d47]/40 bg-[#d26d47]/20 text-[#f4b684]'
                : 'border-white/15 bg-black/40 text-white'
            }`}
          >
            Save
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleLike(movie.id);
            }}
            className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
              isLiked
                ? 'border-[#d26d47]/40 bg-[#d26d47]/20 text-[#f4b684]'
                : 'border-white/15 bg-black/40 text-white'
            }`}
          >
            Like
          </button>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">{movie.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {movie.year} / {movie.genres.slice(0, 3).join(' / ')}
            </p>
          </div>
          <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#d26d47]/25 bg-[#d26d47]/10 px-3 py-1 font-semibold text-[#f4b684]">
            <Star className="h-3.5 w-3.5" />
            Community {movie.score.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#f4b684]/20 bg-[#f4b684]/10 px-3 py-1 font-semibold text-[#f7c59e]">
            <MessageSquareText className="h-3.5 w-3.5" />
            {(movie.reviewCount ?? 0).toLocaleString()} reviews
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{movie.country}</span>
          {movie.runtime > 0 && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{movie.runtime} min</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {movie.genres.slice(0, 4).map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onGenreClick(genre);
              }}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-[#d26d47]/40 hover:text-[#f4b684]"
            >
              {genre}
            </button>
          ))}
        </div>
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{movie.synopsis}</p>
      </div>
    </div>
  );
});

export function Browse() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedVerdicts, setSelectedVerdicts] = useState<Verdict[]>([]);
  const [selectedDecades, setSelectedDecades] = useState<number[]>([]);
  const [selectedStreamingServices, setSelectedStreamingServices] = useState<string[]>([]);
  const [minRating, setMinRating] = useState([0]);
  const [yearRange, setYearRange] = useState([yearBounds[0], yearBounds[1]]);
  const [runtimeRange, setRuntimeRange] = useState([0, 240]);
  const [selectedCountry, setSelectedCountry] = useState(() => searchParams.get('country') ?? '');
  const [exactYear, setExactYear] = useState('');
  const [directorQuery, setDirectorQuery] = useState('');
  const [castQuery, setCastQuery] = useState('');
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [catalogState, setCatalogState] = useState<CatalogState>({
    movies: [],
    totalResults: 0,
    totalPages: 1,
    loadedPage: 0,
    source: 'tmdb',
    isInitialLoading: true,
    isRefreshing: false,
    isLoadingMore: false,
    loadError: '',
  });
  const [renderLimit, setRenderLimit] = useState<number>(initialRenderCount.grid);
  const [library, setLibrary] = useState(() => getUserLibrary());
  const renderMoreRef = useRef<HTMLDivElement | null>(null);
  const urlCountryFilter = searchParams.get('country') ?? '';

  useEffect(() => {
    setSelectedCountry(urlCountryFilter);
  }, [urlCountryFilter]);

  useEffect(() => {
    const normalizedCountryValue = selectedCountry.trim();
    const normalizedUrlCountryValue = urlCountryFilter.trim();
    if (normalizedCountryValue === normalizedUrlCountryValue) return;

    const nextParams = new URLSearchParams(searchParams);
    if (normalizedCountryValue) {
      nextParams.set('country', normalizedCountryValue);
    } else {
      nextParams.delete('country');
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, selectedCountry, setSearchParams, urlCountryFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadTrending() {
      try {
        const movies = await fetchTrendingMovies(5);
        if (!cancelled) {
          setTrendingMovies(movies);
        }
      } catch (error) {
        console.error('Failed to load trending movies', error);
        if (!cancelled) {
          setTrendingMovies([]);
        }
      }
    }

    void loadTrending();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncLibrary = () => setLibrary(getUserLibrary());
    window.addEventListener('stars:library-updated', syncLibrary);
    window.addEventListener('storage', syncLibrary);

    return () => {
      window.removeEventListener('stars:library-updated', syncLibrary);
      window.removeEventListener('storage', syncLibrary);
    };
  }, []);

  const activeFiltersCount = useMemo(
    () =>
      selectedGenres.length +
      selectedVerdicts.length +
      selectedDecades.length +
      selectedStreamingServices.length +
      Number(Boolean(selectedCountry)) +
      Number(Boolean(exactYear)) +
      Number(Boolean(directorQuery.trim())) +
      Number(Boolean(castQuery.trim())) +
      Number(minRating[0] > 0) +
      Number(yearRange[0] !== yearBounds[0] || yearRange[1] !== yearBounds[1]) +
      Number(runtimeRange[0] > 0 || runtimeRange[1] < 240),
    [
      castQuery,
      directorQuery,
      exactYear,
      minRating,
      runtimeRange,
      selectedCountry,
      selectedDecades,
      selectedGenres,
      selectedStreamingServices,
      selectedVerdicts,
      yearRange,
    ],
  );

  const browseApiQuery = useMemo<BrowseMovieQuery>(
    () => ({
      genres: selectedGenres,
      verdicts: selectedVerdicts,
      decades: selectedDecades,
      minRating: minRating[0] > 0 ? minRating[0] : undefined,
      releaseYearMin: yearRange[0] !== yearBounds[0] ? yearRange[0] : undefined,
      releaseYearMax: yearRange[1] !== yearBounds[1] ? yearRange[1] : undefined,
      exactYear: exactYear ? Number(exactYear) : undefined,
      minRuntime: runtimeRange[0] > 0 ? runtimeRange[0] : undefined,
      maxRuntime: runtimeRange[1] < 240 ? runtimeRange[1] : undefined,
      country: selectedCountry || undefined,
      streamingPlatforms: selectedStreamingServices,
      directorQuery: directorQuery.trim() || undefined,
      castQuery: castQuery.trim() || undefined,
      sortBy,
    }),
    [
      castQuery,
      directorQuery,
      exactYear,
      minRating,
      runtimeRange,
      selectedCountry,
      selectedDecades,
      selectedGenres,
      selectedStreamingServices,
      selectedVerdicts,
      sortBy,
      yearRange,
    ],
  );
  const deferredBrowseQuery = useDeferredValue(browseApiQuery);
  const browseQueryKey = useMemo(() => serializeBrowseMovieQuery(deferredBrowseQuery), [deferredBrowseQuery]);
  const isDefaultBrowseState = activeFiltersCount === 0 && !sortBy;

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setCatalogState((current) => ({
        ...current,
        isInitialLoading: current.movies.length === 0,
        isRefreshing: current.movies.length > 0,
        isLoadingMore: false,
        loadError: '',
      }));

      try {
        const responses = await Promise.all(
          Array.from({ length: initialCatalogPages }, (_, index) =>
            fetchBrowseMovies({
              ...deferredBrowseQuery,
              page: index + 1,
            }),
          ),
        );

        if (!cancelled) {
          const mergedMovies = dedupeMovies(responses.flatMap((response) => response.movies));
          setCatalogState({
            movies: sortBy ? mergedMovies : mixBrowseMovies(mergedMovies),
            totalResults: Math.max(...responses.map((response) => response.totalResults)),
            totalPages: Math.max(...responses.map((response) => response.totalPages)),
            loadedPage: Math.max(...responses.map((response) => response.page)),
            source: responses[0]?.source ?? 'tmdb',
            isInitialLoading: false,
            isRefreshing: false,
            isLoadingMore: false,
            loadError: '',
          });
        }
      } catch (error) {
        console.error('Failed to load browse catalog', error);
        if (!cancelled) {
          setCatalogState((current) => ({
            ...current,
            movies: current.movies.length ? current.movies : [],
            totalResults: current.movies.length ? current.totalResults : 0,
            totalPages: current.movies.length ? current.totalPages : 1,
            loadedPage: current.movies.length ? current.loadedPage : 0,
            source: current.movies.length ? current.source : 'tmdb',
            isInitialLoading: false,
            isRefreshing: false,
            isLoadingMore: false,
            loadError: 'TMDB browse is currently unavailable.',
          }));
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [browseQueryKey, deferredBrowseQuery, sortBy]);

  const visibleMovies = useMemo(
    () => (sortBy ? sortMovies(catalogState.movies, sortBy) : catalogState.movies),
    [catalogState.movies, sortBy],
  );

  useEffect(() => {
    setRenderLimit(Math.min(visibleMovies.length, initialRenderCount[viewMode]));
  }, [browseQueryKey, viewMode, visibleMovies.length]);

  const hasMoreToRender = renderLimit < visibleMovies.length;
  const renderedMovies = useMemo(() => visibleMovies.slice(0, renderLimit), [renderLimit, visibleMovies]);

  useEffect(() => {
    const target = renderMoreRef.current;
    if (!target || !hasMoreToRender) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setRenderLimit((current) => Math.min(visibleMovies.length, current + renderBatchSize[viewMode]));
      },
      { rootMargin: '500px 0px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreToRender, viewMode, visibleMovies.length]);

  const watchlistSet = useMemo(() => new Set(library.watchlist), [library.watchlist]);
  const favoritesSet = useMemo(() => new Set(library.favorites), [library.favorites]);

  const canLoadMore =
    catalogState.loadedPage < catalogState.totalPages &&
    !catalogState.isInitialLoading &&
    !catalogState.isLoadingMore &&
    !catalogState.isRefreshing;

  const resetBrowseState = useCallback(() => {
    setSelectedGenres([]);
    setSelectedVerdicts([]);
    setSelectedDecades([]);
    setSelectedStreamingServices([]);
    setMinRating([0]);
    setYearRange([yearBounds[0], yearBounds[1]]);
    setRuntimeRange([0, 240]);
    setSelectedCountry('');
    setExactYear('');
    setDirectorQuery('');
    setCastQuery('');
    setSortBy(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('country');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleLoadMore = useCallback(async () => {
    const nextPage = catalogState.loadedPage + 1;
    if (nextPage > catalogState.totalPages || catalogState.isLoadingMore || catalogState.isRefreshing) return;

    setCatalogState((current) => ({
      ...current,
      isLoadingMore: true,
      loadError: '',
    }));

    try {
      const response = await fetchBrowseMovies({
        ...deferredBrowseQuery,
        page: nextPage,
      });
      setCatalogState((current) => {
        const mergedMovies = dedupeMovies([...current.movies, ...response.movies]);
        return {
          ...current,
          movies: sortBy ? mergedMovies : mixBrowseMovies(mergedMovies),
          totalResults: Math.max(current.totalResults, response.totalResults),
          totalPages: Math.max(current.totalPages, response.totalPages),
          loadedPage: response.page,
          source: response.source,
          isLoadingMore: false,
          loadError: '',
        };
      });
    } catch (error) {
      console.error('Failed to load more browse movies', error);
      setCatalogState((current) => ({
        ...current,
        isLoadingMore: false,
        loadError: 'Could not load more movies from TMDB right now.',
      }));
    }
  }, [
    catalogState.isLoadingMore,
    catalogState.isRefreshing,
    catalogState.loadedPage,
    catalogState.totalPages,
    deferredBrowseQuery,
    sortBy,
  ]);

  const handleGenreClick = useCallback((genre: string) => {
    setSelectedGenres((current) => (current.includes(genre) ? current : [...current, genre]));
    setShowFilters(true);
  }, []);

  const handleToggleWatchlist = useCallback((movieId: string) => {
    const nextState = toggleLibraryItem('watchlist', movieId);
    setLibrary(nextState);
  }, []);

  const handleToggleLike = useCallback((movieId: string) => {
    const nextState = toggleLibraryItem('favorites', movieId);
    setLibrary(nextState);
  }, []);

  const openMovie = useCallback((movieId: string) => {
    navigate(`/review/${movieId}`);
  }, [navigate]);

  const openCompose = useCallback((movieId: string) => {
    navigate(`/review/${movieId}?compose=1`);
  }, [navigate]);

  const filtersPanel = useMemo(
    () => (
      <>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeFiltersCount ? `${activeFiltersCount} active` : 'All filters cleared'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetBrowseState}
            disabled={isDefaultBrowseState}
            className="border-white/10 bg-white/[0.03] hover:bg-white/5"
          >
            Clear All
          </Button>
        </div>

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="block text-mono text-xs uppercase tracking-wider text-muted-foreground">Sort</label>
            {sortBy && (
              <button
                type="button"
                onClick={() => {
                  setSortBy(null);
                }}
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-white"
              >
                Clear sort
              </button>
            )}
          </div>
          <div className="grid gap-2">
            {[
              { value: 'highestRated', label: 'Highest Rated' },
              { value: 'mostPopular', label: 'Most Popular' },
              { value: 'mostReviewed', label: 'Most Reviewed' },
              { value: 'newest', label: 'Release Date: Newest First' },
              { value: 'releaseDate', label: 'Release Date: Oldest First' },
            ].map((option) => {
              const isSelected = sortBy === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSortBy((current) => (current === option.value ? null : (option.value as SortOption)));
                  }}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? 'border-[#d26d47]/40 bg-[#d26d47]/14 text-white'
                      : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:bg-white/[0.05] hover:text-white'
                  }`}
                  aria-pressed={isSelected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Sorting is optional. Leave this unset to browse the full catalog in a mixed order.
          </p>
        </div>

        <div className="mb-6">
          <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Genre</label>
          <FilterChips options={browseGenres} selected={selectedGenres} onChange={setSelectedGenres} />
        </div>

        <div className="mb-6">
          <label className="mb-3 flex items-center gap-2 text-mono text-xs uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-3 w-3" /> Decade
          </label>
          <div className="flex flex-wrap gap-2">
            {browseDecades.map((decade) => (
              <button
                key={decade}
                type="button"
                onClick={() => {
                  setSelectedDecades((current) =>
                    current.includes(decade) ? current.filter((value) => value !== decade) : [...current, decade],
                  );
                }}
                className={`filter-chip ${selectedDecades.includes(decade) ? 'active' : ''}`}
              >
                {decade}s
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Country</label>
          <select
            value={selectedCountry}
            onChange={(event) => {
              setSelectedCountry(event.target.value);
            }}
            className="input-cinematic w-full py-2 text-sm"
          >
            <option value="">Any country</option>
            {browseCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">
            Streaming Service
          </label>
          <FilterChips
            options={browseStreamingPlatforms.map((platform) => platform.label)}
            selected={selectedStreamingServices}
            onChange={setSelectedStreamingServices}
          />
        </div>
      </>
    ),
    [
      activeFiltersCount,
      isDefaultBrowseState,
      resetBrowseState,
      selectedCountry,
      selectedDecades,
      selectedGenres,
      selectedStreamingServices,
      sortBy,
    ],
  );

  const showSkeletons = catalogState.isInitialLoading && catalogState.movies.length === 0;
  const hasActiveSort = Boolean(sortBy);
  const resultSummary = showSkeletons
    ? 'Loading movies from the full catalog...'
    : catalogState.isRefreshing
      ? `Updating ${visibleMovies.length.toLocaleString()} matching movies...`
      : `Showing ${visibleMovies.length.toLocaleString()} matching movies`;
  const resultCaption = showSkeletons
    ? 'Loading state'
    : visibleMovies.length === 0
      ? 'Empty state'
      : activeFiltersCount > 0
        ? 'Filtered view'
        : hasActiveSort
          ? 'Sorted view'
          : 'Default view';
  const browseStateLabel =
    activeFiltersCount > 0
      ? `${activeFiltersCount} filters active`
      : hasActiveSort
        ? 'Sorted browse state'
        : 'Default browse state';

  return (
    <div className="min-h-screen pt-16">
      <div className="flex flex-col lg:flex-row">
        {showFilters && (
          <aside
            className="hidden border-r border-white/[0.06] p-5 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-64px)] lg:w-80 lg:flex-shrink-0 lg:overflow-y-auto"
            style={{ background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(20px)' }}
          >
            {filtersPanel}
          </aside>
        )}

        <main className="flex-1 p-4 sm:p-6">
          <div
            className="mb-6 rounded-[1.8rem] border border-white/[0.08] p-5 sm:p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(23, 17, 18, 0.92) 0%, rgba(17, 16, 27, 0.92) 100%)',
              backdropFilter: 'blur(18px)',
            }}
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="heading-display text-3xl">Browse Movies</h1>
                <p className="mt-2 text-sm text-muted-foreground">{resultSummary}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">
                  {catalogState.movies.length > 0
                    ? `${resultCaption} | page ${catalogState.loadedPage} of ${Math.max(
                        1,
                        catalogState.totalPages,
                      )} | ${catalogState.totalResults.toLocaleString()} TMDB results scanned`
                    : resultCaption}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters((current) => !current)}
                  className="border-white/10 hover:bg-white/5"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
                <div className="flex overflow-hidden rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('grid');
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm ${
                      viewMode === 'grid' ? '' : 'hover:bg-white/5'
                    }`}
                    style={viewMode === 'grid' ? { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' } : {}}
                  >
                    <Grid3X3 className="h-4 w-4" />
                    Grid View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('list');
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm ${
                      viewMode === 'list' ? '' : 'hover:bg-white/5'
                    }`}
                    style={viewMode === 'list' ? { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' } : {}}
                  >
                    <List className="h-4 w-4" />
                    List View
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex-1 rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                Browse keeps its own movie-only filters. Use the global search bar above to search movies, TV shows, and
                people.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                {browseStateLabel}
              </div>
            </div>
            {!showSkeletons && (
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/40">
                {catalogState.source === 'tmdb' ? 'TMDB connected' : 'TMDB unavailable - local fallback catalog'}
                {catalogState.isRefreshing ? ' | refreshing results' : ''}
              </p>
            )}
          </div>

          {showFilters && (
            <div
              className="mb-6 rounded-2xl border border-white/[0.06] p-4 sm:p-5 lg:hidden"
              style={{ background: 'rgba(10, 10, 15, 0.85)', backdropFilter: 'blur(20px)' }}
            >
              {filtersPanel}
            </div>
          )}

          {catalogState.loadError && (
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
              {catalogState.loadError}
            </div>
          )}

          {isDefaultBrowseState && trendingMovies.length > 0 && (
            <section
              className="mb-8 rounded-[1.8rem] border border-white/[0.08] p-5 sm:p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(40, 18, 16, 0.88) 0%, rgba(16, 14, 22, 0.92) 100%)',
                backdropFilter: 'blur(18px)',
              }}
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="mb-1 flex items-center gap-2 text-mono text-xs uppercase tracking-[0.28em] text-[#f4b684]">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Trending This Week
                  </p>
                  <h2 className="text-2xl font-semibold">What movie fans are pulling up right now</h2>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {trendingMovies.map((movie, index) => (
                  <BrowseGridMovieCard
                    key={movie.id}
                    movie={movie}
                    showRank={index + 1}
                    openMovie={openMovie}
                    openCompose={openCompose}
                    toggleWatchlist={handleToggleWatchlist}
                    toggleLike={handleToggleLike}
                    isInWatchlist={watchlistSet.has(movie.id)}
                    isLiked={favoritesSet.has(movie.id)}
                    onGenreClick={handleGenreClick}
                  />
                ))}
              </div>
            </section>
          )}

          {showSkeletons ? (
            <div
              className={`grid gap-5 ${
                viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
              }`}
            >
              {Array.from({ length: viewMode === 'grid' ? 10 : 6 }).map((_, index) => (
                <BrowseCardSkeleton key={index} viewMode={viewMode} />
              ))}
            </div>
          ) : visibleMovies.length > 0 ? (
            <>
              <div
                className={`grid gap-5 ${
                  viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
                }`}
              >
                {renderedMovies.map((movie) =>
                  viewMode === 'grid' ? (
                    <BrowseGridMovieCard
                      key={movie.id}
                      movie={movie}
                      openMovie={openMovie}
                      openCompose={openCompose}
                      toggleWatchlist={handleToggleWatchlist}
                      toggleLike={handleToggleLike}
                      isInWatchlist={watchlistSet.has(movie.id)}
                      isLiked={favoritesSet.has(movie.id)}
                      onGenreClick={handleGenreClick}
                    />
                  ) : (
                    <BrowseListMovieRow
                      key={movie.id}
                      movie={movie}
                      openMovie={openMovie}
                      toggleWatchlist={handleToggleWatchlist}
                      toggleLike={handleToggleLike}
                      isInWatchlist={watchlistSet.has(movie.id)}
                      isLiked={favoritesSet.has(movie.id)}
                      onGenreClick={handleGenreClick}
                    />
                  ),
                )}
              </div>

              {(hasMoreToRender || canLoadMore || catalogState.isLoadingMore) && (
                <div className="mt-6">
                  {hasMoreToRender && (
                    <div className="mb-4 text-center text-xs uppercase tracking-[0.18em] text-white/40">
                      Rendering {renderedMovies.length.toLocaleString()} of {visibleMovies.length.toLocaleString()} loaded
                      movies
                    </div>
                  )}
                  <div ref={renderMoreRef} className="h-1 w-full" />
                </div>
              )}

              {canLoadMore && !hasMoreToRender && (
                <div className="mt-8 flex justify-center">
                  <Button onClick={handleLoadMore} className="btn-primary min-w-40">
                    Load More
                  </Button>
                </div>
              )}

              {catalogState.isLoadingMore && (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <BrowseCardSkeleton key={index} viewMode="grid" />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center">
              <div
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <Film className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">No movies found</h3>
              <p className="mb-2 text-muted-foreground">
                {activeFiltersCount
                  ? 'The current filters do not match any loaded movies.'
                  : 'The catalog finished loading without any movies to display.'}
              </p>
              <p className="mb-6 text-sm text-white/45">
                {activeFiltersCount
                  ? 'Clear or relax the active filters to broaden the result set.'
                  : 'Try reloading the page if TMDB is temporarily unavailable.'}
              </p>
              <Button onClick={resetBrowseState} className="btn-primary">
                Clear all filters
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
