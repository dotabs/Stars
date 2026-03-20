import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Bookmark, ChevronRight, Heart, LoaderCircle, Share2, Sparkles, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PosterImage, VerdictBadge } from '@/components/ui-custom';
import { useToast } from '@/hooks/use-toast';
import { useUserLibrary } from '@/hooks/use-user-library';
import { shareUrl } from '@/lib/browser';
import { fetchTmdbCollectionPage, fetchTmdbCollections } from '@/lib/tmdb-movies';
import { isLibraryAuthError, toggleLibraryItem } from '@/lib/user-library';

const PREVIEW_PAGE_SIZE = 8;
const DETAIL_PAGE_SIZE = 18;

function dedupeMovies(movies) {
    return Array.from(new Map(movies.map((movie) => [movie.id, movie])).values());
}
function formatCompactNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return '0';
    }
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(numeric);
}
function buildCollectionExclusionIds(collections, collectionId) {
    const collectionIndex = collections.findIndex((collection) => collection.id === collectionId);
    return collections
        .filter((collection, index) => index >= 0 && index < collectionIndex)
        .flatMap((collection) => collection.movies.map((movie) => movie.id));
}
function buildCollectionSummary(collection) {
    const leadMovie = collection.movies[0];
    const years = collection.movies
        .map((movie) => Number(movie.year))
        .filter((year) => Number.isFinite(year))
        .sort((a, b) => a - b);
    const yearSummary = years.length ? `${years[0]}-${years[years.length - 1]}` : 'Years unavailable';
    const leadVotes = leadMovie?.reviewCount
        ? `${formatCompactNumber(leadMovie.reviewCount)} votes on ${leadMovie.title}`
        : leadMovie?.title ?? 'TMDB collection';
    return `${yearSummary} / ${leadVotes}`;
}
function getCollectionStatusLabel(collection) {
    if (collection.id === 'trending-day') {
        return 'Trending Today';
    }
    if (collection.id === 'trending-week') {
        return 'Trending This Week';
    }
    if (collection.id === 'now-playing') {
        return 'In Theaters';
    }
    if (collection.id === 'upcoming') {
        return 'Coming Soon';
    }
    return 'Updated Daily';
}

