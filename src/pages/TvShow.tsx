import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Clapperboard, Radio, Star, Tv as TvIcon, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PosterImage } from '@/components/ui-custom';
import { fetchTvShowById } from '@/lib/tmdb-search';
import type { TvShowDetails } from '@/types';

export function TvShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tvId = Number(id);
  const hasValidTvId = Number.isFinite(tvId);
  const [show, setShow] = useState<TvShowDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!hasValidTvId) return;

    void Promise.resolve().then(() => {
      if (cancelled) return;

      setIsLoading(true);
      setLoadError('');

      return fetchTvShowById(tvId)
        .then((response) => {
          if (!cancelled) {
            setShow(response);
          }
        })
        .catch((error) => {
          console.error('Failed to load TV show', error);
          if (!cancelled) {
            setLoadError('Failed to load TV show data.');
          }
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
  }, [hasValidTvId, tvId]);

  if (isLoading && !show) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="section-panel w-full max-w-md px-6 py-10 text-center">
          <p className="section-kicker">Loading</p>
          <h1 className="heading-display mt-3 text-4xl text-white">Opening series</h1>
        </div>
      </div>
    );
  }

  if (!hasValidTvId || !show) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="section-panel w-full max-w-lg px-6 py-10 text-center">
          <p className="section-kicker">Unavailable</p>
          <h1 className="heading-display mt-3 text-4xl text-white">TV show not available</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {hasValidTvId ? loadError || 'This TV show could not be loaded right now.' : 'This TV show could not be found.'}
          </p>
          <Button onClick={() => navigate('/browse')} className="btn-primary mt-6">
            Browse Movies
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 h-[30rem]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${show.backdropUrl || show.posterUrl})`,
              filter: 'blur(36px) brightness(0.24)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="w-full max-w-xs flex-none">
              <div className="overflow-hidden rounded-[1.8rem] border border-white/10 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.95)]">
                <PosterImage
                  src={show.posterUrl}
                  title={show.title}
                  className="aspect-[2/3] w-full object-cover"
                  width={500}
                  height={750}
                  loading="eager"
                />
              </div>
            </div>

            <div className="max-w-3xl flex-1">
              <p className="section-kicker">TV Series</p>
              <h1 className="heading-display mt-3 text-4xl text-white md:text-5xl">{show.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#f4cfb0]">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d26d47]/25 bg-[#d26d47]/10 px-3 py-1.5">
                  <Star className="h-4 w-4" />
                  {show.score.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {show.yearLabel}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <TvIcon className="h-4 w-4" />
                  {show.seasons} seasons
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <Clapperboard className="h-4 w-4" />
                  {show.episodes} episodes
                </span>
              </div>

              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">{show.overview}</p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="section-panel rounded-[1.4rem] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Series Info</p>
                  <div className="mt-4 space-y-3 text-sm text-white">
                    <p>
                      <span className="text-muted-foreground">Status:</span> {show.status}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Genres:</span> {show.genres.join(', ') || 'Not available'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">First aired:</span> {show.firstAirDate || 'Not available'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Last aired:</span> {show.lastAirDate || 'Not available'}
                    </p>
                  </div>
                </div>

                <div className="section-panel rounded-[1.4rem] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Creative Team</p>
                  <div className="mt-4 space-y-4 text-sm text-white">
                    <div>
                      <p className="flex items-center gap-2 text-[#f4cfb0]">
                        <Radio className="h-4 w-4" />
                        Networks
                      </p>
                      <p className="mt-1 text-muted-foreground">{show.networks.join(', ') || 'Not available'}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-[#f4cfb0]">
                        <Users className="h-4 w-4" />
                        Creators
                      </p>
                      <p className="mt-1 text-muted-foreground">{show.creators.join(', ') || 'Not available'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="section-panel mt-6 rounded-[1.4rem] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Top Cast</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {show.cast.length > 0 ? (
                    show.cast.map((member) => (
                      <span
                        key={member}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white"
                      >
                        {member}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Cast information is not available for this series.</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => navigate(-1)} className="btn-primary">
                  Back
                </Button>
                <Button asChild className="btn-outline text-white">
                  <Link to="/browse">Browse Movies</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
