import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkMinus, Check, Clock3, Filter, Grid3X3, Heart, List, Search, Sparkles, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PosterImage, VerdictBadge } from '@/components/ui-custom';
import { useToast } from '@/hooks/use-toast';
import { useUserLibrary } from '@/hooks/use-user-library';
import { movies as localMovies } from '@/data/movies';
import { fetchMoviesByRouteIds } from '@/lib/tmdb-movies';
import { isLibraryAuthError, removeLibraryItem, setLibraryItemState } from '@/lib/user-library';

const sortOptions = [{ value: 'newest', label: 'Newest' }, { value: 'rating', label: 'Rating' }, { value: 'title', label: 'Title' }];
const runtimeOptions = [{ value: 'all', label: 'Any runtime' }, { value: 'short', label: 'Under 90 min' }, { value: 'feature', label: '90-120 min' }, { value: 'long', label: '120-150 min' }, { value: 'epic', label: '150+ min' }];
const ratingOptions = [{ value: 'all', label: 'Any rating' }, { value: '7', label: '7.0+' }, { value: '8', label: '8.0+' }, { value: '9', label: '9.0+' }];
const tabs = [{ id: 'watchlist', label: 'Watchlist', icon: BookmarkMinus }, { id: 'watched', label: 'Watched', icon: Check }, { id: 'favorites', label: 'Favorites', icon: Heart }];

