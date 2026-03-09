import { useState } from 'react';
import type { Movie } from '@/types';
import { VerdictBadge } from './VerdictBadge';
import { Bookmark, Play } from 'lucide-react';
import { getPosterFallback, resolvePosterUrl } from '@/lib/posters';

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

  // Resolve likely-broken external poster URLs and always provide a fallback.
  const posterUrl = imageError
    ? getPosterFallback(movie.title)
    : resolvePosterUrl(movie.poster, movie.title);

  if (variant === 'horizontal') {
    return (
      <div 
        onClick={onClick}
        className="flex gap-4 p-4 rounded-xl cursor-pointer group transition-all duration-300"
        style={{ 
          background: 'linear-gradient(135deg, rgba(20, 20, 28, 0.8) 0%, rgba(15, 15, 22, 0.9) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div className="relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden">
          <img 
            src={posterUrl} 
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        </div>
        <div className="flex-1 min-w-0 py-1">
          <h3 className="font-bold text-foreground truncate group-hover:text-red-400 transition-colors">{movie.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{movie.year} • {movie.director}</p>
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
        className="relative group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, rgba(20, 20, 28, 0.8) 0%, rgba(15, 15, 22, 0.9) 100%)',
            boxShadow: isHovered ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)' : '0 10px 30px -10px rgba(0, 0, 0, 0.4)'
          }}>
          <img 
            src={posterUrl} 
            alt={movie.title}
            className="w-full h-full object-cover transition-all duration-500"
            style={{ transform: isHovered ? 'scale(1.08)' : 'scale(1)' }}
            onError={() => setImageError(true)}
          />
          
          {/* Hover Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
            </div>
          </div>

          {/* Save Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); onSave?.(); }}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
          >
            <Bookmark className="w-4 h-4" />
          </button>

          {/* Rank Badge */}
          {showRank && (
            <div className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ 
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)'
              }}>
              {showRank}
            </div>
          )}
        </div>
        <div className="mt-3">
          <h3 className="font-semibold text-foreground truncate group-hover:text-red-400 transition-colors">{movie.title}</h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">{movie.year}</span>
            <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{movie.score.toFixed(1)}</span>
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
        <div className="relative aspect-[2/3] rounded-2xl overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, rgba(20, 20, 28, 0.8) 0%, rgba(15, 15, 22, 0.9) 100%)',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6)'
          }}>
          <img 
            src={posterUrl} 
            alt={movie.title}
            className="w-full h-full object-cover transition-all duration-700"
            style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
            onError={() => setImageError(true)}
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <VerdictBadge verdict={movie.verdict} score={movie.score} size="md" />
            <h3 className="font-bold text-xl text-white mt-3 line-clamp-2">{movie.title}</h3>
            <p className="text-sm text-white/70 mt-1">{movie.year} • {movie.genres[0]}</p>
            
            {/* Action Buttons */}
            <div className={`flex gap-2 mt-4 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <button className="flex-1 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-105"
                style={{ 
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)'
                }}>
                <Play className="w-4 h-4" />
                Trailer
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onSave?.(); }}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
                style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)' }}
              >
                <Bookmark className="w-4 h-4" />
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
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, rgba(20, 20, 28, 0.8) 0%, rgba(15, 15, 22, 0.9) 100%)',
          boxShadow: isHovered ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)' : '0 10px 30px -10px rgba(0, 0, 0, 0.4)'
        }}>
        <img 
          src={posterUrl} 
          alt={movie.title}
          className="w-full h-full object-cover transition-all duration-500"
          style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
          onError={() => setImageError(true)}
        />
        
        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
            <p className="text-xs text-white/60 mt-2 line-clamp-2">{movie.synopsis}</p>
          </div>
        </div>

        {/* Save Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onSave?.(); }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
        >
          <Bookmark className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-3">
        <h3 className="font-semibold text-foreground truncate group-hover:text-red-400 transition-colors">{movie.title}</h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-muted-foreground">{movie.year}</span>
          <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{movie.score.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
