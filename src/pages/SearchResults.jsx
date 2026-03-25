// Search results page: dedicated full-page view for cross-media TMDB search.
// Why it exists: users can filter one search query across movies, TV, and people in a stable route.
// Connection: search data comes from TMDB; save actions update Firebase library documents.
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SearchResultCard, SearchResultCardSkeleton } from '@/components/ui-custom/GlobalSearchResults';
import { useToast } from '@/hooks/use-toast';
import { useUserLibrary } from '@/hooks/use-user-library';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { isLibraryAuthError, toggleLibraryItem } from '@/lib/user-library';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
const searchDebounceMs = 250;
const searchViewOrder = ['all', 'person', 'tv', 'movie'];
function getSearchViewLabel(type) {
    if (type === 'all')
        return 'All';
    if (type === 'person')
        return 'People';
    if (type === 'tv')
        return 'TV Shows';
    return 'Movies';
}
function normalizeSearchView(value) {
    if (value === 'movie' || value === 'tv' || value === 'person' || value === 'all')
        return value;
    return 'all';
}
function getResultCounts(results) {
    return {
        all: results.length,
        movie: results.filter((result) => result.mediaType === 'movie').length,
        tv: results.filter((result) => result.mediaType === 'tv').length,
        person: results.filter((result) => result.mediaType === 'person').length,
    };
}
function filterResults(results, selectedType) {
    if (selectedType === 'all')
        return results;
    return results.filter((result) => result.mediaType === selectedType);
}
export function SearchResults() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { currentUser, library } = useUserLibrary();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') ?? '';
    const selectedType = normalizeSearchView(searchParams.get('type'));
    const [searchInputValue, setSearchInputValue] = useState(initialQuery);
    const deferredSearchInput = useDeferredValue(searchInputValue);
    const debouncedQuery = useDebouncedValue(deferredSearchInput, searchDebounceMs);
    const { trimmedQuery, results, isLoading, errorMessage, hasQuery, minSearchLength } = useGlobalSearch(debouncedQuery, {
        limit: 60,
        maxPages: 3,
    });
    useEffect(() => {
        setSearchInputValue(initialQuery);
    }, [initialQuery]);
    useEffect(() => {
        const normalizedUrlQuery = (searchParams.get('q') ?? '').trim();
        const nextQuery = debouncedQuery.trim();
        if (normalizedUrlQuery === nextQuery)
            return;
        const nextParams = new URLSearchParams(searchParams);
        if (nextQuery) {
            nextParams.set('q', nextQuery);
        }
        else {
            nextParams.delete('q');
        }
        setSearchParams(nextParams, { replace: true });
    }, [debouncedQuery, searchParams, setSearchParams]);
    const counts = useMemo(() => getResultCounts(results), [results]);
    const visibleResults = useMemo(() => filterResults(results, selectedType), [results, selectedType]);
    const watchlistSet = useMemo(() => new Set(library.watchlist), [library.watchlist]);
    const favoritesSet = useMemo(() => new Set(library.favorites), [library.favorites]);
    const handleToggleLibraryItem = async (listName, movieId) => {
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
                    description: 'Sign in to save titles to your library.',
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
    };
    return (<div className="min-h-screen pt-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="section-panel overflow-hidden">
          <div className="border-b border-white/8 px-6 py-6 sm:px-8">
            <p className="section-kicker">Global Search</p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="heading-display text-4xl text-white sm:text-5xl">Search Everything</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                  Find movies, TV shows, and people in one structured results view.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/50">
                {hasQuery ? `${counts.all.toLocaleString()} ranked results` : 'Enter a query to begin'}
              </div>
            </div>

            <div className="search-input-shell mt-6">
              <Search className="search-input-icon"/>
              <Input type="search" value={searchInputValue} onChange={(event) => setSearchInputValue(event.target.value)} placeholder="Search for a movie, TV show, or person..." className="input-cinematic search-input-field search-input-field-with-clear h-12 rounded-2xl border-white/10 bg-white/[0.03] text-white"/>
              {searchInputValue && (<button type="button" onClick={() => setSearchInputValue('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white" aria-label="Clear search">
                  <X className="h-4 w-4"/>
                </button>)}
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="border-b border-white/8 bg-black/10 p-4 lg:border-b-0 lg:border-r">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                {searchViewOrder.map((type) => {
            const isActive = type === selectedType;
            return (<button key={type} type="button" onClick={() => {
                    const nextParams = new URLSearchParams(searchParams);
                    if (type === 'all') {
                        nextParams.delete('type');
                    }
                    else {
                        nextParams.set('type', type);
                    }
                    setSearchParams(nextParams, { replace: true });
                }} className={cn('flex min-w-fit items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all', isActive
                    ? 'border-[#d26d47]/30 bg-[#d26d47]/12 text-white'
                    : 'border-white/8 bg-white/[0.03] text-muted-foreground hover:border-white/15 hover:text-white')}>
                      <span className="font-medium">{getSearchViewLabel(type)}</span>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/65">
                        {counts[type].toLocaleString()}
                      </span>
                    </button>);
        })}
              </div>
            </aside>

            <section className="p-5 sm:p-6">
              {isLoading ? (<div>
                  <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
                    <Search className="h-4 w-4 text-[#f4b684]"/>
                    Searching across all result types...
                  </div>
                  <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {Array.from({ length: 6 }).map((_, index) => (<SearchResultCardSkeleton key={index}/>))}
                  </div>
                </div>) : errorMessage ? (<div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-100">
                  {errorMessage}
                </div>) : !hasQuery ? (<div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[1.7rem] border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
                  <Search className="h-8 w-8 text-[#f4b684]"/>
                  <h2 className="mt-4 text-2xl font-semibold text-white">Start typing to search globally</h2>
                  <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                    Search for movies, TV shows, and people from one place. Use at least {minSearchLength} characters.
                  </p>
                </div>) : visibleResults.length === 0 ? (<div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[1.7rem] border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
                  <Search className="h-8 w-8 text-muted-foreground"/>
                  <h2 className="mt-4 text-2xl font-semibold text-white">No matches found</h2>
                  <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                    No {getSearchViewLabel(selectedType).toLowerCase()} matched "{trimmedQuery}".
                  </p>
                </div>) : (<div>
                  <div className="mb-5 flex flex-col gap-2 border-b border-white/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="section-kicker">{getSearchViewLabel(selectedType)}</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        {visibleResults.length.toLocaleString()} result{visibleResults.length === 1 ? '' : 's'}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ranked for "{trimmedQuery}" across {counts.all.toLocaleString()} total matches.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {visibleResults.map((result) => (<SearchResultCard key={`${result.mediaType}-${result.id}`} result={result} onOpen={(href) => navigate(href)} isInWatchlist={watchlistSet.has(`tmdb-${result.id}`)} isLiked={favoritesSet.has(`tmdb-${result.id}`)} onToggleWatchlist={() => {
                    void handleToggleLibraryItem('watchlist', `tmdb-${result.id}`);
                }} onToggleLike={() => {
                    void handleToggleLibraryItem('favorites', `tmdb-${result.id}`);
                }}/>))}
                  </div>
                </div>)}
            </section>
          </div>
        </div>
      </div>
    </div>);
}
