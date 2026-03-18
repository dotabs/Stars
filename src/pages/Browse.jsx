import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Film, Grid3X3, Search, SlidersHorizontal, TrendingUp, X, } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchResultCard } from '@/components/ui-custom/GlobalSearchResults';
import { FilterChips, MovieCard } from '@/components/ui-custom';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { useToast } from '@/hooks/use-toast';
import { useUserLibrary } from '@/hooks/use-user-library';
import { buildYouTubeSearchUrl, openExternalUrl } from '@/lib/browser';
import { browseDecades, browseGenres, browseStreamingPlatforms } from '@/lib/movie-constants';
import { fetchBrowseLanguages, fetchBrowseMovies, fetchTrendingMovies, serializeBrowseMovieQuery } from '@/lib/tmdb-movies';
import { isLibraryAuthError, toggleLibraryItem } from '@/lib/user-library';
const yearBounds = [1940, new Date().getFullYear()];
const initialCatalogPages = 1;
const searchDebounceMs = 250;
const initialRenderCount = 20;
const renderBatchSize = 20;
function dedupeMovies(movies) {
    return Array.from(new Map(movies.map((movie) => [movie.id, movie])).values());
}
function hashMovieOrderSeed(movie) {
    const seedSource = `${movie.id}:${movie.title}:${movie.year}`;
    let hash = 0;
    for (let index = 0; index < seedSource.length; index += 1) {
        hash = (hash * 31 + seedSource.charCodeAt(index)) >>> 0;
    }
    return hash;
}
function mixBrowseMovies(movies) {
    return [...movies].sort((a, b) => hashMovieOrderSeed(a) - hashMovieOrderSeed(b));
}
function compareReleaseDate(a, b) {
    const aDate = a.releaseDate ?? `${a.year}-01-01`;
    const bDate = b.releaseDate ?? `${b.year}-01-01`;
    return bDate.localeCompare(aDate);
}
function sortMovies(movies, sortBy) {
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
function BrowseCardSkeleton() {
    return (<div className="space-y-3">
      <Skeleton className="aspect-[2/3] rounded-[1.2rem] bg-white/10"/>
      <Skeleton className="h-5 w-[90%] bg-white/10"/>
      <Skeleton className="h-4 w-[62%] bg-white/10"/>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-16 rounded-full bg-white/10"/>
        <Skeleton className="h-7 w-24 rounded-full bg-white/10"/>
      </div>
    </div>);
}
const BrowseGridMovieCard = memo(function BrowseGridMovieCard({ movie, isInWatchlist, showRank, openMovie, toggleWatchlist, }) {
    const handleOpen = useCallback(() => {
        openMovie(movie.id);
    }, [movie.id, openMovie]);
    const handlePlay = useCallback(() => {
        openExternalUrl(movie.trailerUrl || buildYouTubeSearchUrl(`${movie.title} ${movie.year} trailer`));
    }, [movie.title, movie.trailerUrl, movie.year]);
    const handleToggleWatchlist = useCallback(() => {
        toggleWatchlist(movie.id);
    }, [movie.id, toggleWatchlist]);
    return (<MovieCard movie={movie} variant="compact" showRank={showRank} onClick={handleOpen} onPlay={handlePlay} onToggleWatchlist={handleToggleWatchlist} isInWatchlist={isInWatchlist}/>);
});
export function Browse() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { currentUser, library } = useUserLibrary();
    const [searchParams, setSearchParams] = useSearchParams();
    const [sortBy, setSortBy] = useState(null);
    const [showFilters, setShowFilters] = useState(true);
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [selectedLanguages, setSelectedLanguages] = useState([]);
    const [selectedVerdicts, setSelectedVerdicts] = useState([]);
    const [selectedDecades, setSelectedDecades] = useState([]);
    const [selectedStreamingServices, setSelectedStreamingServices] = useState([]);
    const [minRating, setMinRating] = useState([0]);
    const [yearRange, setYearRange] = useState([yearBounds[0], yearBounds[1]]);
    const [runtimeRange, setRuntimeRange] = useState([0, 240]);
    const [exactYear, setExactYear] = useState('');
    const [directorQuery, setDirectorQuery] = useState('');
    const [castQuery, setCastQuery] = useState('');
    const [languageOptions, setLanguageOptions] = useState([]);
    const [isLanguageOptionsLoading, setIsLanguageOptionsLoading] = useState(true);
    const [showAllLanguages, setShowAllLanguages] = useState(false);
    const [trendingMovies, setTrendingMovies] = useState([]);
    const urlSearchQuery = searchParams.get('q') ?? '';
    const [searchInputValue, setSearchInputValue] = useState(urlSearchQuery);
    const deferredSearchInput = useDeferredValue(searchInputValue);
    const debouncedSearchQuery = useDebouncedValue(deferredSearchInput, searchDebounceMs);
    const [catalogState, setCatalogState] = useState({
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
    const [renderLimit, setRenderLimit] = useState(initialRenderCount);
    const renderMoreRef = useRef(null);
    const { trimmedQuery: trimmedGlobalQuery, results: globalSearchResults, isLoading: isGlobalSearchLoading, errorMessage: globalSearchError, hasQuery: hasGlobalSearchQuery, } = useGlobalSearch(debouncedSearchQuery, { limit: 60, maxPages: 3 });
    useEffect(() => {
        setSearchInputValue(urlSearchQuery);
    }, [urlSearchQuery]);
    useEffect(() => {
        const normalizedSearchValue = debouncedSearchQuery.trim();
        const normalizedUrlSearchValue = urlSearchQuery.trim();
        if (normalizedSearchValue === normalizedUrlSearchValue) {
            return;
        }
        const nextParams = new URLSearchParams(searchParams);
        if (normalizedSearchValue) {
            nextParams.set('q', normalizedSearchValue);
        }
        else {
            nextParams.delete('q');
        }
        setSearchParams(nextParams, { replace: true });
    }, [debouncedSearchQuery, searchParams, setSearchParams, urlSearchQuery]);
    useEffect(() => {
        let cancelled = false;
        async function loadLanguageOptions() {
            setIsLanguageOptionsLoading(true);
            try {
                const languages = await fetchBrowseLanguages();
                if (!cancelled) {
                    setLanguageOptions(languages);
                }
            }
            catch (error) {
                console.error('Failed to load browse languages', error);
                if (!cancelled) {
                    setLanguageOptions([]);
                }
            }
            finally {
                if (!cancelled) {
                    setIsLanguageOptionsLoading(false);
                }
            }
        }
        void loadLanguageOptions();
        return () => {
            cancelled = true;
        };
    }, []);
    useEffect(() => {
        let cancelled = false;
        async function loadTrending() {
            try {
                const movies = await fetchTrendingMovies(5);
                if (!cancelled) {
                    setTrendingMovies(movies);
                }
            }
            catch (error) {
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
    const activeFiltersCount = useMemo(() => selectedGenres.length +
        selectedLanguages.length +
        selectedVerdicts.length +
        selectedDecades.length +
        selectedStreamingServices.length +
        Number(Boolean(exactYear)) +
        Number(Boolean(directorQuery.trim())) +
        Number(Boolean(castQuery.trim())) +
        Number(minRating[0] > 0) +
        Number(yearRange[0] !== yearBounds[0] || yearRange[1] !== yearBounds[1]) +
        Number(runtimeRange[0] > 0 || runtimeRange[1] < 240), [
        castQuery,
        directorQuery,
        exactYear,
        minRating,
        runtimeRange,
        selectedDecades,
        selectedGenres,
        selectedLanguages,
        selectedStreamingServices,
        selectedVerdicts,
        yearRange,
    ]);
    const browseApiQuery = useMemo(() => ({
        genres: selectedGenres,
        languages: selectedLanguages,
        verdicts: selectedVerdicts,
        decades: selectedDecades,
        minRating: minRating[0] > 0 ? minRating[0] : undefined,
        releaseYearMin: yearRange[0] !== yearBounds[0] ? yearRange[0] : undefined,
        releaseYearMax: yearRange[1] !== yearBounds[1] ? yearRange[1] : undefined,
        exactYear: exactYear ? Number(exactYear) : undefined,
        minRuntime: runtimeRange[0] > 0 ? runtimeRange[0] : undefined,
        maxRuntime: runtimeRange[1] < 240 ? runtimeRange[1] : undefined,
        languageOptions,
        streamingPlatforms: selectedStreamingServices,
        directorQuery: directorQuery.trim() || undefined,
        castQuery: castQuery.trim() || undefined,
        sortBy,
    }), [
        castQuery,
        directorQuery,
        exactYear,
        languageOptions,
        minRating,
        runtimeRange,
        selectedDecades,
        selectedGenres,
        selectedLanguages,
        selectedStreamingServices,
        selectedVerdicts,
        sortBy,
        yearRange,
    ]);
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
                const responses = await Promise.all(Array.from({ length: initialCatalogPages }, (_, index) => fetchBrowseMovies({
                    ...deferredBrowseQuery,
                    page: index + 1,
                })));
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
            }
            catch (error) {
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
    const visibleMovies = useMemo(() => (sortBy ? sortMovies(catalogState.movies, sortBy) : catalogState.movies), [catalogState.movies, sortBy]);
    useEffect(() => {
        setRenderLimit(Math.min(visibleMovies.length, initialRenderCount));
    }, [browseQueryKey, visibleMovies.length]);
    const hasMoreToRender = renderLimit < visibleMovies.length;
    const renderedMovies = useMemo(() => visibleMovies.slice(0, renderLimit), [renderLimit, visibleMovies]);
    useEffect(() => {
        const target = renderMoreRef.current;
        if (!target || !hasMoreToRender)
            return;
        const observer = new IntersectionObserver((entries) => {
            if (!entries[0]?.isIntersecting)
                return;
            setRenderLimit((current) => Math.min(visibleMovies.length, current + renderBatchSize));
        }, { rootMargin: '500px 0px' });
        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMoreToRender, visibleMovies.length]);
    const watchlistSet = useMemo(() => new Set(library.watchlist), [library.watchlist]);
    const favoritesSet = useMemo(() => new Set(library.favorites), [library.favorites]);
    const canLoadMore = catalogState.loadedPage < catalogState.totalPages &&
        !catalogState.isInitialLoading &&
        !catalogState.isLoadingMore &&
        !catalogState.isRefreshing;
    const resetBrowseState = useCallback(() => {
        setSelectedGenres([]);
        setSelectedLanguages([]);
        setSelectedVerdicts([]);
        setSelectedDecades([]);
        setSelectedStreamingServices([]);
        setMinRating([0]);
        setYearRange([yearBounds[0], yearBounds[1]]);
        setRuntimeRange([0, 240]);
        setExactYear('');
        setDirectorQuery('');
        setCastQuery('');
        setSortBy(null);
        setShowAllLanguages(false);
        setSearchInputValue('');
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('q');
        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);
    const availableLanguageOptions = useMemo(() => languageOptions, [languageOptions]);
    useEffect(() => {
        setSelectedLanguages((current) => current.filter((code) => availableLanguageOptions.some((language) => language.value === code)));
    }, [availableLanguageOptions]);
    useEffect(() => {
        setShowAllLanguages(false);
    }, [browseQueryKey]);
    const visibleLanguageOptions = useMemo(() => showAllLanguages ? availableLanguageOptions : availableLanguageOptions.slice(0, 18), [availableLanguageOptions, showAllLanguages]);
    const hasMoreLanguages = availableLanguageOptions.length > 18;
    const handleLoadMore = useCallback(async () => {
        const nextPage = catalogState.loadedPage + 1;
        if (nextPage > catalogState.totalPages || catalogState.isLoadingMore || catalogState.isRefreshing)
            return;
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
        }
        catch (error) {
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
    const handleToggleLibraryItem = useCallback(async (listName, movieId) => {
        try {
            await toggleLibraryItem({
                userId: currentUser?.uid,
                listName,
                movieId,
            });
        }
        catch (error) {
            if (isLibraryAuthError(error)) {
                toast({
                    title: 'Sign in required',
                    description: 'Sign in to save movies to your library.',
                    variant: 'destructive',
                });
                return;
            }
            console.error(`Failed to update ${listName}`, error);
            toast({
                title: 'Library update failed',
                description: 'Please try again in a moment.',
                variant: 'destructive',
            });
        }
    }, [currentUser?.uid, toast]);
    const handleToggleWatchlist = useCallback((movieId) => {
        void handleToggleLibraryItem('watchlist', movieId);
    }, [handleToggleLibraryItem]);
    const handleToggleLike = useCallback((movieId) => {
        void handleToggleLibraryItem('favorites', movieId);
    }, [handleToggleLibraryItem]);
    const openMovie = useCallback((movieId) => {
        navigate(`/review/${movieId}`);
    }, [navigate]);
    const browseGridClassName = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
    const loadingSkeletonCount = 10;
    const filtersPanel = useMemo(() => (<>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <SlidersHorizontal className="h-4 w-4"/>
              Filters
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeFiltersCount ? `${activeFiltersCount} active` : 'All filters cleared'}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={resetBrowseState} disabled={isDefaultBrowseState} className="border-white/10 bg-white/[0.03] hover:bg-white/5">
            Clear All
          </Button>
        </div>

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="block text-mono text-xs uppercase tracking-wider text-muted-foreground">Sort</label>
            {sortBy && (<button type="button" onClick={() => {
                setSortBy(null);
            }} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-white">
                Clear sort
              </button>)}
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
            return (<button key={option.value} type="button" onClick={() => {
                    setSortBy((current) => (current === option.value ? null : option.value));
                }} className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${isSelected
                    ? 'border-[#d26d47]/40 bg-[#d26d47]/14 text-white'
                    : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:bg-white/[0.05] hover:text-white'}`} aria-pressed={isSelected}>
                  {option.label}
                </button>);
        })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Sorting is optional. Leave this unset to browse the full catalog in a mixed order.
          </p>
        </div>

        <div className="mb-6">
          <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Genre</label>
          <FilterChips options={browseGenres} selected={selectedGenres} onChange={setSelectedGenres}/>
        </div>

        <div className="mb-6">
          <label className="mb-3 flex items-center gap-2 text-mono text-xs uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-3 w-3"/> Decade
          </label>
          <div className="flex flex-wrap gap-2">
            {browseDecades.map((decade) => (<button key={decade} type="button" onClick={() => {
                setSelectedDecades((current) => current.includes(decade) ? current.filter((value) => value !== decade) : [...current, decade]);
            }} className={`filter-chip ${selectedDecades.includes(decade) ? 'active' : ''}`}>
                {decade}s
              </button>))}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-3 flex items-center justify-between gap-3 text-mono text-xs uppercase tracking-wider text-muted-foreground">
            <span>Language</span>
            {selectedLanguages.length > 0 ? <span className="text-[11px] tracking-[0.18em] text-white/45">{selectedLanguages.length} selected</span> : null}
          </label>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
            {isLanguageOptionsLoading ? (<p className="text-sm text-muted-foreground">Loading TMDB languages...</p>) : availableLanguageOptions.length > 0 ? (<>
                <div className="max-h-52 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                  <div className="flex flex-wrap gap-2">
                    {visibleLanguageOptions.map((language) => {
                        const isSelected = selectedLanguages.includes(language.value);
                        return (<button key={language.value} type="button" onClick={() => {
                                setSelectedLanguages((current) => current.includes(language.value)
                                    ? current.filter((entry) => entry !== language.value)
                                    : [...current, language.value]);
                            }} className={`filter-chip max-w-full whitespace-normal break-words text-left leading-tight ${isSelected ? 'active' : ''}`} aria-pressed={isSelected}>
                            <span className="min-w-0">{language.label}</span>
                            {isSelected ? <X className="ml-1 h-3 w-3 flex-none" /> : null}
                          </button>);
                    })}
                  </div>
                </div>
                {hasMoreLanguages ? (<button type="button" onClick={() => {
                        setShowAllLanguages((current) => !current);
                    }} className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-white">
                    {showAllLanguages ? 'Show less' : `Show more (${availableLanguageOptions.length - visibleLanguageOptions.length})`}
                  </button>) : null}
              </>) : (<p className="text-sm text-muted-foreground">No TMDB languages are available right now.</p>)}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">
            Streaming Service
          </label>
          <FilterChips options={browseStreamingPlatforms.map((platform) => platform.label)} selected={selectedStreamingServices} onChange={setSelectedStreamingServices}/>
        </div>
      </>), [
        activeFiltersCount,
        isDefaultBrowseState,
        resetBrowseState,
        selectedDecades,
        selectedGenres,
        availableLanguageOptions,
        isLanguageOptionsLoading,
        selectedLanguages,
        selectedStreamingServices,
        showAllLanguages,
        sortBy,
        visibleLanguageOptions,
        hasMoreLanguages,
    ]);
    const showSkeletons = catalogState.isInitialLoading && catalogState.movies.length === 0;
    const hasActiveSort = Boolean(sortBy);
    const resultSummary = hasGlobalSearchQuery
        ? isGlobalSearchLoading
            ? `Searching TMDB for "${trimmedGlobalQuery}"...`
            : `Showing ${globalSearchResults.length.toLocaleString()} results for "${trimmedGlobalQuery}"`
        : showSkeletons
            ? 'Loading movies from the full catalog...'
            : catalogState.isRefreshing
                ? `Updating ${visibleMovies.length.toLocaleString()} matching movies...`
                : `Showing ${visibleMovies.length.toLocaleString()} matching movies`;
    const resultCaption = showSkeletons
        ? 'Loading state'
        : hasGlobalSearchQuery
            ? 'Search results'
            : visibleMovies.length === 0
                ? 'Empty state'
                : activeFiltersCount > 0
                    ? 'Filtered view'
                    : hasActiveSort
                        ? 'Sorted view'
                        : 'Default view';
    const browseStateLabel = hasGlobalSearchQuery
        ? 'Search active'
        : activeFiltersCount > 0
            ? `${activeFiltersCount} filters active`
            : hasActiveSort
                ? 'Sorted browse state'
                : 'Default browse state';
    return (<div className="min-h-screen pt-16">
      <div className="flex flex-col lg:flex-row">
        {showFilters && (<aside className="hidden border-r border-white/[0.06] p-5 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-64px)] lg:w-80 lg:flex-shrink-0 lg:overflow-y-auto" style={{ background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(20px)' }}>
            {filtersPanel}
          </aside>)}

        <main className="flex-1 p-4 sm:p-6">
          <div className="mb-6 rounded-[1.8rem] border border-white/[0.08] p-5 sm:p-6" style={{
            background: 'linear-gradient(135deg, rgba(23, 17, 18, 0.92) 0%, rgba(17, 16, 27, 0.92) 100%)',
            backdropFilter: 'blur(18px)',
        }}>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="heading-display text-3xl">Browse Movies</h1>
                <p className="mt-2 text-sm text-muted-foreground">{resultSummary}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">
                  {catalogState.movies.length > 0
            ? `${resultCaption} | page ${catalogState.loadedPage} of ${Math.max(1, catalogState.totalPages)} | ${catalogState.totalResults.toLocaleString()} TMDB results scanned`
            : resultCaption}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowFilters((current) => !current)} className="border-white/10 hover:bg-white/5">
                  <SlidersHorizontal className="mr-2 h-4 w-4"/>
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
                <div className="flex overflow-hidden rounded-lg border border-white/10">
                  <div className="flex items-center gap-2 px-3 py-2.5 text-sm" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}>
                    <Grid3X3 className="h-4 w-4"/>
                    Poster Grid
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-20 mt-5 flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="flex-1">
                <div className="search-input-shell relative w-full">
                  <Search className="search-input-icon"/>
                  <Input type="search" value={searchInputValue} onChange={(event) => {
            setSearchInputValue(event.target.value);
        }} placeholder="Search movies, TV shows, or people..." className="input-cinematic search-input-field search-input-field-with-clear-and-action h-12 rounded-2xl border-white/10 bg-white/[0.03] text-white" aria-label="Search movies, TV shows, or people" autoComplete="off"/>
                  {searchInputValue.trim() && (<button type="button" onClick={() => {
                setSearchInputValue('');
            }} className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white" aria-label="Clear search">
                      <X className="h-4 w-4"/>
                    </button>)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                {browseStateLabel}
              </div>
            </div>
            {!showSkeletons && (<p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/40">
                {hasGlobalSearchQuery
                ? `Global TMDB search for "${trimmedGlobalQuery}"`
                : catalogState.source === 'tmdb'
                    ? 'TMDB connected'
                    : 'TMDB unavailable - local fallback catalog'}
                {catalogState.isRefreshing ? ' | refreshing results' : ''}
              </p>)}
          </div>

          {showFilters && (<div className="mb-6 rounded-2xl border border-white/[0.06] p-4 sm:p-5 lg:hidden" style={{ background: 'rgba(10, 10, 15, 0.85)', backdropFilter: 'blur(20px)' }}>
              {filtersPanel}
            </div>)}

          {catalogState.loadError && (<div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
              {catalogState.loadError}
            </div>)}

          {!hasGlobalSearchQuery && isDefaultBrowseState && trendingMovies.length > 0 && (<section className="mb-8 rounded-[1.8rem] border border-white/[0.08] p-5 sm:p-6" style={{
                background: 'linear-gradient(135deg, rgba(40, 18, 16, 0.88) 0%, rgba(16, 14, 22, 0.92) 100%)',
                backdropFilter: 'blur(18px)',
            }}>
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="mb-1 flex items-center gap-2 text-mono text-xs uppercase tracking-[0.28em] text-[#f4b684]">
                    <TrendingUp className="h-3.5 w-3.5"/>
                    Trending This Week
                  </p>
                  <h2 className="text-2xl font-semibold">What movie fans are pulling up right now</h2>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {trendingMovies.map((movie, index) => (<BrowseGridMovieCard key={movie.id} movie={movie} showRank={index + 1} openMovie={openMovie} toggleWatchlist={handleToggleWatchlist} isInWatchlist={watchlistSet.has(movie.id)}/>))}
              </div>
            </section>)}

          {hasGlobalSearchQuery ? (isGlobalSearchLoading ? (<div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (<BrowseCardSkeleton key={index}/>))}
              </div>) : globalSearchError ? (<div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
                {globalSearchError}
              </div>) : globalSearchResults.length > 0 ? (<div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {globalSearchResults.map((result) => (<SearchResultCard key={`${result.mediaType}-${result.id}`} result={result} onOpen={(href) => navigate(href)} isInWatchlist={watchlistSet.has(`tmdb-${result.id}`)} isLiked={favoritesSet.has(`tmdb-${result.id}`)} onToggleWatchlist={() => handleToggleWatchlist(`tmdb-${result.id}`)} onToggleLike={() => handleToggleLike(`tmdb-${result.id}`)}/>))}
              </div>) : (<div className="py-20 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Film className="h-8 w-8 text-muted-foreground"/>
                </div>
                <h3 className="mb-2 text-xl font-semibold">No search results found</h3>
                <p className="mb-2 text-muted-foreground">No global matches were found for "{trimmedGlobalQuery}".</p>
                <p className="mb-6 text-sm text-white/45">
                  Try a broader title, person name, or TV show search.
                </p>
                <Button onClick={() => setSearchInputValue('')} className="btn-primary">
                  Clear search
                </Button>
              </div>)) : showSkeletons ? (<div className={`grid gap-5 ${browseGridClassName}`}>
              {Array.from({ length: loadingSkeletonCount }).map((_, index) => (<BrowseCardSkeleton key={index}/>))}
            </div>) : visibleMovies.length > 0 ? (<>
              <div className={`grid gap-5 ${browseGridClassName}`}>
                {renderedMovies.map((movie) => (<BrowseGridMovieCard key={movie.id} movie={movie} openMovie={openMovie} toggleWatchlist={handleToggleWatchlist} isInWatchlist={watchlistSet.has(movie.id)}/>))}
              </div>

              {(hasMoreToRender || canLoadMore || catalogState.isLoadingMore) && (<div className="mt-6">
                  {hasMoreToRender && (<div className="mb-4 text-center text-xs uppercase tracking-[0.18em] text-white/40">
                      Rendering {renderedMovies.length.toLocaleString()} of {visibleMovies.length.toLocaleString()} loaded
                      movies
                    </div>)}
                  <div ref={renderMoreRef} className="h-1 w-full"/>
                </div>)}

              {canLoadMore && !hasMoreToRender && (<div className="mt-8 flex justify-center">
                  <Button onClick={handleLoadMore} className="btn-primary min-w-40">
                    Load More
                  </Button>
                </div>)}

              {catalogState.isLoadingMore && (<div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (<BrowseCardSkeleton key={index}/>))}
                </div>)}
            </>) : (<div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Film className="h-8 w-8 text-muted-foreground"/>
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
            </div>)}
        </main>
      </div>
    </div>);
}
