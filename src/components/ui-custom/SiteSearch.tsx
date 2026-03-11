import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Film, LoaderCircle, Search, Tv, UserRound, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getSearchResultHref, getSearchResultTypeLabel, searchTitlesAndPeople } from '@/lib/tmdb-search';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/types';

type SiteSearchProps = {
  variant?: 'desktop' | 'mobile';
  onAfterNavigate?: () => void;
};

const searchDebounceMs = 250;

function getTypeIcon(mediaType: SearchResult['mediaType']) {
  if (mediaType === 'movie') return Film;
  if (mediaType === 'tv') return Tv;
  return UserRound;
}

function getTypeBadgeClassName(mediaType: SearchResult['mediaType']) {
  if (mediaType === 'movie') return 'border-[#d26d47]/30 bg-[#d26d47]/12 text-[#f4b684]';
  if (mediaType === 'tv') return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
  return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
}

function buildFullSearchHref(query: string) {
  return `/search?q=${encodeURIComponent(query.trim())}`;
}

function SiteSearchInner({ variant = 'desktop', onAfterNavigate }: SiteSearchProps) {
  const navigate = useNavigate();
  const listboxId = useId();
  const rootRef = useRef<HTMLFormElement | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState('');
  const debouncedQuery = useDebouncedValue(query, searchDebounceMs);
  const trimmedQuery = query.trim();
  const trimmedDebouncedQuery = debouncedQuery.trim();
  const hasInteractiveResults = results.length > 0;
  const minQueryReached = trimmedQuery.length >= 2;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (trimmedDebouncedQuery.length < 2) return;

    void Promise.resolve().then(() => {
      if (cancelled) return;

      setIsLoading(true);
      setErrorMessage('');

      return searchTitlesAndPeople(trimmedDebouncedQuery)
        .then((nextResults) => {
          if (cancelled) return;
          setResults(nextResults);
          setActiveIndex(-1);
        })
        .catch((error) => {
          console.error('Failed to search TMDB', error);
          if (cancelled) return;
          setResults([]);
          setActiveIndex(-1);
          setErrorMessage('Search is temporarily unavailable.');
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [trimmedDebouncedQuery]);

  const activeResult = useMemo(
    () => (activeIndex >= 0 ? results[activeIndex] ?? null : null),
    [activeIndex, results],
  );

  const dropdownVisible = isOpen && (trimmedQuery.length > 0 || isLoading || errorMessage.length > 0);
  const inputClassName =
    variant === 'desktop'
      ? 'search-input-field search-input-field-with-action h-10 w-56 rounded-full border-white/10 bg-black/20 text-sm text-white placeholder:text-muted-foreground hover:border-white/20 focus-visible:ring-white/20'
      : 'search-input-field search-input-field-with-clear-and-action h-11 rounded-xl border-white/10 bg-black/20 text-white';
  const formClassName = variant === 'desktop' ? 'search-input-shell hidden lg:block' : 'search-input-shell';
  const dropdownClassName =
    variant === 'desktop'
      ? 'absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[28rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#120e0c]/96 shadow-[0_28px_80px_-34px_rgba(0,0,0,0.95)] backdrop-blur-2xl'
      : 'absolute left-0 right-0 top-[calc(100%+0.65rem)] z-50 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#120e0c]/96 shadow-[0_28px_80px_-34px_rgba(0,0,0,0.95)] backdrop-blur-2xl';

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    setErrorMessage('');
  };

  const openResult = (result: SearchResult) => {
    navigate(getSearchResultHref(result));
    clearSearch();
    onAfterNavigate?.();
  };

  const openFullSearch = () => {
    if (!trimmedQuery) return;
    navigate(buildFullSearchHref(trimmedQuery));
    clearSearch();
    onAfterNavigate?.();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeResult) {
      openResult(activeResult);
      return;
    }

    openFullSearch();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownVisible) {
      if (event.key === 'ArrowDown' && hasInteractiveResults) {
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!results.length) return;
      setActiveIndex((currentIndex) => (currentIndex < 0 ? 0 : (currentIndex + 1) % results.length));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!results.length) return;
      setActiveIndex((currentIndex) => (currentIndex <= 0 ? results.length - 1 : currentIndex - 1));
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <form
      ref={rootRef}
      onSubmit={handleSubmit}
      className={formClassName}
      role="search"
      aria-label="Search for a movie, TV show, or person"
    >
      <Search className="search-input-icon" />
      <Input
        type="search"
        value={query}
        onChange={(event) => {
          const nextValue = event.target.value;
          setQuery(nextValue);
          setIsOpen(true);
          setActiveIndex(-1);
          if (nextValue.trim().length < 2) {
            setResults([]);
            setIsLoading(false);
            setErrorMessage('');
          }
        }}
        onFocus={() => {
          if (trimmedQuery.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search for a movie, TV show, or person..."
        className={cn(inputClassName, !trimmedQuery && variant === 'desktop' ? 'w-72' : '')}
        aria-expanded={dropdownVisible}
        aria-controls={listboxId}
        aria-activedescendant={activeResult ? `${listboxId}-${activeResult.mediaType}-${activeResult.id}` : undefined}
        aria-autocomplete="list"
      />
      {trimmedQuery && (
        <button
          type="button"
          onClick={clearSearch}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white',
            variant === 'desktop' ? 'right-14' : 'right-12',
          )}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button
        type="submit"
        className={cn(
          'absolute top-1/2 -translate-y-1/2 border border-white/10 bg-white/[0.04] font-semibold text-white transition-all hover:border-white/20 hover:bg-white/[0.08]',
          variant === 'desktop'
            ? 'right-1.5 flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px]'
            : 'right-1.5 rounded-lg px-3 py-1.5 text-xs',
        )}
        aria-label={activeResult ? 'Open selected result' : 'Open full search results'}
      >
        {variant === 'desktop' ? 'Search' : 'Open'}
      </button>

      {dropdownVisible && (
        <div className={dropdownClassName}>
          <div className="border-b border-white/8 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {isLoading ? 'Searching' : hasInteractiveResults ? `${results.length} top matches` : 'Search'}
          </div>

          <div id={listboxId} role="listbox" className="max-h-[26rem] overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center gap-3 rounded-[1.15rem] px-4 py-5 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin text-[#f4b684]" />
                Searching movies, TV shows, and people...
              </div>
            ) : errorMessage ? (
              <div className="rounded-[1.15rem] px-4 py-5 text-sm text-muted-foreground">{errorMessage}</div>
            ) : !minQueryReached ? (
              <div className="rounded-[1.15rem] px-4 py-5 text-sm text-muted-foreground">
                Type at least 2 characters to search across movies, TV shows, and people.
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-[1.15rem] px-4 py-5 text-sm text-muted-foreground">
                No matches found for "{trimmedQuery}".
              </div>
            ) : (
              <>
                {results.map((result, index) => {
                  const TypeIcon = getTypeIcon(result.mediaType);
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={`${result.mediaType}-${result.id}`}
                      id={`${listboxId}-${result.mediaType}-${result.id}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => openResult(result)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-[1.15rem] px-3 py-3 text-left transition-all',
                        isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]',
                      )}
                    >
                      <div
                        className={cn(
                          'relative flex h-16 w-12 flex-none items-center justify-center overflow-hidden border border-white/10 bg-white/[0.04]',
                          result.mediaType === 'person' ? 'rounded-2xl' : 'rounded-xl',
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
                          <TypeIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="line-clamp-1 text-sm font-semibold text-white">{result.title}</p>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]',
                              getTypeBadgeClassName(result.mediaType),
                            )}
                          >
                            <TypeIcon className="h-3 w-3" />
                            {getSearchResultTypeLabel(result.mediaType)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#f5d0b4]">{result.metadataLine}</p>
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={openFullSearch}
                  className="mt-1 flex w-full items-center justify-between rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">See all results</p>
                    <p className="mt-1 text-xs text-muted-foreground">Open the full search view for "{trimmedQuery}".</p>
                  </div>
                  <Search className="h-4 w-4 text-[#f4b684]" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}

export function SiteSearch(props: SiteSearchProps) {
  const location = useLocation();

  return <SiteSearchInner key={`${location.pathname}${location.search}`} {...props} />;
}
