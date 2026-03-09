import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bookmark, Play, Share2, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PosterImage, VerdictBadge, ScoreRing } from '@/components/ui-custom';
import { resolvePosterUrl } from '@/lib/posters';
import { getMovieById, getReviewByMovieId, movies } from '@/data/movies';

export function Review() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showSpoilers, setShowSpoilers] = useState(false);


  const movie = id ? getMovieById(id) : undefined;
  const review = id ? getReviewByMovieId(id) : undefined;
  
  // Get similar movies (same genre)
  const similarMovies = movie 
    ? movies.filter(m => m.id !== movie.id && m.genres.some(g => movie.genres.includes(g))).slice(0, 3)
    : [];

  if (!movie) {
    return (
      <div className="min-h-screen bg-background pt-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Movie not found</h1>
          <Button onClick={() => navigate('/browse')} className="mt-4">
            Browse Movies
          </Button>
        </div>
      </div>
    );
  }

  const scoreBreakdown = review?.scoreBreakdown || {
    story: movie.score * 0.95,
    performances: movie.score * 0.98,
    direction: movie.score * 0.97,
    visuals: movie.score * 0.96,
    sound: movie.score * 0.94
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Hero Header */}
      <header className="relative">
        {/* Background */}
        <div className="absolute inset-0 h-96">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${resolvePosterUrl(movie.poster, movie.title, { width: 600, height: 900 })})`,
              filter: 'blur(40px) brightness(0.25)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Poster */}
            <div className="lg:w-1/4 flex-shrink-0">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl">
                <PosterImage 
                  src={movie.poster} 
                  title={movie.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Info */}
            <div className="lg:w-3/4 flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="heading-display text-4xl md:text-5xl lg:text-6xl">{movie.title}</h1>
                  <p className="text-lg text-muted-foreground mt-2">
                    {movie.year} • {movie.genres.join(' / ')} • {movie.runtime} min
                  </p>
                  <p className="text-muted-foreground">Directed by {movie.director}</p>
                </div>
              </div>

              <div className="mt-6">
                <VerdictBadge verdict={movie.verdict} score={movie.score} size="lg" />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-8">
                <Button className="btn-outline">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button className="btn-outline">
                  <Play className="w-4 h-4 mr-2" />
                  Watch Trailer
                </Button>
                <Button className="btn-outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>

              {/* Cast */}
              <div className="mt-8">
                <p className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">Starring</p>
                <p className="text-foreground">{movie.cast.join(', ')}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left Column - Review Content */}
          <div className="lg:w-2/3">
            {/* Quick Summary */}
            {review && (
              <section className="mb-10">
                <h2 className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">
                  In 10 Seconds
                </h2>
                <div className="p-6 rounded-2xl bg-card/40 border border-white/[0.06]">
                  <p className="text-lg leading-relaxed">{review.summary}</p>
                </div>
              </section>
            )}

            {/* Pros & Cons */}
            {review && (
              <section className="mb-10">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <ThumbsUp className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-semibold text-emerald-500">Pros</h3>
                    </div>
                    <ul className="space-y-2">
                      {review.pros.map((pro, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-emerald-500 mt-1">+</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <ThumbsDown className="w-5 h-5 text-red-500" />
                      <h3 className="font-semibold text-red-500">Cons</h3>
                    </div>
                    <ul className="space-y-2">
                      {review.cons.map((con, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-red-500 mt-1">-</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Spoiler Toggle */}
            <section className="mb-10">
              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium">Spoiler Section</p>
                    <p className="text-sm text-muted-foreground">Contains plot details</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Show spoilers</span>
                  <Switch checked={showSpoilers} onCheckedChange={setShowSpoilers} />
                </div>
              </div>

              {showSpoilers && (
                <div className="mt-4 p-6 rounded-2xl bg-card/40 border border-white/[0.06]">
                  <p className="text-muted-foreground">
                    Spoiler content would appear here. This section contains detailed plot analysis, 
                    ending discussion, and key story revelations that viewers may want to experience fresh.
                  </p>
                </div>
              )}
            </section>

            {/* Detailed Sections */}
            {review && (
              <section className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Story</h2>
                  <p className="text-muted-foreground leading-relaxed">{review.sections.story}</p>
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold mb-4">Performances</h2>
                  <p className="text-muted-foreground leading-relaxed">{review.sections.performances}</p>
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold mb-4">Direction</h2>
                  <p className="text-muted-foreground leading-relaxed">{review.sections.direction}</p>
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold mb-4">Visuals</h2>
                  <p className="text-muted-foreground leading-relaxed">{review.sections.visuals}</p>
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold mb-4">Sound</h2>
                  <p className="text-muted-foreground leading-relaxed">{review.sections.sound}</p>
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold mb-4">Themes</h2>
                  <p className="text-muted-foreground leading-relaxed">{review.sections.themes}</p>
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Sticky Rail */}
          <aside className="lg:w-1/3">
            <div className="sticky top-24 space-y-6">
              {/* Score Breakdown */}
              <div className="p-6 rounded-2xl bg-card/40 border border-white/[0.06]">
                <h3 className="font-semibold mb-6">Score Breakdown</h3>
                <div className="space-y-4">
                  {Object.entries(scoreBreakdown).map(([category, score]) => (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-muted-foreground">{category}</span>
                        <span className="font-medium">{score.toFixed(1)}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${(score / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Overall</span>
                    <ScoreRing score={movie.score} size="md" />
                  </div>
                </div>
              </div>

              {/* Where to Watch */}
              <div className="p-6 rounded-2xl bg-card/40 border border-white/[0.06]">
                <h3 className="font-semibold mb-4">Where to Watch</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.streaming?.map((service) => (
                    <span 
                      key={service}
                      className="px-3 py-1.5 rounded-full bg-white/5 text-sm border border-white/10"
                    >
                      {service}
                    </span>
                  )) || (
                    <span className="text-muted-foreground text-sm">Theaters</span>
                  )}
                </div>
              </div>

              {/* Similar Movies */}
              {similarMovies.length > 0 && (
                <div className="p-6 rounded-2xl bg-card/40 border border-white/[0.06]">
                  <h3 className="font-semibold mb-4">Similar Movies</h3>
                  <div className="space-y-3">
                    {similarMovies.map((similar) => (
                      <div 
                        key={similar.id}
                        onClick={() => navigate(`/review/${similar.id}`)}
                        className="flex gap-3 cursor-pointer group"
                      >
                        <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <PosterImage 
                            src={similar.poster} 
                            title={similar.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                            {similar.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">{similar.year}</p>
                          <p className="text-xs text-primary mt-1">{similar.score.toFixed(1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
