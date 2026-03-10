import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  Calendar,
  Clock3,
  Globe,
  Play,
  Sparkles,
  Star,
  Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MovieCard, PosterImage, VerdictBadge } from '@/components/ui-custom';
import { resolvePosterUrl } from '@/lib/posters';
import {
  editorLists,
  getClassicMovies,
  getLatestMovies,
  getMoviesByDecade,
  getTrendingMovies,
  movies,
} from '@/data/movies';

export function Home() {
  const navigate = useNavigate();
  const [activeDecade, setActiveDecade] = useState<number>(2020);

  const spotlightMovie = movies.find((movie) => movie.id === 'sinners-2025') || movies[0];
  const latestMovies = getLatestMovies().slice(0, 4);
  const trendingMovies = getTrendingMovies().slice(0, 4);
  const classicMovies = getClassicMovies().slice(0, 4);
  const theatricalMovies = movies.filter((movie) => movie.streaming?.includes('Theaters')).slice(0, 5);
  const decades = [2020, 2010, 2000, 1990, 1980];
  const decadeMovies = getMoviesByDecade(activeDecade).slice(0, 4);

  const spotlightStats = [
    { label: 'Verdict', value: spotlightMovie.verdict },
    { label: 'Score', value: spotlightMovie.score.toFixed(1) },
    { label: 'Runtime', value: `${spotlightMovie.runtime} min` },
  ];
  const activeDecadeRange = `${activeDecade} - ${activeDecade + 9}`;
  const leadLatestMovie = latestMovies[0];
  const supportingLatestMovies = latestMovies.slice(1);
  const leadDecadeMovie = decadeMovies[0];
  const supportingDecadeMovies = decadeMovies.slice(1);

  return (
    <div className="min-h-screen pt-16 pb-16">
      <section className="section-shell overflow-hidden pt-6 md:pt-10">
        <div className="mx-auto max-w-7xl">
          <div className="section-panel relative overflow-hidden px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
            <div className="absolute inset-0 opacity-80">
              <div
                className="absolute inset-y-0 right-0 w-full lg:w-[54%]"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(13, 10, 9, 0.98) 0%, rgba(13, 10, 9, 0.72) 30%, rgba(13, 10, 9, 0.28) 55%, rgba(13, 10, 9, 0.9) 100%), url(${resolvePosterUrl(
                    spotlightMovie.poster,
                    spotlightMovie.title,
                    { width: 1000, height: 1500 },
                  )})`,
                  backgroundPosition: 'left center, right center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '100% 100%, cover',
                }}
              />
              <div
                className="absolute -left-24 top-0 h-72 w-72 rounded-full blur-3xl"
                style={{ background: 'rgba(210, 109, 71, 0.2)' }}
              />
              <div
                className="absolute bottom-0 right-12 h-72 w-72 rounded-full blur-3xl"
                style={{ background: 'rgba(214, 159, 95, 0.12)' }}
              />
            </div>

            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="section-kicker">Issue 12 / Curated This Week</p>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                    Editorial front page
                  </span>
                </div>
                <h1 className="heading-display heading-gradient mt-5 max-w-3xl text-5xl sm:text-6xl lg:text-[5.4rem]">
                  {spotlightMovie.title}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {spotlightMovie.synopsis}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button onClick={() => navigate(`/review/${spotlightMovie.id}`)} className="btn-primary">
                    Read Spotlight
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button className="btn-outline text-white">
                    <Play className="mr-2 h-4 w-4" />
                    Watch Trailer
                  </Button>
                  <Button variant="outline" className="btn-outline text-white">
                    <Bookmark className="mr-2 h-4 w-4" />
                    Save for Later
                  </Button>
                </div>

                <div className="editorial-rule mt-8 max-w-2xl" />

                <div className="mt-8 grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
                  <div className="soft-ring w-fit rounded-3xl bg-black/20 p-3">
                    <div className="relative aspect-[2/3] w-40 overflow-hidden rounded-[1.4rem] sm:w-48">
                      <PosterImage
                        src={spotlightMovie.poster}
                        title={spotlightMovie.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <VerdictBadge verdict={spotlightMovie.verdict} score={spotlightMovie.score} size="lg" />
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-muted-foreground">
                        {spotlightMovie.genres.join(' / ')}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {spotlightMovie.year}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4" />
                        {spotlightMovie.runtime} min
                      </span>
                      <span>Directed by {spotlightMovie.director}</span>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {spotlightStats.map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                        >
                          <p className="section-kicker !text-[0.62rem] !tracking-[0.18em]">{stat.label}</p>
                          <p className="mt-2 text-sm font-semibold text-white">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:pl-4">
                <div className="rounded-[1.9rem] border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="section-kicker">Front Page Notes</p>
                      <h2 className="heading-display mt-3 text-3xl text-white">Why this leads</h2>
                    </div>
                    <span className="rounded-full border border-[#d26d47]/30 bg-[#d26d47]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#f4b684]">
                      Cover story
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    A stronger homepage needs one clear editorial decision. This week the lead film anchors the page,
                    while the surrounding modules feel like departments in the same publication.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {spotlightMovie.cast.slice(0, 5).map((actor) => (
                      <span
                        key={actor}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/82"
                      >
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {[
                    { label: 'In Theaters', value: theatricalMovies.length.toString().padStart(2, '0') },
                    { label: 'Fresh Reviews', value: latestMovies.length.toString().padStart(2, '0') },
                    { label: 'Top Score This Week', value: `${Math.max(...latestMovies.map((movie) => movie.score)).toFixed(1)}` },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] px-4 py-4"
                    >
                      <p className="section-kicker !text-[0.58rem] !tracking-[0.2em]">{item.label}</p>
                      <p className="heading-display mt-3 text-3xl text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.9rem] border border-white/10 bg-gradient-to-br from-[#201613] to-[#120d0b] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="section-kicker">Now Playing Signal</p>
                      <h3 className="heading-display mt-2 text-2xl text-white">Theater board</h3>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/70">
                      Updated daily
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {theatricalMovies.slice(0, 3).map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => navigate(`/review/${movie.id}`)}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
                      >
                        <div>
                          <p className="font-semibold text-white">{movie.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{movie.year}</p>
                        </div>
                        <span className="text-sm font-bold text-[#f4b684]">{movie.score.toFixed(1)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell mt-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="section-panel p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="section-kicker">Latest Reviews</p>
                <h2 className="heading-display mt-3 text-3xl text-white sm:text-4xl">Fresh dispatches</h2>
              </div>
              <button
                onClick={() => navigate('/browse')}
                className="text-sm font-semibold text-[#f4b684] transition-colors hover:text-white"
              >
                Browse archive
              </button>
            </div>

            <div className="mt-6 grid items-start gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              {leadLatestMovie && (
                <div className="self-start rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-4">
                  <MovieCard
                    movie={leadLatestMovie}
                    variant="hero"
                    onClick={() => navigate(`/review/${leadLatestMovie.id}`)}
                  />
                </div>
              )}
              <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-2">
                {supportingLatestMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    variant="compact"
                    onClick={() => navigate(`/review/${movie.id}`)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="section-panel p-6 sm:p-8">
            <p className="section-kicker">Trending Reads</p>
            <h2 className="heading-display mt-3 text-3xl text-white sm:text-4xl">Most discussed</h2>
            <div className="mt-6 space-y-3">
              {trendingMovies.map((movie, index) => (
                <button
                  key={movie.id}
                  onClick={() => navigate(`/review/${movie.id}`)}
                  className="group flex w-full items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition-all hover:border-[#d26d47]/40 hover:bg-white/[0.05]"
                >
                  <span className="heading-display text-4xl text-white/20">{`0${index + 1}`}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white group-hover:text-[#f4b684]">{movie.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {movie.year} - {movie.director}
                    </p>
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
        <div className="mx-auto max-w-7xl section-panel p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
              <p className="section-kicker">Browse by Decade</p>
              <h2 className="heading-display mt-3 text-3xl text-white sm:text-4xl">A cleaner way to roam the archive</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
                Instead of throwing every filter on screen at once, this section gives the archive one strong axis:
                time. Pick an era and jump straight into its defining titles.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {decades.map((decade) => (
                  <button
                    key={decade}
                    onClick={() => setActiveDecade(decade)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                      activeDecade === decade ? 'text-white' : 'text-muted-foreground hover:text-white'
                    }`}
                    style={
                      activeDecade === decade
                        ? {
                            borderColor: 'rgba(210, 109, 71, 0.45)',
                            background: 'linear-gradient(135deg, rgba(210, 109, 71, 0.18) 0%, rgba(132, 58, 36, 0.16) 100%)',
                            boxShadow: '0 0 20px rgba(166, 66, 34, 0.18)',
                          }
                        : {
                            borderColor: 'rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                          }
                    }
                  >
                    {decade}s
                  </button>
                ))}
              </div>

              <div className="mt-8 rounded-[1.7rem] border border-white/10 bg-black/20 p-5">
                <p className="section-kicker">Selected era</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="heading-display text-4xl text-white">{activeDecade}s</p>
                    <p className="mt-2 text-sm text-muted-foreground">{activeDecadeRange}</p>
                  </div>
                  <span className="rounded-full border border-[#d26d47]/30 bg-[#d26d47]/10 px-3 py-1 text-sm font-semibold text-[#f4b684]">
                    {decadeMovies.length} picks
                  </span>
                </div>
                <div className="editorial-rule mt-5" />
                <div className="mt-5 grid gap-3">
                  {decadeMovies.slice(0, 3).map((movie, index) => (
                    <button
                      key={movie.id}
                      onClick={() => navigate(`/review/${movie.id}`)}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="heading-display text-2xl text-white/20">{`0${index + 1}`}</span>
                        <div>
                          <p className="font-semibold text-white">{movie.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{movie.year}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#f4b684]">{movie.score.toFixed(1)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid items-start gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              {leadDecadeMovie && (
                <div className="self-start rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-4">
                  <MovieCard
                    movie={leadDecadeMovie}
                    variant="hero"
                    onClick={() => navigate(`/review/${leadDecadeMovie.id}`)}
                  />
                </div>
              )}
              <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-2">
                {supportingDecadeMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    variant="compact"
                    onClick={() => navigate(`/review/${movie.id}`)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell mt-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="section-panel p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#d26d47]/12 p-3 text-[#f4b684]">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="section-kicker">Explore</p>
                <h2 className="heading-display mt-2 text-3xl text-white">Cinema by place</h2>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
              Find films through cities, countries, and landscapes. This should feel like opening an atlas, not a
              search filter.
            </p>
            <Button onClick={() => navigate('/explore')} className="btn-primary mt-6">
              Open the globe
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="section-panel p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="section-kicker">Editor Lists</p>
                <h2 className="heading-display mt-3 text-3xl text-white sm:text-4xl">Curated entries</h2>
              </div>
              <button
                onClick={() => navigate('/lists')}
                className="text-sm font-semibold text-[#f4b684] transition-colors hover:text-white"
              >
                See all lists
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {editorLists.slice(0, 3).map((list) => (
                <button
                  key={list.id}
                  onClick={() => navigate('/lists')}
                  className="group overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.03] text-left transition-all hover:border-[#d26d47]/30 hover:bg-white/[0.05]"
                >
                  <div className="grid h-32 grid-cols-3 overflow-hidden">
                    {list.movieIds.slice(0, 3).map((id) => {
                      const movie = movies.find((item) => item.id === id);
                      if (!movie) return <div key={id} className="bg-black/30" />;

                      return (
                        <div
                          key={id}
                          style={{
                            backgroundImage: `url(${resolvePosterUrl(movie.poster, movie.title, { width: 400, height: 600 })})`,
                            backgroundPosition: 'center',
                            backgroundSize: 'cover',
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-white group-hover:text-[#f4b684]">{list.title}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{list.description}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{list.movieIds.length} films</span>
                      <span className="text-[#f4b684]">{list.followers.toLocaleString()} followers</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell mt-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="section-panel p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="section-kicker">Classic Cinema</p>
                <h2 className="heading-display mt-3 text-3xl text-white sm:text-4xl">The foundation</h2>
              </div>
              <button
                onClick={() => navigate('/browse')}
                className="text-sm font-semibold text-[#f4b684] transition-colors hover:text-white"
              >
                View classics
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
              {classicMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  variant="compact"
                  onClick={() => navigate(`/review/${movie.id}`)}
                />
              ))}
            </div>
          </div>

          <div className="section-panel p-6 sm:p-8">
            <p className="section-kicker">At a Glance</p>
            <h2 className="heading-display mt-3 text-3xl text-white sm:text-4xl">The signal board</h2>
            <div className="mt-6 grid gap-4">
              {[
                { icon: Ticket, label: 'Movies Reviewed', value: `${movies.length}+` },
                { icon: Sparkles, label: 'Years Covered', value: '80+' },
                { icon: Star, label: 'Actor Profiles', value: '50+' },
                { icon: Globe, label: 'Curated Lists', value: '20+' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4"
                >
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

