import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Compass,
  Film,
  MapPinned,
  Plane,
  RotateCw,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CinematicGlobe, FilterChips, PosterImage } from '@/components/ui-custom';
import {
  defaultExploreCountry,
  defaultPinnedCountryKeys,
  exploreCountries,
  exploreCountryByKey,
  featuredExploreCountries,
  type ExploreCountryStat,
} from '@/data/explore';

type ExploreTab = 'picks' | 'new' | 'genres';

export function Explore() {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState<ExploreCountryStat>(defaultExploreCountry);
  const [activeTab, setActiveTab] = useState<ExploreTab>('picks');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [pinnedCountries, setPinnedCountries] = useState<string[]>(defaultPinnedCountryKeys);
  const [searchQuery, setSearchQuery] = useState('');
  const [spinToken, setSpinToken] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return featuredExploreCountries
      .filter((country) => country.label.toLowerCase().includes(query))
      .slice(0, 6);
  }, [searchQuery]);

  const selectCountry = (country: ExploreCountryStat) => {
    setSelectedCountry(country);
    setSelectedGenres([]);
    setSearchQuery('');
  };

  const visibleGenres = useMemo(
    () => selectedCountry.genreCounts.slice(0, 6).map(({ genre }) => genre),
    [selectedCountry.genreCounts],
  );

  const visibleMovies = useMemo(() => {
    let result = [...selectedCountry.movies];

    if (selectedGenres.length > 0) {
      result = result.filter((movie) => movie.genres.some((genre) => selectedGenres.includes(genre)));
    }

    if (activeTab === 'picks') {
      result.sort((a, b) => b.score - a.score || b.year - a.year);
    } else if (activeTab === 'new') {
      result.sort((a, b) => b.year - a.year || b.score - a.score);
    } else {
      result.sort((a, b) => {
        const aMatches = a.genres.filter((genre) => selectedGenres.includes(genre)).length;
        const bMatches = b.genres.filter((genre) => selectedGenres.includes(genre)).length;
        return bMatches - aMatches || b.score - a.score;
      });
    }

    return result.slice(0, 6);
  }, [activeTab, selectedCountry.movies, selectedGenres]);

  const exploredCountryCount = useMemo(
    () => featuredExploreCountries.filter((country) => country.explored).length,
    [],
  );
  const exploredProgress = Math.round((exploredCountryCount / featuredExploreCountries.length) * 100);

  const pinnedCountryData = pinnedCountries
    .map((countryKey) => exploreCountryByKey.get(countryKey))
    .filter(Boolean) as ExploreCountryStat[];

  const handleCountrySelect = (country: ExploreCountryStat) => {
    selectCountry(country);
  };

  const togglePin = (countryKey: string) => {
    setPinnedCountries((current) =>
      current.includes(countryKey)
        ? current.filter((key) => key !== countryKey)
        : [...current, countryKey].slice(-6),
    );
  };

  const handleSpin = () => {
    if (featuredExploreCountries.length === 0) return;
    const randomCountry =
      featuredExploreCountries[Math.floor(Math.random() * featuredExploreCountries.length)];
    selectCountry(randomCountry);
    setSpinToken((value) => value + 1);
  };

  return (
    <div className="min-h-screen pt-16">
      <div className="animated-bg" />

      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(circle at 18% 22%, rgba(255,59,59,0.12) 0%, transparent 34%), radial-gradient(circle at 82% 18%, rgba(50,75,130,0.18) 0%, transparent 32%), linear-gradient(180deg, rgba(4,7,13,0.38) 0%, rgba(4,7,13,0.9) 100%)',
          }}
        />

        <div className="relative z-10 grid min-h-[calc(100vh-64px)] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="flex min-h-0 flex-col px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                <p className="text-mono text-xs uppercase tracking-[0.24em] text-white/45">
                  Movie Universe
                </p>
                <h1 className="heading-display mt-3 text-4xl text-white sm:text-5xl lg:text-6xl">
                  Explore Cinema by Country
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/62 sm:text-base">
                  Spin into new film cultures, chase national classics, and move through the STARS archive
                  like a passport stamped in posters.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:w-auto sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                    Countries
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">{featuredExploreCountries.length}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                    Films Logged
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {featuredExploreCountries.reduce((total, country) => total + country.filmCount, 0)}
                  </p>
                </div>
                <div className="col-span-2 rounded-2xl border border-[#f3c86a]/20 bg-[#f3c86a]/[0.06] p-4 sm:col-span-1">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-[#f3c86a]/70">
                    Passport
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">{exploredProgress}%</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:mt-8">
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/[0.06] bg-[#0c111a]/80 p-4 backdrop-blur-xl">
                  <label className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">
                    Country Search
                  </label>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search a film country..."
                      className="input-cinematic h-11 border-white/10 bg-white/[0.03] pl-10 text-sm"
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
                            <p className="text-xs text-white/45">{country.filmCount} films explored</p>
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
                        Pinned Countries
                      </p>
                      <p className="mt-1 text-xs text-white/50">Quick jumps for your favorite scenes.</p>
                    </div>
                    <MapPinned className="h-4 w-4 text-white/40" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {pinnedCountryData.map((country) => (
                      <button
                        key={country.key}
                        onClick={() => handleCountrySelect(country)}
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                          selectedCountry.key === country.key
                            ? 'border-white/20 text-white'
                            : 'border-white/8 text-white/62 hover:border-white/16 hover:text-white'
                        }`}
                        style={
                          selectedCountry.key === country.key
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
              </div>

              <div className="relative rounded-[2rem] border border-white/[0.06] bg-[#09101a]/70 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-5 lg:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                      Orbital Discovery
                    </p>
                    <p className="mt-2 max-w-md text-sm text-white/55">
                      Drag to rotate. Scroll to zoom. Hover for film intel. Click to land on a country.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleSpin}
                      disabled={isSpinning}
                      className="btn-primary h-12 rounded-full px-5"
                    >
                      <RotateCw className={`mr-2 h-4 w-4 ${isSpinning ? 'animate-spin' : ''}`} />
                      Spin the Globe
                    </Button>
                  </div>
                </div>

                <div className="mt-6 aspect-square w-full">
                  <CinematicGlobe
                    countries={exploreCountries}
                    selectedCountryKey={selectedCountry.key}
                    pinnedCountryKeys={pinnedCountries}
                    spinToken={spinToken}
                    onCountrySelect={handleCountrySelect}
                    onSpinStateChange={setIsSpinning}
                    className="relative h-full w-full"
                  />
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-[1fr_240px]">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#FF3B3B]/30 text-sm font-semibold text-white"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(255,59,59,0.2) 0%, rgba(185,28,28,0.2) 100%)',
                          boxShadow: '0 0 24px rgba(255,59,59,0.18)',
                        }}
                      >
                        {selectedCountry.flag}
                      </div>
                      <div>
                        <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">
                          Current Orbit
                        </p>
                        <h2 className="text-lg font-semibold text-white">{selectedCountry.label}</h2>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedCountry.topGenres.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/72"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#f3c86a]/15 bg-[#f3c86a]/[0.05] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#f3c86a]/35 bg-[#f3c86a]/10">
                        <Plane className="h-5 w-5 text-[#f3c86a]" />
                      </div>
                      <div>
                        <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-[#f3c86a]/70">
                          Film Passport
                        </p>
                        <p className="text-sm text-white/72">
                          {exploredCountryCount} of {featuredExploreCountries.length} countries explored
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
              </div>
            </div>
          </section>

          <aside
            className="border-t border-white/[0.06] px-4 py-5 xl:border-l xl:border-t-0 xl:px-6"
            style={{ background: 'rgba(8, 12, 20, 0.86)', backdropFilter: 'blur(24px)' }}
          >
            <div key={selectedCountry.key} className="animate-fade-in space-y-6">
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/42">
                      Scene Location
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold text-white">{selectedCountry.label}</h2>
                    <p className="mt-2 text-sm text-white/52">{selectedCountry.region}</p>
                  </div>

                  <button
                    onClick={() => togglePin(selectedCountry.key)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 transition-all hover:scale-105"
                    style={
                      pinnedCountries.includes(selectedCountry.key)
                        ? {
                            background:
                              'linear-gradient(135deg, rgba(255,59,59,0.22) 0%, rgba(185,28,28,0.22) 100%)',
                            boxShadow: '0 0 24px rgba(255,59,59,0.18)',
                          }
                        : { background: 'rgba(255,255,255,0.04)' }
                    }
                  >
                    <Bookmark
                      className={`h-4 w-4 ${pinnedCountries.includes(selectedCountry.key) ? 'fill-white text-white' : 'text-white/68'}`}
                    />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/[0.06] bg-[#101724] p-4">
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Films</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{selectedCountry.filmCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-[#101724] p-4">
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Avg Score</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {selectedCountry.filmCount > 0 ? selectedCountry.averageScore.toFixed(1) : '--'}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                    Top Genres
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {selectedCountry.topGenres.length > 0
                      ? selectedCountry.topGenres.join(', ')
                      : 'No STARS titles indexed in this country yet.'}
                  </p>
                </div>

                {selectedCountry.posterFilms.length > 0 && (
                  <div className="mt-5">
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                      Poster Reel
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {selectedCountry.posterFilms.map((movie) => (
                        <button
                          key={movie.id}
                          onClick={() => navigate(`/review/${movie.id}`)}
                          className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] transition-transform hover:scale-[1.02]"
                        >
                          <div className="aspect-[2/3]">
                            <PosterImage
                              src={movie.poster}
                              title={movie.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => navigate('/browse')}
                  className="btn-primary mt-6 w-full justify-center"
                  disabled={selectedCountry.filmCount === 0}
                >
                  <Compass className="mr-2 h-4 w-4" />
                  Explore {selectedCountry.label} Cinema
                </Button>
              </div>

              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
                <div className="flex gap-2">
                  {(['picks', 'new', 'genres'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                        activeTab === tab ? 'text-white' : 'text-white/54 hover:text-white'
                      }`}
                      style={
                        activeTab === tab
                          ? {
                              background:
                                'linear-gradient(135deg, rgba(255,59,59,0.18) 0%, rgba(185,28,28,0.18) 100%)',
                              boxShadow: '0 0 20px rgba(255,59,59,0.14)',
                            }
                          : { background: 'rgba(255,255,255,0.04)' }
                      }
                    >
                      {tab === 'picks' ? 'Top Picks' : tab === 'new' ? 'Newest' : 'Genres'}
                    </button>
                  ))}
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                      Genre Lens
                    </p>
                    <div className="mt-3">
                      <FilterChips
                        options={visibleGenres}
                        selected={selectedGenres}
                        onChange={setSelectedGenres}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.06] bg-[#0f1622] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                          Highlights
                        </p>
                        <p className="mt-2 text-sm text-white/65">
                          {selectedCountry.topFilms.length > 0
                            ? selectedCountry.topFilms.slice(0, 3).map((movie) => movie.title).join(', ')
                            : 'No highlights yet'}
                        </p>
                      </div>
                      <Sparkles className="h-4 w-4 text-[#FF3B3B]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                      Results
                    </p>
                    <p className="mt-2 text-sm text-white/54">{visibleMovies.length} films in view</p>
                  </div>
                  <Star className="h-4 w-4 text-white/45" />
                </div>

                {visibleMovies.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {visibleMovies.map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => navigate(`/review/${movie.id}`)}
                        className="flex w-full gap-3 rounded-2xl border border-white/[0.06] bg-[#0e141f] p-3 text-left transition-all hover:scale-[1.01] hover:border-white/[0.12]"
                      >
                        <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-xl">
                          <PosterImage
                            src={movie.poster}
                            title={movie.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-white">{movie.title}</h3>
                              <p className="mt-1 text-xs text-white/48">
                                {movie.year} - {movie.director}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#FF3B3B]/12 px-2 py-1 text-xs font-semibold text-[#FF8A8A]">
                              {movie.score.toFixed(1)}
                            </span>
                          </div>
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
                  <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#0e141f] p-6 text-center">
                    <Film className="mx-auto h-7 w-7 text-white/35" />
                    <p className="mt-3 text-sm text-white/62">
                      No films match the current genre lens for {selectedCountry.label}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

