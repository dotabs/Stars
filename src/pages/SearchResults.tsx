import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Film, LoaderCircle, Search, Tv, UserRound, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getSearchResultHref, getSearchResultTypeLabel, searchGlobal } from '@/lib/tmdb-search';
import { cn } from '@/lib/utils';
import type { SearchResult, SearchResultType, SearchViewType } from '@/types';

const searchDebounceMs = 250;
const minSearchLength = 2;

const searchViewOrder: SearchViewType[] = ['all', 'person', 'tv', 'movie'];

function getSearchViewLabel(type: SearchViewType) {
  if (type === 'all') return 'All';
  if (type === 'person') return 'People';
  if (type === 'tv') return 'TV Shows';
  return 'Movies';
}

function SearchTypeIcon({ mediaType, className }: { mediaType: SearchResultType; className?: string }) {
  if (mediaType === 'movie') return <Film className={className} />;
  if (mediaType === 'tv') return <Tv className={className} />;
  return <UserRound className={className} />;
}

function getTypeBadgeClassName(mediaType: SearchResultType) {
  if (mediaType === 'movie') return 'border-[#d26d47]/30 bg-[#d26d47]/12 text-[#f4b684]';
  if (mediaType === 'tv') return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
  return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
}

function normalizeSearchView(value: string | null): SearchViewType {
  if (value === 'movie' || value === 'tv' || value === 'person' || value === 'all') return value;
  return 'all';
}

function getResultCounts(results: SearchResult[]) {
  return {
    all: results.length,
    movie: results.filter((result) => result.mediaType === 'movie').length,
    tv: results.filter((result) => result.mediaType === 'tv').length,
    person: results.filter((result) => result.mediaType === 'person').length,
  } satisfies Record<SearchViewType, number>;
}

function filterResults(results: SearchResult[], selectedType: SearchViewType) {
  if (selectedType === 'all') return results;
  return results.filter((result) => result.mediaType === selectedType);
}

