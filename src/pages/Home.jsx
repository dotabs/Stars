// Home page: presents the main landing experience with TMDB-powered hero picks and rows.
// Why it exists: gives users a fast entry point into trending titles, recommendations, and their library.
// Connection: reads TMDB movie feeds and lets signed-in users save titles to Firebase library lists.
import { startTransition, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bookmark, CalendarDays, ChevronLeft, ChevronRight, Clock3, Flame, Play, Sparkles, Star, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PosterImage } from '@/components/ui-custom';
import { useToast } from '@/hooks/use-toast';
import { useUserLibrary } from '@/hooks/use-user-library';
import { buildYouTubeSearchUrl, openExternalUrl } from '@/lib/browser';
import { fetchHomeFeed, fetchMoviesByRouteIds } from '@/lib/tmdb-movies';
import { isLibraryAuthError, toggleLibraryItem } from '@/lib/user-library';

const heroRotationIntervalMs = 7000;

function clampCopy(value, maxLength = 220) {
  if (!value) {
    return '';
  }

  if (value.length <= maxLength) {
    return value;
  }

  const safeValue = value.slice(0, maxLength);
  const lastSpaceIndex = safeValue.lastIndexOf(' ');
  return `${safeValue.slice(0, Math.max(lastSpaceIndex, maxLength - 24)).trimEnd()}...`;
}

function getBrowseHrefForRow(label) {
  if (label === 'Trending Today') {
    return '/lists?collection=trending-day';
  }

  if (label === 'Trending This Week') {
    return '/lists?collection=trending-week';
  }

  if (label === 'In Theaters') {
    return '/lists?collection=now-playing';
  }

  if (label === 'Popular') {
    return '/lists?collection=popular';
  }

  if (label === 'Top Rated') {
    return '/lists?collection=top-rated';
  }

  if (label === 'Upcoming') {
    return '/lists?collection=upcoming';
  }

  return '/browse';
}

