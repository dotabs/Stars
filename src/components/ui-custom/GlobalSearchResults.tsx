import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Sparkles, Star, Tv, UserRound, Users } from 'lucide-react';
import type { Movie, SearchResult, SearchResultType } from '@/types';
import { fetchTmdbMovieByRouteId } from '@/lib/tmdb-movies';
import { fetchPersonById, fetchTvShowById, getSearchResultHref } from '@/lib/tmdb-search';
import { getPosterFallback } from '@/lib/posters';
import { MovieCard } from './MovieCard';

const currentYear = new Date().getFullYear();

function scoreToVerdict(score: number): Movie['verdict'] {
  if (score >= 8.8) return 'Masterpiece';
  if (score >= 7.8) return 'Essential';
  if (score >= 6.8) return 'Recommended';
  if (score >= 5.5) return 'Mixed';
  return 'Skip';
}

function parseYear(value?: string) {
  const year = Number((value ?? '').slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : currentYear;
}

function buildSearchFallbackMovie(result: SearchResult): Movie {
  const score = result.score ?? 0;
  const year = result.yearLabel && /^\d{4}$/.test(result.yearLabel) ? Number(result.yearLabel) : currentYear;

  return {
    id: result.mediaType === 'movie' ? `tmdb-${result.id}` : `${result.mediaType}-${result.id}`,
    source: result.mediaType === 'movie' ? 'tmdb' : 'local',
    tmdbId: result.mediaType === 'movie' ? result.id : undefined,
    title: result.title,
    year,
    genres:
      result.mediaType === 'person'
        ? [result.knownForDepartment || 'Person', ...(result.knownForTitles ?? []).slice(0, 2)]
        : [result.mediaType === 'tv' ? 'TV Show' : 'Movie'],
    verdict: scoreToVerdict(score),
    score,
    reviewCount: Math.max(48, Math.round((result.popularity ?? 1) * 6)),
    popularity: result.popularity,
    poster: result.imageUrl || getPosterFallback(result.title),
    backdrop: result.imageUrl || '',
    director: result.mediaType === 'tv' ? 'Series details pending' : result.knownForDepartment || 'Not available',
    cast: result.knownForTitles ?? [],
    runtime: 0,
    synopsis: result.overview,
    country: 'Not available',
    language: 'Not available',
    streaming: [],
    decade: Math.floor(year / 10) * 10,
  };
}

function buildTvMovie(details: Awaited<ReturnType<typeof fetchTvShowById>>): Movie {
  const score = details.score ?? 0;
  const year = parseYear(details.firstAirDate ?? details.yearLabel);

  return {
    id: `tv-${details.id}`,
    source: 'local',
    title: details.title,
    year,
    releaseDate: details.firstAirDate,
    genres: details.genres.length ? details.genres : ['TV Show'],
    verdict: scoreToVerdict(score),
    score,
    reviewCount: Math.max(details.episodes, details.seasons * 8, 1),
    popularity: score * 10,
    poster: details.posterUrl || getPosterFallback(details.title),
    backdrop: details.backdropUrl || '',
    director: details.creators.join(', ') || details.networks.join(', ') || 'Not available',
    cast: details.cast,
    runtime: 0,
    synopsis: details.overview,
    country: details.networks[0] || 'Not available',
    language: 'Not available',
    streaming: [],
    decade: Math.floor(year / 10) * 10,
  };
}

function buildPersonMovie(details: Awaited<ReturnType<typeof fetchPersonById>>): Movie {
  const year = parseYear(details.birthday);

  return {
    id: `person-${details.id}`,
    source: 'local',
    title: details.name,
    year,
    genres: [details.knownForDepartment, ...details.knownFor.slice(0, 2).map((credit) => credit.title)].filter(Boolean),
    verdict: 'Recommended',
    score: 0,
    reviewCount: details.knownFor.length,
    popularity: details.knownFor.length,
    poster: details.imageUrl || '',
    backdrop: details.backdropUrl || '',
    director: details.knownForDepartment,
    cast: details.knownFor.slice(0, 3).map((credit) => credit.title),
    runtime: 0,
    synopsis: details.biography,
    country: details.placeOfBirth,
    language: 'Not available',
    streaming: [],
    decade: Math.floor(year / 10) * 10,
  };
}

export function SearchResultCard({
  result,
  onOpen,
  isInWatchlist = false,
  isLiked = false,
  onToggleWatchlist,
  onToggleLike,
}: {
  result: SearchResult;
  onOpen?: (href: string) => void;
  isInWatchlist?: boolean;
  isLiked?: boolean;
  onToggleWatchlist?: () => void;
  onToggleLike?: () => void;
}) {
  const [movie, setMovie] = useState<Movie>(() => buildSearchFallbackMovie(result));
  const [subtitle, setSubtitle] = useState<string>(() => result.subtitle || result.metadataLine);
  const [previewSynopsis, setPreviewSynopsis] = useState<string>(result.overview);
  const [previewSections, setPreviewSections] = useState<Array<{ label: string; value: string }>>(() => {
    if (result.mediaType === 'person') {
      return [
        { label: 'Department', value: result.knownForDepartment || 'Person' },
        { label: 'Known For', value: (result.knownForTitles ?? []).join(', ') || 'Not available' },
      ];
    }

    return [
      { label: result.mediaType === 'tv' ? 'Format' : 'Director', value: result.mediaType === 'tv' ? 'TV Series' : 'Not available' },
      { label: result.mediaType === 'tv' ? 'Overview' : 'Top Cast', value: result.mediaType === 'tv' ? result.metadataLine : 'Not available' },
    ];
  });

  useEffect(() => {
    let cancelled = false;

    setMovie(buildSearchFallbackMovie(result));
    setSubtitle(result.subtitle || result.metadataLine);
    setPreviewSynopsis(result.overview);

    if (result.mediaType === 'movie') {
      void fetchTmdbMovieByRouteId(`tmdb-${result.id}`)
        .then((response) => {
          if (!cancelled && response?.movie) {
            setMovie(response.movie);
            setSubtitle(`${response.movie.year}${response.movie.runtime ? ` / ${response.movie.runtime} min` : ''}`);
            setPreviewSynopsis(response.movie.synopsis);
            setPreviewSections([
              { label: 'Director', value: response.movie.director || 'Not available' },
              { label: 'Top Cast', value: response.movie.cast.slice(0, 3).join(', ') || 'Not available' },
            ]);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPreviewSections([
              { label: 'Director', value: 'Not available' },
              { label: 'Top Cast', value: 'Not available' },
            ]);
          }
        });
    }

    if (result.mediaType === 'tv') {
      void fetchTvShowById(result.id)
        .then((details) => {
          if (!cancelled) {
            setMovie(buildTvMovie(details));
            setSubtitle(`${details.yearLabel} / ${details.seasons} season${details.seasons === 1 ? '' : 's'}`);
            setPreviewSynopsis(details.overview);
            setPreviewSections([
              { label: 'Creators', value: details.creators.join(', ') || 'Not available' },
              { label: 'Top Cast', value: details.cast.slice(0, 3).join(', ') || 'Not available' },
            ]);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPreviewSections([
              { label: 'Creators', value: 'Not available' },
              { label: 'Top Cast', value: 'Not available' },
            ]);
          }
        });
    }

    if (result.mediaType === 'person') {
      void fetchPersonById(result.id)
        .then((details) => {
          if (!cancelled) {
            setMovie(buildPersonMovie(details));
            setSubtitle(details.birthday ? `${details.birthday} / ${details.knownForDepartment}` : details.knownForDepartment);
            setPreviewSynopsis(details.biography);
            setPreviewSections([
              { label: 'Department', value: details.knownForDepartment },
              { label: 'Place of Birth', value: details.placeOfBirth || 'Not available' },
            ]);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPreviewSections([
              { label: 'Department', value: result.knownForDepartment || 'Person' },
              { label: 'Known For', value: (result.knownForTitles ?? []).join(', ') || 'Not available' },
            ]);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [result]);

  const display = useMemo(() => {
    if (result.mediaType === 'movie') {
      return {
        subtitle,
        previewSubtitle: subtitle || `${movie.year}`,
        previewSynopsis,
        previewSections,
      };
    }

    if (result.mediaType === 'tv') {
      return {
        subtitle,
        badges: [
          { label: movie.score > 0 ? movie.score.toFixed(1) : 'TV', icon: Star, tone: 'primary' as const },
          { label: `${Math.max(movie.reviewCount ?? 0, 1)} eps`, icon: Tv, tone: 'secondary' as const },
        ],
        tags: movie.genres.slice(0, 3),
        previewSubtitle: subtitle,
        previewSynopsis,
        previewSections,
      };
    }

    return {
      posterUrl: movie.poster,
      subtitle,
      badges: [
        { label: 'Person', icon: UserRound, tone: 'primary' as const },
        { label: `${Math.max(movie.reviewCount ?? 0, 0)} credits`, icon: Users, tone: 'secondary' as const },
      ],
      tags: movie.genres.slice(0, 3),
      previewSubtitle: subtitle,
      previewSynopsis,
      previewSections,
      fallbackIcon: UserRound,
    };
  }, [movie, previewSections, previewSynopsis, result.mediaType, subtitle]);

  const href = getSearchResultHref(result);

  return (
    <MovieCard
      movie={movie}
      variant="compact"
      onClick={() => onOpen?.(href)}
      onToggleWatchlist={result.mediaType === 'movie' ? onToggleWatchlist : undefined}
      onToggleLike={result.mediaType === 'movie' ? onToggleLike : undefined}
      isInWatchlist={result.mediaType === 'movie' ? isInWatchlist : false}
      isLiked={result.mediaType === 'movie' ? isLiked : false}
      display={display}
    />
  );
}

export function SearchTypeIcon({ mediaType, className }: { mediaType: SearchResultType; className?: string }) {
  if (mediaType === 'movie') return <Clapperboard className={className} />;
  if (mediaType === 'tv') return <Tv className={className} />;
  return <UserRound className={className} />;
}

export function SearchResultCardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="aspect-[2/3] rounded-[1.45rem] border border-white/10 bg-white/10" />
      <div className="h-5 w-3/4 rounded bg-white/10" />
      <div className="h-4 w-1/2 rounded bg-white/10" />
      <div className="flex gap-2">
        <div className="h-7 w-16 rounded-full bg-white/10" />
        <div className="h-7 w-24 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

export function SearchResultEmptyCard() {
  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[1.7rem] border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
      <Sparkles className="h-8 w-8 text-[#f4b684]" />
      <h2 className="mt-4 text-2xl font-semibold text-white">No matches found</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">Try a broader title, series, or person search.</p>
    </div>
  );
}

export function SearchResultSectionIcon() {
  return <Clapperboard className="h-4 w-4 text-[#f4b684]" />;
}