export function Lists() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { toast } = useToast();
    const { currentUser, library } = useUserLibrary();
    const [followedLists, setFollowedLists] = useState(['trending-week']);
    const [selectedList, setSelectedList] = useState(null);
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState('');
    const collectionsRef = useRef([]);
    const loadMoreRef = useRef(null);
    const loadingCollectionIdRef = useRef('');
    const requestedCollectionId = searchParams.get('collection') ?? '';

    useEffect(() => {
        let cancelled = false;
        async function loadCollections() {
            setIsLoading(true);
            try {
                const response = await fetchTmdbCollections(PREVIEW_PAGE_SIZE);
                if (!cancelled) {
                    setCollections(response);
                }
            }
            catch (error) {
                console.error('Failed to load TMDB collections', error);
                if (!cancelled) {
                    toast({
                        title: 'Collections unavailable',
                        description: 'TMDB collections could not be loaded right now.',
                        variant: 'destructive',
                    });
                }
            }
            finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }
        void loadCollections();
        return () => {
            cancelled = true;
        };
    }, [toast]);

    useEffect(() => {
        if (!requestedCollectionId || !collections.length) {
            return;
        }

        const matchingCollection = collections.find((collection) => collection.id === requestedCollectionId);
        if (!matchingCollection) {
            return;
        }

        setSelectedList((current) => current === requestedCollectionId ? current : requestedCollectionId);
        setLoadMoreError('');
    }, [collections, requestedCollectionId]);

    function mergeCollectionPage(collectionId, payload, replace = false) {
        setCollections((current) => current.map((collection) => {
            if (collection.id !== collectionId) {
                return collection;
            }
            return {
                ...collection,
                movies: replace ? payload.movies : dedupeMovies([...collection.movies, ...payload.movies]),
                currentPage: payload.page,
                totalPages: payload.totalPages,
                totalResults: payload.totalResults,
                tmdbTotalResults: payload.tmdbTotalResults,
                uniqueLoadedCount: (replace ? payload.movies : dedupeMovies([...collection.movies, ...payload.movies])).length,
                hasMore: payload.hasMore,
            };
        }));
    }

    useEffect(() => {
        collectionsRef.current = collections;
    }, [collections]);

    const loadCollectionPage = useCallback(async (collectionId, page, options = {}) => {
        const { replace = false, limit = DETAIL_PAGE_SIZE } = options;
        const cacheKey = `${collectionId}:${page}:${limit}`;
        if (loadingCollectionIdRef.current === cacheKey) {
            return;
        }
        loadingCollectionIdRef.current = cacheKey;
        if (page > 1) {
            setIsLoadingMore(true);
        }
        setLoadMoreError('');
        try {
            const excludeIds = buildCollectionExclusionIds(collectionsRef.current, collectionId);
            const payload = await fetchTmdbCollectionPage(collectionId, { page, limit, excludeIds });
            mergeCollectionPage(collectionId, payload, replace);
        }
        catch (error) {
            console.error(`Failed to load collection page for ${collectionId}`, error);
            setLoadMoreError('More titles could not be loaded right now.');
        }
        finally {
            loadingCollectionIdRef.current = '';
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        if (!selectedList) {
            return;
        }
        const collection = collections.find((entry) => entry.id === selectedList);
        if (!collection) {
            return;
        }
        if (collection.movies.length >= Math.min(DETAIL_PAGE_SIZE, collection.totalResults ?? DETAIL_PAGE_SIZE)) {
            return;
        }
        void loadCollectionPage(selectedList, 1, { replace: true, limit: DETAIL_PAGE_SIZE });
    }, [collections, loadCollectionPage, selectedList]);

    const selectedCollection = useMemo(() => collections.find((entry) => entry.id === selectedList) ?? null, [collections, selectedList]);
    const selectedCollectionStats = useMemo(() => {
        if (!selectedCollection) {
            return [];
        }
        const scoredMovies = selectedCollection.movies.filter((movie) => typeof movie.score === 'number');
        const sortedYears = selectedCollection.movies
            .map((movie) => Number(movie.year))
            .filter((year) => Number.isFinite(year))
            .sort((a, b) => a - b);
        const averageScore = scoredMovies.length
            ? (scoredMovies.reduce((total, movie) => total + movie.score, 0) / scoredMovies.length).toFixed(1)
            : 'N/A';
        return [
            {
                label: 'Loaded',
                value: selectedCollection.uniqueLoadedCount ?? selectedCollection.movies.length,
            },
            {
                label: 'TMDB Count',
                value: selectedCollection.tmdbTotalResults ?? selectedCollection.totalResults ?? selectedCollection.movies.length,
            },
            { label: 'Avg Score', value: averageScore === 'N/A' ? averageScore : `${averageScore}/10` },
            {
                label: 'Years',
                value: sortedYears.length ? `${sortedYears[0]}-${sortedYears[sortedYears.length - 1]}` : 'Mixed eras',
            },
        ];
    }, [selectedCollection]);

    useEffect(() => {
        if (!selectedList || !selectedCollection?.hasMore || isLoadingMore) {
            return;
        }
        const node = loadMoreRef.current;
        if (!node) {
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                void loadCollectionPage(selectedList, (selectedCollection.currentPage ?? 1) + 1);
            }
        }, { rootMargin: '420px 0px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [isLoadingMore, loadCollectionPage, selectedCollection?.currentPage, selectedCollection?.hasMore, selectedList]);

    const handleFollow = (listId) => {
        if (followedLists.includes(listId)) {
            setFollowedLists(followedLists.filter((id) => id !== listId));
            return;
        }
        setFollowedLists([...followedLists, listId]);
    };

    const handleListShare = async (listTitle) => {
        const currentUrl = typeof window === 'undefined' ? '' : window.location.href;
        await shareUrl(currentUrl, listTitle, `Explore the ${listTitle} collection on STARS`);
    };

    const handleToggleSaveMovie = async (movieId) => {
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
                    description: 'Sign in to save collection picks to your watchlist.',
                    variant: 'destructive',
                });
                return;
            }
            console.error('Failed to update watchlist', error);
            toast({
                title: 'Watchlist update failed',
                description: 'Please try again in a moment.',
                variant: 'destructive',
            });
        }
    };

    if (isLoading && !collections.length) {
        return (<div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="section-panel w-full max-w-md px-6 py-10 text-center">
          <p className="section-kicker">Loading</p>
          <h1 className="heading-display mt-3 text-4xl text-white">Opening collections</h1>
        </div>
      </div>);
    }

    if (selectedList) {
        const list = selectedCollection;
        if (!list) {
            return null;
        }
        return (<div className="min-h-screen bg-background pt-16">
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 h-[31rem]">
            <div className="absolute inset-0 bg-cover bg-center" style={{
                backgroundImage: `url(${list.movies[0]?.backdrop || list.movies[0]?.poster || ''})`,
                filter: 'blur(22px) brightness(0.24)',
                transform: 'scale(1.08)',
            }}/>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,182,132,0.16),transparent_28%)]"/>
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-background/50 to-background"/>
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/72 to-background/90"/>
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 lg:px-8">
            <button type="button" onClick={() => {
                setSelectedList(null);
                setLoadMoreError('');
                setSearchParams((current) => {
                    const nextParams = new URLSearchParams(current);
                    nextParams.delete('collection');
                    return nextParams;
                }, { replace: true });
            }} className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ChevronRight className="h-4 w-4 rotate-180"/>
              Back to Collections
            </button>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 shadow-[0_40px_120px_-48px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_30%,transparent_70%,rgba(210,109,71,0.16))]"/>
              <div className="relative flex flex-col justify-between gap-8 px-5 py-6 sm:px-7 sm:py-8 lg:flex-row lg:items-end lg:px-10 lg:py-10">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-mono text-[11px] uppercase tracking-[0.22em] text-white/70">
                      <Sparkles className="h-3.5 w-3.5 text-[#f4b684]"/>
                      TMDB Live Data
                    </span>
                  </div>
                  <h1 className="heading-display mt-5 text-4xl md:text-5xl lg:text-6xl">{list.title}</h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">{buildCollectionSummary(list)}</p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {selectedCollectionStats.map((stat) => (<div key={stat.label} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{stat.label}</p>
                        <p className="mt-1 text-lg font-semibold text-white">{stat.value}</p>
                      </div>))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/72">
                    <Sparkles className="h-4 w-4 text-[#f4b684]"/>
                    <span>{getCollectionStatusLabel(list)}</span>
                  </div>
                  <Button onClick={() => handleFollow(list.id)} className={followedLists.includes(list.id) ? 'btn-outline' : 'btn-primary'}>
                    <Heart className={`mr-2 h-4 w-4 ${followedLists.includes(list.id) ? 'fill-current' : ''}`}/>
                    {followedLists.includes(list.id) ? 'Following' : 'Follow'}
                  </Button>
                  <Button className="btn-outline" onClick={() => void handleListShare(list.title)}>
                    <Share2 className="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-mono text-[11px] uppercase tracking-[0.2em] text-white/45">Collection Ranking</p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Loaded titles in this list</h2>
            </div>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
              View All
              <ArrowRight className="h-4 w-4"/>
            </button>
          </div>

          <div className="space-y-4">
            {list.movies.map((movie, index) => (<div key={movie.id} onClick={() => navigate(`/review/${movie.id}`)} className="group cursor-pointer">
                <div className="relative overflow-hidden rounded-[1.75rem] border border-white/8 bg-[linear-gradient(145deg,rgba(26,20,17,0.95),rgba(12,10,10,0.98))] p-4 shadow-[0_28px_70px_-38px_rgba(0,0,0,0.95)] transition-all duration-300 hover:-translate-y-1 hover:border-white/14 hover:shadow-[0_38px_90px_-40px_rgba(0,0,0,1)] sm:p-5">
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{
                        background: 'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.05) 32%, transparent 60%)',
                    }}/>
                  <div className="relative flex gap-4 sm:gap-5">
                    <div className="flex w-[4.25rem] flex-shrink-0 flex-col items-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-[#f4b684]/18 bg-[radial-gradient(circle_at_top,rgba(244,182,132,0.2),rgba(255,255,255,0.02)_62%)] shadow-[0_18px_40px_-26px_rgba(210,109,71,0.8)] transition-transform duration-300 group-hover:scale-[1.03]">
                        <span className="text-2xl font-bold text-white/92">{index + 1}</span>
                      </div>
                      <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Rank</span>
                    </div>

                    <div className="h-36 w-24 flex-shrink-0 overflow-hidden rounded-[1.1rem] border border-white/8 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.95)]">
                      <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"/>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm"/>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                              {movie.year}
                            </span>
                            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                              {movie.originalLanguage?.toUpperCase()}
                            </span>
                          </div>
                          <h3 className="mt-3 text-xl font-semibold text-white transition-colors duration-300 group-hover:text-[#fff1e6] sm:text-[1.35rem]">{movie.title}</h3>
                        </div>

                        <button type="button" aria-pressed={library.watchlist.includes(movie.id)} onClick={(event) => {
                            event.stopPropagation();
                            void handleToggleSaveMovie(movie.id);
                        }} className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 ${library.watchlist.includes(movie.id)
                            ? 'border-[#d26d47]/40 bg-[#d26d47]/14 text-[#f4b684] shadow-[0_14px_30px_-20px_rgba(210,109,71,0.95)]'
                            : 'border-white/10 bg-black/25 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white'}`}>
                          <Bookmark className={`h-4 w-4 ${library.watchlist.includes(movie.id) ? 'fill-current' : ''}`}/>
                        </button>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/58 sm:text-[15px]">{movie.synopsis}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/54">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                          <Star className="h-3.5 w-3.5 text-[#f4b684]"/>
                          <span>{typeof movie.score === 'number' ? `${movie.score.toFixed(1)} average score` : 'New pick'}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                          <Users className="h-3.5 w-3.5 text-[#f4b684]"/>
                          <span>{movie.reviewCount?.toLocaleString?.() ?? movie.reviewCount} votes</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-white/48 transition-colors duration-300 group-hover:text-white/72">
                          Open details
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"/>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>))}
          </div>

          <div ref={loadMoreRef} className="mt-8 flex min-h-16 flex-col items-center justify-center gap-3">
            {loadMoreError ? <p className="text-sm text-red-200/85">{loadMoreError}</p> : null}
            {isLoadingMore ? (<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70">
                <LoaderCircle className="h-4 w-4 animate-spin"/>
                Loading more titles
              </div>) : null}
            {!isLoadingMore && list.hasMore ? (<button type="button" onClick={() => void loadCollectionPage(list.id, (list.currentPage ?? 1) + 1)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
                View All
                <ArrowRight className="h-4 w-4"/>
              </button>) : null}
            {!list.hasMore ? <p className="text-sm text-white/45">All available titles for this collection are loaded.</p> : null}
          </div>
        </main>
      </div>);
    }

    return (<div className="min-h-screen bg-background pt-16">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative mb-12 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(18,14,12,0.96),rgba(9,8,8,0.98))] px-5 py-8 shadow-[0_38px_110px_-54px_rgba(0,0,0,1)] sm:px-8 sm:py-10 lg:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(210,109,71,0.18),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(244,182,132,0.08),transparent_22%)]"/>
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
                <Sparkles className="h-3.5 w-3.5 text-[#f4b684]"/>
                Updated Live
              </div>
              <h1 className="heading-display mt-4 text-4xl md:text-5xl">Live Collections</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/62 sm:text-base">Curated collections powered by live TMDB data, constantly updated for fresh discovery.</p>
            </div>

            <div className="sm:flex sm:flex-wrap">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Collections</p>
                <p className="mt-1 text-2xl font-semibold text-white">{collections.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-mono text-[11px] uppercase tracking-[0.2em] text-white/45">Browse Collections</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Jump into ranked worlds</h2>
          </div>
          <button type="button" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
            View All
            <ArrowRight className="h-4 w-4"/>
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((list) => (<div key={list.id} onClick={() => {
                setSelectedList(list.id);
                setLoadMoreError('');
                setSearchParams((current) => {
                    const nextParams = new URLSearchParams(current);
                    nextParams.set('collection', list.id);
                    return nextParams;
                }, { replace: true });
            }} className="group cursor-pointer">
              <div className="relative overflow-hidden rounded-[1.8rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(28,21,18,0.95),rgba(13,10,9,0.98))] p-3 shadow-[0_30px_80px_-42px_rgba(0,0,0,0.95)] transition-all duration-300 hover:-translate-y-1.5 hover:border-white/[0.14] hover:shadow-[0_38px_95px_-42px_rgba(0,0,0,1)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,182,132,0.14),transparent_30%)] opacity-70"/>
                <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-[1.35rem]">
                  <div className="absolute inset-0 flex transition-transform duration-500 group-hover:scale-[1.04]">
                    {list.movies.slice(0, 4).map((movie, index) => (<div key={index} className="flex-1" style={{
                            backgroundImage: `url(${movie.poster})`,
                            backgroundPosition: 'center',
                            backgroundSize: 'cover',
                            filter: 'brightness(0.62)',
                        }}/>))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"/>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/45">TMDB Collection</p>
                        <h3 className="mt-2 text-xl font-semibold text-white transition-colors duration-300 group-hover:text-[#fff2e7]">{list.title}</h3>
                      </div>
                      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/78 backdrop-blur-md">
                        <Sparkles className="h-3 w-3 text-[#f4b684]"/>
                        <span>{getCollectionStatusLabel(list)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white/72 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                    View All
                    <ArrowRight className="h-3.5 w-3.5"/>
                  </div>
                </div>

                <div className="relative px-1 pb-1">
                  <p className="min-h-[2.75rem] text-sm leading-6 text-white/58">{buildCollectionSummary(list)}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-white/46">
                      <Star className="h-4 w-4 text-[#f4b684]"/>
                      <span>{list.movies[0]?.reviewCount ? `${formatCompactNumber(list.movies[0].reviewCount)} votes` : 'Vote count unavailable'}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-white/70 transition-all duration-300 group-hover:gap-2 group-hover:text-white">
                      Open
                      <ArrowRight className="h-4 w-4"/>
                    </span>
                  </div>
                </div>
              </div>
            </div>))}
        </div>
      </div>
    </div>);
}

