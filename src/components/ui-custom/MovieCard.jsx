import { memo } from 'react';
import { Bookmark, MessageSquareText, Play, Star } from 'lucide-react';
import { getPosterFallback, resolvePosterUrl } from '@/lib/posters';
import { PosterImage } from './PosterImage';
import { VerdictBadge } from './VerdictBadge';
function getReviewCount(movie) {
    if (movie.reviewCount && movie.reviewCount > 0)
        return movie.reviewCount;
    return Math.max(48, Math.round(movie.score * 420 + Math.max(0, new Date().getFullYear() - movie.year) * 12));
}
export const MovieCard = memo(function MovieCard({ movie, variant = 'default', onClick, onPlay, onSave, onToggleWatchlist, showRank, isInWatchlist = false, display, }) {
    const titleText = display?.title ?? movie.title;
    const rawPosterSource = display?.posterUrl ?? movie.poster;
    const resolvedPosterUrl = resolvePosterUrl(rawPosterSource, titleText);
    const shouldUseIconFallback = Boolean(display?.fallbackIcon) && !rawPosterSource && !resolvedPosterUrl;
    const posterUrl = shouldUseIconFallback ? '' : resolvedPosterUrl || getPosterFallback(titleText);
    const displayMovie = movie;
    const reviewCount = getReviewCount(displayMovie);
    const reviewCountLabel = `${reviewCount.toLocaleString()} reviews`;
    const FallbackIcon = display?.fallbackIcon;
    const saveAction = onToggleWatchlist ?? onSave;
    if (variant === 'horizontal') {
        return (<div onClick={onClick} className="group flex cursor-pointer gap-4 rounded-xl p-4 transition-all duration-300" style={{
                background: 'linear-gradient(145deg, rgba(28, 21, 18, 0.9) 0%, rgba(17, 13, 11, 0.96) 100%)',
                border: '1px solid rgba(244, 182, 132, 0.1)',
            }}>
        <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-lg">
          <PosterImage src={posterUrl} title={titleText} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" width={160} height={224} sizes="160px"/>
        </div>
        <div className="min-w-0 flex-1 py-1">
          <h3 className="truncate font-bold text-foreground transition-colors group-hover:text-[#f4b684]">{titleText}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{movie.year} / {movie.director}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-[#f4b684]"/>
              {movie.score.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="h-3.5 w-3.5 text-[#f4b684]"/>
              {reviewCountLabel}
            </span>
          </div>
          <div className="mt-2">
            <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm"/>
          </div>
        </div>
      </div>);
    }
    if (variant === 'compact') {
        const posterLoading = showRank && showRank <= 2 ? 'eager' : 'lazy';
        const posterFetchPriority = showRank && showRank <= 2 ? 'high' : 'auto';
        return (<div onClick={onClick} className="group relative cursor-pointer [content-visibility:auto] [contain-intrinsic-size:360px_660px]">
            <div className="relative aspect-[2/3] overflow-hidden rounded-[1.35rem] border border-white/10 transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.035] group-hover:border-white/24 group-hover:shadow-[0_28px_54px_rgba(0,0,0,0.42)] motion-reduce:transform-none" style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.3))',
            }}>
              <PosterImage src={posterUrl} title={titleText} className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.03] motion-reduce:transform-none" loading={posterLoading} fetchPriority={posterFetchPriority} width={342} height={513} sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 768px) 28vw, 44vw"/>
              {shouldUseIconFallback && FallbackIcon && (<div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(145deg,rgba(28,21,18,0.96),rgba(17,13,11,0.99))]">
                  <FallbackIcon className="h-10 w-10 text-white/38"/>
                </div>)}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/28 to-transparent opacity-90"/>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_40%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"/>
              {showRank && (<div className="absolute left-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full border border-white/12 bg-black/55 px-1.5 text-[10px] font-semibold text-white/85">
                  {showRank}
                </div>)}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-white/86">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#d26d47]/30 bg-[#d26d47]/15 px-2.5 py-1 text-[#f4b684]">
                    <Star className="h-3.5 w-3.5 fill-current"/>
                    {movie.score.toFixed(1)}
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1">{movie.year}</span>
                </div>
                <h3 className="line-clamp-2 font-semibold text-white transition-colors group-hover:text-[#f4b684]">
                  {titleText}
                </h3>
                <p className="mt-1 line-clamp-1 text-xs text-white/58">{movie.genres.slice(0, 2).join(' / ')}</p>
                <div className="mt-3 opacity-100 transition-all duration-300 md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={(event) => {
                        event.stopPropagation();
                        onPlay?.();
                    }} className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-white px-2.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-black shadow-[0_18px_40px_rgba(255,255,255,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/94 sm:min-h-12 sm:gap-2 sm:px-3 sm:py-3 sm:text-[12px] sm:tracking-[0.16em]">
                      <Play className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5"/>
                      Watch Trailer
                    </button>
                    {saveAction && (<button type="button" onClick={(event) => {
                            event.stopPropagation();
                            saveAction();
                        }} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 sm:min-h-12 sm:gap-2 sm:px-3 sm:py-3 sm:text-[12px] sm:tracking-[0.16em] ${isInWatchlist
                            ? 'border-[#d26d47]/45 bg-[#d26d47]/16 text-[#f4c3a4] shadow-[0_14px_34px_rgba(210,109,71,0.12)]'
                            : 'border-white/12 bg-black/26 text-white hover:border-white/20 hover:bg-black/38'}`}>
                        <Bookmark className="h-3 w-3 sm:h-3.5 sm:w-3.5"/>
                        {isInWatchlist ? 'Saved' : 'My List'}
                      </button>)}
                  </div>
                </div>
              </div>
            </div>
          </div>);
    }
    if (variant === 'hero') {
        return (<div onClick={onClick} className="relative group cursor-pointer">
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl" style={{
                background: 'linear-gradient(145deg, rgba(28, 21, 18, 0.9) 0%, rgba(17, 13, 11, 0.96) 100%)',
                boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6)',
            }}>
          <PosterImage src={posterUrl} title={titleText} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transform-none" loading="eager" fetchPriority="high" width={420} height={630} sizes="(min-width: 1024px) 30vw, 70vw"/>

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"/>

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <VerdictBadge verdict={movie.verdict} score={movie.score} size="md"/>
            <h3 className="mt-3 line-clamp-2 text-xl font-bold text-white">{titleText}</h3>
            <p className="mt-1 text-sm text-white/70">{movie.year} - {movie.genres[0]}</p>

            <div className="mt-4 flex translate-y-4 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <button onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }} className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all hover:scale-105" style={{
                background: 'linear-gradient(135deg, #d26d47 0%, #9f472a 100%)',
                boxShadow: '0 4px 20px rgba(210, 109, 71, 0.32)',
            }}>
                <Play className="h-4 w-4"/>
                Open
              </button>
              <button onClick={(e) => {
                e.stopPropagation();
                onSave?.();
            }} className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-105" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)' }}>
                <Bookmark className="h-4 w-4"/>
              </button>
            </div>
          </div>
        </div>
      </div>);
    }
    return (<div onClick={onClick} className="relative group cursor-pointer">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/8" style={{
            background: 'linear-gradient(145deg, rgba(28, 21, 18, 0.9) 0%, rgba(17, 13, 11, 0.96) 100%)',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.4)',
        }}>
        <PosterImage src={posterUrl} title={titleText} className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transform-none" width={342} height={513} sizes="(min-width: 1024px) 22vw, 45vw"/>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm"/>
            <p className="mt-2 line-clamp-2 text-xs text-white/60">{movie.synopsis}</p>
          </div>
        </div>

        <button onClick={(e) => {
            e.stopPropagation();
            onSave?.();
        }} className="absolute right-3 top-3 flex h-9 w-9 -translate-y-2 items-center justify-center rounded-full opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" style={{ background: 'rgba(14, 11, 10, 0.72)', backdropFilter: 'blur(8px)' }}>
          <Bookmark className="h-4 w-4"/>
        </button>
      </div>
      <div className="mt-3">
        <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-[#f4b684]">{titleText}</h3>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{movie.year}</span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-[#f4b684]">
            <Star className="h-3.5 w-3.5"/>
            {movie.score.toFixed(1)}
          </span>
        </div>
      </div>
    </div>);
});
