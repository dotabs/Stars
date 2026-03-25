// Profile page: user identity, privacy settings, social graph, and public activity hub.
// Why it exists: this is the main account surface for editing profile data and viewing social content.
// Connection: most data here comes from Firebase profiles, follows, reviews, notifications, and library summaries.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bell, Bookmark, Check, Lock, Mail, Shield, Star, UserPlus, UserRound, Users, X } from 'lucide-react';
import { useAuth } from '@/components/auth/useAuth';
import { Button } from '@/components/ui/button';
import { FilterChips, PosterImage } from '@/components/ui-custom';
import { useUserLibrary } from '@/hooks/use-user-library';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import { browseGenres } from '@/lib/movie-constants';
import { updateAuthPassword, updateAuthProfileFields } from '@/lib/firebase';
import { loadProfileLibrarySections, loadProfileReviewEntries } from '@/lib/profile-data';
import {
  canMessageProfile,
  canViewerAccessPrivacyLevel,
  ensureUserProfile,
  getFollowState,
  getProfilePath,
  listFollowRequests,
  listNotifications,
  requestOrFollowUser,
  respondToFollowRequest,
  syncProfileIdentityReferences,
  syncUserProfileStats,
  unfollowUser,
  updateUserProfile,
} from '@/lib/social';

function ProfileAvatar({ profile, className = 'h-24 w-24 text-3xl' }) {
  const [hasImageError, setHasImageError] = useState(false);

  if (profile?.avatarUrl && !hasImageError) {
    return <img src={profile.avatarUrl} alt={profile.username} className={`${className} rounded-full object-cover`} onError={() => setHasImageError(true)} />;
  }

  return (
    <div className={`flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#d26d47,#9f472a)] font-bold text-white ${className}`}>
      {profile?.username?.slice(0, 2).toUpperCase() || <UserRound className="h-8 w-8" />}
    </div>
  );
}

