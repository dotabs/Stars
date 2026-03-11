import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Film,
  Grid3X3,
  List,
  MessageSquareText,
  Search,
  SlidersHorizontal,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterChips, MovieCard, PosterImage, VerdictBadge } from '@/components/ui-custom';
import { browseCountries, browseDecades, browseGenres, browseStreamingPlatforms } from '@/lib/movie-constants';
import { fetchBrowseMovies, fetchTrendingMovies } from '@/lib/tmdb-movies';
import { getUserLibrary, toggleLibraryItem } from '@/lib/user-library';
import type { Movie, SortOption, Verdict } from '@/types';
import type { BrowseMovieQuery } from '@/lib/tmdb-movies';

const yearBounds = [1940, new Date().getFullYear()] as const;
const initialCatalogPages = 1;

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
  const [selectedCountry, setSelectedCountry] = useState('');
  const [exactYear, setExactYear] = useState('');
  const [directorQuery, setDirectorQuery] = useState('');
  const [castQuery, setCastQuery] = useState('');
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [catalogMovies, setCatalogMovies] = useState<Movie[]>([]);
  const [catalogTotalResults, setCatalogTotalResults] = useState(0);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [loadedCatalogPage, setLoadedCatalogPage] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [catalogSource, setCatalogSource] = useState<'tmdb' | 'local'>('tmdb');
  const [library, setLibrary] = useState(() => getUserLibrary());
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchQuery = searchParams.get('q') ?? '';

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditableTarget) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeFiltersCount =
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
    Number(runtimeRange[0] > 0 || runtimeRange[1] < 240);

  const isDefaultBrowseState =
    !searchQuery.trim() &&
    activeFiltersCount === 0 &&
    !sortBy;

  const browseApiQuery = useMemo<BrowseMovieQuery>(
    () => ({
      query: searchQuery.trim() || undefined,
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
      searchQuery,
      selectedCountry,
      selectedDecades,
      selectedGenres,
      selectedStreamingServices,
      selectedVerdicts,
      sortBy,
      yearRange,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setIsInitialLoading(true);
      setIsLoadingMore(false);
      setLoadError('');

      try {
        const responses = await Promise.all(
          Array.from({ length: initialCatalogPages }, (_, index) =>
            fetchBrowseMovies({
              ...browseApiQuery,
              page: index + 1,
            }),
          ),
        );

        if (!cancelled) {
          const mergedMovies = dedupeMovies(responses.flatMap((response) => response.movies));
          setCatalogMovies(sortBy ? mergedMovies : mixBrowseMovies(mergedMovies));
          setCatalogTotalResults(Math.max(...responses.map((response) => response.totalResults)));
          setCatalogTotalPages(Math.max(...responses.map((response) => response.totalPages)));
          setLoadedCatalogPage(Math.max(...responses.map((response) => response.page)));
          setCatalogSource(responses[0]?.source ?? 'tmdb');
        }
      } catch (error) {
        console.error('Failed to load browse catalog', error);
        if (!cancelled) {
          setCatalogMovies([]);
          setCatalogTotalResults(0);
          setCatalogTotalPages(1);
          setLoadedCatalogPage(0);
          setCatalogSource('tmdb');
          setLoadError('TMDB browse is currently unavailable.');
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [browseApiQuery, sortBy]);

  const updateSearchQuery = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const visibleMovies = useMemo(
    () => (sortBy ? sortMovies(catalogMovies, sortBy) : catalogMovies),
    [catalogMovies, sortBy],
  );
  const canLoadMore = loadedCatalogPage < catalogTotalPages && !isInitialLoading && !isLoadingMore;

  const resetBrowseState = () => {
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
    nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  const handleLoadMore = async () => {
    const nextPage = loadedCatalogPage + 1;
    if (nextPage > catalogTotalPages || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const response = await fetchBrowseMovies({
        ...browseApiQuery,
        page: nextPage,
      });
      setCatalogMovies((current) => {
        const mergedMovies = dedupeMovies([...current, ...response.movies]);
        return sortBy ? mergedMovies : mixBrowseMovies(mergedMovies);
      });
      setCatalogTotalResults((current) => Math.max(current, response.totalResults));
      setCatalogTotalPages((current) => Math.max(current, response.totalPages));
      setLoadedCatalogPage(response.page);
      setCatalogSource(response.source);
      setLoadError('');
    } catch (error) {
      console.error('Failed to load more browse movies', error);
      setLoadError('Could not load more movies from TMDB right now.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleGenreClick = (genre: string) => {
    setSelectedGenres((current) => (current.includes(genre) ? current : [...current, genre]));
    setShowFilters(true);
  };

  const handleToggleWatchlist = (movieId: string) => {
    const nextState = toggleLibraryItem('watchlist', movieId);
    setLibrary(nextState);
  };

  const handleToggleLike = (movieId: string) => {
    const nextState = toggleLibraryItem('favorites', movieId);
    setLibrary(nextState);
  };

  const renderFilters = () => (
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
            { value: 'newest', label: 'Newest First' },
            { value: 'highestRated', label: 'Highest Rated' },
            { value: 'mostPopular', label: 'Most Popular' },
            { value: 'releaseDate', label: 'Release Date' },
            { value: 'mostReviewed', label: 'Most Reviewed' },
          ].map((option) => {
            const isSelected = sortBy === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSortBy((current) => (current === option.value ? null : (option.value as SortOption)));
                }}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition-all ${
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
        <FilterChips
          options={browseGenres}
          selected={selectedGenres}
          onChange={(nextGenres) => {
            setSelectedGenres(nextGenres);
          }}
        />
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
        <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Streaming Service</label>
        <FilterChips
          options={browseStreamingPlatforms.map((platform) => platform.label)}
          selected={selectedStreamingServices}
          onChange={(services) => {
            setSelectedStreamingServices(services);
          }}
        />
      </div>

    </>
  );

  const hasSearchQuery = Boolean(searchQuery.trim());
  const hasActiveSort = Boolean(sortBy);
  const showSkeletons = isInitialLoading && catalogMovies.length === 0;
  const resultSummary = showSkeletons
    ? 'Loading movies from the full catalog...'
    : `Showing ${visibleMovies.length.toLocaleString()} matching movies`;
  const resultCaption = showSkeletons
    ? 'Loading state'
    : visibleMovies.length === 0
      ? 'Empty state'
      : activeFiltersCount > 0 || hasSearchQuery
        ? 'Filtered view'
        : hasActiveSort
          ? 'Sorted view'
          : 'Default view';
  const browseStateLabel =
    activeFiltersCount > 0 && hasSearchQuery
      ? `${activeFiltersCount} filters + search active`
      : activeFiltersCount > 0
        ? `${activeFiltersCount} filters active`
        : hasSearchQuery
          ? 'Search active'
          : hasActiveSort
            ? 'Sorted browse state'
            : 'Default browse state';

  return (
    <div className="min-h-screen pt-16">
      <div className="animated-bg" />
      <div className="flex flex-col lg:flex-row">
        {showFilters && (
          <aside
            className="hidden border-r border-white/[0.06] p-5 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-64px)] lg:w-80 lg:flex-shrink-0 lg:overflow-y-auto"
            style={{ background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(20px)' }}
          >
            {renderFilters()}
          </aside>
        )}

        <main className="flex-1 p-4 sm:p-6">
          <div className="mb-6 rounded-[1.8rem] border border-white/[0.08] p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, rgba(23, 17, 18, 0.92) 0%, rgba(17, 16, 27, 0.92) 100%)', backdropFilter: 'blur(18px)' }}>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="heading-display text-3xl">Browse Movies</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {resultSummary}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">
                  {catalogMovies.length > 0
                    ? `${resultCaption} | page ${loadedCatalogPage} of ${Math.max(1, catalogTotalPages)} | ${catalogTotalResults.toLocaleString()} TMDB results scanned`
                    : resultCaption}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="border-white/10 hover:bg-white/5">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
                <Button variant="outline" size="sm" onClick={resetBrowseState} disabled={isDefaultBrowseState} className="border-white/10 hover:bg-white/5">
                  Clear All Filters
                </Button>
                <div className="flex overflow-hidden rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('grid');
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm ${viewMode === 'grid' ? '' : 'hover:bg-white/5'}`}
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
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm ${viewMode === 'list' ? '' : 'hover:bg-white/5'}`}
                    style={viewMode === 'list' ? { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' } : {}}
                  >
                    <List className="h-4 w-4" />
                    List View
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="search-input-shell flex-1">
                <Search className="search-input-icon" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search title, cast, director, synopsis, genre..."
                  value={searchQuery}
                  onChange={(event) => updateSearchQuery(event.target.value)}
                  className="input-cinematic search-input-field search-input-field-with-action h-12"
                />
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                  {searchQuery && (
                    <button type="button" onClick={() => updateSearchQuery('')} aria-label="Clear search">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                    /
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                {browseStateLabel}
              </div>
            </div>
            {!showSkeletons && (
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/40">
                {catalogSource === 'tmdb' ? 'TMDB connected' : 'TMDB unavailable - local fallback catalog'}
              </p>
            )}
          </div>

          {showFilters && (
            <div className="mb-6 rounded-2xl border border-white/[0.06] p-4 sm:p-5 lg:hidden" style={{ background: 'rgba(10, 10, 15, 0.85)', backdropFilter: 'blur(20px)' }}>
              {renderFilters()}
            </div>
          )}

          {loadError && (
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
              {loadError}
            </div>
          )}

          {isDefaultBrowseState && trendingMovies.length > 0 && (
            <section className="mb-8 rounded-[1.8rem] border border-white/[0.08] p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, rgba(40, 18, 16, 0.88) 0%, rgba(16, 14, 22, 0.92) 100%)', backdropFilter: 'blur(18px)' }}>
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
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    variant="compact"
                    showRank={index + 1}
                    onClick={() => navigate(`/review/${movie.id}`)}
                    onViewDetails={() => navigate(`/review/${movie.id}`)}
                    onWriteReview={() => navigate(`/review/${movie.id}?compose=1`)}
                    onToggleWatchlist={() => handleToggleWatchlist(movie.id)}
                    onToggleLike={() => handleToggleLike(movie.id)}
                    isInWatchlist={library.watchlist.includes(movie.id)}
                    isLiked={library.favorites.includes(movie.id)}
                    onGenreClick={handleGenreClick}
                  />
                ))}
              </div>
            </section>
          )}

          {showSkeletons ? (
            <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
              {Array.from({ length: viewMode === 'grid' ? 10 : 6 }).map((_, index) => (
                <BrowseCardSkeleton key={index} viewMode={viewMode} />
              ))}
            </div>
          ) : visibleMovies.length > 0 ? (
            <>
              <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                {visibleMovies.map((movie) =>
                  viewMode === 'grid' ? (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      variant="compact"
                      onClick={() => navigate(`/review/${movie.id}`)}
                      onViewDetails={() => navigate(`/review/${movie.id}`)}
                      onWriteReview={() => navigate(`/review/${movie.id}?compose=1`)}
                      onToggleWatchlist={() => handleToggleWatchlist(movie.id)}
                      onToggleLike={() => handleToggleLike(movie.id)}
                      isInWatchlist={library.watchlist.includes(movie.id)}
                      isLiked={library.favorites.includes(movie.id)}
                      onGenreClick={handleGenreClick}
                    />
                  ) : (
                    <div
                      key={movie.id}
                      onClick={() => navigate(`/review/${movie.id}`)}
                      className="flex cursor-pointer gap-4 rounded-[1.35rem] p-4 transition-all hover:scale-[1.01]"
                      style={{ background: 'rgba(20, 20, 28, 0.8)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                    >
                      <div className="group relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-xl sm:h-36">
                        <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-x-2 bottom-2 flex justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleWatchlist(movie.id);
                            }}
                            className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${library.watchlist.includes(movie.id) ? 'border-[#d26d47]/40 bg-[#d26d47]/20 text-[#f4b684]' : 'border-white/15 bg-black/40 text-white'}`}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleLike(movie.id);
                            }}
                            className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${library.favorites.includes(movie.id) ? 'border-[#d26d47]/40 bg-[#d26d47]/20 text-[#f4b684]' : 'border-white/15 bg-black/40 text-white'}`}
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
                          {movie.runtime > 0 && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{movie.runtime} min</span>}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {movie.genres.slice(0, 4).map((genre) => (
                            <button
                              key={genre}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleGenreClick(genre);
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
                  ),
                )}
              </div>

              {canLoadMore && (
                <div className="mt-8 flex justify-center">
                  <Button onClick={handleLoadMore} className="btn-primary min-w-40">
                    Load More
                  </Button>
                </div>
              )}

              {isLoadingMore && (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <BrowseCardSkeleton key={index} viewMode="grid" />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Film className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">No movies found</h3>
              <p className="mb-2 text-muted-foreground">
                {activeFiltersCount || hasSearchQuery
                  ? 'The current search and filters do not match any loaded movies.'
                  : 'The catalog finished loading without any movies to display.'}
              </p>
              <p className="mb-6 text-sm text-white/45">
                {activeFiltersCount || hasSearchQuery
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