function SearchResultRow({ result }: { result: SearchResult }) {
  const isPerson = result.mediaType === 'person';

  return (
    <Link
      to={getSearchResultHref(result)}
      className="group flex gap-4 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4 transition-all hover:border-white/15 hover:bg-white/[0.05]"
    >
      <div
        className={cn(
          'flex h-28 w-20 flex-none items-center justify-center overflow-hidden border border-white/10 bg-white/[0.04]',
          isPerson ? 'rounded-[1.4rem]' : 'rounded-[1.2rem]',
        )}
      >
        {result.imageUrl ? (
          <img
            src={result.imageUrl}
            alt={result.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <SearchTypeIcon mediaType={result.mediaType} className="h-7 w-7 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="line-clamp-1 text-lg font-semibold text-white group-hover:text-[#f4b684]">{result.title}</h2>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
              getTypeBadgeClassName(result.mediaType),
            )}
          >
            <SearchTypeIcon mediaType={result.mediaType} className="h-3 w-3" />
            {getSearchResultTypeLabel(result.mediaType)}
          </span>
          {result.yearLabel && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {result.yearLabel}
            </span>
          )}
        </div>

        <p className="mt-2 text-sm text-[#f4cfb0]">{result.metadataLine}</p>
        {!isPerson && (
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">{getSearchResultTypeLabel(result.mediaType)}</p>
        )}
        {isPerson && result.knownForDepartment && (
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">{result.knownForDepartment}</p>
        )}
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{result.overview}</p>
      </div>
    </Link>
  );
}

function SearchResultSkeleton() {
  return (
    <div className="flex gap-4 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
      <div className="h-28 w-20 rounded-[1.2rem] bg-white/10" />
      <div className="flex-1 space-y-3">
        <div className="h-5 w-1/3 rounded bg-white/10" />
        <div className="h-4 w-1/2 rounded bg-white/10" />
        <div className="h-4 w-1/4 rounded bg-white/10" />
        <div className="h-4 w-full rounded bg-white/10" />
      </div>
    </div>
  );
}

export function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const selectedType = normalizeSearchView(searchParams.get('type'));
  const [searchInputValue, setSearchInputValue] = useState(initialQuery);
  const deferredSearchInput = useDeferredValue(searchInputValue);
  const debouncedQuery = useDebouncedValue(deferredSearchInput, searchDebounceMs);
  const trimmedQuery = debouncedQuery.trim();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setSearchInputValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const normalizedUrlQuery = (searchParams.get('q') ?? '').trim();
    const nextQuery = debouncedQuery.trim();
    if (normalizedUrlQuery === nextQuery) return;

    const nextParams = new URLSearchParams(searchParams);
    if (nextQuery) {
      nextParams.set('q', nextQuery);
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams, { replace: true });
  }, [debouncedQuery, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    if (trimmedQuery.length < minSearchLength) {
      setResults([]);
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    void searchGlobal(trimmedQuery, { limit: 60, maxPages: 3 })
      .then((nextResults) => {
        if (!cancelled) {
          setResults(nextResults);
        }
      })
      .catch((error) => {
        console.error('Failed to load full search results', error);
        if (!cancelled) {
          setResults([]);
          setErrorMessage('Search is temporarily unavailable.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trimmedQuery]);

  const counts = useMemo(() => getResultCounts(results), [results]);
  const visibleResults = useMemo(() => filterResults(results, selectedType), [results, selectedType]);
  const hasSearchQuery = trimmedQuery.length >= minSearchLength;

  return (
    <div className="min-h-screen pt-16">
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
                {hasSearchQuery ? `${counts.all.toLocaleString()} ranked results` : 'Enter a query to begin'}
              </div>
            </div>

            <div className="search-input-shell mt-6">
              <Search className="search-input-icon" />
              <Input
                type="search"
                value={searchInputValue}
                onChange={(event) => setSearchInputValue(event.target.value)}
                placeholder="Search for a movie, TV show, or person..."
                className="input-cinematic search-input-field search-input-field-with-clear h-12 rounded-2xl border-white/10 bg-white/[0.03] text-white"
              />
              {searchInputValue && (
                <button
                  type="button"
                  onClick={() => setSearchInputValue('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="border-b border-white/8 bg-black/10 p-4 lg:border-b-0 lg:border-r">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                {searchViewOrder.map((type) => {
                  const isActive = type === selectedType;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const nextParams = new URLSearchParams(searchParams);
                        if (type === 'all') {
                          nextParams.delete('type');
                        } else {
                          nextParams.set('type', type);
                        }
                        setSearchParams(nextParams, { replace: true });
                      }}
                      className={cn(
                        'flex min-w-fit items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all',
                        isActive
                          ? 'border-[#d26d47]/30 bg-[#d26d47]/12 text-white'
                          : 'border-white/8 bg-white/[0.03] text-muted-foreground hover:border-white/15 hover:text-white',
                      )}
                    >
                      <span className="font-medium">{getSearchViewLabel(type)}</span>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/65">
                        {counts[type].toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="p-5 sm:p-6">
              {isLoading ? (
                <div>
                  <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[#f4b684]" />
                    Searching across all result types...
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <SearchResultSkeleton key={index} />
                    ))}
                  </div>
                </div>
              ) : errorMessage ? (
                <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-100">
                  {errorMessage}
                </div>
              ) : !hasSearchQuery ? (
                <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[1.7rem] border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
                  <Search className="h-8 w-8 text-[#f4b684]" />
                  <h2 className="mt-4 text-2xl font-semibold text-white">Start typing to search globally</h2>
                  <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                    Search for movies, TV shows, and people from one place. Use at least 2 characters.
                  </p>
                </div>
              ) : visibleResults.length === 0 ? (
                <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[1.7rem] border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                  <h2 className="mt-4 text-2xl font-semibold text-white">No matches found</h2>
                  <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                    No {getSearchViewLabel(selectedType).toLowerCase()} matched "{trimmedQuery}".
                  </p>
                </div>
              ) : (
                <div>
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

                  <div className="space-y-4">
                    {visibleResults.map((result) => (
                      <SearchResultRow key={`${result.mediaType}-${result.id}`} result={result} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
