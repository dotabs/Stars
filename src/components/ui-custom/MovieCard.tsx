import { memo, useEffect, useState } from 'react';
import { Bookmark, Eye, Heart, MessageSquareText, PenSquare, Play, Star, Users } from 'lucide-react';
import type { Movie } from '@/types';
import { getPosterFallback, resolvePosterUrl } from '@/lib/posters';
import { fetchTmdbMovieByRouteId } from '@/lib/tmdb-movies';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { PosterImage } from './PosterImage';
import { VerdictBadge } from './VerdictBadge';

interface MovieCardProps {
  movie: Movie;
  variant?: 'default' | 'compact' | 'horizontal' | 'hero';
  onClick?: () => void;
  onSave?: () => void;
  onToggleWatchlist?: () => void;
  onToggleLike?: () => void;
  onWriteReview?: () => void;
  onViewDetails?: () => void;
  onGenreClick?: (genre: string) => void;
  showRank?: number;
  isInWatchlist?: boolean;
  isLiked?: boolean;
}

function getReviewCount(movie: Movie) {
  if (movie.reviewCount && movie.reviewCount > 0) return movie.reviewCount;
  return Math.max(48, Math.round(movie.score * 420 + Math.max(0, new Date().getFullYear() - movie.year) * 12));
}

function normalizePreviewDirector(movie: Movie) {
  const director = movie.director?.trim();
  if (!director || director.toLowerCase() === 'tmdb' || director.toLowerCase() === 'unknown director') {
    return 'Not available';
  }

  return director;
}

function normalizePreviewCast(movie: Movie) {
  const cast = movie.cast
    .map((member) => member.trim())
    .filter(Boolean)
    .slice(0, 3);

  return cast.length > 0 ? cast.join(', ') : 'Not available';
}

function needsPreviewCredits(movie: Movie) {
  return movie.source === 'tmdb' && (normalizePreviewDirector(movie) === 'Not available' || normalizePreviewCast(movie) === 'Not available');
}

let reviewRoutePreloaded = false;

function preloadReviewRoute() {
  if (reviewRoutePreloaded) return;
  reviewRoutePreloaded = true;
  void import('@/pages/Review');
}

