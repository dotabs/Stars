import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bookmark, Calendar, Clock3, Play, Sparkles, Star, Ticket, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MovieCard, PosterImage, VerdictBadge } from '@/components/ui-custom';
import { buildYouTubeSearchUrl, openExternalUrl } from '@/lib/browser';
import { fetchHomeFeed } from '@/lib/tmdb-movies';
import { getUserLibrary, toggleLibraryItem } from '@/lib/user-library';
import type { Movie } from '@/types';

type HomeFeed = {
  spotlightMovie: Movie | null;
  latestMovies: Movie[];
  trendingMovies: Movie[];
  topRatedMovies: Movie[];
  popularMovies: Movie[];
};

export function Home() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [savedMovieIds, setSavedMovieIds] = useState(() => getUserLibrary().watchlist);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      setIsLoading(true);
      setLoadError('');
      try {
        const response = await fetchHomeFeed();
        if (!cancelled) {
          setFeed(response);
        }
      } catch (error) {
        console.error('Failed to load TMDB home feed', error);
        if (!cancelled) {
          setLoadError('The live TMDB feed is currently unavailable.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadFeed();
    return () => {
      cancelled = true;
    };
  }, []);

  const spotlightMovie = feed?.spotlightMovie;
  const latestMovies = feed?.latestMovies ?? [];
  const trendingMovies = feed?.trendingMovies ?? [];
  const topRatedMovies = feed?.topRatedMovies ?? [];
  const popularMovies = feed?.popularMovies ?? [];

  if (isLoading && !spotlightMovie) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="section-panel w-full max-w-md px-6 py-10 text-center">
          <p className="section-kicker">Loading</p>
          <h1 className="heading-display mt-3 text-4xl text-white">Opening live front page</h1>
        </div>
      </div>
    );
  }

  if (!spotlightMovie) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="section-panel w-full max-w-lg px-6 py-10 text-center">
          <p className="section-kicker">Unavailable</p>
          <h1 className="heading-display mt-3 text-4xl text-white">TMDB feed failed</h1>
          <p className="mt-4 text-sm text-muted-foreground">{loadError || 'No live movie data is available right now.'}</p>
          <Button className="btn-primary mt-6" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isSaved = savedMovieIds.includes(spotlightMovie.id);

  const handleSaveSpotlight = () => {
    const nextState = toggleLibraryItem('watchlist', spotlightMovie.id);
    setSavedMovieIds(nextState.watchlist);
  };

  const spotlightStats = [
    { icon: Calendar, label: 'Release Year', value: String(spotlightMovie.year) },
    { icon: Clock3, label: 'Runtime', value: spotlightMovie.runtime ? `${spotlightMovie.runtime} min` : 'Pending' },
    { icon: Ticket, label: 'Score', value: `${spotlightMovie.score.toFixed(1)}/10` },
  ];

  return (
    <div className="min-h-screen pb-16 pt-16">
      <section className="section-shell pt-5 md:pt-8">
        <div className="mx-auto max-w-7xl">
          <div className="section-panel relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7 lg:px-9 lg:py-9">
            <div className="absolute inset-0 opacity-90">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(10, 8, 7, 0.96) 0%, rgba(10, 8, 7, 0.74) 35%, rgba(10, 8, 7, 0.95) 100%), url(${spotlightMovie.backdrop || spotlightMovie.poster})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                }}
              />
            </div>

            <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,360px)] lg:items-center lg:gap-8">
              <div className="max-w-2xl xl:max-w-[42rem]">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="section-kicker">Live Front Page</p>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                    TMDB only
                  </span>
                </div>
                <h1 className="heading-display heading-gradient mt-4 max-w-2xl text-[3.55rem] sm:text-[4.4rem] lg:text-[4.8rem] xl:text-[5.1rem]">
                  {spotlightMovie.title}
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                  {spotlightMovie.synopsis}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {spotlightStats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-[0.8rem] text-muted-foreground">
                        <stat.icon className="h-4 w-4" />
                        <span>{stat.label}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => navigate(`/review/${spotlightMovie.id}`)} className="btn-primary">
                    Open Review
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button className="btn-outline text-white" onClick={() => openExternalUrl(spotlightMovie.trailerUrl || buildYouTubeSearchUrl(`${spotlightMovie.title} ${spotlightMovie.year} trailer`))}>
                    <Play className="mr-2 h-4 w-4" />
                    Watch Trailer
                  </Button>
                  <Button variant="outline" className="btn-outline text-white" onClick={handleSaveSpotlight}>
                    <Bookmark className="mr-2 h-4 w-4" />
                    {isSaved ? 'Saved' : 'Save'}
                  </Button>
                </div>
              </div>

              <div className="mx-auto w-full max-w-[20rem] lg:mx-0 lg:justify-self-end">
                <div className="rounded-[1.6rem] border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
                  <PosterImage
                    src={spotlightMovie.poster}
                    title={spotlightMovie.title}
                    className="aspect-[2/3] max-h-[30rem] w-full rounded-[1.35rem] object-cover"
                  />
                  <div className="mt-4">
                    <VerdictBadge verdict={spotlightMovie.verdict} score={spotlightMovie.score} size="lg" />
                  </div>
                  <div className="mt-4 grid gap-2.5">
                    {spotlightStats.slice(0, 2).map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <stat.icon className="h-4 w-4" />
                          <span>{stat.label}</span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-white">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell mt-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="section-panel p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Now Playing</p>
                <h2 className="heading-display mt-3 text-3xl text-white sm:text-4xl">In theaters</h2>
              </div>
              <button onClick={() => navigate('/browse')} className="text-sm font-semibold text-[#f4b684] transition-colors hover:text-white">
                Browse all
              </button>
            </div>
            <div className="mt-6 grid items-start gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              {latestMovies[0] && (
                <div className="self-start rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-4">
                  <MovieCard movie={latestMovies[0]} variant="hero" onClick={() => navigate(`/review/${latestMovies[0].id}`)} />
                </div>
              )}
              <div className="grid items-start gap-5 sm:grid-cols-2">
                {latestMovies.slice(1, 5).map((movie) => (
                  <MovieCard key={movie.id} movie={movie} variant="compact" onClick={() => navigate(`/review/${movie.id}`)} />
                ))}
              </div>
            </div>
          </div>

          <div className="section-panel p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Trending</p>
                <h2 className="heading-display mt-3 text-3xl text-white sm:text-4xl">Heat this week</h2>
              </div>
              <TrendingUp className="h-5 w-5 text-[#f4b684]" />
            </div>
            <div className="mt-6 space-y-3">
              {trendingMovies.slice(0, 5).map((movie, index) => (
                <button key={movie.id} onClick={() => navigate(`/review/${movie.id}`)} className="group flex w-full items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition-all hover:border-[#d26d47]/40 hover:bg-white/[0.05]">
                  <span className="heading-display text-4xl text-white/20">{`0${index + 1}`}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white group-hover:text-[#f4b684]">{movie.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{movie.year}</p>
                  </div>
                  <span className="rounded-full border border-[#d26d47]/30 bg-[#d26d47]/10 px-3 py-1 text-sm font-semibold text-[#f4b684]">
                    {movie.score.toFixed(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell mt-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="section-panel p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="section-kicker">Top Rated</p>
                <h2 className="heading-display mt-3 text-3xl text-white sm:text-4xl">Critical favorites</h2>
              </div>
              <button onClick={() => navigate('/browse')} className="text-sm font-semibold text-[#f4b684] transition-colors hover:text-white">
                Explore
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
              {topRatedMovies.slice(0, 4).map((movie) => (
                <MovieCard key={movie.id} movie={movie} variant="compact" onClick={() => navigate(`/review/${movie.id}`)} />
              ))}
            </div>
          </div>

          <div className="section-panel p-6 sm:p-8">
            <p className="section-kicker">Signal Board</p>
            <h2 className="heading-display mt-3 text-3xl text-white sm:text-4xl">Live snapshot</h2>
            <div className="mt-6 grid gap-4">
              {[
                { icon: Ticket, label: 'Now Playing', value: `${latestMovies.length}` },
                { icon: Sparkles, label: 'Trending Titles', value: `${trendingMovies.length}` },
                { icon: Star, label: 'Top Rated', value: `${topRatedMovies.length}` },
                { icon: Play, label: 'Popular Picks', value: `${popularMovies.length}` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[#d26d47]/12 p-3 text-[#f4b684]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="heading-display text-3xl text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
