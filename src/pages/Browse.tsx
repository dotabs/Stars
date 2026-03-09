import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Grid3X3, List, Search, X, User, Calendar, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { MovieCard, FilterChips, PosterImage, VerdictBadge } from '@/components/ui-custom';
import { movies, genres, countries, streamingServices, decades } from '@/data/movies';
import { actors } from '@/data/actors';
import type { Verdict, SortOption } from '@/types';

const verdicts: Verdict[] = ['Masterpiece', 'Essential', 'Recommended', 'Mixed', 'Skip'];

export function Browse() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(true);
  
  // Filters
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedVerdicts, setSelectedVerdicts] = useState<Verdict[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedDecades, setSelectedDecades] = useState<number[]>([]);
  const [selectedStreaming, setSelectedStreaming] = useState<string[]>([]);
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [scoreRange, setScoreRange] = useState([0, 10]);
  const [runtimeRange, setRuntimeRange] = useState([60, 240]);
  const [spoilerFree, setSpoilerFree] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'basic' | 'advanced'>('basic');

  // Filter movies
  const filteredMovies = useMemo(() => {
    let result = [...movies];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.director.toLowerCase().includes(query) ||
        m.cast.some(c => c.toLowerCase().includes(query))
      );
    }
    
    if (selectedGenres.length > 0) {
      result = result.filter(m => m.genres.some(g => selectedGenres.includes(g)));
    }
    
    if (selectedVerdicts.length > 0) {
      result = result.filter(m => selectedVerdicts.includes(m.verdict));
    }
    
    if (selectedCountries.length > 0) {
      result = result.filter(m => selectedCountries.includes(m.country));
    }
    
    if (selectedDecades.length > 0) {
      result = result.filter(m => selectedDecades.includes(m.decade));
    }
    
    if (selectedStreaming.length > 0) {
      result = result.filter(m => m.streaming?.some(s => selectedStreaming.includes(s)));
    }
    
    if (selectedActors.length > 0) {
      result = result.filter(m => selectedActors.some(actor => 
        m.cast.some(c => c.toLowerCase().includes(actor.toLowerCase()))
      ));
    }
    
    result = result.filter(m => m.score >= scoreRange[0] && m.score <= scoreRange[1]);
    result = result.filter(m => m.runtime >= runtimeRange[0] && m.runtime <= runtimeRange[1]);
    
    // Sort
    switch (sortBy) {
      case 'topRated':
        result.sort((a, b) => b.score - a.score);
        break;
      case 'popular':
        result.sort((a, b) => b.year - a.year);
        break;
      case 'oldest':
        result.sort((a, b) => a.year - b.year);
        break;
      case 'newest':
      default:
        result.sort((a, b) => b.year - a.year);
        break;
    }
    
    return result;
  }, [selectedGenres, selectedVerdicts, selectedCountries, selectedDecades, selectedStreaming, selectedActors, scoreRange, runtimeRange, searchQuery, sortBy]);

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedVerdicts([]);
    setSelectedCountries([]);
    setSelectedDecades([]);
    setSelectedStreaming([]);
    setSelectedActors([]);
    setScoreRange([0, 10]);
    setRuntimeRange([60, 240]);
    setSearchQuery('');
  };

  const activeFiltersCount = selectedGenres.length + selectedVerdicts.length + selectedCountries.length + 
    selectedDecades.length + selectedStreaming.length + selectedActors.length;

  const renderFilters = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </h2>
        {activeFiltersCount > 0 && (
          <button 
            onClick={clearFilters}
            className="text-xs font-medium hover:text-red-400 transition-colors"
            style={{ color: '#ef4444' }}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveFilterTab('basic')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeFilterTab === 'basic' ? 'text-white' : 'text-muted-foreground'
          }`}
          style={activeFilterTab === 'basic' ? {
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)'
          } : { background: 'rgba(255,255,255,0.05)' }}
        >
          Basic
        </button>
        <button
          onClick={() => setActiveFilterTab('advanced')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeFilterTab === 'advanced' ? 'text-white' : 'text-muted-foreground'
          }`}
          style={activeFilterTab === 'advanced' ? {
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)'
          } : { background: 'rgba(255,255,255,0.05)' }}
        >
          Advanced
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search movies, actors, directors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 input-cinematic"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {activeFilterTab === 'basic' ? (
        <>
          <div className="mb-6">
            <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
              Genre
            </label>
            <FilterChips 
              options={genres.slice(0, 10)} 
              selected={selectedGenres}
              onChange={setSelectedGenres}
            />
          </div>

          <div className="mb-6">
            <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 block flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Decade
            </label>
            <div className="flex flex-wrap gap-2">
              {decades.map((decade) => (
                <button
                  key={decade}
                  onClick={() => {
                    if (selectedDecades.includes(decade)) {
                      setSelectedDecades(selectedDecades.filter(d => d !== decade));
                    } else {
                      setSelectedDecades([...selectedDecades, decade]);
                    }
                  }}
                  className={`filter-chip ${selectedDecades.includes(decade) ? 'active' : ''}`}
                >
                  {decade}s
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
              Verdict
            </label>
            <div className="flex flex-wrap gap-2">
              {verdicts.map((verdict) => (
                <button
                  key={verdict}
                  onClick={() => {
                    if (selectedVerdicts.includes(verdict)) {
                      setSelectedVerdicts(selectedVerdicts.filter(v => v !== verdict));
                    } else {
                      setSelectedVerdicts([...selectedVerdicts, verdict]);
                    }
                  }}
                  className={`filter-chip ${selectedVerdicts.includes(verdict) ? 'active' : ''}`}
                >
                  {verdict}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-6">
            <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 block flex items-center gap-2">
              <User className="w-3 h-3" /> Actors
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-hide">
              {actors.slice(0, 15).map((actor) => (
                <button
                  key={actor.id}
                  onClick={() => {
                    if (selectedActors.includes(actor.name)) {
                      setSelectedActors(selectedActors.filter(a => a !== actor.name));
                    } else {
                      setSelectedActors([...selectedActors, actor.name]);
                    }
                  }}
                  className={`filter-chip ${selectedActors.includes(actor.name) ? 'active' : ''}`}
                >
                  {actor.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
              Country
            </label>
            <select 
              className="w-full input-cinematic text-sm"
              onChange={(e) => {
                const value = e.target.value;
                if (value && !selectedCountries.includes(value)) {
                  setSelectedCountries([...selectedCountries, value]);
                }
              }}
            >
              <option value="">Select country</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {selectedCountries.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedCountries.map(country => (
                  <span key={country} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                    style={{ background: 'rgba(220, 38, 38, 0.2)', color: '#ef4444' }}>
                    {country}
                    <button onClick={() => setSelectedCountries(selectedCountries.filter(c => c !== country))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
              Streaming
            </label>
            <div className="flex flex-wrap gap-2">
              {streamingServices.slice(0, 8).map((service) => (
                <button
                  key={service}
                  onClick={() => {
                    if (selectedStreaming.includes(service)) {
                      setSelectedStreaming(selectedStreaming.filter(s => s !== service));
                    } else {
                      setSelectedStreaming([...selectedStreaming, service]);
                    }
                  }}
                  className={`filter-chip ${selectedStreaming.includes(service) ? 'active' : ''}`}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
              Score: {scoreRange[0]} - {scoreRange[1]}
            </label>
            <Slider 
              value={scoreRange}
              onValueChange={setScoreRange}
              min={0}
              max={10}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="mb-6">
            <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
              Runtime: {runtimeRange[0]} - {runtimeRange[1]} min
            </label>
            <Slider 
              value={runtimeRange}
              onValueChange={setRuntimeRange}
              min={60}
              max={240}
              step={5}
              className="w-full"
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground">
          Spoiler-free mode
        </label>
        <Switch checked={spoilerFree} onCheckedChange={setSpoilerFree} />
      </div>
    </>
  );

  return (
    <div className="min-h-screen pt-16">
      <div className="animated-bg" />
      
      <div className="flex flex-col lg:flex-row">
        {showFilters && (
          <aside className="hidden lg:block lg:w-80 lg:flex-shrink-0 lg:h-[calc(100vh-64px)] lg:overflow-y-auto lg:sticky lg:top-16 p-5 border-r border-white/[0.06]"
            style={{ background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(20px)' }}>
            {renderFilters()}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="heading-display text-3xl">Browse Movies</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {filteredMovies.length} films found
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Toggle Filters */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-white/10 hover:bg-white/5"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              
              {/* Sort */}
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="input-cinematic text-sm py-2"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="topRated">Top Rated</option>
                <option value="popular">Most Popular</option>
              </select>
              
              {/* View Mode */}
              <div className="flex border border-white/10 rounded-lg overflow-hidden">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 ${viewMode === 'grid' ? '' : 'hover:bg-white/5'}`}
                  style={viewMode === 'grid' ? {
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                  } : {}}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('compact')}
                  className={`p-2.5 ${viewMode === 'compact' ? '' : 'hover:bg-white/5'}`}
                  style={viewMode === 'compact' ? {
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                  } : {}}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="lg:hidden mb-6 rounded-2xl border border-white/[0.06] p-4 sm:p-5"
              style={{ background: 'rgba(10, 10, 15, 0.85)', backdropFilter: 'blur(20px)' }}>
              {renderFilters()}
            </div>
          )}

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedGenres.map(g => (
                <span key={g} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs"
                  style={{ background: 'rgba(255,255,255,0.1)' }}>
                  {g}
                  <button onClick={() => setSelectedGenres(selectedGenres.filter(x => x !== g))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedDecades.map(d => (
                <span key={d} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs"
                  style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>
                  {d}s
                  <button onClick={() => setSelectedDecades(selectedDecades.filter(x => x !== d))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedVerdicts.map(v => (
                <span key={v} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs"
                  style={{ background: 'rgba(220, 38, 38, 0.2)', color: '#ef4444' }}>
                  {v}
                  <button onClick={() => setSelectedVerdicts(selectedVerdicts.filter(x => x !== v))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Movie Grid */}
          {filteredMovies.length > 0 ? (
            <div className={`grid gap-5 ${
              viewMode === 'grid' 
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                : 'grid-cols-1'
            }`}>
              {filteredMovies.map((movie) => (
                viewMode === 'grid' ? (
                  <MovieCard 
                    key={movie.id}
                    movie={movie}
                    variant="compact"
                    onClick={() => navigate(`/review/${movie.id}`)}
                  />
                ) : (
                  <div 
                    key={movie.id}
                    onClick={() => navigate(`/review/${movie.id}`)}
                    className="flex gap-4 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                    style={{ 
                      background: 'rgba(20, 20, 28, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}
                  >
                    <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <PosterImage src={movie.poster} title={movie.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{movie.title}</h3>
                          <p className="text-sm text-muted-foreground">{movie.year} • {movie.director}</p>
                        </div>
                        <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{movie.synopsis}</p>
                      <div className="flex gap-2 mt-3">
                        {movie.genres.slice(0, 3).map(g => (
                          <span key={g} className="text-xs px-2 py-1 rounded-full" 
                            style={{ background: 'rgba(255,255,255,0.05)' }}>{g}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Film className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No movies found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your filters</p>
              <Button onClick={clearFilters} className="btn-primary">
                Clear all filters
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