export const MovieCard = memo(function MovieCard({
  movie,
  variant = 'default',
  onClick,
  onSave,
  onToggleWatchlist,
  onToggleLike,
  onWriteReview,
  onViewDetails,
  onGenreClick,
  showRank,
  isInWatchlist = false,
  isLiked = false,
}: MovieCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMovie, setPreviewMovie] = useState(movie);

  useEffect(() => {
    setPreviewMovie(movie);
  }, [movie]);

  useEffect(() => {
    if (variant !== 'compact' || !isPreviewOpen || !needsPreviewCredits(movie)) {
      return;
    }

    let cancelled = false;

    void fetchTmdbMovieByRouteId(movie.id)
      .then((result) => {
        if (!cancelled && result?.movie) {
          setPreviewMovie(result.movie);
        }
      })
      .catch(() => {
        // Leave previewMovie unchanged and fall back to a clean placeholder label.
      });

    return () => {
      cancelled = true;
    };
  }, [isPreviewOpen, movie, variant]);

  const posterUrl = resolvePosterUrl(movie.poster, movie.title) || getPosterFallback(movie.title);
  const displayMovie = variant === 'compact' ? previewMovie : movie;
  const reviewCount = getReviewCount(displayMovie);
  const reviewCountLabel = `${reviewCount.toLocaleString()} reviews`;
  const runtimeLabel = displayMovie.runtime ? `${displayMovie.runtime} min` : 'Runtime pending';
  const previewDirector = normalizePreviewDirector(displayMovie);
  const topCast = normalizePreviewCast(displayMovie);

  if (variant === 'horizontal') {
    return (
      <div
        onClick={onClick}
        className="group flex cursor-pointer gap-4 rounded-xl p-4 transition-all duration-300"
        style={{
          background: 'linear-gradient(145deg, rgba(28, 21, 18, 0.9) 0%, rgba(17, 13, 11, 0.96) 100%)',
          border: '1px solid rgba(244, 182, 132, 0.1)',
        }}
      >
        <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-lg">
          <PosterImage
            src={posterUrl}
            title={movie.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            width={160}
            height={224}
            sizes="160px"
          />
        </div>
        <div className="min-w-0 flex-1 py-1">
          <h3 className="truncate font-bold text-foreground transition-colors group-hover:text-[#f4b684]">
            {movie.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{movie.year} / {movie.director}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-[#f4b684]" />
              {movie.score.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="h-3.5 w-3.5 text-[#f4b684]" />
              {reviewCountLabel}
            </span>
          </div>
          <div className="mt-2">
            <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <HoverCard
        openDelay={180}
        closeDelay={80}
        onOpenChange={(open) => {
          if (open) {
            preloadReviewRoute();
          }
          setIsPreviewOpen(open);
        }}
      >
        <HoverCardTrigger asChild>
          <div
            onClick={onClick}
            className="group relative cursor-pointer"
            onPointerEnter={preloadReviewRoute}
          >
            <div
              className="relative aspect-[2/3] overflow-hidden rounded-[1.45rem] border border-white/10 transition-transform duration-200 will-change-transform group-hover:-translate-y-1"
              style={{
                background: 'linear-gradient(145deg, rgba(28, 21, 18, 0.9) 0%, rgba(17, 13, 11, 0.96) 100%)',
                boxShadow: '0 18px 36px -22px rgba(0, 0, 0, 0.58)',
              }}
            >
              <PosterImage
                src={posterUrl}
                title={movie.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
                width={342}
                height={513}
                sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 768px) 28vw, 44vw"
              />

              <div
                className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        label: isInWatchlist ? 'Saved' : 'Watchlist',
                        icon: Bookmark,
                        onPress: onToggleWatchlist ?? onSave,
                        active: isInWatchlist,
                      },
                      {
                        label: 'Write Review',
                        icon: PenSquare,
                        onPress: onWriteReview,
                        active: false,
                      },
                      {
                        label: 'View Details',
                        icon: Eye,
                        onPress: onViewDetails ?? onClick,
                        active: false,
                      },
                      {
                        label: isLiked ? 'Liked' : 'Like',
                        icon: Heart,
                        onPress: onToggleLike,
                        active: isLiked,
                      },
                    ].map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          action.onPress?.();
                        }}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all ${
                          action.active
                            ? 'border-[#d26d47]/50 bg-[#d26d47]/20 text-[#f7c59e]'
                            : 'border-white/15 bg-black/35 text-white hover:border-white/30 hover:bg-black/50'
                        }`}
                      >
                        <action.icon className={`h-3.5 w-3.5 ${action.active ? 'fill-current' : ''}`} />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />

              {showRank && (
                <div
                  className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #d26d47 0%, #9f472a 100%)',
                    boxShadow: '0 0 20px rgba(210, 109, 71, 0.34)',
                  }}
                >
                  {showRank}
                </div>
              )}
            </div>
            <div className="mt-3 px-1">
              <h3 className="line-clamp-1 text-[1.02rem] font-semibold text-foreground transition-colors group-hover:text-[#f4b684]">
                {movie.title}
              </h3>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {movie.year}{movie.runtime ? ` / ${runtimeLabel}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#d26d47]/25 bg-[#d26d47]/10 px-2.5 py-1 font-bold text-[#f4b684]">
                  <Star className="h-3.5 w-3.5" />
                  {movie.score.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#f4b684]/20 bg-[#f4b684]/10 px-2.5 py-1 text-[11px] font-semibold text-[#f9d0b0]">
                  <Users className="h-3.5 w-3.5" />
                  {reviewCountLabel}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {movie.genres.slice(0, 3).map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onGenreClick?.(genre);
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-[#d26d47]/40 hover:text-[#f4b684]"
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          className="w-80 rounded-[1.35rem] border border-white/10 bg-[#110e14]/96 p-5 text-white shadow-2xl backdrop-blur-xl"
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-semibold">{movie.title}</h4>
              <p className="mt-1 text-sm text-white/65">{movie.year} / {runtimeLabel}</p>
            </div>
            <p className="line-clamp-4 text-sm leading-6 text-white/75">{displayMovie.synopsis}</p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Director</p>
                <p className="mt-1 text-white/88">{previewDirector}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Top Cast</p>
                <p className="mt-1 text-white/88">{topCast}</p>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  if (variant === 'hero') {
    return (
      <div
        onClick={onClick}
        className="relative group cursor-pointer"
      >
        <div
          className="relative aspect-[2/3] overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(145deg, rgba(28, 21, 18, 0.9) 0%, rgba(17, 13, 11, 0.96) 100%)',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6)',
          }}
        >
          <PosterImage
            src={posterUrl}
            title={movie.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            width={420}
            height={630}
            sizes="(min-width: 1024px) 30vw, 70vw"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <VerdictBadge verdict={movie.verdict} score={movie.score} size="md" />
            <h3 className="mt-3 line-clamp-2 text-xl font-bold text-white">{movie.title}</h3>
            <p className="mt-1 text-sm text-white/70">{movie.year} - {movie.genres[0]}</p>

            <div className="mt-4 flex translate-y-4 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #d26d47 0%, #9f472a 100%)',
                  boxShadow: '0 4px 20px rgba(210, 109, 71, 0.32)',
                }}
              >
                <Play className="h-4 w-4" />
                Open
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSave?.();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-105"
                style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)' }}
              >
                <Bookmark className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer"
    >
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/8"
        style={{
          background: 'linear-gradient(145deg, rgba(28, 21, 18, 0.9) 0%, rgba(17, 13, 11, 0.96) 100%)',
          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.4)',
        }}
      >
        <PosterImage
          src={posterUrl}
          title={movie.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          width={342}
          height={513}
          sizes="(min-width: 1024px) 22vw, 45vw"
        />

        <div
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
            <p className="mt-2 line-clamp-2 text-xs text-white/60">{movie.synopsis}</p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave?.();
          }}
          className="absolute right-3 top-3 flex h-9 w-9 -translate-y-2 items-center justify-center rounded-full opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          style={{ background: 'rgba(14, 11, 10, 0.72)', backdropFilter: 'blur(8px)' }}
        >
          <Bookmark className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3">
        <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-[#f4b684]">
          {movie.title}
        </h3>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{movie.year}</span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-[#f4b684]">
            <Star className="h-3.5 w-3.5" />
            {movie.score.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
});
