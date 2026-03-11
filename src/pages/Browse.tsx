import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Film, Grid3X3, List, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { MovieCard, FilterChips, PosterImage, VerdictBadge } from '@/components/ui-custom';
import { browseDecades, browseGenres } from '@/lib/movie-constants';
import { fetchBrowseMovies } from '@/lib/tmdb-movies';
import type { Movie, SortOption, Verdict } from '@/types';

const verdicts: Verdict[] = ['Masterpiece', 'Essential', 'Recommended', 'Mixed', 'Skip'];

export function Browse() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedVerdicts, setSelectedVerdicts] = useState<Verdict[]>([]);
  const [selectedDecades, setSelectedDecades] = useState<number[]>([]);
  const [scoreRange, setScoreRange] = useState([0, 10]);
  const [runtimeRange, setRuntimeRange] = useState([0, 240]);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');
  const [activeFilterTab, setActiveFilterTab] = useState<'basic' | 'advanced'>('basic');
  const [remoteMovies, setRemoteMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const queryFromUrl = searchParams.get('q') ?? '';
    if (queryFromUrl !== searchQuery) {
      setSearchQuery(queryFromUrl);
    }
  }, [searchParams, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const normalizedQuery = searchQuery.trim();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const fetchedMovies = await fetchBrowseMovies({
          query: normalizedQuery,
          genres: selectedGenres,
          decades: selectedDecades,
          minScore: scoreRange[0],
          maxScore: scoreRange[1],
          minRuntime: runtimeRange[0],
          maxRuntime: runtimeRange[1],
          sortBy,
        });

        if (!cancelled) {
          setRemoteMovies(fetchedMovies);
        }
      } catch (error) {
        console.error('Failed to load browse movies', error);
        if (!cancelled) {
          setRemoteMovies([]);
          setLoadError('TMDB search is currently unavailable.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, normalizedQuery ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [runtimeRange, scoreRange, searchQuery, selectedDecades, selectedGenres, sortBy]);

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();
    const currentQuery = searchParams.get('q') ?? '';

    if (normalizedQuery === currentQuery) return;

    const nextParams = new URLSearchParams(searchParams);
    if (normalizedQuery) {
      nextParams.set('q', normalizedQuery);
    } else {
      nextParams.delete('q');
    }

    setSearchParams(nextParams, { replace: true });
  }, [searchParams, searchQuery, setSearchParams]);

  const filteredMovies = useMemo(() => {
    let result = [...remoteMovies];

    if (selectedVerdicts.length > 0) {
      result = result.filter((movie) => selectedVerdicts.includes(movie.verdict));
    }

    switch (sortBy) {
      case 'topRated':
        result.sort((a, b) => b.score - a.score);
        break;
      case 'oldest':
        result.sort((a, b) => a.year - b.year);
        break;
      case 'popular':
        result.sort((a, b) => b.score - a.score || b.year - a.year);
        break;
      case 'newest':
      default:
        result.sort((a, b) => b.year - a.year);
        break;
    }

    return result;
  }, [remoteMovies, selectedVerdicts, sortBy]);

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedVerdicts([]);
    setSelectedDecades([]);
    setScoreRange([0, 10]);
    setRuntimeRange([0, 240]);
    setSearchQuery('');
  };

  const activeFiltersCount = selectedGenres.length + selectedVerdicts.length + selectedDecades.length;

  const renderFilters = () => (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </h2>
        {activeFiltersCount > 0 && (
          <button onClick={clearFilters} className="text-xs font-medium text-red-500 transition-colors hover:text-red-400">
            Clear all
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveFilterTab('basic')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${activeFilterTab === 'basic' ? 'text-white' : 'text-muted-foreground'}`}
          style={activeFilterTab === 'basic' ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)' } : { background: 'rgba(255,255,255,0.05)' }}
        >
          Basic
        </button>
        <button
          onClick={() => setActiveFilterTab('advanced')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${activeFilterTab === 'advanced' ? 'text-white' : 'text-muted-foreground'}`}
          style={activeFilterTab === 'advanced' ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)' } : { background: 'rgba(255,255,255,0.05)' }}
        >
          Advanced
        </button>
      </div>

      <div className="mb-6">
        <div className="search-input-shell">
          <Search className="search-input-icon" />
          <Input
            type="search"
            placeholder="Search title, then refine with filters..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="input-cinematic search-input-field search-input-field-with-clear"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Genre</label>
        <FilterChips options={browseGenres.slice(0, 12)} selected={selectedGenres} onChange={setSelectedGenres} />
      </div>

      <div className="mb-6">
        <label className="mb-3 flex items-center gap-2 text-mono text-xs uppercase tracking-wider text-muted-foreground">
          <Calendar className="h-3 w-3" /> Decade
        </label>
        <div className="flex flex-wrap gap-2">
          {browseDecades.map((decade) => (
            <button
              key={decade}
              onClick={() =>
                setSelectedDecades((current) =>
                  current.includes(decade) ? current.filter((value) => value !== decade) : [...current, decade],
                )
              }
              className={`filter-chip ${selectedDecades.includes(decade) ? 'active' : ''}`}
            >
              {decade}s
            </button>
          ))}
        </div>
      </div>

      {activeFilterTab === 'advanced' && (
        <>
          <div className="mb-6">
            <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">
              Score: {scoreRange[0]} - {scoreRange[1]}
            </label>
            <Slider value={scoreRange} onValueChange={setScoreRange} min={0} max={10} step={0.1} className="w-full" />
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">
              Runtime: {runtimeRange[0]} - {runtimeRange[1]} min
            </label>
            <Slider value={runtimeRange} onValueChange={setRuntimeRange} min={0} max={240} step={5} className="w-full" />
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Verdict</label>
            <div className="flex flex-wrap gap-2">
              {verdicts.map((verdict) => (
                <button
                  key={verdict}
                  onClick={() =>
                    setSelectedVerdicts((current) =>
                      current.includes(verdict) ? current.filter((value) => value !== verdict) : [...current, verdict],
                    )
                  }
                  className={`filter-chip ${selectedVerdicts.includes(verdict) ? 'active' : ''}`}
                >
                  {verdict}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen pt-16">
      <div className="animated-bg" />
      <div className="flex flex-col lg:flex-row">
        {showFilters && (
          <aside className="hidden border-r border-white/[0.06] p-5 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-64px)] lg:w-80 lg:flex-shrink-0 lg:overflow-y-auto" style={{ background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(20px)' }}>
            {renderFilters()}
          </aside>
        )}

        <main className="flex-1 p-4 sm:p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h1 className="heading-display text-3xl">Browse TMDB</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading
                  ? 'Refreshing live results...'
                  : searchQuery.trim()
                    ? `${filteredMovies.length} results for "${searchQuery.trim()}"`
                    : `${filteredMovies.length} results`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="border-white/10 hover:bg-white/5">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>

              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="input-cinematic py-2 text-sm">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="topRated">Top Rated</option>
                <option value="popular">Most Popular</option>
              </select>

              <div className="flex overflow-hidden rounded-lg border border-white/10">
                <button type="button" onClick={() => setViewMode('grid')} className={`p-2.5 ${viewMode === 'grid' ? '' : 'hover:bg-white/5'}`} style={viewMode === 'grid' ? { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' } : {}}>
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setViewMode('compact')} className={`p-2.5 ${viewMode === 'compact' ? '' : 'hover:bg-white/5'}`} style={viewMode === 'compact' ? { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' } : {}}>
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
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

          {filteredMovies.length > 0 ? (
            <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
              {filteredMovies.map((movie) =>
                viewMode === 'grid' ? (
                  <MovieCard key={movie.id} movie={movie} variant="compact" onClick={() => navigate(`/review/${movie.id}`)} />
                ) : (
                  <div key={movie.id} onClick={() => navigate(`/review/${movie.id}`)} className="flex cursor-pointer gap-4 rounded-xl p-4 transition-all hover:scale-[1.01]" style={{ background: 'rgba(20, 20, 28, 0.8)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                      <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{movie.title}</h3>
                          <p className="text-sm text-muted-foreground">{movie.year}</p>
                        </div>
                        <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{movie.synopsis}</p>
                      <div className="mt-3 flex gap-2">
                        {movie.genres.slice(0, 3).map((genre) => (
                          <span key={genre} className="rounded-full px-2 py-1 text-xs" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Film className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{isLoading ? 'Loading movies' : 'No movies found'}</h3>
              <p className="mb-6 text-muted-foreground">{isLoading ? 'Fetching live TMDB results.' : 'Try a broader search or clear some filters.'}</p>
              {!isLoading && <Button onClick={clearFilters} className="btn-primary">Clear all filters</Button>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
