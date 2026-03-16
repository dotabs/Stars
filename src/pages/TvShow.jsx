import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, Check, Heart, MessageCircleHeart, Play, Share2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmModal, PosterImage } from '@/components/ui-custom';
import { useToast } from '@/hooks/use-toast';
import { useMovieFeedback } from '@/hooks/use-movie-feedback';
import { useUserLibrary } from '@/hooks/use-user-library';
import { openExternalUrl, shareUrl } from '@/lib/browser';
import { isMovieFeedbackAuthError, saveMovieFeedback } from '@/lib/movie-feedback';
import { fetchTvShowById } from '@/lib/tmdb-search';
import { isLibraryAuthError, setLibraryItemState } from '@/lib/user-library';

function hasText(value) {
  return Boolean(typeof value === 'string' && value.trim());
}

function dedupeBy(values, keyFn) {
  return values.filter((value, index, current) => {
    const key = keyFn(value);
    return key && current.findIndex((entry) => keyFn(entry) === key) === index;
  });
}

function formatDate(value) {
  if (!value) {
    return 'Recently';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Recently';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getReviewAvatar(name) {
  const normalized = (name || 'U')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return normalized || 'U';
}

function getReviewProfilePath(entry) {
  return entry?.userId ? `/profile/${entry.userId}` : entry?.userPublicProfileId ? `/profile/${entry.userPublicProfileId}` : '';
}

function getRatingTone(type, hasData, score) {
  if (type === 'personal') {
    return {
      cardClassName: `border-[#d26d47]/38 bg-[linear-gradient(180deg,rgba(210,109,71,0.26),rgba(120,44,28,0.18),rgba(30,14,12,0.92))] shadow-[0_20px_56px_rgba(210,109,71,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_62px_rgba(210,109,71,0.24)] ${!hasData ? 'opacity-92' : ''}`,
      labelClassName: 'text-[#ffd7c8]/78',
      valueClassName: 'text-[#fff1e9]',
      hintClassName: 'text-[#ffd7c8]/72',
      badgeClassName: 'border-[#ef9d7f]/26 bg-[#d26d47]/14 text-[#ffe1d3]',
    };
  }

  if (!Number.isFinite(score)) {
    return {
      cardClassName: 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] shadow-[0_12px_36px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(255,255,255,0.08)]',
      labelClassName: 'text-white/50',
      valueClassName: 'text-white',
      hintClassName: 'text-white/60',
      badgeClassName: 'border-white/12 bg-white/[0.08] text-white/72',
    };
  }

  if (score >= 7) {
    return {
      cardClassName: 'border-[rgba(80,255,140,0.3)] bg-[linear-gradient(180deg,rgba(80,255,140,0.12),rgba(80,255,140,0.04),rgba(10,14,11,0.92))] shadow-[0_16px_44px_rgba(80,255,140,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgba(80,255,140,0.18)]',
      labelClassName: 'text-[#98f5b6]/74',
      valueClassName: 'text-[#4ADE80]',
      hintClassName: 'text-[#b7f7cb]/72',
      badgeClassName: 'border-[rgba(80,255,140,0.22)] bg-[rgba(80,255,140,0.08)] text-[#98f5b6]',
    };
  }

  if (score >= 5) {
    return {
      cardClassName: 'border-[rgba(255,200,80,0.3)] bg-[linear-gradient(180deg,rgba(255,209,102,0.12),rgba(255,209,102,0.04),rgba(17,14,9,0.92))] shadow-[0_16px_44px_rgba(255,200,80,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(255,200,80,0.18)]',
      labelClassName: 'text-[#ffe3a0]/74',
      valueClassName: 'text-[#FFD166]',
      hintClassName: 'text-[#ffe8b7]/72',
      badgeClassName: 'border-[rgba(255,200,80,0.22)] bg-[rgba(255,209,102,0.08)] text-[#ffe3a0]',
    };
  }

  return {
    cardClassName: 'border-[rgba(255,80,80,0.3)] bg-[linear-gradient(180deg,rgba(255,107,107,0.12),rgba(255,107,107,0.04),rgba(18,10,10,0.92))] shadow-[0_16px_44px_rgba(255,80,80,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(255,80,80,0.18)]',
    labelClassName: 'text-[#ffb3b3]/74',
    valueClassName: 'text-[#FF6B6B]',
    hintClassName: 'text-[#ffc2c2]/72',
    badgeClassName: 'border-[rgba(255,80,80,0.22)] bg-[rgba(255,107,107,0.08)] text-[#ffb3b3]',
  };
}