// Filter helpers stay outside the component so sorting and matching logic remains easy to scan.
function formatRuntime(runtime) {
  if (!runtime || runtime <= 0) return 'Runtime pending';
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function matchesRuntime(runtime, filter) {
  if (filter === 'all') return true;
  if (!runtime || runtime <= 0) return false;
  if (filter === 'short') return runtime < 90;
  if (filter === 'feature') return runtime >= 90 && runtime <= 120;
  if (filter === 'long') return runtime > 120 && runtime <= 150;
  return runtime > 150;
}

function getSortDate(entry, activeTab) {
  if (activeTab === 'watched') return entry.watchedAt || entry.updatedAt || entry.addedAt || '';
  if (activeTab === 'favorites') return entry.favoriteAddedAt || entry.updatedAt || entry.addedAt || '';
  return entry.watchlistAddedAt || entry.updatedAt || entry.addedAt || '';
}

function WatchlistSkeletonCard({ viewMode }) {
  if (viewMode === 'list') {
    return (
      <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex gap-4">
          <Skeleton className="h-32 w-24 rounded-[1.1rem] bg-white/10" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-40 bg-white/10" />
            <Skeleton className="h-4 w-56 bg-white/10" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-20 rounded-full bg-white/10" />
              <Skeleton className="h-7 w-24 rounded-full bg-white/10" />
            </div>
            <Skeleton className="h-14 w-full bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Skeleton className="aspect-[2/3] rounded-[1.65rem] bg-white/10" />
      <Skeleton className="h-5 w-2/3 bg-white/10" />
      <Skeleton className="h-4 w-1/2 bg-white/10" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full bg-white/10" />
        <Skeleton className="h-8 w-24 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

function WatchlistMovieCard({ movie, entry, viewMode, onOpen, onToggleWatched, onToggleFavorite, onToggleWatchlist }) {
  const metadataChips = [`${movie.year}`, formatRuntime(movie.runtime), ...(movie.genres?.slice(0, 2) ?? [])];
  const watchlistLabel = entry?.inWatchlist ? 'Remove' : 'Save';
  const isFavorite = Boolean(entry?.isFavorite);
  const isWatched = Boolean(entry?.isWatched);

  if (viewMode === 'list') {
    return (
      <article className="group flex flex-col gap-4 rounded-[1.7rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(28,21,18,0.88),rgba(16,14,20,0.96))] p-4 shadow-[0_16px_48px_-26px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d26d47]/35 hover:shadow-[0_28px_72px_-34px_rgba(210,109,71,0.42)] sm:flex-row sm:p-5">
        <button type="button" onClick={onOpen} className="relative h-40 w-28 flex-shrink-0 overflow-hidden rounded-[1.2rem] text-left">
          <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" width={200} height={300} sizes="200px" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
                {isWatched ? <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Watched</span> : null}
              </div>
              <button type="button" onClick={onOpen} className="mt-3 text-left">
                <h2 className="text-xl font-semibold text-white transition-colors group-hover:text-[#f4b684]">{movie.title}</h2>
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                {metadataChips.map((chip) => <span key={`${movie.id}-${chip}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/65">{chip}</span>)}
                <span className="rounded-full border border-[#d26d47]/25 bg-[#d26d47]/10 px-3 py-1 text-[11px] font-semibold text-[#f4b684]">{movie.score.toFixed(1)}/10</span>
              </div>
              <p className="mt-3 line-clamp-3 max-w-2xl text-sm leading-6 text-white/65">{movie.synopsis}</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:w-[15.5rem] lg:justify-end">
              <button type="button" onClick={onToggleWatched} className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${isWatched ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-100' : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white'}`}>{isWatched ? 'Watched' : 'Mark Watched'}</button>
              <button type="button" onClick={onToggleFavorite} className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${isFavorite ? 'border-[#d26d47]/40 bg-[#d26d47]/14 text-[#f4b684]' : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white'}`}>{isFavorite ? 'Favorited' : 'Favorite'}</button>
              <button type="button" onClick={onToggleWatchlist} className="rounded-full border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-100 transition-all hover:border-red-400/35 hover:bg-red-500/10">{watchlistLabel}</button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative">
      <div className="overflow-hidden rounded-[1.7rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(28,21,18,0.9),rgba(15,13,19,0.98))] shadow-[0_18px_48px_-28px_rgba(0,0,0,0.88)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#d26d47]/35 hover:shadow-[0_30px_84px_-34px_rgba(210,109,71,0.48)]">
        <button type="button" onClick={onOpen} className="relative block aspect-[2/3] w-full overflow-hidden text-left">
          <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" width={360} height={540} sizes="(min-width: 1280px) 16vw, (min-width: 768px) 24vw, 42vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
            <div className="flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <button type="button" onClick={(event) => { event.stopPropagation(); onToggleFavorite(); }} className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all ${isFavorite ? 'border-[#d26d47]/45 bg-[#d26d47]/18 text-[#f4b684]' : 'border-white/15 bg-black/40 text-white hover:border-white/30'}`} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onToggleWatchlist(); }} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md transition-all hover:border-red-300/35 hover:text-red-100" aria-label={watchlistLabel === 'Remove' ? 'Remove from watchlist' : 'Save to watchlist'}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-full border border-white/12 bg-black/35 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur-md">{movie.year}</div>
              <button type="button" onClick={(event) => { event.stopPropagation(); onToggleWatched(); }} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all ${isWatched ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-100' : 'border-white/12 bg-black/35 text-white/80 backdrop-blur-md hover:border-white/25'}`}>{isWatched ? 'Watched' : 'Mark Watched'}</button>
            </div>
          </div>
        </button>
        <div className="space-y-3 px-4 pb-4 pt-3">
          <button type="button" onClick={onOpen} className="block text-left">
            <h2 className="line-clamp-1 text-lg font-semibold text-white transition-colors group-hover:text-[#f4b684]">{movie.title}</h2>
          </button>
          <div className="flex flex-wrap gap-2">
            {metadataChips.map((chip) => <span key={`${movie.id}-${chip}`} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60">{chip}</span>)}
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-white/62">{movie.synopsis}</p>
        </div>
      </div>
    </article>
  );
}

export function Watchlist() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authReady, currentUser, isAuthenticated, isLoading: isLibraryLoading, library } = useUserLibrary();
  const [activeTab, setActiveTab] = useState('watchlist');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [runtimeFilter, setRuntimeFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [loadedMovies, setLoadedMovies] = useState([]);
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Resolve saved ids into full movie objects from both the local seed catalog and TMDB-backed entries.
  useEffect(() => {
    let cancelled = false;
    async function loadMovies() {
      const ids = [...new Set([...library.watchlist, ...library.watched, ...library.favorites])];
      if (!ids.length) {
        setLoadedMovies([]);
        setLoadError('');
        setIsLoadingMovies(false);
        return;
      }
      setIsLoadingMovies(true);
      setLoadError('');
      try {
        const localMatches = localMovies.filter((movie) => ids.includes(movie.id));
        const remoteMatches = await fetchMoviesByRouteIds(ids.filter((movieId) => movieId.startsWith('tmdb-')));
        const movieMap = new Map([...localMatches, ...remoteMatches].map((movie) => [movie.id, movie]));
        const nextMovies = ids.map((movieId) => movieMap.get(movieId)).filter(Boolean);
        if (!cancelled) setLoadedMovies(nextMovies);
      } catch (error) {
        console.error('Failed to load watchlist movies', error);
        if (!cancelled) {
          setLoadedMovies([]);
          setLoadError('Saved titles could not be loaded right now.');
        }
      } finally {
        if (!cancelled) setIsLoadingMovies(false);
      }
    }
    void loadMovies();
    return () => { cancelled = true; };
  }, [library.favorites, library.watchlist, library.watched]);

  const movieMap = useMemo(() => new Map(loadedMovies.map((movie) => [movie.id, movie])), [loadedMovies]);
  // Build the active tab from library ids so filters and view modes work the same across all three lists.
  const tabMovies = useMemo(() => (library[activeTab] ?? []).map((movieId) => {
    const movie = movieMap.get(movieId);
    const entry = library.itemsById[movieId];
    return movie && entry ? { movie, entry } : null;
  }).filter(Boolean), [activeTab, library, movieMap]);
  const availableGenres = useMemo(() => {
    const genres = new Set();
    tabMovies.forEach(({ movie }) => (movie.genres ?? []).forEach((genre) => genres.add(genre)));
    return ['all', ...Array.from(genres).sort((left, right) => left.localeCompare(right))];
  }, [tabMovies]);

  useEffect(() => {
    if (selectedGenre !== 'all' && !availableGenres.includes(selectedGenre)) setSelectedGenre('all');
  }, [availableGenres, selectedGenre]);

  const filteredMovies = useMemo(() => {
    const minRating = ratingFilter === 'all' ? 0 : Number(ratingFilter);
    return tabMovies.filter(({ movie }) => (selectedGenre === 'all' || movie.genres?.includes(selectedGenre)) && matchesRuntime(movie.runtime, runtimeFilter) && (minRating === 0 || movie.score >= minRating));
  }, [ratingFilter, runtimeFilter, selectedGenre, tabMovies]);

  const sortedMovies = useMemo(() => {
    const nextMovies = [...filteredMovies];
    nextMovies.sort((left, right) => {
      if (sortBy === 'rating') return right.movie.score - left.movie.score || left.movie.title.localeCompare(right.movie.title);
      if (sortBy === 'title') return left.movie.title.localeCompare(right.movie.title) || right.movie.score - left.movie.score;
      return getSortDate(right.entry, activeTab).localeCompare(getSortDate(left.entry, activeTab)) || right.movie.score - left.movie.score;
    });
    return nextMovies;
  }, [activeTab, filteredMovies, sortBy]);

  const heroStats = [{ label: 'Saved', value: String(library.watchlist.length) }, { label: 'Watched', value: String(library.watched.length) }, { label: 'Favorites', value: String(library.favorites.length) }];
  const isBusy = !authReady || isLibraryLoading || isLoadingMovies;

  // All library actions surface the same auth and failure messaging to avoid drifting behavior between buttons.
  const handleActionError = (error, fallbackTitle) => {
    if (isLibraryAuthError(error)) {
      toast({ title: 'Sign in required', description: 'Your library is stored per account. Sign in to manage saved movies.', variant: 'destructive' });
      return;
    }
    console.error(fallbackTitle, error);
    toast({ title: fallbackTitle, description: 'Please try again in a moment.', variant: 'destructive' });
  };

  const handleToggleWatched = async (movieId, enabled) => {
    try {
      await setLibraryItemState({ userId: currentUser?.uid, listName: 'watched', movieId, enabled });
      toast({ title: enabled ? 'Marked as watched' : 'Marked as unwatched', description: enabled ? 'Moved into your watched history.' : 'Removed from your watched history.', variant: 'success' });
    } catch (error) {
      handleActionError(error, 'Watch status update failed');
    }
  };

  const handleToggleFavorite = async (movieId, enabled) => {
    try {
      await setLibraryItemState({ userId: currentUser?.uid, listName: 'favorites', movieId, enabled });
      toast({ title: enabled ? 'Added to favorites' : 'Removed from favorites', description: enabled ? 'This title is pinned as a favorite.' : 'This title is no longer in favorites.', variant: 'success' });
    } catch (error) {
      handleActionError(error, 'Favorites update failed');
    }
  };

  const handleToggleWatchlist = async (movieId, enabled) => {
    try {
      if (!enabled) {
        await removeLibraryItem({ userId: currentUser?.uid, movieId });
      } else {
        await setLibraryItemState({ userId: currentUser?.uid, listName: 'watchlist', movieId, enabled: true });
      }
      toast({ title: enabled ? 'Saved to watchlist' : 'Removed from watchlist', description: enabled ? 'Added back to your queue.' : 'This title has been removed from your queue.', variant: 'success' });
    } catch (error) {
      handleActionError(error, 'Watchlist update failed');
    }
  };

  const emptyTitle = !isAuthenticated ? 'Sign in to build your watchlist' : activeTab === 'watchlist' ? 'Your watchlist is empty' : activeTab === 'watched' ? 'No watched titles yet' : 'No favorites saved yet';
  const emptyDescription = !isAuthenticated ? 'Your library syncs to Firebase per account so your saved movies follow you across sessions.' : activeTab === 'watchlist' ? 'Save movies from Browse, Home, or Review to build a queue worth opening every night.' : activeTab === 'watched' ? 'Mark titles as watched to keep a clean record of what you have finished.' : 'Favorite the standouts you want to surface first.';
  const emptyActionLabel = !isAuthenticated ? 'Sign In' : 'Browse Movies';
  const emptyActionPath = !isAuthenticated ? '/login' : '/browse';

  return (
    <div className="min-h-screen pb-16 pt-16">
      <section className="section-shell pt-6 sm:pt-8">
        <div className="mx-auto max-w-7xl">
          <div className="section-panel relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
            <div className="absolute inset-0 opacity-90"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(210,109,71,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(244,182,132,0.1),transparent_32%),linear-gradient(135deg,rgba(20,16,14,0.98),rgba(12,10,14,0.96))]" /></div>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="section-kicker">Personal Library</p>
                <h1 className="heading-display mt-3 text-4xl text-white sm:text-5xl">Watchlist</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">Real saved titles, synced per user, with quick actions for watched status, favorites, and queue cleanup.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:min-w-[22rem]">
                {heroStats.map((stat) => <div key={stat.label} className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4 text-center backdrop-blur-sm"><p className="text-[11px] uppercase tracking-[0.2em] text-white/40">{stat.label}</p><p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell mt-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-[#d26d47] text-white shadow-[0_14px_30px_-18px_rgba(210,109,71,0.8)]' : 'border border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white'}`}><tab.icon className="h-4 w-4" />{tab.label}<span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px]">{library[tab.id].length}</span></button>)}
            </div>
            <div className="flex items-center gap-3 self-start rounded-full border border-white/10 bg-white/[0.03] p-1">
              <button type="button" onClick={() => setViewMode('grid')} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white'}`}><Grid3X3 className="h-4 w-4" />Grid</button>
              <button type="button" onClick={() => setViewMode('list')} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white'}`}><List className="h-4 w-4" />List</button>
            </div>
          </div>

          <div className="relative z-20 overflow-visible rounded-[1.8rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(18,14,17,0.94),rgba(12,11,15,0.98))] p-4 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.85)] sm:p-5">
            <div className="flex flex-col gap-4 overflow-visible xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3 text-white/65">
                <div className="rounded-full bg-[#d26d47]/12 p-2 text-[#f4b684]"><Filter className="h-4 w-4" /></div>
                <div><p className="text-sm font-semibold text-white">Refine this view</p><p className="text-sm text-white/45">{sortedMovies.length.toLocaleString()} title{sortedMovies.length === 1 ? '' : 's'} visible</p></div>
              </div>
              <div className="relative z-30 grid gap-3 overflow-visible sm:grid-cols-2 xl:grid-cols-4">
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="select-cinematic z-[1000]">
                  {sortOptions.map((option) => <option key={option.value} value={option.value}>Sort: {option.label}</option>)}
                </select>
                <select value={selectedGenre} onChange={(event) => setSelectedGenre(event.target.value)} className="select-cinematic z-[1000]">
                  {availableGenres.map((genre) => <option key={genre} value={genre}>{genre === 'all' ? 'All genres' : genre}</option>)}
                </select>
                <select value={runtimeFilter} onChange={(event) => setRuntimeFilter(event.target.value)} className="select-cinematic z-[1000]">
                  {runtimeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)} className="select-cinematic z-[1000]">
                  {ratingOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {loadError ? <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-100">{loadError}</div> : null}

          {isBusy ? (
            <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
              {Array.from({ length: viewMode === 'grid' ? 10 : 5 }).map((_, index) => <WatchlistSkeletonCard key={index} viewMode={viewMode} />)}
            </div>
          ) : sortedMovies.length > 0 ? (
            <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
              {sortedMovies.map(({ movie, entry }) => <WatchlistMovieCard key={movie.id} movie={movie} entry={entry} viewMode={viewMode} onOpen={() => navigate(`/review/${movie.id}`)} onToggleWatched={() => void handleToggleWatched(movie.id, !entry.isWatched)} onToggleFavorite={() => void handleToggleFavorite(movie.id, !entry.isFavorite)} onToggleWatchlist={() => void handleToggleWatchlist(movie.id, !entry.inWatchlist)} />)}
            </div>
          ) : (
            <div className="section-panel px-6 py-14 text-center sm:px-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#f4b684]">{isAuthenticated ? <Sparkles className="h-8 w-8" /> : <Search className="h-8 w-8" />}</div>
              <h2 className="mt-6 text-2xl font-semibold text-white">{emptyTitle}</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/60">{emptyDescription}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button className="btn-primary" onClick={() => navigate(emptyActionPath)}>{emptyActionLabel}</Button>
                {isAuthenticated ? <Button variant="outline" className="btn-outline text-white" onClick={() => { setSelectedGenre('all'); setRuntimeFilter('all'); setRatingFilter('all'); setSortBy('newest'); }}>Clear filters</Button> : null}
              </div>
            </div>
          )}

          {!isBusy && sortedMovies.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/52"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#f4b684]" />Sorted by {sortOptions.find((option) => option.value === sortBy)?.label ?? 'Newest'}</span><span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-[#f4b684]" />Real saved titles powered by Firebase + TMDB</span></div> : null}
        </div>
      </section>
    </div>
  );
}
