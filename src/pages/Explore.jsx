import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Compass, Film, Globe2, MapPinned, RefreshCw, Search, Shuffle, Star, Ticket, } from 'lucide-react';
import { useAuth } from '@/components/auth/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CinematicGlobe, FilterChips, MovieCard, PosterImage } from '@/components/ui-custom';
import { defaultExploreCountry, exploreCountries, } from '@/data/explore';
import { useToast } from '@/hooks/use-toast';
import { useUserLibrary } from '@/hooks/use-user-library';
import { buildYouTubeSearchUrl, openExternalUrl } from '@/lib/browser';
import { buildExploreDiscovery, fetchExploreCountryPool, prefetchExploreCountryPool, } from '@/lib/explore-discovery';
import { isLibraryAuthError, toggleLibraryItem } from '@/lib/user-library';
const maxPinnedCountries = 6;
const maxRecentMoviesPerCountry = 24;
const visibleMovieLimit = 12;
const shelfOptions = [
    ['lineup', 'Random Lineup'],
    ['top', 'Top Picks'],
    ['new', 'Newest'],
    ['hidden', 'Hidden Gems'],
];
function buildStorageKey(userScope, suffix) {
    return `stars:explore:${userScope}:${suffix}`;
}
function readStoredArray(key, fallback) {
    if (typeof window === 'undefined' || !key)
        return fallback;
    try {
        const parsed = JSON.parse(window.localStorage.getItem(key) ?? 'null');
        return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : fallback;
    }
    catch {
        return fallback;
    }
}
function readStoredRecentMovies(key) {
    if (typeof window === 'undefined' || !key)
        return {};
    try {
        const parsed = JSON.parse(window.localStorage.getItem(key) ?? 'null');
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    catch {
        return {};
    }
}
function writeStoredValue(key, value) {
    if (typeof window === 'undefined' || !key)
        return;
    window.localStorage.setItem(key, JSON.stringify(value));
}
function mergeCountryState(countries, nextCountry, visited) {
    return countries.map((country) => country.key === nextCountry.key
        ? {
            ...country,
            ...nextCountry,
            explored: visited.has(nextCountry.key),
        }
        : {
            ...country,
            explored: visited.has(country.key),
        });
}
function passportLabel(count) {
    if (count >= 20)
        return 'World Collector';
    if (count >= 12)
        return 'Festival Hopper';
    if (count >= 6)
        return 'Cinema Scout';
    return 'First Stamp';
}
function buildCountrySearchResults(countries, query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized)
        return [];
    return countries
        .filter((country) => country.label.toLowerCase().includes(normalized) || country.region.toLowerCase().includes(normalized))
        .slice(0, 8);
}
function getShelfMovies(discovery, shelf, countryKey) {
    if (!discovery || discovery.country.key !== countryKey)
        return [];
    if (shelf === 'top')
        return discovery.topPicks;
    if (shelf === 'new')
        return discovery.newestPicks;
    if (shelf === 'hidden')
        return discovery.hiddenGems;
    return discovery.lineup;
}
function pickRandomCountry(countries, excludedKeys = []) {
    const excluded = new Set(excludedKeys);
    const available = countries.filter((country) => !excluded.has(country.key));
    const pool = available.length > 0 ? available : countries;
    return pool[Math.floor(Math.random() * pool.length)] ?? defaultExploreCountry;
}
function buildRecentMovieIds(discovery, currentRecentMovies) {
    return [
        ...discovery.lineup.map((movie) => movie.id),
        ...currentRecentMovies,
    ].slice(0, maxRecentMoviesPerCountry);
}
function getShelfLabel(shelf) {
    if (shelf === 'top')
        return 'Top Picks';
    if (shelf === 'new')
        return 'Newest';
    if (shelf === 'hidden')
        return 'Hidden Gems';
    return 'Random Lineup';
}
export function Explore() {
    const { authReady, currentUser } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { library } = useUserLibrary();
    const storageScope = authReady ? currentUser?.uid ?? 'guest' : '';
    const pinnedStorageKey = storageScope ? buildStorageKey(storageScope, 'pinned-countries') : '';
    const visitedStorageKey = storageScope ? buildStorageKey(storageScope, 'visited-countries') : '';
    const recentMoviesStorageKey = storageScope ? buildStorageKey(storageScope, 'recent-country-movies') : '';
    const recentMovieIdsRef = useRef({});
    const visitedCountriesRef = useRef([]);
    const loadRequestRef = useRef(0);
    const [countries, setCountries] = useState(() => exploreCountries.map((country) => ({
        ...country,
        explored: false,
    })));
    const [selectedCountryKey, setSelectedCountryKey] = useState(defaultExploreCountry.key);
    const [selectedShelf, setSelectedShelf] = useState('lineup');
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [pinnedCountries, setPinnedCountries] = useState([]);
    const [visitedCountries, setVisitedCountries] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [spinToken, setSpinToken] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [isCountryLoading, setIsCountryLoading] = useState(true);
    const [countryError, setCountryError] = useState('');
    const [discovery, setDiscovery] = useState(null);
    const [shuffleCount, setShuffleCount] = useState(0);
    const [reloadToken, setReloadToken] = useState(0);
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const selectedCountry = countries.find((country) => country.key === selectedCountryKey) ?? defaultExploreCountry;
    const selectedCountryData = discovery?.country.key === selectedCountryKey ? discovery.country : selectedCountry;
    useEffect(() => {
        if (!storageScope)
            return;
        const nextPinnedCountries = readStoredArray(pinnedStorageKey, []);
        const nextVisitedCountries = readStoredArray(visitedStorageKey, []);
        recentMovieIdsRef.current = readStoredRecentMovies(recentMoviesStorageKey);
        visitedCountriesRef.current = nextVisitedCountries;
        setPinnedCountries(nextPinnedCountries);
        setVisitedCountries(nextVisitedCountries);
        setCountries(exploreCountries.map((country) => ({
            ...country,
            explored: nextVisitedCountries.includes(country.key),
        })));
    }, [pinnedStorageKey, recentMoviesStorageKey, storageScope, visitedStorageKey]);
    useEffect(() => {
        if (!pinnedStorageKey)
            return;
        writeStoredValue(pinnedStorageKey, pinnedCountries);
    }, [pinnedCountries, pinnedStorageKey]);
    useEffect(() => {
        visitedCountriesRef.current = visitedCountries;
        if (!visitedStorageKey)
            return;
        writeStoredValue(visitedStorageKey, visitedCountries);
    }, [visitedCountries, visitedStorageKey]);
    useEffect(() => {
        prefetchExploreCountryPool([selectedCountryKey, ...pinnedCountries]);
    }, [pinnedCountries, selectedCountryKey]);
    useEffect(() => {
        let cancelled = false;
        const requestId = loadRequestRef.current + 1;
        loadRequestRef.current = requestId;
        setIsCountryLoading(true);
        setCountryError('');
        async function loadCountry() {
            try {
                const pool = await fetchExploreCountryPool(selectedCountryKey);
                if (cancelled || loadRequestRef.current !== requestId)
                    return;
                const visited = new Set([...visitedCountriesRef.current, selectedCountryKey]);
                const nextDiscovery = buildExploreDiscovery(pool, {
                    recentMovieIds: recentMovieIdsRef.current[selectedCountryKey] ?? [],
                    shuffleSeed: Date.now(),
                });
                recentMovieIdsRef.current = {
                    ...recentMovieIdsRef.current,
                    [selectedCountryKey]: buildRecentMovieIds(nextDiscovery, recentMovieIdsRef.current[selectedCountryKey] ?? []),
                };
                if (recentMoviesStorageKey) {
                    writeStoredValue(recentMoviesStorageKey, recentMovieIdsRef.current);
                }
                if (storageScope) {
                    setVisitedCountries((current) => current.includes(selectedCountryKey) ? current : [...current, selectedCountryKey]);
                }
                setCountries((current) => mergeCountryState(current, pool, visited));
                setDiscovery(nextDiscovery);
                setSelectedGenres([]);
                setCountryError('');
            }
            catch {
                if (cancelled || loadRequestRef.current !== requestId)
                    return;
                setCountryError(`Could not load a fresh lineup for ${selectedCountry.label}.`);
            }
            finally {
                if (!cancelled && loadRequestRef.current === requestId) {
                    setIsCountryLoading(false);
                }
            }
        }
        void loadCountry();
        return () => {
            cancelled = true;
        };
    }, [recentMoviesStorageKey, reloadToken, selectedCountry.label, selectedCountryKey, shuffleCount, storageScope]);
    const searchResults = useMemo(() => buildCountrySearchResults(countries, deferredSearchQuery), [countries, deferredSearchQuery]);
    const visibleGenres = useMemo(() => selectedCountryData.genreCounts.slice(0, 8).map(({ genre }) => genre), [selectedCountryData.genreCounts]);
    const shelfMovies = useMemo(() => getShelfMovies(discovery, selectedShelf, selectedCountryKey), [discovery, selectedCountryKey, selectedShelf]);
    const visibleMovies = useMemo(() => {
        if (selectedGenres.length === 0)
            return shelfMovies;
        return shelfMovies.filter((movie) => movie.genres.some((genre) => selectedGenres.includes(genre)));
    }, [selectedGenres, shelfMovies]);
    const pinnedCountryData = useMemo(() => pinnedCountries
        .map((countryKey) => countries.find((country) => country.key === countryKey))
        .filter((country) => Boolean(country)), [countries, pinnedCountries]);
    const recentCountryData = useMemo(() => [...visitedCountries]
        .reverse()
        .filter((countryKey) => countryKey !== selectedCountryKey)
        .slice(0, 5)
        .map((countryKey) => countries.find((country) => country.key === countryKey))
        .filter((country) => Boolean(country)), [countries, selectedCountryKey, visitedCountries]);
    const exploredProgress = countries.length > 0 ? Math.round((visitedCountries.length / countries.length) * 100) : 0;
    const passportTier = passportLabel(visitedCountries.length);
    const topStandouts = selectedCountryData.standoutTitles?.slice(0, 4) ?? [];
    const isShowingCurrentCountryDiscovery = discovery?.country.key === selectedCountryKey;
    const hasSearchQuery = deferredSearchQuery.trim().length > 0;
    const isBusy = isCountryLoading || isSpinning;
    const visibleMovieCards = visibleMovies.slice(0, visibleMovieLimit);
    const hasMoreVisibleMovies = visibleMovies.length > visibleMovieCards.length;
    const shouldShowMovieSkeleton = isCountryLoading && !isShowingCurrentCountryDiscovery;
    const searchHasNoResults = hasSearchQuery && searchResults.length === 0;
    const watchlistSet = useMemo(() => new Set(Object.entries(library.itemsById)
        .filter(([, entry]) => entry?.inWatchlist)
        .map(([movieId]) => movieId)), [library.itemsById]);
    const handleCountrySelect = (country) => {
        startTransition(() => {
            setSelectedCountryKey(country.key);
            setSelectedShelf('lineup');
            setSelectedGenres([]);
            setSearchQuery('');
            setCountryError('');
        });
    };
    const togglePin = (countryKey) => {
        setPinnedCountries((current) => current.includes(countryKey)
            ? current.filter((key) => key !== countryKey)
            : [countryKey, ...current].slice(0, maxPinnedCountries));
    };
    const handleSpin = () => {
        if (countries.length === 0 || isBusy)
            return;
        const randomCountry = pickRandomCountry(countries, [selectedCountryKey]);
        setSpinToken((value) => value + 1);
        handleCountrySelect(randomCountry);
    };
    const handleShuffleCurrentCountry = () => {
        if (isBusy)
            return;
        setCountryError('');
        setShuffleCount((value) => value + 1);
    };
    const handleRetryCurrentCountry = () => {
        if (isBusy)
            return;
        setCountryError('');
        setReloadToken((value) => value + 1);
    };
    const handleToggleWatchlist = useCallback(async (movieId) => {
        try {
            await toggleLibraryItem({
                userId: currentUser?.uid,
                listName: 'watchlist',
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
            console.error('Failed to update watchlist', error);
            toast({
                title: 'Library update failed',
                description: 'Please try again in a moment.',
                variant: 'destructive',
            });
        }
    }, [currentUser?.uid, toast]);
    const openMovie = useCallback((movieId) => {
        navigate(`/review/${movieId}`);
    }, [navigate]);
    const openTrailer = useCallback((movie) => {
        openExternalUrl(movie.trailerUrl || buildYouTubeSearchUrl(`${movie.title} ${movie.year} trailer`));
    }, []);
    const openBrowseForCountry = () => {
        navigate(`/browse?country=${encodeURIComponent(selectedCountryData.label)}`);
    };
    return (<div className="min-h-screen pt-16">
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-90" style={{
            background: 'radial-gradient(circle at 15% 18%, rgba(255,59,59,0.12) 0%, transparent 34%), radial-gradient(circle at 80% 12%, rgba(62,108,255,0.18) 0%, transparent 35%), linear-gradient(180deg, rgba(4,7,13,0.32) 0%, rgba(4,7,13,0.92) 100%)',
        }}/>

        <div className="relative z-10 grid min-h-[calc(100vh-64px)] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="flex min-h-0 flex-col px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-mono text-xs uppercase tracking-[0.24em] text-white/45">
                  Discovery Engine
                </p>
                <h1 className="heading-display mt-3 text-4xl text-white sm:text-5xl lg:text-6xl">
                  Spin Into Global Movie Discovery
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
                  Land on a country, pull a fresh lineup from a much larger catalog, then reshuffle until
                  the mix feels right. The globe starts the journey. The movies are the payoff.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:w-auto sm:grid-cols-4">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40 text-center">Countries</p>
                  <p className="mt-2 text-2xl font-semibold text-white text-center">{countries.length}</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40 text-center">Visited</p>
                  <p className="mt-2 text-2xl font-semibold text-white text-center">{visitedCountries.length}</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40 text-center">Pool</p>
                  <p className="mt-2 text-2xl font-semibold text-white text-center">
                    {(selectedCountryData.totalPoolResults ?? selectedCountryData.filmCount).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-[#f3c86a]/20 bg-[#f3c86a]/[0.06] p-4">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-[#f3c86a]/70 text-center">Passport</p>
                  <p className="mt-2 text-2xl font-semibold text-white text-center">{exploredProgress}%</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:mt-8">
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/[0.06] bg-[#0c111a]/80 p-4 backdrop-blur-xl">
                  <label htmlFor="explore-country-search" className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">
                    Country Search
                  </label>
                  <div className="search-input-shell mt-3">
                    <Search className="search-input-icon text-white/35"/>
                    <Input id="explore-country-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Jump to a country or region..." className="input-cinematic search-input-field h-11 border-white/10 bg-white/[0.03] text-sm"/>
                  </div>

                  {searchResults.length > 0 && (<div className="mt-3 space-y-2 rounded-2xl border border-white/[0.06] bg-black/20 p-2">
                      {searchResults.map((country) => (<button key={country.key} onClick={() => handleCountrySelect(country)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.05]">
                          <div>
                            <p className="text-sm font-medium text-white">{country.label}</p>
                            <p className="text-xs text-white/45">{country.region}</p>
                          </div>
                          <span className="text-xs text-white/55">{country.flag}</span>
                        </button>))}
                    </div>)}

                  {searchHasNoResults && (<p className="mt-3 text-sm text-white/46">No indexed countries matched "{deferredSearchQuery.trim()}".</p>)}
                </div>

                <div className="rounded-3xl border border-white/[0.06] bg-[#0c111a]/80 p-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">
                        Saved Countries
                      </p>
                      <p className="mt-1 text-xs text-white/50">Fast return points for the places worth revisiting.</p>
                    </div>
                    <MapPinned className="h-4 w-4 text-white/40"/>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {pinnedCountryData.length > 0 ? pinnedCountryData.map((country) => (<button key={country.key} type="button" onClick={() => handleCountrySelect(country)} className={`rounded-full border px-3 py-2 text-sm font-medium transition-all ${selectedCountryKey === country.key
                ? 'border-white/20 text-white'
                : 'border-white/8 text-white/62 hover:border-white/16 hover:text-white'}`} style={selectedCountryKey === country.key
                ? {
                    background: 'linear-gradient(135deg, rgba(255,59,59,0.18) 0%, rgba(185,28,28,0.18) 100%)',
                    boxShadow: '0 0 24px rgba(255,59,59,0.18)',
                }
                : { background: 'rgba(255,255,255,0.03)' }}>
                        {country.flag} {country.label}
                      </button>)) : <p className="text-sm leading-6 text-white/46">No saved countries yet. Save a country from the current landing card.</p>}
                  </div>
                  <p className="mt-3 text-xs text-white/38">Up to {maxPinnedCountries} countries stay pinned for quick return.</p>
                </div>

                <div className="rounded-3xl border border-[#f3c86a]/15 bg-[#f3c86a]/[0.05] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#f3c86a]/35 bg-[#f3c86a]/10">
                      <Ticket className="h-5 w-5 text-[#f3c86a]"/>
                    </div>
                    <div>
                      <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-[#f3c86a]/70">Passport</p>
                      <p className="text-sm text-white/72">
                        {passportTier} - {visitedCountries.length} stamps
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/8">
                    <div className="h-full rounded-full" style={{
            width: `${exploredProgress}%`,
            background: 'linear-gradient(90deg, #f3c86a 0%, #ffdf8c 100%)',
            boxShadow: '0 0 20px rgba(243,200,106,0.35)',
        }}/>
                  </div>
                </div>

                {recentCountryData.length > 0 && (<div className="rounded-3xl border border-white/[0.06] bg-[#0c111a]/80 p-4 backdrop-blur-xl">
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">
                      Recent Landings
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {recentCountryData.map((country) => (<button key={country.key} type="button" onClick={() => handleCountrySelect(country)} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/65 transition-colors hover:border-white/18 hover:text-white">
                          {country.flag} {country.label}
                        </button>))}
                    </div>
                  </div>)}
              </div>

              <div className="relative rounded-[2rem] border border-white/[0.06] bg-[#09101a]/70 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-5 lg:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                      Orbital Discovery
                    </p>
                    <p className="mt-2 max-w-lg text-sm text-white/55">
                      Spin for a fresh country, click any marker to land manually, then reshuffle movies
                      without leaving the country.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={handleSpin} disabled={isBusy} className="btn-primary h-12 rounded-full px-5">
                      <RefreshCw className={`mr-2 h-4 w-4 ${isBusy ? 'animate-spin' : ''}`}/>
                      {isSpinning ? 'Spinning' : isCountryLoading ? 'Loading' : 'Spin Again'}
                    </Button>
                    



                  </div>
                </div>

                <div className="mt-6 aspect-square w-full">
                  <CinematicGlobe countries={countries} selectedCountryKey={selectedCountryKey} pinnedCountryKeys={pinnedCountries} spinToken={spinToken} onCountrySelect={handleCountrySelect} onSpinStateChange={setIsSpinning} className="relative h-full w-full"/>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-[2rem] border border-white/[0.06] bg-[#09101a]/70 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5 lg:p-6">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-3xl border border-[#FF3B3B]/20 bg-[#FF3B3B]/[0.06] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-[#FFB3B3]/70">
                        Landed Country
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold text-white">{selectedCountryData.label}</h2>
                      <p className="mt-2 text-sm text-white/62">{selectedCountryData.region}</p>
                    </div>
                    <div className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.22em] text-white/72">
                      {selectedCountryData.flag}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Discovered</p>
                      <p className="mt-2 text-xl font-semibold text-white">{selectedCountryData.filmCount}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Catalog Reach</p>
                      <p className="mt-2 text-xl font-semibold text-white">
                        {(selectedCountryData.totalPoolResults ?? selectedCountryData.filmCount).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Avg Score</p>
                      <p className="mt-2 text-xl font-semibold text-white">
                        {selectedCountryData.filmCount > 0 ? selectedCountryData.averageScore.toFixed(1) : '--'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Discovery Feed</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {selectedCountryData.source === 'tmdb' ? 'Live TMDB pool' : 'Local fallback pool'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedCountryData.topGenres.slice(0, 6).length > 0 ? selectedCountryData.topGenres.slice(0, 6).map((genre) => (<span key={genre} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/75">
                        {genre}
                      </span>)) : <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">Genre mix will appear after discovery data loads</span>}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                        Discovery Controls
                      </p>
                      <p className="mt-2 text-sm text-white/52">Keep the country and refresh the mix, or jump into Browse for the full catalog.</p>
                    </div>
                    {countryError && (<span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100">
                        Needs retry
                      </span>)}
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Button onClick={handleShuffleCurrentCountry} disabled={isBusy} className="btn-primary justify-start">
                      <Shuffle className="mr-2 h-4 w-4"/>
                      {isCountryLoading ? 'Refreshing discovery...' : 'Shuffle Movies in This Country'}
                    </Button>
                    <Button onClick={() => togglePin(selectedCountryKey)} disabled={isBusy} variant="outline" className="justify-start border-white/10 bg-white/[0.03] hover:bg-white/5">
                      <Bookmark className="mr-2 h-4 w-4"/>
                      {pinnedCountries.includes(selectedCountryKey) ? 'Remove Saved Country' : 'Save Country'}
                    </Button>
                    <Button onClick={openBrowseForCountry} variant="outline" className="justify-start border-white/10 bg-white/[0.03] hover:bg-white/5">
                      <Compass className="mr-2 h-4 w-4"/>
                      Explore This Country in Browse
                    </Button>
                    <Button onClick={handleRetryCurrentCountry} disabled={isBusy} variant="outline" className="justify-start border-white/10 bg-white/[0.03] hover:bg-white/5">
                      <RefreshCw className="mr-2 h-4 w-4"/>
                      Retry Country Load
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                    Curated Discovery Shelf
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {selectedCountryData.label} discovery payoff
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-white/58">
                    Mixed from popular titles, hidden gems, classics, newer releases, and genre variety so
                    each spin feels less like a demo and more like a real catalog pull.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {shelfOptions.map(([shelf, label]) => (<button key={shelf} onClick={() => setSelectedShelf(shelf)} className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${selectedShelf === shelf ? 'text-white' : 'text-white/54 hover:text-white'}`} style={selectedShelf === shelf
                ? {
                    background: 'linear-gradient(135deg, rgba(255,59,59,0.18) 0%, rgba(185,28,28,0.18) 100%)',
                    boxShadow: '0 0 20px rgba(255,59,59,0.14)',
                }
                : { background: 'rgba(255,255,255,0.04)' }}>
                      {label}
                    </button>))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Genre Lens</p>
                        <p className="mt-2 text-sm text-white/55">Refine the current shelf without re-spinning.</p>
                      </div>
                      <Globe2 className="h-4 w-4 text-white/40"/>
                    </div>
                    <div className="mt-4">
                      {visibleGenres.length > 0 ? <FilterChips options={visibleGenres} selected={selectedGenres} onChange={setSelectedGenres}/> : <p className="text-sm text-white/46">Genre filters will appear when the selected country has enough loaded data.</p>}
                    </div>
                  </div>

                  {countryError && (<div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p>{countryError}</p>
                        <Button onClick={handleRetryCurrentCountry} disabled={isBusy} variant="outline" className="border-amber-300/20 bg-amber-100/5 hover:bg-amber-100/10">Retry</Button>
                      </div>
                    </div>)}

                  {shouldShowMovieSkeleton ? (<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, index) => (<div key={index} className="overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-3">
                          <div className="aspect-[2/3] rounded-[1.2rem] bg-white/10"/>
                          <div className="mt-3 h-5 rounded-full bg-white/10"/>
                          <div className="mt-2 h-4 w-2/3 rounded-full bg-white/10"/>
                        </div>))}
                    </div>) : visibleMovies.length > 0 ? (<div className="space-y-4">
                      {isCountryLoading && (<div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-white/62">Refreshing the lineup while keeping the current shelf visible.</div>)}
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {visibleMovieCards.map((movie, index) => (<MovieCard key={movie.id} movie={movie} variant="compact" showRank={selectedShelf === 'top' ? index + 1 : undefined} onClick={() => openMovie(movie.id)} onPlay={() => openTrailer(movie)} onToggleWatchlist={() => void handleToggleWatchlist(movie.id)} isInWatchlist={watchlistSet.has(movie.id)}/>))}
                      </div>
                      {hasMoreVisibleMovies && (<div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-sm text-white/60">Showing {visibleMovieCards.length} of {visibleMovies.length} titles in {getShelfLabel(selectedShelf).toLowerCase()}. <button type="button" onClick={openBrowseForCountry} className="ml-2 font-medium text-white underline decoration-white/30 underline-offset-4 transition-colors hover:text-[#f3c86a]">Open the full country catalog</button></div>)}
                    </div>) : (<div className="rounded-3xl border border-white/[0.06] bg-[#0e141f] p-10 text-center">
                      <Film className="mx-auto h-7 w-7 text-white/35"/>
                      <p className="mt-3 text-sm text-white/62">
                        {selectedGenres.length > 0 ? 'That genre lens came up empty. Clear filters or reshuffle this country.' : 'No titles are available for this shelf yet. Retry the country load or switch shelves.'}
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-3">
                        {selectedGenres.length > 0 ? <Button onClick={() => setSelectedGenres([])} variant="outline" className="border-white/10 bg-white/[0.03] hover:bg-white/5">Clear Filters</Button> : <Button onClick={handleRetryCurrentCountry} disabled={isBusy} variant="outline" className="border-white/10 bg-white/[0.03] hover:bg-white/5">Retry This Country</Button>}
                        <Button onClick={handleShuffleCurrentCountry} disabled={isBusy} className="btn-primary">Shuffle Again</Button>
                      </div>
                    </div>)}
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Quick Facts</p>
                        <p className="mt-2 text-sm text-white/58">Clean updates after every spin and reshuffle.</p>
                      </div>
                      <Star className="h-4 w-4 text-white/40"/>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-2xl border border-white/[0.06] bg-[#0f1622] p-4">
                        <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Standout Titles</p>
                        <p className="mt-2 text-sm leading-6 text-white/72">
                          {topStandouts.length > 0 ? topStandouts.join(', ') : 'Fresh lineup loading'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.06] bg-[#0f1622] p-4">
                        <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Top Genres</p>
                        <p className="mt-2 text-sm leading-6 text-white/72">
                          {selectedCountryData.topGenres.length > 0
            ? selectedCountryData.topGenres.join(', ')
            : 'This country is waiting for its first live discovery pull.'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.06] bg-[#0f1622] p-4">
                        <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Discovery Status</p>
                        <p className="mt-2 text-sm leading-6 text-white/72">
                          {selectedCountryData.source === 'tmdb'
            ? `TMDB-backed pool connected with ${selectedCountryData.filmCount} rotating titles loaded now.`
            : 'Local fallback pool active while live discovery is unavailable.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Poster Reel</p>
                    {selectedCountryData.posterFilms.slice(0, 4).length > 0 ? (<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {selectedCountryData.posterFilms.slice(0, 4).map((movie) => (<button key={movie.id} type="button" onClick={() => navigate(`/review/${movie.id}`)} className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] transition-transform hover:scale-[1.02]">
                            <div className="aspect-[2/3]">
                              <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover"/>
                            </div>
                          </button>))}
                      </div>) : (<p className="mt-4 text-sm text-white/48">Poster previews will appear once the selected country has usable artwork.</p>)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="border-t border-white/[0.06] px-4 py-5 xl:border-l xl:border-t-0 xl:px-6" style={{ background: 'rgba(8, 12, 20, 0.86)', backdropFilter: 'blur(24px)' }}>
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
                <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Now Landing</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">{selectedCountryData.label}</h2>
                <p className="mt-2 text-sm text-white/52">{selectedCountryData.region}</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/[0.06] bg-[#101724] p-4">
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Visible Titles</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{visibleMovies.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-[#101724] p-4">
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Shelf</p>
                    <p className="mt-2 text-lg font-semibold text-white">{getShelfLabel(selectedShelf)}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#101724] p-4">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Why It Feels Fresh</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Recent pulls avoid the same titles too often, while the shelf keeps mixing crowd favorites,
                    newer releases, classics, and quieter discoveries without hiding the rest of the pool.
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#101724] p-4">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Session Status</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {isBusy ? 'Discovery is updating. Controls are temporarily locked so the current state cannot race itself.' : `Ready. ${selectedCountryData.label} is stable and you can spin, shuffle, pin, or jump into Browse.`}
                  </p>
                </div>

                {recentCountryData.length > 0 && (<div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#101724] p-4">
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Recent Stops</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recentCountryData.map((country) => (<button key={country.key} type="button" onClick={() => handleCountrySelect(country)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/72 transition-colors hover:border-white/20 hover:text-white">
                          {country.flag} {country.label}
                        </button>))}
                    </div>
                  </div>)}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>);
}

