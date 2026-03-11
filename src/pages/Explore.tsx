import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Compass,
  Film,
  Globe2,
  MapPinned,
  RefreshCw,
  Search,
  Shuffle,
  Sparkles,
  Star,
  Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CinematicGlobe, FilterChips, PosterImage } from '@/components/ui-custom';
import {
  defaultExploreCountry,
  defaultPinnedCountryKeys,
  exploreCountries,
  type ExploreCountryStat,
} from '@/data/explore';
import {
  buildExploreDiscovery,
  fetchExploreCountryPool,
  prefetchExploreCountryPool,
  type ExploreCountryDiscovery,
} from '@/lib/explore-discovery';

type ExploreShelf = 'lineup' | 'top' | 'new' | 'hidden';

const pinnedStorageKey = 'stars:explore:pinned-countries';
const visitedStorageKey = 'stars:explore:visited-countries';
const recentMoviesStorageKey = 'stars:explore:recent-country-movies';
const maxPinnedCountries = 6;
const maxRecentMoviesPerCountry = 24;

function readStoredArray(key: string, fallback: string[]) {
  if (typeof window === 'undefined') return fallback;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? 'null');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : fallback;
  } catch {
    return fallback;
  }
}

function readStoredRecentMovies() {
  if (typeof window === 'undefined') return {} as Record<string, string[]>;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(recentMoviesStorageKey) ?? 'null');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function writeStoredValue(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function mergeCountryState(
  countries: ExploreCountryStat[],
  nextCountry: ExploreCountryStat,
  visited: Set<string>,
) {
  return countries.map((country) =>
    country.key === nextCountry.key
      ? {
          ...country,
          ...nextCountry,
          explored: visited.has(nextCountry.key),
        }
      : {
          ...country,
          explored: visited.has(country.key),
        },
  );
}

function passportLabel(count: number) {
  if (count >= 20) return 'World Collector';
  if (count >= 12) return 'Festival Hopper';
  if (count >= 6) return 'Cinema Scout';
  return 'First Stamp';
}

function buildCountrySearchResults(countries: ExploreCountryStat[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return countries
    .filter((country) => country.label.toLowerCase().includes(normalized))
    .slice(0, 8);
}

function getShelfMovies(discovery: ExploreCountryDiscovery | null, shelf: ExploreShelf, countryKey: string) {
  if (!discovery || discovery.country.key !== countryKey) return [];
  if (shelf === 'top') return discovery.topPicks;
  if (shelf === 'new') return discovery.newestPicks;
  if (shelf === 'hidden') return discovery.hiddenGems;
  return discovery.lineup;
}

function pickRandomCountry(countries: ExploreCountryStat[], excludedKeys: string[] = []) {
  const excluded = new Set(excludedKeys);
  const available = countries.filter((country) => !excluded.has(country.key));
  const pool = available.length > 0 ? available : countries;
  return pool[Math.floor(Math.random() * pool.length)] ?? defaultExploreCountry;
}

export function Explore() {
  const navigate = useNavigate();
  const recentMovieIdsRef = useRef<Record<string, string[]>>(readStoredRecentMovies());
  const visitedCountriesRef = useRef<string[]>(readStoredArray(visitedStorageKey, [defaultExploreCountry.key]));
  const loadRequestRef = useRef(0);
  const [countries, setCountries] = useState<ExploreCountryStat[]>(() => {
    const visited = new Set(readStoredArray(visitedStorageKey, [defaultExploreCountry.key]));
    return exploreCountries.map((country) => ({
      ...country,
      explored: visited.has(country.key),
    }));
  });
  const [selectedCountryKey, setSelectedCountryKey] = useState(defaultExploreCountry.key);
  const [selectedShelf, setSelectedShelf] = useState<ExploreShelf>('lineup');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [pinnedCountries, setPinnedCountries] = useState<string[]>(() =>
    readStoredArray(pinnedStorageKey, defaultPinnedCountryKeys),
  );
  const [visitedCountries, setVisitedCountries] = useState<string[]>(() =>
    readStoredArray(visitedStorageKey, [defaultExploreCountry.key]),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [spinToken, setSpinToken] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isCountryLoading, setIsCountryLoading] = useState(true);
  const [countryError, setCountryError] = useState('');
  const [discovery, setDiscovery] = useState<ExploreCountryDiscovery | null>(null);
  const [shuffleCount, setShuffleCount] = useState(0);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const selectedCountry =
    countries.find((country) => country.key === selectedCountryKey) ?? defaultExploreCountry;

  const selectedCountryData =
    discovery?.country.key === selectedCountryKey ? discovery.country : selectedCountry;

  useEffect(() => {
    writeStoredValue(pinnedStorageKey, pinnedCountries);
  }, [pinnedCountries]);

  useEffect(() => {
    visitedCountriesRef.current = visitedCountries;
    writeStoredValue(visitedStorageKey, visitedCountries);
  }, [visitedCountries]);

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
        if (cancelled || loadRequestRef.current !== requestId) return;

        const visited = new Set([...visitedCountriesRef.current, selectedCountryKey]);
        const nextDiscovery = buildExploreDiscovery(pool, {
          recentMovieIds: recentMovieIdsRef.current[selectedCountryKey] ?? [],
          shuffleSeed: Date.now(),
        });
        const nextRecentMovies = [
          ...nextDiscovery.lineup.map((movie) => movie.id),
          ...(recentMovieIdsRef.current[selectedCountryKey] ?? []),
        ].slice(0, maxRecentMoviesPerCountry);

        recentMovieIdsRef.current = {
          ...recentMovieIdsRef.current,
          [selectedCountryKey]: nextRecentMovies,
        };
        writeStoredValue(recentMoviesStorageKey, recentMovieIdsRef.current);
        setVisitedCountries((current) =>
          current.includes(selectedCountryKey) ? current : [...current, selectedCountryKey],
        );
        setCountries((current) => mergeCountryState(current, pool, visited));
        setDiscovery(nextDiscovery);
        setSelectedGenres([]);
        setCountryError('');
      } catch {
        if (cancelled || loadRequestRef.current !== requestId) return;
        setCountryError(`Could not load a fresh lineup for ${selectedCountry.label}.`);
      } finally {
        if (!cancelled && loadRequestRef.current === requestId) {
          setIsCountryLoading(false);
        }
      }
    }

    void loadCountry();
    return () => {
      cancelled = true;
    };
  }, [selectedCountry.label, selectedCountryKey]);

  const searchResults = useMemo(
    () => buildCountrySearchResults(countries, deferredSearchQuery),
    [countries, deferredSearchQuery],
  );

  const visibleGenres = useMemo(
    () => selectedCountryData.genreCounts.slice(0, 8).map(({ genre }) => genre),
    [selectedCountryData.genreCounts],
  );

  const shelfMovies = useMemo(
    () => getShelfMovies(discovery, selectedShelf, selectedCountryKey),
    [discovery, selectedCountryKey, selectedShelf],
  );

  const visibleMovies = useMemo(() => {
    if (selectedGenres.length === 0) return shelfMovies;
    return shelfMovies.filter((movie) => movie.genres.some((genre) => selectedGenres.includes(genre)));
  }, [selectedGenres, shelfMovies]);

  const pinnedCountryData = useMemo(
    () =>
      pinnedCountries
        .map((countryKey) => countries.find((country) => country.key === countryKey))
        .filter((country): country is ExploreCountryStat => Boolean(country)),
    [countries, pinnedCountries],
  );

  const exploredProgress = Math.round((visitedCountries.length / countries.length) * 100);
  const passportTier = passportLabel(visitedCountries.length);
  const topStandouts = selectedCountryData.standoutTitles?.slice(0, 4) ?? [];
  const isShowingCurrentCountryDiscovery = discovery?.country.key === selectedCountryKey;

  const handleCountrySelect = (country: ExploreCountryStat) => {
    startTransition(() => {
      setSelectedCountryKey(country.key);
      setSelectedShelf('lineup');
      setSearchQuery('');
    });
  };

  const togglePin = (countryKey: string) => {
    setPinnedCountries((current) =>
      current.includes(countryKey)
        ? current.filter((key) => key !== countryKey)
        : [countryKey, ...current].slice(0, maxPinnedCountries),
    );
  };

  const handleSpin = () => {
    if (countries.length === 0) return;
    const randomCountry = pickRandomCountry(countries, [selectedCountryKey]);
    setSpinToken((value) => value + 1);
    handleCountrySelect(randomCountry);
  };

  const handleSurpriseMe = () => {
    const randomCountry = pickRandomCountry(
      countries,
      [...visitedCountries.slice(-4), selectedCountryKey].filter(Boolean),
    );
    setSpinToken((value) => value + 1);
    handleCountrySelect(randomCountry);
  };

  const handleShuffleCurrentCountry = async () => {
    setIsCountryLoading(true);
    setCountryError('');

    try {
      const pool = await fetchExploreCountryPool(selectedCountryKey);
      const nextDiscovery = buildExploreDiscovery(pool, {
        recentMovieIds: recentMovieIdsRef.current[selectedCountryKey] ?? [],
        shuffleSeed: Date.now() + shuffleCount + 1,
      });
      const nextRecentMovies = [
        ...nextDiscovery.lineup.map((movie) => movie.id),
        ...(recentMovieIdsRef.current[selectedCountryKey] ?? []),
      ].slice(0, maxRecentMoviesPerCountry);

      recentMovieIdsRef.current = {
        ...recentMovieIdsRef.current,
        [selectedCountryKey]: nextRecentMovies,
      };
      writeStoredValue(recentMoviesStorageKey, recentMovieIdsRef.current);
      setDiscovery(nextDiscovery);
      setShuffleCount((value) => value + 1);
    } catch {
      setCountryError(`Could not reshuffle ${selectedCountry.label} right now.`);
    } finally {
      setIsCountryLoading(false);
    }
  };

  const openBrowseForCountry = () => {
    navigate(`/browse?country=${encodeURIComponent(selectedCountryData.label)}`);
  };

  return (
    <div className="min-h-screen pt-16">
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(circle at 15% 18%, rgba(255,59,59,0.12) 0%, transparent 34%), radial-gradient(circle at 80% 12%, rgba(62,108,255,0.18) 0%, transparent 35%), linear-gradient(180deg, rgba(4,7,13,0.32) 0%, rgba(4,7,13,0.92) 100%)',
          }}
        />

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
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Countries</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{countries.length}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Visited</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{visitedCountries.length}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Pool</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {(selectedCountryData.totalPoolResults ?? selectedCountryData.filmCount).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#f3c86a]/20 bg-[#f3c86a]/[0.06] p-4">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-[#f3c86a]/70">Passport</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{exploredProgress}%</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:mt-8">
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/[0.06] bg-[#0c111a]/80 p-4 backdrop-blur-xl">
                  <label className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">
                    Country Search
                  </label>
                  <div className="search-input-shell mt-3">
                    <Search className="search-input-icon text-white/35" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Jump to a country..."
                      className="input-cinematic search-input-field h-11 border-white/10 bg-white/[0.03] text-sm"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mt-3 space-y-2 rounded-2xl border border-white/[0.06] bg-black/20 p-2">
                      {searchResults.map((country) => (
                        <button
                          key={country.key}
                          onClick={() => handleCountrySelect(country)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.05]"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">{country.label}</p>
                            <p className="text-xs text-white/45">{country.region}</p>
                          </div>
                          <span className="text-xs text-white/55">{country.flag}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-white/[0.06] bg-[#0c111a]/80 p-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">
                        Saved Countries
                      </p>
                      <p className="mt-1 text-xs text-white/50">Fast return points for the places worth revisiting.</p>
                    </div>
                    <MapPinned className="h-4 w-4 text-white/40" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {pinnedCountryData.map((country) => (
                      <button
                        key={country.key}
                        onClick={() => handleCountrySelect(country)}
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                          selectedCountryKey === country.key
                            ? 'border-white/20 text-white'
                            : 'border-white/8 text-white/62 hover:border-white/16 hover:text-white'
                        }`}
                        style={
                          selectedCountryKey === country.key
                            ? {
                                background:
                                  'linear-gradient(135deg, rgba(255,59,59,0.18) 0%, rgba(185,28,28,0.18) 100%)',
                                boxShadow: '0 0 24px rgba(255,59,59,0.18)',
                              }
                            : { background: 'rgba(255,255,255,0.03)' }
                        }
                      >
                        {country.flag} {country.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#f3c86a]/15 bg-[#f3c86a]/[0.05] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#f3c86a]/35 bg-[#f3c86a]/10">
                      <Ticket className="h-5 w-5 text-[#f3c86a]" />
                    </div>
                    <div>
                      <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-[#f3c86a]/70">Passport</p>
                      <p className="text-sm text-white/72">
                        {passportTier} · {visitedCountries.length} stamps
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${exploredProgress}%`,
                        background: 'linear-gradient(90deg, #f3c86a 0%, #ffdf8c 100%)',
                        boxShadow: '0 0 20px rgba(243,200,106,0.35)',
                      }}
                    />
                  </div>
                </div>
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
                    <Button onClick={handleSpin} disabled={isSpinning} className="btn-primary h-12 rounded-full px-5">
                      <RefreshCw className={`mr-2 h-4 w-4 ${isSpinning ? 'animate-spin' : ''}`} />
                      Spin Again
                    </Button>
                    <Button
                      onClick={handleSurpriseMe}
                      variant="outline"
                      className="h-12 rounded-full border-white/10 bg-white/[0.03] px-5 hover:bg-white/5"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Surprise Me
                    </Button>
                  </div>
                </div>

                <div className="mt-6 aspect-square w-full">
                  <CinematicGlobe
                    countries={countries}
                    selectedCountryKey={selectedCountryKey}
                    pinnedCountryKeys={pinnedCountries}
                    spinToken={spinToken}
                    onCountrySelect={handleCountrySelect}
                    onSpinStateChange={setIsSpinning}
                    className="relative h-full w-full"
                  />
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
                      <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Top Genres</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {selectedCountryData.topGenres.slice(0, 2).join(', ') || 'Loading'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedCountryData.topGenres.slice(0, 6).map((genre) => (
                      <span
                        key={genre}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/75"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                    Discovery Controls
                  </p>
                  <div className="mt-4 grid gap-3">
                    <Button onClick={handleShuffleCurrentCountry} className="btn-primary justify-start">
                      <Shuffle className="mr-2 h-4 w-4" />
                      Shuffle Movies in This Country
                    </Button>
                    <Button
                      onClick={() => togglePin(selectedCountryKey)}
                      variant="outline"
                      className="justify-start border-white/10 bg-white/[0.03] hover:bg-white/5"
                    >
                      <Bookmark className="mr-2 h-4 w-4" />
                      {pinnedCountries.includes(selectedCountryKey) ? 'Saved Country' : 'Save Country'}
                    </Button>
                    <Button
                      onClick={openBrowseForCountry}
                      variant="outline"
                      className="justify-start border-white/10 bg-white/[0.03] hover:bg-white/5"
                    >
                      <Compass className="mr-2 h-4 w-4" />
                      Explore This Country in Browse
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                    Curated Random Lineup
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
                  {([
                    ['lineup', 'Random Lineup'],
                    ['top', 'Top Picks'],
                    ['new', 'Newest'],
                    ['hidden', 'Hidden Gems'],
                  ] as const).map(([shelf, label]) => (
                    <button
                      key={shelf}
                      onClick={() => setSelectedShelf(shelf)}
                      className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                        selectedShelf === shelf ? 'text-white' : 'text-white/54 hover:text-white'
                      }`}
                      style={
                        selectedShelf === shelf
                          ? {
                              background:
                                'linear-gradient(135deg, rgba(255,59,59,0.18) 0%, rgba(185,28,28,0.18) 100%)',
                              boxShadow: '0 0 20px rgba(255,59,59,0.14)',
                            }
                          : { background: 'rgba(255,255,255,0.04)' }
                      }
                    >
                      {label}
                    </button>
                  ))}
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
                      <Globe2 className="h-4 w-4 text-white/40" />
                    </div>
                    <div className="mt-4">
                      <FilterChips options={visibleGenres} selected={selectedGenres} onChange={setSelectedGenres} />
                    </div>
                  </div>

                  {countryError && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
                      {countryError}
                    </div>
                  )}

                  {isCountryLoading && !isShowingCurrentCountryDiscovery ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-3">
                          <div className="aspect-[2/3] rounded-[1.2rem] bg-white/10" />
                          <div className="mt-3 h-5 rounded-full bg-white/10" />
                          <div className="mt-2 h-4 w-2/3 rounded-full bg-white/10" />
                        </div>
                      ))}
                    </div>
                  ) : visibleMovies.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {visibleMovies.map((movie) => (
                        <button
                          key={movie.id}
                          onClick={() => navigate(`/review/${movie.id}`)}
                          className="group overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-[#0f1622] p-3 text-left transition-all hover:-translate-y-1 hover:border-white/[0.12]"
                        >
                          <div className="relative aspect-[2/3] overflow-hidden rounded-[1.2rem]">
                            <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                            <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold text-white">
                              {movie.score.toFixed(1)}
                            </div>
                          </div>
                          <div className="mt-3">
                            <h3 className="truncate text-sm font-semibold text-white">{movie.title}</h3>
                            <p className="mt-1 text-xs text-white/48">
                              {movie.year} · {movie.country}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {movie.genres.slice(0, 3).map((genre) => (
                                <span
                                  key={genre}
                                  className="rounded-full bg-white/[0.04] px-2 py-1 text-[11px] text-white/58"
                                >
                                  {genre}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-white/[0.06] bg-[#0e141f] p-10 text-center">
                      <Film className="mx-auto h-7 w-7 text-white/35" />
                      <p className="mt-3 text-sm text-white/62">
                        That genre lens came up empty. Shuffle again or clear the current filters.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Quick Facts</p>
                        <p className="mt-2 text-sm text-white/58">Clean updates after every spin and reshuffle.</p>
                      </div>
                      <Star className="h-4 w-4 text-white/40" />
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
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {selectedCountryData.posterFilms.slice(0, 4).map((movie) => (
                        <button
                          key={movie.id}
                          onClick={() => navigate(`/review/${movie.id}`)}
                          className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] transition-transform hover:scale-[1.02]"
                        >
                          <div className="aspect-[2/3]">
                            <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside
            className="border-t border-white/[0.06] px-4 py-5 xl:border-l xl:border-t-0 xl:px-6"
            style={{ background: 'rgba(8, 12, 20, 0.86)', backdropFilter: 'blur(24px)' }}
          >
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
                <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Now Landing</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">{selectedCountryData.label}</h2>
                <p className="mt-2 text-sm text-white/52">{selectedCountryData.region}</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/[0.06] bg-[#101724] p-4">
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Lineup Size</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{visibleMovies.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-[#101724] p-4">
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Shelf</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {selectedShelf === 'lineup'
                        ? 'Random'
                        : selectedShelf === 'top'
                          ? 'Top Picks'
                          : selectedShelf === 'new'
                            ? 'Newest'
                            : 'Hidden Gems'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#101724] p-4">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Why It Feels Fresh</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Recent pulls avoid the same titles too often, while the lineup keeps mixing crowd favorites,
                    newer releases, classics, and quieter discoveries.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