function RatingPill({ label, value, hint, tone = 'tmdb', score, hasData = true }) {
  const styles = getRatingTone(tone, hasData, score);

  return (
    <div className={`rounded-2xl border px-4 py-4 backdrop-blur-sm ${styles.cardClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[11px] uppercase tracking-[0.28em] ${styles.labelClassName}`}>{label}</p>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${styles.badgeClassName}`}>
          {label}
        </span>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className={`text-2xl font-semibold leading-none ${styles.valueClassName}`}>{value}</span>
        {hint ? <span className={`pb-0.5 text-sm ${styles.hintClassName}`}>{hint}</span> : null}
      </div>
    </div>
  );
}

function PersonCard({ person, subtitle, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(person.id)}
      className="group flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.2))] p-3.5 text-left shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-1 hover:border-[#d26d47]/35 hover:bg-white/[0.05] hover:shadow-[0_20px_46px_rgba(210,109,71,0.14)]"
    >
      <div className="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition-all duration-200 group-hover:scale-[1.03] group-hover:border-[#d26d47]/35 group-hover:shadow-[0_16px_34px_rgba(210,109,71,0.16)]">
        {person.profile ? (
          <img src={person.profile} alt={person.name} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#3a241a,#1a1410)] text-lg font-semibold text-white/70">
            {person.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-1 font-medium text-white group-hover:text-[#f4b684]">{person.name}</p>
        {subtitle ? <p className="mt-1 line-clamp-2 text-sm text-white/58">{subtitle}</p> : null}
      </div>
    </button>
  );
}

function ShowRail({ title, shows, onOpen }) {
  if (!shows.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <span className="text-xs uppercase tracking-[0.24em] text-white/45">{shows.length} titles</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shows.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onOpen(entry.id)}
            className="group flex gap-3 rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18))] p-3 text-left shadow-[0_12px_28px_rgba(0,0,0,0.1)] transition-all duration-200 hover:-translate-y-1 hover:border-[#d26d47]/35 hover:bg-white/[0.05] hover:shadow-[0_20px_44px_rgba(210,109,71,0.12)]"
          >
            <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-xl">
              <PosterImage src={entry.poster} title={entry.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            </div>
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-medium text-white">{entry.title}</h3>
              <p className="mt-1 text-sm text-white/55">{entry.year}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function TvShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, library, isAuthenticated } = useUserLibrary();
  const tvId = Number(id);
  const hasValidTvId = Number.isFinite(tvId);
  const [show, setShow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showAllCast, setShowAllCast] = useState(false);
  const [favoritePulse, setFavoritePulse] = useState(false);
  const [helpfulByReviewId, setHelpfulByReviewId] = useState({});
  const [ratingInput, setRatingInput] = useState(0);
  const [reviewInput, setReviewInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const feedbackId = show ? `tv-${show.id}` : '';
  const { feedback, isLoading: isFeedbackLoading } = useMovieFeedback(feedbackId);

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/browse');
  }

  useEffect(() => {
    let cancelled = false;

    if (!hasValidTvId) {
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    setLoadError('');

    fetchTvShowById(tvId)
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

    return () => {
      cancelled = true;
    };
  }, [hasValidTvId, tvId]);

  const userEntry = currentUser ? feedback.entries.find((entry) => entry.userId === currentUser.uid) ?? null : null;
  const hasUserFeedback = Boolean(userEntry?.rating || userEntry?.reviewText || userEntry?.spoilerText);

  useEffect(() => {
    setRatingInput(userEntry?.rating ?? 0);
    setReviewInput(userEntry?.reviewText ?? '');
  }, [feedbackId, userEntry?.rating, userEntry?.reviewText]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (window.history.length > 1) {
          navigate(-1);
          return;
        }

        navigate('/browse');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  if (isLoading && !show) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="section-panel w-full max-w-md px-6 py-10 text-center">
          <p className="section-kicker">Loading</p>
          <h1 className="heading-display mt-3 text-4xl text-white">Opening series details</h1>
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

  const storyText = show.overview || 'Story details are not available yet.';
  const totalRatings = feedback.totalRatings;
  const averageRating = feedback.averageRating;
  const tmdbRating = Number.isFinite(show.score) && show.score > 0 ? show.score : null;
  const reviewEntries = feedback.reviews;
  const watchProviders = dedupeBy(show.watchProviders ?? [], (provider) => `${provider?.id}-${provider?.type}-${provider?.name}`).filter(
    (provider) => hasText(provider?.name) && hasText(provider?.type) && hasText(provider?.url)
  );
  const groupedProviders = ['Stream', 'Rent', 'Buy']
    .map((type) => ({ type, providers: watchProviders.filter((provider) => provider.type === type) }))
    .filter((group) => group.providers.length > 0);
  const castMembers = dedupeBy(show.castMembers ?? [], (member) => member?.name).filter((member) => hasText(member?.name));
  const crewMembers = dedupeBy(show.crewMembers ?? [], (member) => `${member?.name}-${member?.job}`).filter(
    (member) => hasText(member?.name) && hasText(member?.job)
  );
  const displayedCastMembers = showAllCast ? castMembers : castMembers.slice(0, 6);
  const recommendations = dedupeBy(show.recommendations ?? [], (entry) => entry?.id).filter((entry) => entry?.id && hasText(entry?.title));
  const libraryId = `tv-${show.id}`;
  const libraryEntry = library.itemsById[libraryId];
  const isInWatchlist = Boolean(libraryEntry?.inWatchlist);
  const isWatched = Boolean(libraryEntry?.isWatched);
  const isFavorite = Boolean(libraryEntry?.isFavorite);

  async function handleLibraryToggle(listName, enabled, successTitle, successDescription) {
    try {
      await setLibraryItemState({
        userId: currentUser?.uid,
        listName,
        movieId: libraryId,
        enabled,
      });

      toast({
        title: successTitle,
        description: successDescription,
        variant: 'success',
      });
    } catch (error) {
      if (isLibraryAuthError(error)) {
        toast({
          title: 'Sign in required',
          description: 'Sign in to manage your series lists.',
          variant: 'destructive',
        });
        return;
      }

      console.error(`Failed to update ${listName}`, error);
      toast({
        title: 'List update failed',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  }

  async function handleShare() {
    const pageUrl = typeof window === 'undefined' ? '' : window.location.href;
    await shareUrl(pageUrl, show.title, `Open ${show.title} on STARS`);
  }

  async function handleSubmitReview() {
    setIsSubmittingReview(true);

    try {
      await saveMovieFeedback({
        movieId: feedbackId,
        user: currentUser,
        rating: ratingInput,
        reviewText: reviewInput,
        spoilerText: '',
      });

      toast({
        title: 'Review saved',
        description: 'Your rating and review are now live on this series page.',
        variant: 'success',
      });
      setIsEditorOpen(false);
    } catch (error) {
      if (isMovieFeedbackAuthError(error)) {
        toast({
          title: 'Sign in required',
          description: 'Sign in to rate or review this series.',
          variant: 'destructive',
        });
      } else {
        console.error('Failed to save TV feedback', error);
        toast({
          title: 'Review save failed',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmittingReview(false);
    }
  }

  async function handleDeleteReview() {
    if (!hasUserFeedback) {
      return;
    }

    setIsDeletingReview(true);

    try {
      await saveMovieFeedback({
        movieId: feedbackId,
        user: currentUser,
        rating: null,
        reviewText: '',
        spoilerText: '',
      });

      setRatingInput(0);
      setReviewInput('');
      setIsEditorOpen(false);
      setIsDeleteModalOpen(false);
      toast({
        title: 'Review deleted',
        description: 'Your rating and review have been removed from this series page.',
        variant: 'success',
      });
    } catch (error) {
      if (isMovieFeedbackAuthError(error)) {
        toast({
          title: 'Sign in required',
          description: 'Sign in to manage your series review.',
          variant: 'destructive',
        });
      } else {
        console.error('Failed to delete TV feedback', error);
        toast({
          title: 'Delete failed',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsDeletingReview(false);
    }
  }

  function openPerson(personId) {
    if (personId) {
      navigate(`/person/${personId}`);
    }
  }

  function triggerFavoritePulse() {
    setFavoritePulse(true);
    window.setTimeout(() => setFavoritePulse(false), 180);
  }

  function toggleHelpful(reviewId) {
    setHelpfulByReviewId((current) => ({
      ...current,
      [reviewId]: !current[reviewId],
    }));
  }

  return (
    <div className="min-h-screen bg-background pt-16 text-white">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${show.backdropUrl || show.posterUrl})`,
              filter: 'blur(52px) brightness(0.24)',
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(210,109,71,0.24),transparent_32%),linear-gradient(180deg,rgba(8,6,5,0.18),rgba(8,6,5,0.94)_64%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex justify-start">
            <Button
              type="button"
              className="btn-outline sticky top-20 cursor-pointer rounded-full px-5 shadow-[0_14px_34px_rgba(0,0,0,0.2)] hover:shadow-[0_18px_42px_rgba(210,109,71,0.22)]"
              onClick={handleBack}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[320px]">
              <div className="overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                <PosterImage src={show.posterUrl} title={show.title} className="aspect-[2/3] h-full w-full object-cover" />
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <div className="max-w-4xl">
                <p className="text-sm uppercase tracking-[0.28em] text-[#f2b38c]">TV series detail</p>
                <h1 className="heading-display mt-3 text-4xl text-white sm:text-5xl lg:text-6xl">{show.title}</h1>
                <p className="mt-3 text-base text-white/60 sm:text-lg">
                  {show.firstAirYear} • {show.genres.join(' / ') || 'Genre pending'} • {show.episodeRuntime ? `${show.episodeRuntime} min episodes` : 'Runtime pending'}
                </p>
                <p className="mt-2 text-sm text-white/55 sm:text-base">
                  Created by {show.creators.length ? show.creators.join(', ') : 'Unknown creators'}
                </p>
                <p className="mt-5 max-w-3xl text-sm leading-7 text-white/78 sm:text-base">{storyText}</p>
              </div>

              <div className="mt-8 grid gap-3 xl:max-w-4xl">
                <div className="grid gap-3 sm:grid-cols-2">
                  <RatingPill
                    label="TMDB rating"
                    value={tmdbRating !== null ? `${tmdbRating}/10` : 'Not available'}
                    hint={tmdbRating !== null ? 'TMDB score' : 'TMDB missing'}
                    tone="tmdb"
                    score={tmdbRating}
                    hasData={tmdbRating !== null}
                  />
                  <RatingPill
                    label="Community Rating"
                    value={averageRating !== null ? `${averageRating} (${totalRatings.toLocaleString()} ${totalRatings === 1 ? 'rating' : 'ratings'})` : 'No app ratings'}
                    hint="community"
                    tone="community"
                    score={averageRating}
                    hasData={averageRating !== null}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-stretch">
                  <RatingPill
                    label="My rating"
                    value={userEntry?.rating ? `${userEntry.rating}/10` : isAuthenticated ? 'Not rated' : 'Sign in'}
                    hint={userEntry?.rating ? 'your score' : isAuthenticated ? 'add yours' : 'to rate'}
                    tone="personal"
                    hasData={Boolean(userEntry?.rating)}
                  />
                  <Button
                    className={`rounded-full border px-5 transition-all duration-200 ${
                      isInWatchlist
                        ? 'border-yellow-300/40 bg-yellow-200/10 font-semibold text-yellow-50 shadow-[0_10px_28px_rgba(250,204,21,0.16)] hover:border-yellow-200/50 hover:bg-yellow-200/14 hover:shadow-[0_14px_34px_rgba(250,204,21,0.2)]'
                        : 'btn-outline'
                    }`}
                    onClick={() =>
                      void handleLibraryToggle(
                        'watchlist',
                        !isInWatchlist,
                        isInWatchlist ? 'Removed from watchlist' : 'Saved to watchlist',
                        isInWatchlist ? 'This series has been removed from your queue.' : 'This series is now in your queue.'
                      )
                    }
                  >
                    <Bookmark className={`mr-2 h-4 w-4 transition-all duration-200 ${isInWatchlist ? 'fill-yellow-300 text-yellow-300' : ''}`} />
                    {isInWatchlist ? 'In Watchlist' : 'Watchlist'}
                  </Button>
                  <Button
                    className={`rounded-full border px-5 transition-all duration-200 ${
                      userEntry?.rating
                        ? 'border-red-400/45 bg-red-500/14 font-semibold text-white shadow-[0_10px_28px_rgba(239,68,68,0.14)] hover:border-red-300/50 hover:bg-red-500/18 hover:shadow-[0_14px_34px_rgba(239,68,68,0.18)]'
                        : isEditorOpen
                          ? 'border-[#d26d47]/45 bg-[#d26d47]/18 text-white shadow-[0_10px_28px_rgba(210,109,71,0.14)]'
                        : 'btn-outline'
                    }`}
                    onClick={() => setIsEditorOpen((current) => !current)}
                  >
                    <Star className={`mr-2 h-4 w-4 transition-all duration-200 ${userEntry?.rating ? 'fill-red-500 text-red-400' : ''}`} />
                    Rate
                  </Button>
                  {show.trailerUrl ? (
                    <Button className="btn-outline rounded-full px-5" onClick={() => openExternalUrl(show.trailerUrl)}>
                      <Play className="mr-2 h-4 w-4" />
                      Watch Trailer on YouTube
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  className={`rounded-full border px-5 ${isWatched ? 'border-emerald-400/40 bg-emerald-500/15 text-white' : 'btn-outline'}`}
                  onClick={() =>
                    void handleLibraryToggle(
                      'watched',
                      !isWatched,
                      isWatched ? 'Marked unwatched' : 'Marked watched',
                      isWatched ? 'This series has been removed from watched history.' : 'This series is now in your watched history.'
                    )
                  }
                >
                  <Check className="mr-2 h-4 w-4" />
                  {isWatched ? 'Watched' : 'Mark Watched'}
                </Button>
                <Button
                  className={`rounded-full border px-5 transition-all duration-200 ${
                    isFavorite
                      ? 'border-red-400/45 bg-red-500/14 text-white shadow-[0_10px_28px_rgba(239,68,68,0.14)]'
                      : 'btn-outline'
                  } ${favoritePulse ? 'scale-[1.04]' : 'scale-100'}`}
                  onClick={() => {
                    triggerFavoritePulse();
                    void handleLibraryToggle(
                      'favorites',
                      !isFavorite,
                      isFavorite ? 'Removed from favorites' : 'Added to favorites',
                      isFavorite ? 'This series is no longer pinned as a favorite.' : 'This series is now pinned as a favorite.'
                    );
                  }}
                >
                  <Heart className={`mr-2 h-4 w-4 transition-all duration-200 ${isFavorite ? 'fill-red-500 text-red-400' : ''}`} />
                  {isFavorite ? 'Favorite' : 'Add Favorite'}
                </Button>
                <Button className="btn-outline rounded-full px-5" onClick={() => void handleShare()}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-sm text-white/70">
                {castMembers.slice(0, 4).map((member) => (
                  <span key={member.id} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                    {member.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <div className="space-y-8">
            {isEditorOpen ? (
              <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Your review</h2>
                    <p className="mt-2 text-sm leading-6 text-white/62">Save your rating and a public review for this series.</p>
                  </div>
                  {!isAuthenticated ? (
                    <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-amber-100">
                      Sign in required
                    </span>
                  ) : null}
                </div>

                <div className="mt-6">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/50">Your rating</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRatingInput(value)}
                        className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition-all ${
                          ratingInput === value
                            ? 'border-[#d26d47]/60 bg-[#d26d47]/20 text-white'
                            : 'border-white/10 bg-white/[0.03] text-white/72 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid gap-5">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.24em] text-white/50">Public review</span>
                    <textarea
                      value={reviewInput}
                      onChange={(event) => setReviewInput(event.target.value)}
                      rows={5}
                      placeholder="Write your review here."
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#d26d47]/45"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button className="btn-primary" onClick={() => void handleSubmitReview()} disabled={isSubmittingReview || isDeletingReview}>
                    {isSubmittingReview ? 'Saving...' : 'Save Review'}
                  </Button>
                  {hasUserFeedback ? (
                    <Button
                      className="rounded-full border border-red-400/28 bg-red-500/8 px-5 text-red-100 transition-all duration-200 hover:border-red-300/38 hover:bg-red-500/12 hover:text-white hover:shadow-[0_14px_30px_rgba(239,68,68,0.14)]"
                      onClick={() => setIsDeleteModalOpen(true)}
                      disabled={isSubmittingReview || isDeletingReview}
                    >
                      Delete Review
                    </Button>
                  ) : null}
                  <Button className="btn-outline" onClick={() => setIsEditorOpen(false)}>
                    Close
                  </Button>
                </div>
              </section>
            ) : null}

            <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">User reviews</h2>
                <p className="mt-2 text-sm text-white/60">
                  {feedback.totalReviews > 0
                    ? `${feedback.totalReviews} real review${feedback.totalReviews === 1 ? '' : 's'} from STARS users`
                    : 'No reviews yet'}
                </p>
              </div>

              {isFeedbackLoading ? (
                <p className="mt-6 text-sm text-white/55">Loading user feedback...</p>
              ) : reviewEntries.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-white/12 bg-black/20 p-6">
                  <p className="text-base text-white">Be the first to review this series.</p>
                  <p className="mt-2 text-sm leading-6 text-white/60">Real app user reviews appear here as soon as someone posts one.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {reviewEntries.map((entry) => {
                    const profilePath = getReviewProfilePath(entry);
                    return (
                    <article
                      key={entry.id}
                      className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.2))] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.1)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-[0_18px_40px_rgba(210,109,71,0.1)]"
                    >
                      <div className="flex items-start gap-3">
                        {profilePath ? (
                          <Link to={profilePath} className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,#3a241a,#1a1410)] text-sm font-semibold text-white/80 transition-all hover:border-[#d26d47]/35 hover:text-white">
                            {entry.userAvatarUrl ? <img src={entry.userAvatarUrl} alt={entry.userDisplayName} className="h-full w-full object-cover" /> : getReviewAvatar(entry.userDisplayName)}
                          </Link>
                        ) : (
                          <div className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,#3a241a,#1a1410)] text-sm font-semibold text-white/80">
                            {entry.userAvatarUrl ? <img src={entry.userAvatarUrl} alt={entry.userDisplayName} className="h-full w-full object-cover" /> : getReviewAvatar(entry.userDisplayName)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {profilePath ? <Link to={profilePath} className="font-medium text-white transition-colors hover:text-[#f4b684]">{entry.userDisplayName}</Link> : <span className="font-medium text-white">{entry.userDisplayName}</span>}
                            {entry.rating ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[#d26d47]/30 bg-[#d26d47]/12 px-2.5 py-1 text-xs font-semibold text-[#ffd5bf]">
                                <Star className="h-3.5 w-3.5 fill-current" />
                                {entry.rating}/10
                              </span>
                            ) : null}
                            <span className="text-xs uppercase tracking-[0.22em] text-white/38">{formatDate(entry.updatedAt)}</span>
                          </div>
                          <p className="mt-4 text-sm leading-7 text-white/78">{entry.reviewText}</p>
                          <div className="mt-4 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleHelpful(entry.id)}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                                helpfulByReviewId[entry.id]
                                  ? 'border-[#d26d47]/35 bg-[#d26d47]/14 text-[#ffd5bf]'
                                  : 'border-white/10 bg-white/[0.03] text-white/62 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
                              }`}
                            >
                              <MessageCircleHeart className={`h-3.5 w-3.5 ${helpfulByReviewId[entry.id] ? 'fill-current' : ''}`} />
                              Helpful
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-2 rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
              <h2 className="text-2xl font-semibold text-white">Story</h2>
              <p className="mt-4 text-sm leading-7 text-white/78">{storyText}</p>
            </section>

            <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">Series details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/42">First aired</p>
                  <p className="mt-2 text-white">{show.firstAirDate || 'Not available'}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/42">Last aired</p>
                  <p className="mt-2 text-white">{show.lastAirDate || 'Not available'}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/42">Episode runtime</p>
                  <p className="mt-2 text-white">{show.episodeRuntime ? `${show.episodeRuntime} min` : 'Not available'}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/42">Seasons & episodes</p>
                  <p className="mt-2 text-white">
                    {show.seasons} season{show.seasons === 1 ? '' : 's'} • {show.episodes} episode{show.episodes === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-3 grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.25fr_1fr]">
              <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white">Cast</h2>
                  <span className="text-xs uppercase tracking-[0.22em] text-white/38">{castMembers.length} listed</span>
                </div>
                {castMembers.length === 0 ? (
                  <p className="mt-5 text-sm text-white/55">Cast details are not available.</p>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {displayedCastMembers.map((member) => (
                      <PersonCard key={member.id} person={member} subtitle={member.role || 'Cast'} onOpen={openPerson} />
                    ))}
                    {castMembers.length > 6 ? (
                      <Button className="btn-outline justify-center rounded-full" onClick={() => setShowAllCast((current) => !current)}>
                        {showAllCast ? 'Show less' : 'See all cast'}
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white">Creators & crew</h2>
                  <span className="text-xs uppercase tracking-[0.22em] text-white/38">{crewMembers.length} listed</span>
                </div>
                {crewMembers.length === 0 ? (
                  <p className="mt-5 text-sm text-white/55">Creator details are not available.</p>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {crewMembers.map((member) => (
                      <PersonCard key={`${member.id}-${member.job}`} person={member} subtitle={member.job} onOpen={openPerson} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <ShowRail title="You might also like" shows={recommendations} onOpen={(seriesId) => navigate(`/tv/${seriesId}`)} />
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            {groupedProviders.length > 0 ? (
              <section className="rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.2))] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.14)]">
                <h2 className="text-xl font-semibold text-white">Where to watch</h2>
                <p className="mt-2 text-sm leading-6 text-white/58">Choose a provider to open availability details in a new tab.</p>
                <div className="mt-5 space-y-4">
                  {groupedProviders.map((group) => (
                    <div key={group.type}>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/45">{group.type}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.providers.map((provider) => (
                          <button
                            key={`${provider.id}-${provider.type}`}
                            type="button"
                            onClick={() => provider.url && openExternalUrl(provider.url)}
                            title={
                              provider.urlType === 'title'
                                ? `Open ${show.title} on ${provider.name}`
                                : provider.urlType === 'homepage'
                                  ? `Open ${provider.name}`
                                  : 'Open availability details on TMDB'
                            }
                            className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-white/78 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d26d47]/35 hover:bg-white/[0.05] hover:text-white"
                          >
                            {provider.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Rating breakdown</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-white/42">{totalRatings.toLocaleString()} app ratings</span>
              </div>

              {totalRatings === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-white/12 bg-black/20 p-4">
                  <p className="text-sm text-white">No app user ratings yet.</p>
                  <p className="mt-2 text-sm leading-6 text-white/58">
                    {tmdbRating !== null ? `TMDB still reports ${tmdbRating}/10 for this series.` : 'Rate this series to start the breakdown.'}
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {feedback.ratingBreakdown.filter((entry) => entry.count > 0).map((entry) => {
                    const width = totalRatings > 0 ? (entry.count / totalRatings) * 100 : 0;

                    return (
                      <div key={entry.rating}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-white/62">{entry.rating}/10</span>
                          <span className="text-white/88">{entry.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#d26d47,#ff9c6c)]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete review?"
        message="Delete your rating and review? This cannot be undone."
        confirmLabel="Delete review"
        cancelLabel="Cancel"
        isConfirming={isDeletingReview}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={() => void handleDeleteReview()}
      />
    </div>
  );
}
