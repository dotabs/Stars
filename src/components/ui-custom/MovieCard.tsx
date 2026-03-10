import { useState } from 'react';
import { Bookmark, Play } from 'lucide-react';
import type { Movie } from '@/types';
import { getPosterFallback, resolvePosterUrl } from '@/lib/posters';
import { VerdictBadge } from './VerdictBadge';

interface MovieCardProps {
  movie: Movie;
  variant?: 'default' | 'compact' | 'horizontal' | 'hero';
  onClick?: () => void;
  onSave?: () => void;
  showRank?: number;
}

export function MovieCard({ movie, variant = 'default', onClick, onSave, showRank }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const posterUrl = imageError
    ? getPosterFallback(movie.title)
    : resolvePosterUrl(movie.poster, movie.title);

  if (variant === 'horizontal') {
    return (
      <div
        onClick={onClick}
        className="group flex cursor-pointer gap-4 rounded-xl p-4 transition-all duration-300"
        style={{
          background: 'linear-gradient(145deg, rgba(28, 21, 18, 0.9) 0%, rgba(17, 13, 11, 0.96) 100%)',
          border: '1px solid rgba(244, 182, 132, 0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(244, 182, 132, 0.22)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(244, 182, 132, 0.1)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-lg">
          <img
            src={posterUrl}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        </div>
        <div className="min-w-0 flex-1 py-1">
          <h3 className="truncate font-bold text-foreground transition-colors group-hover:text-[#f4b684]">
            {movie.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{movie.year} - {movie.director}</p>
          <div className="mt-2">
            <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className="group relative cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="relative aspect-[2/3] overflow-hidden rounded-[1.45rem] border border-white/10"
          style={{
            background: 'linear-gradient(145deg, rgba(28, 21, 18, 0.9) 0%, rgba(17, 13, 11, 0.96) 100%)',
            boxShadow: isHovered
              ? '0 34px 62px -24px rgba(0, 0, 0, 0.72)'
              : '0 18px 36px -22px rgba(0, 0, 0, 0.58)',
            transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
          }}
        >
          <img
            src={posterUrl}
            alt={movie.title}
            className="h-full w-full object-cover transition-all duration-500"
            style={{ transform: isHovered ? 'scale(1.08)' : 'scale(1)' }}
            onError={() => setImageError(true)}
          />

          <div
            className={`absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />

          {onSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
                isHovered ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
              }`}
              style={{ background: 'rgba(14, 11, 10, 0.72)', backdropFilter: 'blur(8px)' }}
            >
              <Bookmark className="h-4 w-4" />
            </button>
          )}

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
          <h3 className="truncate text-[1.02rem] font-semibold text-foreground transition-colors group-hover:text-[#f4b684]">
            {movie.title}
          </h3>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{movie.year}</span>
            <span className="rounded-full border border-[#d26d47]/25 bg-[#d26d47]/10 px-2.5 py-1 text-xs font-bold text-[#f4b684]">
              {movie.score.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div
        onClick={onClick}
        className="relative group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="relative aspect-[2/3] overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(145deg, rgba(28, 21, 18, 0.9) 0%, rgba(17, 13, 11, 0.96) 100%)',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6)',
          }}
        >
          <img
            src={posterUrl}
            alt={movie.title}
            className="h-full w-full object-cover transition-all duration-700"
            style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
            onError={() => setImageError(true)}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <VerdictBadge verdict={movie.verdict} score={movie.score} size="md" />
            <h3 className="mt-3 line-clamp-2 text-xl font-bold text-white">{movie.title}</h3>
            <p className="mt-1 text-sm text-white/70">{movie.year} - {movie.genres[0]}</p>

            <div
              className={`mt-4 flex gap-2 transition-all duration-300 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
            >
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #d26d47 0%, #9f472a 100%)',
                  boxShadow: '0 4px 20px rgba(210, 109, 71, 0.32)',
                }}
              >
                <Play className="h-4 w-4" />
                Trailer
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/8"
        style={{
          background: 'linear-gradient(145deg, rgba(28, 21, 18, 0.9) 0%, rgba(17, 13, 11, 0.96) 100%)',
          boxShadow: isHovered ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)' : '0 10px 30px -10px rgba(0, 0, 0, 0.4)',
        }}
      >
        <img
          src={posterUrl}
          alt={movie.title}
          className="h-full w-full object-cover transition-all duration-500"
          style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
          onError={() => setImageError(true)}
        />

        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
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
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
            isHovered ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
          }`}
          style={{ background: 'rgba(14, 11, 10, 0.72)', backdropFilter: 'blur(8px)' }}
        >
          <Bookmark className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3">
        <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-[#f4b684]">
          {movie.title}
        </h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{movie.year}</span>
          <span className="text-sm font-bold text-[#f4b684]">{movie.score.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