function formatReleaseDate(value) {
  if (!value) {
    return 'Release date pending';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Release date pending';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function dedupeMovies(movies = []) {
  return Array.from(new Map(movies.filter(Boolean).map((movie) => [movie.id, movie])).values());
}

function rankRecommendedMovies(savedMovies = [], candidateMovies = [], excludedIds = new Set()) {
  if (!savedMovies.length) {
    return [];
  }

  const genreWeights = new Map();
  savedMovies.forEach((movie) => {
    movie.genres.forEach((genre, index) => {
      genreWeights.set(genre, (genreWeights.get(genre) ?? 0) + Math.max(1, 3 - index));
    });
  });

  return dedupeMovies(candidateMovies)
    .filter((movie) => movie?.id && !excludedIds.has(movie.id))
    .map((movie) => ({
      movie,
      score:
        movie.genres.reduce((total, genre) => total + (genreWeights.get(genre) ?? 0), 0) +
        movie.score * 0.35 +
        (movie.popularity ?? 0) * 0.015,
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.movie);
}

function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-[#060708] pb-24 pt-16">
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
          <div className="relative min-h-[76vh] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <div className="max-w-2xl space-y-5">
              <Skeleton className="h-5 w-48 bg-white/10" />
              <Skeleton className="h-24 w-full max-w-xl bg-white/10" />
              <Skeleton className="h-20 w-full max-w-2xl bg-white/10" />
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-11 w-40 rounded-full bg-white/10" />
                <Skeleton className="h-11 w-40 rounded-full bg-white/10" />
                <Skeleton className="h-11 w-40 rounded-full bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10 space-y-10">
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <section key={rowIndex} className="px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[96rem]">
              <div className="mb-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-white/10" />
                  <Skeleton className="h-9 w-72 bg-white/10" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
                  <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
                </div>
              </div>
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 6 }).map((_, cardIndex) => (
                  <div key={cardIndex} className="w-[11rem] flex-none space-y-3 sm:w-[11.5rem]">
                    <Skeleton className="aspect-[2/3] rounded-[1.2rem] bg-white/10" />
                    <Skeleton className="h-4 w-[90%] bg-white/10" />
                    <Skeleton className="h-4 w-[60%] bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// Shared card for the landing page shelves and hero-adjacent rows.
function RowCard({ movie, variant = 'poster', onOpen, onWatchTrailer, onSave, isSaved, eager }) {
  const isWide = variant === 'wide';

  return (
    <article
      className={`group relative flex-none cursor-pointer snap-start ${isWide ? 'w-[calc(100vw-2rem)] sm:w-[21rem] lg:w-[23rem]' : 'w-[9.75rem] sm:w-[12.75rem] lg:w-[14rem]'} [content-visibility:auto] [contain-intrinsic-size:340px_260px]`}
      onClick={onOpen}
    >
      <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.3))] transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.035] group-hover:border-white/24 group-hover:shadow-[0_28px_54px_rgba(0,0,0,0.42)] motion-reduce:transform-none">
        {isWide ? (
          <>
            <PosterImage
              src={movie.poster || movie.backdrop}
              title={movie.title}
              className="aspect-[2/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none sm:hidden"
              width={342}
              height={513}
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : 'auto'}
              sizes="(max-width: 639px) calc(100vw - 2rem), 0px"
            />
            <PosterImage
              src={movie.backdrop || movie.poster}
              title={movie.title}
              className="hidden aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none sm:block"
              width={780}
              height={440}
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : 'auto'}
              sizes="(min-width: 1280px) 23rem, (min-width: 640px) 21rem, 72vw"
            />
          </>
        ) : (
          <PosterImage
            src={movie.poster}
            title={movie.title}
            className="aspect-[2/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none"
            width={342}
            height={513}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
            sizes="(min-width: 1280px) 14rem, (min-width: 1024px) 13rem, (min-width: 640px) 12rem, 42vw"
          />
        )}

        <div className={`pointer-events-none absolute inset-0 ${isWide ? 'bg-gradient-to-t from-black via-black/40 to-transparent' : 'bg-gradient-to-t from-black via-black/28 to-transparent'} opacity-90`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_40%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-white/86">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#d26d47]/30 bg-[#d26d47]/15 px-2.5 py-1 text-[#f4b684]">
              <Star className="h-3.5 w-3.5 fill-current" />
              {movie.score.toFixed(1)}
            </span>
            <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1">{movie.year}</span>
          </div>

          <h3 className={`line-clamp-2 font-semibold text-white transition-colors group-hover:text-[#f4b684] ${isWide ? 'text-lg' : 'text-base'}`}>
            {movie.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-white/58">{movie.genres.slice(0, 2).join(' / ')}</p>

          <div className="mt-3 opacity-100 transition-all duration-300 md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onWatchTrailer();
                }}
                className="flex min-h-10 items-center justify-center gap-1 rounded-2xl bg-white px-5 py-2 text-center text-[8px] font-semibold uppercase tracking-[0.025em] text-black shadow-[0_18px_40px_rgba(255,255,255,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/94 sm:min-h-12 sm:gap-2 sm:px-6 sm:py-3 sm:text-[12px] sm:tracking-[0.04em]"
              >
                <span className="flex h-4 w-4 flex-none items-center justify-center sm:h-5 sm:w-5">
                  <Play className="h-3.5 w-3.5 flex-none fill-current stroke-[2.2] sm:h-4 sm:w-4" />
                </span>
                Watch Trailer
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSave();
                }}
                className={`flex min-h-10 items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 sm:min-h-12 sm:gap-2 sm:px-3 sm:py-3 sm:text-[12px] sm:tracking-[0.16em] ${
                  isSaved
                    ? 'border-[#d26d47]/45 bg-[#d26d47]/16 text-[#f4c3a4] shadow-[0_14px_34px_rgba(210,109,71,0.12)]'
                    : 'border-white/12 bg-black/26 text-white hover:border-white/20 hover:bg-black/38'
                }`}
              >
                <Bookmark className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {isSaved ? 'Saved' : 'My List'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function MovieRow({ label, title, movies, variant = 'poster', accent = 'default', navigate, watchlistSet, onSave, browseHref = '/browse' }) {
  const [scroller, setScroller] = useState(null);
  const [canScroll, setCanScroll] = useState(false);
  const tintClassName = accent === 'ember'
    ? 'from-[#2e130d]/55 via-transparent to-transparent'
    : accent === 'steel'
      ? 'from-[#101922]/55 via-transparent to-transparent'
      : accent === 'gold'
        ? 'from-[#2c2510]/55 via-transparent to-transparent'
        : 'from-white/5 via-transparent to-transparent';

  useEffect(() => {
    if (!scroller) {
      return undefined;
    }

    const updateCanScroll = () => {
      setCanScroll(scroller.scrollWidth - scroller.clientWidth > 24);
    };

    const frameId = window.requestAnimationFrame(() => {
      updateCanScroll();
    });

    const resizeObserver = new ResizeObserver(() => {
      updateCanScroll();
    });

    resizeObserver.observe(scroller);
    Array.from(scroller.children).forEach((child) => {
      resizeObserver.observe(child);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [movies, scroller]);

  function handleScroll(direction) {
    if (!scroller || !canScroll) {
      return;
    }

    const distance = Math.max(scroller.clientWidth * 0.92, 320);
    scroller.scrollBy({
      left: direction * distance,
      behavior: 'smooth',
    });
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className={`mx-auto max-w-[96rem] rounded-[1.8rem] bg-gradient-to-r ${tintClassName} px-0 py-4`}>
        <div className="mb-4 flex items-end justify-between gap-4 px-4 sm:px-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">{label}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="hidden rounded-full border-white/12 bg-black/25 text-white hover:bg-black/40 sm:inline-flex"
              onClick={() => navigate(browseHref)}
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {canScroll ? (
              <>
                <button
                  type="button"
                  onClick={() => handleScroll(-1)}
                  className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/75 transition-colors hover:border-white/20 hover:text-white sm:flex"
                  aria-label={`Scroll ${title} left`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll(1)}
                  className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/75 transition-colors hover:border-white/20 hover:text-white sm:flex"
                  aria-label={`Scroll ${title} right`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem]">
          <div
            ref={setScroller}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pr-4 sm:px-1 sm:pr-6 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]"
          >
            {movies.map((movie, index) => (
              <RowCard
                key={movie.id}
                movie={movie}
                variant={variant}
                eager={index < 2}
                isSaved={watchlistSet.has(movie.id)}
                onOpen={() => navigate(`/review/${movie.id}`)}
                onWatchTrailer={() => openExternalUrl(movie.trailerUrl || buildYouTubeSearchUrl(`${movie.title} ${movie.year} trailer`))}
                onSave={() => void onSave(movie.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DiscoverySection({ navigate, heroMovie, trendingTodayMovie, recommendedMovie, upcomingMovie }) {
  const cards = [
    heroMovie
      ? {
          id: `${heroMovie.id}-hero`,
          eyebrow: 'Featured Hero',
          title: heroMovie.title,
          copy: 'Jump back into the live TMDB spotlight and open the full movie page or trailer.',
          movie: heroMovie,
        }
      : null,
    trendingTodayMovie
      ? {
          id: `${trendingTodayMovie.id}-today`,
          eyebrow: 'Trending Today',
          title: trendingTodayMovie.title,
          copy: 'Same-day TMDB heat. This title is moving fastest in the daily movie feed.',
          movie: trendingTodayMovie,
        }
      : null,
    recommendedMovie
      ? {
          id: `${recommendedMovie.id}-recommended`,
          eyebrow: 'For You',
          title: recommendedMovie.title,
          copy: 'A lightweight recommendation based on the genres in your saved TMDB movies.',
          movie: recommendedMovie,
        }
      : upcomingMovie
        ? {
            id: `${upcomingMovie.id}-upcoming`,
            eyebrow: 'Coming Soon',
            title: upcomingMovie.title,
            copy: 'Keep exploring the release calendar with upcoming TMDB titles.',
            movie: upcomingMovie,
          }
        : null,
  ].filter(Boolean);

  if (!cards.length) {
    return null;
  }

  return (
    <section className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[96rem] rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.26))] px-6 py-7 sm:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">Discovery</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Keep exploring the catalog</h2>
          </div>
          <Button variant="outline" className="rounded-full border-white/12 bg-black/25 text-white hover:bg-black/40" onClick={() => navigate('/browse')}>
            Open Browse
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => navigate(`/review/${card.movie.id}`)}
              className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
            >
              <div className="relative">
                <PosterImage
                  src={card.movie.poster || card.movie.backdrop}
                  title={card.movie.title}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] sm:aspect-video"
                  width={780}
                  height={440}
                  sizes="(min-width: 1024px) 30vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
              </div>
              <div className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/45">{card.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-semibold text-white group-hover:text-[#f4b684]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/68">{card.copy}</p>
                <div className="mt-4 flex items-center gap-3 text-sm text-white/62">
                  <span className="inline-flex items-center gap-1 text-[#f4b684]">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {card.movie.score.toFixed(1)}
                  </span>
                  <span>{formatReleaseDate(card.movie.releaseDate)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, library } = useUserLibrary();
  const [feed, setFeed] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [recommendedMovies, setRecommendedMovies] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      setIsLoading(true);
      setLoadError('');

      try {
        const response = await fetchHomeFeed();
        if (!cancelled) {
          startTransition(() => {
            setFeed(response);
          });
        }
      } catch (error) {
        console.error('Failed to load TMDB home feed', error);
        if (!cancelled) {
          setLoadError('The live TMDB homepage feed is currently unavailable.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFeed();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const heroCount = feed?.heroCandidates?.length ?? 0;
    if (heroCount <= 1) {
      return () => {};
    }

    const intervalId = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroCount);
    }, heroRotationIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [feed?.heroCandidates?.length]);

  useEffect(() => {
    const candidates = feed?.heroCandidates ?? [];
    candidates.forEach((movie) => {
      const imageUrl = movie?.backdrop || movie?.poster;
      if (!imageUrl) {
        return;
      }

      const image = new window.Image();
      image.src = imageUrl;
    });
  }, [feed?.heroCandidates]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      const routeIds = Array.from(new Set([...(library.favorites ?? []), ...(library.watchlist ?? [])])).slice(0, 8);
      if (!routeIds.length || !feed) {
        setRecommendedMovies([]);
        return;
      }

      try {
        const savedMovies = await fetchMoviesByRouteIds(routeIds);
        if (cancelled) {
          return;
        }

        const excludedIds = new Set(routeIds);
        const candidateMovies = dedupeMovies([
          ...(feed.trendingTodayMovies ?? []),
          ...(feed.popularMovies ?? []),
          ...(feed.topRatedMovies ?? []),
          ...(feed.upcomingMovies ?? []),
          ...(feed.inTheatersMovies ?? []),
        ]);
        const ranked = rankRecommendedMovies(savedMovies, candidateMovies, excludedIds).slice(0, 6);

        startTransition(() => {
          setRecommendedMovies(ranked);
        });
      } catch (error) {
        console.error('Failed to personalize home recommendations', error);
        if (!cancelled) {
          setRecommendedMovies([]);
        }
      }
    }

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [feed, library.favorites, library.watchlist]);

  async function handleSaveMovie(movieId) {
    try {
      await toggleLibraryItem({
        userId: currentUser?.uid,
        listName: 'watchlist',
        movieId,
      });
    } catch (error) {
      if (isLibraryAuthError(error)) {
        toast({
          title: 'Sign in required',
          description: 'Create an account or sign in to save movies to your watchlist.',
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
  }

  const heroCandidates = feed?.heroCandidates ?? [];
  const spotlightMovie = heroCandidates[activeHeroIndex] ?? feed?.spotlightMovie ?? null;
  const watchlistSet = useMemo(() => new Set(library.watchlist), [library.watchlist]);

  const rows = useMemo(() => {
    if (!feed) {
      return [];
    }

    return [
      {
        label: 'Trending Today',
        title: 'What is moving fastest right now',
        movies: feed.trendingTodayMovies ?? [],
        variant: 'wide',
        accent: 'ember',
      },
      recommendedMovies.length
        ? {
            label: 'Recommended For You',
            title: 'Based on your saved movies',
            movies: recommendedMovies,
            variant: 'poster',
            accent: 'gold',
          }
        : null,
      {
        label: 'Trending This Week',
        title: 'Weekly TMDB momentum',
        movies: feed.trendingMovies ?? [],
        variant: 'poster',
        accent: 'default',
      },
      {
        label: 'In Theaters',
        title: 'Now playing in theaters',
        movies: feed.inTheatersMovies ?? [],
        variant: 'poster',
        accent: 'steel',
      },
      {
        label: 'Popular',
        title: 'Big audience pull worldwide',
        movies: feed.popularMovies ?? [],
        variant: 'wide',
        accent: 'default',
      },
      {
        label: 'Top Rated',
        title: 'Long-run TMDB favorites',
        movies: feed.topRatedMovies ?? [],
        variant: 'poster',
        accent: 'gold',
      },
      {
        label: 'Upcoming',
        title: 'Release radar',
        movies: feed.upcomingMovies ?? [],
        variant: 'poster',
        accent: 'ember',
      },
    ].filter((row) => row && row.movies.length > 0);
  }, [feed, recommendedMovies]);

  if (isLoading && !feed) {
    return <HomeSkeleton />;
  }

  if (!spotlightMovie) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="section-panel w-full max-w-lg px-6 py-10 text-center">
          <p className="section-kicker">Unavailable</p>
          <h1 className="heading-display mt-3 text-4xl text-white">TMDB homepage feed failed</h1>
          <p className="mt-4 text-sm text-muted-foreground">{loadError || 'No live movie data is available right now.'}</p>
          <Button className="btn-primary mt-6" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isHeroSaved = watchlistSet.has(spotlightMovie.id);
  const primaryRecommendation = recommendedMovies[0] ?? null;
  const trendingTodayMovie = feed?.trendingTodayMovies?.[0] ?? null;
  const upcomingMovie = feed?.upcomingMovies?.[0] ?? null;
  const heroGenres = spotlightMovie.genres.slice(0, 3);
  const heroSynopsis = clampCopy(spotlightMovie.synopsis, 240);

  return (
    <div className="min-h-screen bg-[#060708] pb-24 pt-16 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {heroCandidates.map((movie, index) => (
            <div
              key={movie.id}
              className={`absolute inset-0 will-change-opacity transition-opacity duration-1000 ease-out ${index === activeHeroIndex ? 'opacity-100' : 'opacity-0'}`}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(5,6,8,0.08) 0%, rgba(5,6,8,0.5) 46%, #060708 100%), linear-gradient(90deg, rgba(6,7,8,0.98) 0%, rgba(6,7,8,0.93) 22%, rgba(6,7,8,0.72) 42%, rgba(6,7,8,0.24) 70%, rgba(6,7,8,0.88) 100%), url(${movie.backdrop || movie.poster})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                }}
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-12rem] top-[8rem] h-[22rem] w-[22rem] rounded-full bg-[#d26d47]/12 blur-3xl" />
          <div className="absolute right-[8%] top-[16%] h-[20rem] w-[20rem] rounded-full bg-[#2a5f7b]/12 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[#060708]" />
        </div>

        <div className="relative mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
          <div className="grid min-h-[76vh] items-end gap-10 py-12 sm:py-16 lg:min-h-[84vh] lg:grid-cols-[minmax(0,1.25fr)_22rem] lg:py-20 xl:grid-cols-[minmax(0,1.2fr)_24rem]">
            <div className="max-w-[54rem] pr-2 sm:pr-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/28 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/72 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-[#f4b684]" />
                Curated TMDB Spotlight
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">
                <span>Featured Now</span>
                <span className="h-1 w-1 rounded-full bg-[#d26d47]/70" />
                <span>{spotlightMovie.year}</span>
                <span className="h-1 w-1 rounded-full bg-[#d26d47]/70" />
                <span>{heroGenres.join(' / ')}</span>
              </div>

              <h1 className="mt-4 min-h-[2.2em] max-w-[9ch] text-[3.35rem] font-semibold leading-[0.9] tracking-[-0.06em] text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.38)] sm:min-h-[2.8em] sm:max-w-[11ch] sm:text-6xl lg:min-h-[2.7em] lg:text-[5.6rem] xl:text-[7.15rem]">
                {spotlightMovie.title}
              </h1>

              <p className="mt-6 max-w-[38rem] text-[15px] leading-7 text-white/78 sm:text-[17px] sm:leading-8">
                {heroSynopsis}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-[#d26d47]/22 bg-[#d26d47]/10 px-4 py-3 text-sm text-[#ffd8bb] backdrop-blur-md">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-semibold">TMDB {spotlightMovie.score.toFixed(1)}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-sm text-white/74 backdrop-blur-md">
                  <CalendarDays className="h-4 w-4 text-[#f4b684]" />
                  <span>{formatReleaseDate(spotlightMovie.releaseDate)}</span>
                </div>
                {spotlightMovie.runtime ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-sm text-white/74 backdrop-blur-md">
                    <Clock3 className="h-4 w-4 text-[#f4b684]" />
                    <span>{spotlightMovie.runtime} min runtime</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-2.5 sm:mt-8 sm:gap-3">
                <button
                  type="button"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black shadow-[0_18px_40px_rgba(255,255,255,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/94 sm:min-h-12 sm:px-5 sm:text-[12px] sm:tracking-[0.16em]"
                  onClick={() => navigate(`/review/${spotlightMovie.id}`)}
                >
                  Open Details
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-black/26 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-black/38 sm:min-h-12 sm:px-5 sm:text-[12px] sm:tracking-[0.16em]"
                  onClick={() => openExternalUrl(spotlightMovie.trailerUrl || buildYouTubeSearchUrl(`${spotlightMovie.title} ${spotlightMovie.year} trailer`))}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Watch Trailer
                </button>
                <button
                  type="button"
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 sm:min-h-12 sm:px-5 sm:text-[12px] sm:tracking-[0.16em] ${
                    isHeroSaved
                      ? 'border-[#d26d47]/45 bg-[#d26d47]/16 text-[#f4c3a4] shadow-[0_14px_34px_rgba(210,109,71,0.12)]'
                      : 'border-white/12 bg-black/26 text-white hover:border-white/20 hover:bg-black/38'
                  }`}
                  onClick={() => void handleSaveMovie(spotlightMovie.id)}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {isHeroSaved ? 'Saved To List' : 'Add To List'}
                </button>
              </div>


              <div className="mt-8 lg:hidden">
                <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.38))] p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.82)] backdrop-blur-xl">
                  <div className="relative overflow-hidden rounded-[1.3rem]">
                    <PosterImage
                      src={spotlightMovie.poster || spotlightMovie.backdrop}
                      title={spotlightMovie.title}
                      className="aspect-[2/3] w-full object-cover"
                      width={780}
                      height={975}
                      sizes="92vw"
                      loading="eager"
                      fetchPriority="high"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/18 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-white/86">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#d26d47]/30 bg-[#d26d47]/15 px-2.5 py-1 text-[#f4b684]">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {spotlightMovie.score.toFixed(1)}
                        </span>
                        <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1">{spotlightMovie.year}</span>
                      </div>
                      <p className="line-clamp-1 text-sm text-white/62">{heroGenres.join(' / ')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4 sm:mt-10">
                <div className="flex flex-wrap items-center gap-2" aria-label="Hero rotation status" role="status">
                  {heroCandidates.map((movie, index) => (
                    <div
                      key={movie.id}
                      className={`h-2.5 rounded-full transition-all duration-700 ${index === activeHeroIndex ? 'w-12 bg-white' : 'w-6 bg-white/28'}`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="select-none text-xs uppercase tracking-[0.22em] text-white/38">Auto-rotating featured lineup</p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-white/44 sm:mt-10 sm:text-xs sm:tracking-[0.2em]">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-4 py-2">
                  <Flame className="h-3.5 w-3.5 text-[#f4b684]" />
                  Trending today is live
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-4 py-2">
                  <Ticket className="h-3.5 w-3.5 text-[#f4b684]" />
                  In-theaters picks below
                </span>
                {primaryRecommendation ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-4 py-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#f4b684]" />
                    More {primaryRecommendation.genres[0]} recommendations ready
                  </span>
                ) : null}
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.38))] p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                <div className="relative overflow-hidden rounded-[1.5rem]">
                  <PosterImage
                    src={spotlightMovie.backdrop || spotlightMovie.poster}
                    title={spotlightMovie.title}
                    className="aspect-[4/5] w-full object-cover"
                    width={780}
                    height={975}
                    sizes="(min-width: 1280px) 24rem, 22rem"
                    loading="eager"
                    fetchPriority="high"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/8 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 space-y-10 pb-6 lg:mt-10">
        {rows.map((row) => (
          <MovieRow
            key={row.title}
            label={row.label}
            title={row.title}
            movies={row.movies}
            variant={row.variant}
            accent={row.accent}
            navigate={navigate}
            watchlistSet={watchlistSet}
            onSave={handleSaveMovie}
            browseHref={getBrowseHrefForRow(row.label)}
          />
        ))}
      </div>

      <DiscoverySection
        navigate={navigate}
        heroMovie={spotlightMovie}
        trendingTodayMovie={trendingTodayMovie}
        recommendedMovie={primaryRecommendation}
        upcomingMovie={upcomingMovie}
      />
    </div>
  );
}
