import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Bookmark, Play, Share2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PosterImage, ScoreRing, VerdictBadge } from '@/components/ui-custom';
import { useToast } from '@/hooks/use-toast';
import { useUserLibrary } from '@/hooks/use-user-library';
import { getMovieById, getReviewByMovieId, movies as localMovies } from '@/data/movies';
import { buildYouTubeSearchUrl, openExternalUrl, shareUrl } from '@/lib/browser';
import { fetchTmdbMovieByRouteId, isTmdbMovieId } from '@/lib/tmdb-movies';
import { isLibraryAuthError, toggleLibraryItem } from '@/lib/user-library';
export function Review() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { currentUser, library } = useUserLibrary();
    const [showSpoilers, setShowSpoilers] = useState(false);
    const [movie, setMovie] = useState(null);
    const [review, setReview] = useState(null);
    const [similarMovies, setSimilarMovies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    useEffect(() => {
        let cancelled = false;
        async function loadMovie() {
            if (!id)
                return;
            setIsLoading(true);
            setLoadError('');
            try {
                if (isTmdbMovieId(id)) {
                    const response = await fetchTmdbMovieByRouteId(id);
                    if (!cancelled && response) {
                        setMovie(response.movie);
                        setReview(response.review);
                        setSimilarMovies(response.similarMovies);
                        return;
                    }
                }
                const localMovie = getMovieById(id);
                if (!cancelled && localMovie) {
                    setMovie(localMovie);
                    setReview(getReviewByMovieId(id) ?? null);
                    setSimilarMovies(localMovies
                        .filter((entry) => entry.id !== localMovie.id && entry.genres.some((genre) => localMovie.genres.includes(genre)))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 6));
                    return;
                }
                if (!cancelled) {
                    setLoadError('This title is not available in the current catalog.');
                }
            }
            catch (error) {
                console.error('Failed to load movie', error);
                if (!cancelled) {
                    setLoadError('Failed to load movie data.');
                }
            }
            finally {
                if (!cancelled)
                    setIsLoading(false);
            }
        }
        void loadMovie();
        return () => {
            cancelled = true;
        };
    }, [id]);
    if (isLoading && !movie) {
        return (<div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="section-panel w-full max-w-md px-6 py-10 text-center">
          <p className="section-kicker">Loading</p>
          <h1 className="heading-display mt-3 text-4xl text-white">Opening review</h1>
        </div>
      </div>);
    }
    if (!movie) {
        return (<div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="section-panel w-full max-w-lg px-6 py-10 text-center">
          <p className="section-kicker">Unavailable</p>
          <h1 className="heading-display mt-3 text-4xl text-white">Movie not available</h1>
          <p className="mt-4 text-sm text-muted-foreground">{loadError || 'This title could not be loaded from the current catalog.'}</p>
          <Button onClick={() => navigate('/browse')} className="btn-primary mt-6">
            Browse Movies
          </Button>
        </div>
      </div>);
    }
    const scoreBreakdown = review?.scoreBreakdown || {
        story: movie.score * 0.95,
        performances: movie.score * 0.98,
        direction: movie.score * 0.97,
        visuals: movie.score * 0.96,
        sound: movie.score * 0.94,
    };
    const isSaved = library.watchlist.includes(movie.id);
    const handleToggleSave = async () => {
        try {
            await toggleLibraryItem({
                userId: currentUser?.uid,
                listName: 'watchlist',
                movieId: movie.id,
            });
        }
        catch (error) {
            if (isLibraryAuthError(error)) {
                toast({
                    title: 'Sign in required',
                    description: 'Sign in to save titles to your watchlist.',
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
    const handleShare = async () => {
        const reviewUrl = typeof window === 'undefined' ? '' : window.location.href;
        await shareUrl(reviewUrl, `${movie.title} review`, `Read the STARS review for ${movie.title}`);
    };
    const trailerUrl = movie.trailerUrl || buildYouTubeSearchUrl(`${movie.title} ${movie.year} trailer`);
    return (<div className="min-h-screen bg-background pt-16">
      <header className="relative">
        <div className="absolute inset-0 h-96">
          <div className="absolute inset-0 bg-cover bg-center" style={{
            backgroundImage: `url(${movie.backdrop || movie.poster})`,
            filter: 'blur(40px) brightness(0.25)',
        }}/>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent"/>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-shrink-0 lg:w-1/4">
              <div className="aspect-[2/3] overflow-hidden rounded-2xl shadow-2xl">
                <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover"/>
              </div>
            </div>

            <div className="flex flex-col lg:w-3/4">
              <div>
                <h1 className="heading-display text-4xl md:text-5xl lg:text-6xl">{movie.title}</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                  {movie.year} • {movie.genres.join(' / ')} • {movie.runtime ? `${movie.runtime} min` : 'Runtime pending'}
                </p>
                <p className="text-muted-foreground">Directed by {movie.director}</p>
              </div>

              <div className="mt-6">
                <VerdictBadge verdict={movie.verdict} score={movie.score} size="lg"/>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="btn-outline" onClick={() => void handleToggleSave()}>
                  <Bookmark className="mr-2 h-4 w-4"/>
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
                <Button className="btn-outline" onClick={() => openExternalUrl(trailerUrl)}>
                  <Play className="mr-2 h-4 w-4"/>
                  Watch Trailer
                </Button>
                <Button className="btn-outline" onClick={() => void handleShare()}>
                  <Share2 className="mr-2 h-4 w-4"/>
                  Share
                </Button>
              </div>

              <div className="mt-8">
                <p className="mb-2 text-mono text-xs uppercase tracking-wider text-muted-foreground">Starring</p>
                <p className="text-foreground">{movie.cast.length ? movie.cast.join(', ') : 'Cast details unavailable.'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row">
          <div className="lg:w-2/3">
            {review && (<section className="mb-10">
                <h2 className="mb-4 text-mono text-xs uppercase tracking-wider text-muted-foreground">In 10 Seconds</h2>
                <div className="rounded-2xl border border-white/[0.06] bg-card/40 p-6">
                  <p className="text-lg leading-relaxed">{review.summary}</p>
                </div>
              </section>)}

            {review && (<section className="mb-10">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <ThumbsUp className="h-5 w-5 text-emerald-500"/>
                      <h3 className="font-semibold text-emerald-500">Pros</h3>
                    </div>
                    <ul className="space-y-2">
                      {review.pros.map((pro, index) => (<li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1 text-emerald-500">+</span>
                          {pro}
                        </li>))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <ThumbsDown className="h-5 w-5 text-red-500"/>
                      <h3 className="font-semibold text-red-500">Cons</h3>
                    </div>
                    <ul className="space-y-2">
                      {review.cons.map((con, index) => (<li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1 text-red-500">-</span>
                          {con}
                        </li>))}
                    </ul>
                  </div>
                </div>
              </section>)}

            <section className="mb-10">
              <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500"/>
                  <div>
                    <p className="font-medium">Spoiler Section</p>
                    <p className="text-sm text-muted-foreground">Contains generated plot notes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Show spoilers</span>
                  <Switch checked={showSpoilers} onCheckedChange={setShowSpoilers}/>
                </div>
              </div>

              {showSpoilers && (<div className="mt-4 rounded-2xl border border-white/[0.06] bg-card/40 p-6">
                  <p className="text-muted-foreground">{review?.sections.story ?? movie.synopsis}</p>
                </div>)}
            </section>

            {review && (<section className="space-y-8">
                <div><h2 className="mb-4 text-xl font-semibold">Story</h2><p className="leading-relaxed text-muted-foreground">{review.sections.story}</p></div>
                <div><h2 className="mb-4 text-xl font-semibold">Performances</h2><p className="leading-relaxed text-muted-foreground">{review.sections.performances}</p></div>
                <div><h2 className="mb-4 text-xl font-semibold">Direction</h2><p className="leading-relaxed text-muted-foreground">{review.sections.direction}</p></div>
                <div><h2 className="mb-4 text-xl font-semibold">Visuals</h2><p className="leading-relaxed text-muted-foreground">{review.sections.visuals}</p></div>
                <div><h2 className="mb-4 text-xl font-semibold">Sound</h2><p className="leading-relaxed text-muted-foreground">{review.sections.sound}</p></div>
                <div><h2 className="mb-4 text-xl font-semibold">Themes</h2><p className="leading-relaxed text-muted-foreground">{review.sections.themes}</p></div>
              </section>)}
          </div>

          <aside className="lg:w-1/3">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-white/[0.06] bg-card/40 p-6">
                <h3 className="mb-6 font-semibold">Score Breakdown</h3>
                <div className="space-y-4">
                  {Object.entries(scoreBreakdown).map(([category, score]) => (<div key={category}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{category}</span>
                        <span className="font-medium">{score.toFixed(1)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(score / 10) * 100}%` }}/>
                      </div>
                    </div>))}
                </div>
                <div className="mt-6 border-t border-white/[0.06] pt-6">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Overall</span>
                    <ScoreRing score={movie.score} size="md"/>
                  </div>
                </div>
              </div>

              {similarMovies.length > 0 && (<div className="rounded-2xl border border-white/[0.06] bg-card/40 p-6">
                  <h3 className="mb-4 font-semibold">Similar Movies</h3>
                  <div className="space-y-3">
                    {similarMovies.map((similar) => (<div key={similar.id} onClick={() => navigate(`/review/${similar.id}`)} className="group flex cursor-pointer gap-3">
                        <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg">
                          <PosterImage src={similar.poster} title={similar.title} className="h-full w-full object-cover transition-transform group-hover:scale-105"/>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium transition-colors group-hover:text-primary">{similar.title}</h4>
                          <p className="text-xs text-muted-foreground">{similar.year}</p>
                          <p className="mt-1 text-xs text-primary">{similar.score.toFixed(1)}</p>
                        </div>
                      </div>))}
                  </div>
                </div>)}
            </div>
          </aside>
        </div>
      </div>
    </div>);
}
