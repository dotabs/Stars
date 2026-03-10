import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, List, Filter, Check, Heart, Clock, Globe, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MovieCard, PosterImage, VerdictBadge } from '@/components/ui-custom';
import { movies, countries } from '@/data/movies';
import type { WatchlistTab, ViewMode } from '@/types';

const watchlistIds = ['dune-part-two', 'anora', 'the-brutalist', 'wicked'];
const watchedIds = ['the-substance', 'conclave'];
const favoritesIds = ['dune-part-two', 'anora'];

export function Watchlist() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WatchlistTab>('watchlist');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Filters
  const [availableOnMyServices, setAvailableOnMyServices] = useState(false);
  const [underTwoHours, setUnderTwoHours] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedVerdict, setSelectedVerdict] = useState<string>('');

  const tabMovies = useMemo(() => {
    switch (activeTab) {
      case 'watchlist':
        return movies.filter((movie) => watchlistIds.includes(movie.id));
      case 'watched':
        return movies.filter((movie) => watchedIds.includes(movie.id));
      case 'favorites':
        return movies.filter((movie) => favoritesIds.includes(movie.id));
      default:
        return [];
    }
  }, [activeTab]);

  const filteredMovies = useMemo(() => {
    let result = tabMovies;
    
    if (availableOnMyServices) {
      result = result.filter(m => m.streaming && m.streaming.length > 0);
    }
    
    if (underTwoHours) {
      result = result.filter(m => m.runtime <= 120);
    }
    
    if (selectedCountry) {
      result = result.filter(m => m.country === selectedCountry);
    }
    
    if (selectedVerdict) {
      result = result.filter(m => m.verdict === selectedVerdict);
    }
    
    return result;
  }, [availableOnMyServices, selectedCountry, selectedVerdict, tabMovies, underTwoHours]);

  const tabs: { id: WatchlistTab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'watchlist', label: 'Watchlist', icon: Check, count: watchlistIds.length },
    { id: 'watched', label: 'Watched', icon: Clock, count: watchedIds.length },
    { id: 'favorites', label: 'Favorites', icon: Heart, count: favoritesIds.length },
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="heading-display text-3xl md:text-4xl">Your Watchlist</h1>
            <p className="text-muted-foreground mt-2">
              Plan your next screening. Filter fast. Watch soon.
            </p>
          </div>
          
          {/* View Toggle */}
          <div className="flex border border-white/10 rounded-lg overflow-hidden">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 flex items-center gap-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'hover:bg-white/5'}`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="text-sm">Grid</span>
            </button>
            <button 
              onClick={() => setViewMode('compact')}
              className={`p-2.5 flex items-center gap-2 ${viewMode === 'compact' ? 'bg-primary text-white' : 'hover:bg-white/5'}`}
            >
              <List className="w-4 h-4" />
              <span className="text-sm">List</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-primary text-white' 
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-2xl bg-card/40 border border-white/[0.06]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch 
              checked={availableOnMyServices} 
              onCheckedChange={setAvailableOnMyServices}
              id="services"
            />
            <label htmlFor="services" className="text-sm cursor-pointer">Available on my services</label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch 
              checked={underTwoHours} 
              onCheckedChange={setUnderTwoHours}
              id="runtime"
            />
            <label htmlFor="runtime" className="text-sm cursor-pointer">Under 2 hours</label>
          </div>
          
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <select 
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-secondary/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All countries</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-muted-foreground" />
            <select 
              value={selectedVerdict}
              onChange={(e) => setSelectedVerdict(e.target.value)}
              className="bg-secondary/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All verdicts</option>
              {['Masterpiece', 'Essential', 'Recommended', 'Mixed', 'Skip'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Movie Grid/List */}
        {filteredMovies.length > 0 ? (
          <div className={`grid gap-4 ${
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
                  className="flex gap-4 p-4 rounded-xl bg-card/40 border border-white/[0.06] hover:border-white/[0.12] cursor-pointer"
                >
                  <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <PosterImage src={movie.poster} title={movie.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{movie.title}</h3>
                        <p className="text-sm text-muted-foreground">{movie.year} - {movie.runtime} min</p>
                      </div>
                      <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{movie.synopsis}</p>
                    <div className="flex gap-2 mt-3">
                      {movie.streaming?.slice(0, 3).map(s => (
                        <span key={s} className="text-xs px-2 py-1 rounded-full bg-white/5">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {activeTab === 'watchlist' ? 'Your watchlist is empty' : 
               activeTab === 'watched' ? 'No movies watched yet' : 'No favorites yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {activeTab === 'watchlist' ? 'Start saving films-hit the + on any poster.' : 
               activeTab === 'watched' ? 'Mark movies as watched to see them here.' : 'Add movies to your favorites to see them here.'}
            </p>
            <Button onClick={() => navigate('/browse')} className="btn-primary">
              Browse Movies
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