function formatJoinedDate(value) {
  if (!value) {
    return 'Recently joined';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'Recently joined'
    : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatActivityDate(value) {
  if (!value) {
    return 'Recently';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'Recently'
    : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatPrivacyLabel(value) {
  return typeof value === 'string' && value ? value.replaceAll('_', ' ') : 'Unavailable';
}

function getFavoriteGenreLabels(profile) {
  return Array.isArray(profile?.favoriteGenres) && profile.favoriteGenres.length
    ? profile.favoriteGenres
    : ['No favorite genres set'];
}

// Reusable profile section wrapper keeps account panels visually consistent.
function SectionCard({ title, description, action, children }) {
  return (
    <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-6 text-white/60">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function MediaPreviewRail({ title, items, emptyTitle, emptyDescription, accent = 'default' }) {
  const accentClassName = accent === 'favorite'
    ? 'border-[#d26d47]/18 bg-[#d26d47]/8 text-[#f4b684]'
    : accent === 'activity'
      ? 'border-emerald-500/18 bg-emerald-500/8 text-emerald-200'
      : 'border-white/10 bg-white/[0.04] text-white/72';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${accentClassName}`}>{items.length} shown</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 p-5">
          <p className="text-base text-white">{emptyTitle}</p>
          <p className="mt-2 text-sm leading-6 text-white/60">{emptyDescription}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(({ movie, entry, movieId }) => (
            <Link key={movieId} to={`/review/${movie.id}`} className="group overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(28,21,18,0.9),rgba(15,13,19,0.96))] transition-all hover:-translate-y-1 hover:border-[#d26d47]/35 hover:bg-white/[0.05]">
              <div className="flex gap-4 p-4">
                <div className="h-28 w-20 flex-shrink-0 overflow-hidden rounded-[1rem]">
                  <PosterImage src={movie.poster || movie.posterUrl} title={movie.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                </div>
                <div className="min-w-0">
                  <h4 className="line-clamp-2 text-base font-semibold text-white">{movie.title}</h4>
                  <p className="mt-2 text-sm text-white/55">{movie.year || movie.firstAirYear || 'Year pending'}</p>
                  <p className="mt-2 text-sm text-white/60">{formatActivityDate(entry?.favoriteAddedAt || entry?.watchlistAddedAt || entry?.watchedAt || entry?.updatedAt)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewPreviewList({ reviews, username }) {
  if (!reviews.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 p-5">
        <p className="text-base text-white">No reviews published yet.</p>
        <p className="mt-2 text-sm leading-6 text-white/60">{username} has not posted any profile-visible reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((entry) => (
        <Link key={`${entry.movieId}-${entry.id}`} to={`/review/${entry.movieId}`} className="block rounded-2xl border border-white/[0.08] bg-black/20 p-5 transition-all hover:border-[#d26d47]/35 hover:bg-white/[0.04]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-white">{entry.movie?.title || 'Untitled title'}</span>
            {entry.rating ? <span className="rounded-full border border-[#d26d47]/30 bg-[#d26d47]/12 px-2.5 py-1 text-xs font-semibold text-[#ffd5bf]">{entry.rating}/10</span> : null}
            <span className="text-xs uppercase tracking-[0.2em] text-white/40">{formatActivityDate(entry.updatedAt)}</span>
          </div>
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-white/75">{entry.reviewText || 'Rated without a written review.'}</p>
        </Link>
      ))}
    </div>
  );
}

function PrivacyNote({ lockedLabel }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/65">{lockedLabel}</div>;
}

export function Profile() {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const { currentUser, logOut, refreshCurrentUser, updateCurrentUser } = useAuth();
  const { toast } = useToast();
  const { library } = useUserLibrary();
  const targetUserId = routeUserId || currentUser?.uid || '';
  const { profile, isLoading, error: profileError, resolvedUserId, reload: reloadProfile } = useUserProfile(targetUserId, {
    currentUser,
    autoCreateForCurrentUser: Boolean(currentUser?.uid && targetUserId && currentUser.uid === targetUserId),
  });
  const isOwner = Boolean(currentUser?.uid && resolvedUserId === currentUser.uid);
  const [followState, setFollowState] = useState({ isFollowing: false, hasPendingRequest: false });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const [requestState, setRequestState] = useState({ items: [], isLoading: false });
  const [contentState, setContentState] = useState({
    isLoading: true,
    error: '',
    watchlistItems: [],
    favoriteItems: [],
    watchedItems: [],
    reviewItems: [],
    recentNotifications: [],
  });
  const [saveState, setSaveState] = useState({ type: '', message: '' });
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    favoriteGenres: [],
    profileVisibility: 'public',
    whoCanMessage: 'everyone',
    reviewsVisibility: 'public',
    listsVisibility: 'public',
    activityVisibility: 'public',
    currentPassword: '',
    nextPassword: '',
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    setEditForm((current) => ({
      ...current,
      username: profile.username,
      bio: profile.bio,
      favoriteGenres: profile.favoriteGenres,
      profileVisibility: profile.privacy.profileVisibility,
      whoCanMessage: profile.privacy.whoCanMessage,
      reviewsVisibility: profile.privacy.reviewsVisibility,
      listsVisibility: profile.privacy.listsVisibility,
      activityVisibility: profile.privacy.activityVisibility,
    }));
  }, [profile]);


  useEffect(() => {
    if (!profile?.publicProfileId || !routeUserId || routeUserId === profile.publicProfileId) {
      return;
    }

    navigate(getProfilePath(profile), { replace: true });
  }, [navigate, profile, routeUserId]);

  useEffect(() => {
    let cancelled = false;

    if (!currentUser?.uid || !profile?.userId || currentUser.uid === profile.userId) {
      setFollowState({ isFollowing: false, hasPendingRequest: false });
      return () => {
        cancelled = true;
      };
    }

    void getFollowState({ viewerId: currentUser.uid, profileUserId: profile.userId })
      .then((nextState) => {
        if (!cancelled) {
          setFollowState({ isFollowing: nextState.isFollowing, hasPendingRequest: nextState.hasPendingRequest });
        }
      })
      .catch((error) => {
        console.error('Failed to load follow state', error);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, profile?.userId]);

  useEffect(() => {
    if (!isOwner || !profile) {
      return;
    }

    void syncUserProfileStats(profile.userId, {
      watchedCount: library.watched.length,
      watchlistCount: library.watchlist.length,
      favoritesCount: library.favorites.length,
    }).catch((error) => {
      console.error('Failed to sync profile stats', error);
    });
  }, [isOwner, library.favorites.length, library.watchlist.length, library.watched.length, profile]);

  useEffect(() => {
    if (!isOwner || !currentUser?.uid) {
      setRequestState({ items: [], isLoading: false });
      return;
    }

    let cancelled = false;
    setRequestState({ items: [], isLoading: true });

    void listFollowRequests(currentUser.uid)
      .then((response) => {
        if (!cancelled) {
          setRequestState({ items: response.items, isLoading: false });
        }
      })
      .catch((error) => {
        console.error('Failed to load follow requests', error);
        if (!cancelled) {
          setRequestState({ items: [], isLoading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, isOwner]);

  const access = useMemo(() => ({
    canViewProfile: canViewerAccessPrivacyLevel(profile?.privacy.profileVisibility || 'public', { isOwner, isFollower: followState.isFollowing }),
    canViewReviews: canViewerAccessPrivacyLevel(profile?.privacy.reviewsVisibility || 'public', { isOwner, isFollower: followState.isFollowing }),
    canViewLists: canViewerAccessPrivacyLevel(profile?.privacy.listsVisibility || 'public', { isOwner, isFollower: followState.isFollowing }),
    canViewActivity: canViewerAccessPrivacyLevel(profile?.privacy.activityVisibility || 'public', { isOwner, isFollower: followState.isFollowing }),
    canMessage: profile ? canMessageProfile(profile, { isOwner, isFollower: followState.isFollowing }) : false,
  }), [followState.isFollowing, isOwner, profile]);

  useEffect(() => {
    let cancelled = false;

    if (!profile?.userId) {
      setContentState({
        isLoading: false,
        error: '',
        watchlistItems: [],
        favoriteItems: [],
        watchedItems: [],
        reviewItems: [],
        recentNotifications: [],
      });
      return () => {
        cancelled = true;
      };
    }

    setContentState((current) => ({ ...current, isLoading: true, error: '' }));

    const requests = [
      access.canViewLists || access.canViewActivity || isOwner
        ? loadProfileLibrarySections(profile.userId, { watchlistLimit: 6, favoritesLimit: 6, watchedLimit: 6 })
        : Promise.resolve({ watchlistItems: [], favoriteItems: [], watchedItems: [] }),
      access.canViewReviews || isOwner
        ? loadProfileReviewEntries(profile.userId, 6)
        : Promise.resolve([]),
      isOwner && currentUser?.uid
        ? listNotifications(currentUser.uid, null, 4).then((response) => response.items)
        : Promise.resolve([]),
    ];

    void Promise.all(requests)
      .then(([librarySections, reviewItems, recentNotifications]) => {
        if (!cancelled) {
          setContentState({
            isLoading: false,
            error: '',
            watchlistItems: access.canViewLists || isOwner ? librarySections.watchlistItems : [],
            favoriteItems: access.canViewLists || isOwner ? librarySections.favoriteItems : [],
            watchedItems: access.canViewActivity || isOwner ? librarySections.watchedItems : [],
            reviewItems: access.canViewReviews || isOwner ? reviewItems : [],
            recentNotifications,
          });
        }
      })
      .catch((error) => {
        console.error('Failed to load profile content', error);
        if (!cancelled) {
          setContentState({
            isLoading: false,
            error: 'Some profile details could not be loaded right now.',
            watchlistItems: [],
            favoriteItems: [],
            watchedItems: [],
            reviewItems: [],
            recentNotifications: [],
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    access.canViewActivity,
    access.canViewLists,
    access.canViewReviews,
    currentUser?.uid,
    isOwner,
    library.favorites.length,
    library.watchlist.length,
    library.watched.length,
    profile?.userId,
  ]);

  const visibleStats = isOwner && profile
    ? {
        ...profile.stats,
        watchedCount: library.watched.length,
        watchlistCount: library.watchlist.length,
        favoritesCount: library.favorites.length,
      }
    : profile?.stats;
  const visibleProfile = isOwner && currentUser?.photoURL
    ? { ...profile, avatarUrl: currentUser.photoURL }
    : profile;
  const topReview = contentState.reviewItems[0] ?? null;

  async function handleSaveProfile() {
    if (!currentUser?.uid) {
      return;
    }

    const trimmedUsername = editForm.username.trim();

    if (!trimmedUsername) {
      setSaveState({ type: 'error', message: 'Username is required.' });
      toast({
        title: 'Profile save failed',
        description: 'Enter a username before saving.',
        variant: 'destructive',
      });
      return;
    }

    if (editForm.bio.trim().length > 280) {
      setSaveState({ type: 'error', message: 'Bio must be 280 characters or less.' });
      return;
    }

    if ((editForm.currentPassword && !editForm.nextPassword) || (!editForm.currentPassword && editForm.nextPassword)) {
      setSaveState({ type: 'error', message: 'Enter both your current and new password to change it.' });
      toast({
        title: 'Profile save failed',
        description: 'Password updates need both fields filled in.',
        variant: 'destructive',
      });
      return;
    }

    if (editForm.nextPassword && editForm.nextPassword.length < 6) {
      setSaveState({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }

    setSaveState({ type: '', message: '' });
    setIsSavingProfile(true);

    try {
      const existingProfile = await ensureUserProfile(currentUser);

      const nextProfile = await updateUserProfile(currentUser.uid, {
        username: trimmedUsername,
        bio: editForm.bio,
        avatarUrl: existingProfile?.avatarUrl || currentUser.photoURL || '',
        avatarStoragePath: existingProfile?.avatarStoragePath || '',
        favoriteGenres: editForm.favoriteGenres,
        privacy: {
          profileVisibility: editForm.profileVisibility,
          whoCanMessage: editForm.whoCanMessage,
          reviewsVisibility: editForm.reviewsVisibility,
          listsVisibility: editForm.listsVisibility,
          activityVisibility: editForm.activityVisibility,
        },
      });

      await updateAuthProfileFields({ displayName: nextProfile.username, photoURL: nextProfile.avatarUrl });
      updateCurrentUser({
        ...currentUser,
        displayName: nextProfile.username,
        photoURL: nextProfile.avatarUrl,
      });
      await syncProfileIdentityReferences(currentUser.uid, nextProfile);

      if (editForm.currentPassword && editForm.nextPassword) {
        await updateAuthPassword({
          currentPassword: editForm.currentPassword,
          nextPassword: editForm.nextPassword,
        });
      }

      setEditForm((current) => ({
        ...current,
        username: nextProfile.username,
        bio: nextProfile.bio,
        favoriteGenres: nextProfile.favoriteGenres,
        profileVisibility: nextProfile.privacy.profileVisibility,
        whoCanMessage: nextProfile.privacy.whoCanMessage,
        reviewsVisibility: nextProfile.privacy.reviewsVisibility,
        listsVisibility: nextProfile.privacy.listsVisibility,
        activityVisibility: nextProfile.privacy.activityVisibility,
        currentPassword: '',
        nextPassword: '',
      }));
      setSaveState({ type: 'success', message: 'Profile changes saved successfully.' });
      await refreshCurrentUser();
      reloadProfile();

      toast({
        title: 'Profile saved',
        description: 'Your profile changes are now live.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Failed to save profile', error);
      setSaveState({ type: 'error', message: error?.message || 'Please try again in a moment.' });
      toast({
        title: 'Profile save failed',
        description: error?.message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleFollowAction() {
    if (!currentUser || !profile || isOwner) {
      return;
    }

    setIsUpdatingFollow(true);

    try {
      if (followState.isFollowing || followState.hasPendingRequest) {
        await unfollowUser({ currentUserId: currentUser.uid, targetUserId: profile.userId });
        setFollowState({ isFollowing: false, hasPendingRequest: false });
      } else {
        const response = await requestOrFollowUser({ currentUser, targetUserId: profile.userId });
        setFollowState({
          isFollowing: response.status === 'following',
          hasPendingRequest: response.status === 'requested',
        });
      }

      reloadProfile();
    } catch (error) {
      console.error('Failed to update follow state', error);
      toast({
        title: 'Follow update failed',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingFollow(false);
    }
  }

  async function handleRespondToRequest(requesterUserId, accept) {
    if (!currentUser?.uid) {
      return;
    }

    try {
      await respondToFollowRequest({ currentUser, requesterUserId, accept });
      setRequestState((current) => ({
        ...current,
        items: current.items.filter((entry) => entry.userId !== requesterUserId),
      }));
      reloadProfile();
    } catch (error) {
      console.error('Failed to respond to follow request', error);
      toast({
        title: 'Request update failed',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  }

  async function handleLogout() {
    try {
      await logOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
      toast({
        title: 'Logout failed',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center pt-16 text-white"><div className="section-panel w-full max-w-md px-6 py-10 text-center"><p className="section-kicker">Loading</p><h1 className="heading-display mt-3 text-4xl text-white">Opening profile</h1></div></div>;
  }

  if (!targetUserId && !currentUser?.uid) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16 text-white">
        <div className="section-panel w-full max-w-lg px-6 py-10 text-center">
          <p className="section-kicker">Profile</p>
          <h1 className="heading-display mt-3 text-4xl text-white">Sign in to open your profile</h1>
          <p className="mt-4 text-sm text-white/60">Your profile, watchlist, favorites, reviews, and notifications are stored per Firebase account.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/login" className="btn-primary rounded-full px-5 py-2.5 text-sm">Sign in</Link>
            <Link to="/signup" className="btn-outline rounded-full px-5 py-2.5 text-sm">Create account</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="flex min-h-screen items-center justify-center pt-16 text-white"><div className="section-panel w-full max-w-md px-6 py-10 text-center"><p className="section-kicker">Unavailable</p><h1 className="heading-display mt-3 text-4xl text-white">Profile not found</h1><p className="mt-4 text-sm text-white/60">{profileError || 'This user does not exist.'}</p></div></div>;
  }

  return (
    <div className="min-h-screen bg-background pt-20 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(26,20,17,0.92),rgba(14,11,10,0.98))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row">
              <ProfileAvatar profile={visibleProfile} className="h-24 w-24 text-3xl" />
              <div>
                <p className="section-kicker">{isOwner ? 'Your profile' : 'Public profile'}</p>
                <h1 className="heading-display mt-2 text-4xl text-white">{profile.username}</h1>
                <p className="mt-2 text-sm text-white/55">Joined {formatJoinedDate(profile.joinedAt)}</p>
                {access.canViewProfile ? (
                  <>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">{profile.bio || (isOwner ? 'Add a bio so people know what you watch and review.' : `${profile.username} has not added a bio yet.`)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {getFavoriteGenreLabels(profile).map((genre) => (
                        <span key={genre} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/72">{genre}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">This profile is only visible to approved followers.</div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {isOwner ? (
                <>
                  <Link to={`${getProfilePath(profile)}/followers`} className="btn-outline rounded-full px-5 py-2.5 text-sm">Followers</Link>
                  <Link to={`${getProfilePath(profile)}/following`} className="btn-outline rounded-full px-5 py-2.5 text-sm">Following</Link>
                </>
              ) : (
                <>
                  <Button className={`rounded-full px-5 ${followState.isFollowing ? 'btn-outline' : 'btn-primary'}`} onClick={() => void handleFollowAction()} disabled={isUpdatingFollow}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {isUpdatingFollow ? 'Updating...' : followState.isFollowing ? 'Unfollow' : followState.hasPendingRequest ? 'Requested' : 'Follow'}
                  </Button>
                  {access.canMessage ? <Button className="btn-outline rounded-full px-5" onClick={() => navigate(`/messages?user=${profile.publicProfileId || profile.userId}`)}><Mail className="mr-2 h-4 w-4" />Message</Button> : null}
                </>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              { label: 'Watched', value: visibleStats?.watchedCount ?? 0 },
              { label: 'Watchlist', value: visibleStats?.watchlistCount ?? 0 },
              { label: 'Reviews', value: visibleStats?.reviewsCount ?? 0 },
              { label: 'Favorites', value: visibleStats?.favoritesCount ?? 0 },
              { label: 'Followers', value: visibleStats?.followersCount ?? 0, href: `${getProfilePath(profile)}/followers` },
              { label: 'Following', value: visibleStats?.followingCount ?? 0, href: `${getProfilePath(profile)}/following` },
            ].map((item) => item.href ? <Link key={item.label} to={item.href} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-all hover:border-[#d26d47]/35 hover:bg-white/[0.05]"><p className="text-xs uppercase tracking-[0.24em] text-white/45">{item.label}</p><p className="mt-2 text-2xl font-semibold text-white">{item.value}</p></Link> : <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-[0.24em] text-white/45">{item.label}</p><p className="mt-2 text-2xl font-semibold text-white">{item.value}</p></div>)}
          </div>
        </section>

        {contentState.error ? <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-100">{contentState.error}</div> : null}
        {isOwner ? (
          <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_380px]">
            <div className="space-y-8">
              <SectionCard
                title="Account settings"
                description="Update your public profile, privacy defaults, and password."
              >
                <div className="grid gap-5">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.24em] text-white/50">Username</span>
                    <input value={editForm.username} onChange={(event) => setEditForm((current) => ({ ...current, username: event.target.value }))} className="input-cinematic mt-3 w-full" />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.24em] text-white/50">Bio</span>
                    <textarea value={editForm.bio} onChange={(event) => setEditForm((current) => ({ ...current, bio: event.target.value }))} rows={4} maxLength={280} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#d26d47]/45" />
                    <span className="mt-2 block text-xs text-white/40">{editForm.bio.trim().length}/280</span>
                  </label>
                  <div>
                    <span className="text-xs uppercase tracking-[0.24em] text-white/50">Favorite genres</span>
                    <div className="mt-3">
                      <FilterChips options={browseGenres} selected={editForm.favoriteGenres} onChange={(nextGenres) => setEditForm((current) => ({ ...current, favoriteGenres: nextGenres.slice(0, 6) }))} />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { key: 'profileVisibility', label: 'Profile visibility', options: ['public', 'followers_only', 'private'] },
                      { key: 'whoCanMessage', label: 'Who can message', options: ['everyone', 'followers_only', 'nobody'] },
                      { key: 'reviewsVisibility', label: 'Who can see reviews', options: ['public', 'followers_only', 'private'] },
                      { key: 'listsVisibility', label: 'Who can see lists', options: ['public', 'followers_only', 'private'] },
                      { key: 'activityVisibility', label: 'Who can see activity', options: ['public', 'followers_only', 'private'] },
                    ].map((setting) => (
                      <label key={setting.key} className="block">
                        <span className="text-xs uppercase tracking-[0.24em] text-white/50">{setting.label}</span>
                        <select value={editForm[setting.key]} onChange={(event) => setEditForm((current) => ({ ...current, [setting.key]: event.target.value }))} className="input-cinematic mt-3 w-full py-3 text-sm">
                          {setting.options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.24em] text-white/50">Current password</span>
                      <input type="password" value={editForm.currentPassword} onChange={(event) => setEditForm((current) => ({ ...current, currentPassword: event.target.value }))} className="input-cinematic mt-3 w-full" />
                    </label>
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.24em] text-white/50">New password</span>
                      <input type="password" value={editForm.nextPassword} onChange={(event) => setEditForm((current) => ({ ...current, nextPassword: event.target.value }))} className="input-cinematic mt-3 w-full" />
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button className="btn-primary" onClick={() => void handleSaveProfile()} disabled={isSavingProfile}>
                    {isSavingProfile ? 'Saving...' : 'Save profile'}
                  </Button>
                  <Button className="btn-outline" onClick={() => void handleLogout()}>Logout</Button>
                </div>
                {saveState.message ? <p className={`mt-4 text-sm ${saveState.type === 'success' ? 'text-emerald-300' : 'text-red-200'}`}>{saveState.message}</p> : null}
              </SectionCard>

              <SectionCard title="Profile content" description="These previews reflect the Firebase data visible on your profile right now.">
                {contentState.isLoading ? (
                  <p className="text-sm text-white/55">Loading your profile sections...</p>
                ) : (
                  <div className="space-y-8">
                    <MediaPreviewRail title="Watchlist" items={contentState.watchlistItems} emptyTitle="Your watchlist is empty." emptyDescription="Save titles from Browse, Lists, or Review to surface them here." />
                    <MediaPreviewRail title="Favorites" items={contentState.favoriteItems} emptyTitle="No favorite titles yet." emptyDescription="Favorite your standout movies and series to highlight them on your profile." accent="favorite" />
                    <MediaPreviewRail title="Recent activity" items={contentState.watchedItems} emptyTitle="No recent watched activity." emptyDescription="Mark titles as watched to build a visible activity trail." accent="activity" />
                    <ReviewPreviewList reviews={contentState.reviewItems} username={profile.username} />
                  </div>
                )}
              </SectionCard>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-[#f4b684]" />
                  <h2 className="text-xl font-semibold text-white">Follow requests</h2>
                </div>
                {requestState.isLoading ? (
                  <p className="mt-4 text-sm text-white/55">Loading follow requests...</p>
                ) : requestState.items.length === 0 ? (
                  <p className="mt-4 text-sm text-white/55">No pending follow requests.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {requestState.items.map((request) => (
                      <div key={request.userId} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                        <div className="flex items-center gap-3">
                          <ProfileAvatar profile={request} className="h-10 w-10 text-sm" />
                          <div className="min-w-0 flex-1">
                            <Link to={getProfilePath(request)} className="truncate font-medium text-white hover:text-[#f4b684]">{request.username}</Link>
                            <p className="text-xs text-white/45">Requested {formatJoinedDate(request.createdAt)}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button className="btn-outline rounded-full px-4" onClick={() => void handleRespondToRequest(request.userId, false)}>
                            <X className="mr-2 h-4 w-4" />
                            Decline
                          </Button>
                          <Button className="btn-primary rounded-full px-4" onClick={() => void handleRespondToRequest(request.userId, true)}>
                            <Check className="mr-2 h-4 w-4" />
                            Accept
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-[#f4b684]" />
                  <h2 className="text-xl font-semibold text-white">Recent notifications</h2>
                </div>
                {contentState.isLoading ? (
                  <p className="mt-4 text-sm text-white/55">Loading notifications...</p>
                ) : contentState.recentNotifications.length === 0 ? (
                  <p className="mt-4 text-sm text-white/55">No recent notifications.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {contentState.recentNotifications.map((notification) => (
                      <div key={notification.id} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                        <p className="text-sm text-white">{notification.message || 'New activity on your account.'}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/40">{formatPrivacyLabel(notification.type)}</p>
                      </div>
                    ))}
                  </div>
                )}
                <Link to="/notifications" className="btn-outline mt-5 inline-flex rounded-full px-4 py-2 text-sm">Open notifications</Link>
              </div>

              <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-[#f4b684]" />
                  <h2 className="text-xl font-semibold text-white">Privacy snapshot</h2>
                </div>
                <div className="mt-4 space-y-3 text-sm text-white/72">
                  <p>Profile: {formatPrivacyLabel(profile.privacy?.profileVisibility)}</p>
                  <p>Messages: {formatPrivacyLabel(profile.privacy?.whoCanMessage)}</p>
                  <p>Reviews: {formatPrivacyLabel(profile.privacy?.reviewsVisibility)}</p>
                  <p>Lists: {formatPrivacyLabel(profile.privacy?.listsVisibility)}</p>
                  <p>Activity: {formatPrivacyLabel(profile.privacy?.activityVisibility)}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-[#f4b684]" />
                  <h2 className="text-xl font-semibold text-white">Account state</h2>
                </div>
                <div className="mt-4 space-y-3 text-sm text-white/72">
                  <p>Email: {currentUser?.email || 'Unavailable'}</p>
                  <p>Email verified: {currentUser?.emailVerified ? 'Yes' : 'No'}</p>
                  <p>Profile route: {getProfilePath(profile)}</p>
                  <p>Status: Active</p>
                </div>
              </div>
            </aside>
          </section>
        ) : (
          <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="space-y-6">
              <SectionCard title="Watchlist" description={`Titles ${profile.username} is currently tracking.`}>
                {contentState.isLoading ? (
                  <p className="text-sm text-white/55">Loading watchlist...</p>
                ) : access.canViewLists ? (
                  <MediaPreviewRail title="Watchlist preview" items={contentState.watchlistItems} emptyTitle="No watchlist titles shared yet." emptyDescription={`${profile.username} has not shared any watchlist titles.`} />
                ) : (
                  <PrivacyNote lockedLabel={`${profile.username} only shares watchlist and favorites with approved followers.`} />
                )}
              </SectionCard>

              <SectionCard title="Favorites" description={`Pinned favorites from ${profile.username}.`}>
                {contentState.isLoading ? (
                  <p className="text-sm text-white/55">Loading favorites...</p>
                ) : access.canViewLists ? (
                  <MediaPreviewRail title="Favorites preview" items={contentState.favoriteItems} emptyTitle="No favorites shared yet." emptyDescription={`${profile.username} has not shared any favorite titles.`} accent="favorite" />
                ) : (
                  <PrivacyNote lockedLabel={`${profile.username} keeps favorites private unless you are an approved follower.`} />
                )}
              </SectionCard>
              <SectionCard title="Reviews" description={`Recent review activity from ${profile.username}.`}>
                {contentState.isLoading ? (
                  <p className="text-sm text-white/55">Loading reviews...</p>
                ) : access.canViewReviews ? (
                  <ReviewPreviewList reviews={contentState.reviewItems} username={profile.username} />
                ) : (
                  <PrivacyNote lockedLabel={`${profile.username} only shares reviews with approved followers.`} />
                )}
              </SectionCard>

              <SectionCard title="Recent activity" description="Recently watched titles and visible viewing activity.">
                {contentState.isLoading ? (
                  <p className="text-sm text-white/55">Loading activity...</p>
                ) : access.canViewActivity ? (
                  <MediaPreviewRail title="Recently watched" items={contentState.watchedItems} emptyTitle="No recent activity shared." emptyDescription={`${profile.username} has not shared any recent watched activity.`} accent="activity" />
                ) : (
                  <PrivacyNote lockedLabel={`${profile.username} only shares activity with approved followers.`} />
                )}
              </SectionCard>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center gap-3">
                  <Bookmark className="h-5 w-5 text-[#f4b684]" />
                  <h2 className="text-xl font-semibold text-white">Profile summary</h2>
                </div>
                <div className="mt-4 space-y-3 text-sm text-white/72">
                  <p>Watchlist titles: {visibleStats?.watchlistCount ?? 0}</p>
                  <p>Favorites: {visibleStats?.favoritesCount ?? 0}</p>
                  <p>Reviews: {visibleStats?.reviewsCount ?? 0}</p>
                  <p>Followers: {visibleStats?.followersCount ?? 0}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-[#f4b684]" />
                  <h2 className="text-xl font-semibold text-white">Privacy</h2>
                </div>
                <div className="mt-4 space-y-3 text-sm text-white/72">
                  <p>Profile visibility: {formatPrivacyLabel(profile.privacy?.profileVisibility)}</p>
                  <p>Reviews visibility: {formatPrivacyLabel(profile.privacy?.reviewsVisibility)}</p>
                  <p>Lists visibility: {formatPrivacyLabel(profile.privacy?.listsVisibility)}</p>
                  <p>Activity visibility: {formatPrivacyLabel(profile.privacy?.activityVisibility)}</p>
                </div>
              </div>

              {access.canMessage ? (
                <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-[#f4b684]" />
                    <h2 className="text-xl font-semibold text-white">Reach out</h2>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/60">Messaging is enabled for this profile based on its privacy settings.</p>
                  <Button className="btn-primary mt-5 w-full" onClick={() => navigate(`/messages?user=${profile.publicProfileId || profile.userId}`)}>
                    Message {profile.username}
                  </Button>
                </div>
              ) : null}

              {topReview ? (
                <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-[#f4b684]" />
                    <h2 className="text-xl font-semibold text-white">Top review pick</h2>
                  </div>
                  <Link to={`/review/${topReview.movieId}`} className="mt-4 block rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition-all hover:border-[#d26d47]/35 hover:bg-white/[0.04]">
                    <p className="font-medium text-white">{topReview.movie?.title || 'Untitled title'}</p>
                    <p className="mt-2 line-clamp-4 text-sm leading-6 text-white/70">{topReview.reviewText || 'Rated without a written review.'}</p>
                  </Link>
                </div>
              ) : null}
            </aside>
          </section>
        )}
      </div>
    </div>
  );
}
