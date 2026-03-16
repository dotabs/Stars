import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Camera, Check, Lock, Mail, UserPlus, UserRound, Users, X } from 'lucide-react';
import { useAuth } from '@/components/auth/useAuth';
import { Button } from '@/components/ui/button';
import { FilterChips } from '@/components/ui-custom';
import { browseGenres } from '@/lib/movie-constants';
import {
  canMessageProfile,
  canViewerAccessPrivacyLevel,
  ensureUserProfile,
  getFollowState,
  listFollowRequests,
  requestOrFollowUser,
  respondToFollowRequest,
  syncUserProfileStats,
  unfollowUser,
  updateUserProfile,
  uploadProfileAvatar,
} from '@/lib/social';
import { updateAuthPassword, updateAuthProfileFields } from '@/lib/firebase';
import { useUserLibrary } from '@/hooks/use-user-library';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';

function ProfileAvatar({ profile, className = 'h-24 w-24 text-3xl' }) {
  if (profile?.avatarUrl) {
    return <img src={profile.avatarUrl} alt={profile.username} className={`${className} rounded-full object-cover`} />;
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
  if (Number.isNaN(parsed.getTime())) {
    return 'Recently joined';
  }
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Profile() {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const { currentUser, logOut } = useAuth();
  const { toast } = useToast();
  const { library } = useUserLibrary();
  const targetUserId = routeUserId || currentUser?.uid || '';
  const {
    profile,
    isLoading,
    error: profileError,
    resolvedUserId,
    reload: reloadProfile,
  } = useUserProfile(targetUserId, {
    currentUser,
    autoCreateForCurrentUser: Boolean(currentUser?.uid && targetUserId && currentUser.uid === targetUserId),
  });
  const isOwner = Boolean(currentUser?.uid && resolvedUserId === currentUser.uid);
  const [followState, setFollowState] = useState({ isFollowing: false, hasPendingRequest: false });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const [requestState, setRequestState] = useState({ items: [], isLoading: false });
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
    avatarFile: null,
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
      avatarFile: null,
    }));
  }, [profile]);

  useEffect(() => {
    if (!currentUser?.uid || !profile?.userId || currentUser.uid === profile.userId) {
      setFollowState({ isFollowing: false, hasPendingRequest: false });
      return;
    }

    void getFollowState({ viewerId: currentUser.uid, profileUserId: profile.userId })
      .then((nextState) => setFollowState(nextState))
      .catch((error) => {
        console.error('Failed to load follow state', error);
      });
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

  const visibleStats = isOwner && profile
    ? {
        ...profile.stats,
        watchedCount: library.watched.length,
        watchlistCount: library.watchlist.length,
        favoritesCount: library.favorites.length,
      }
    : profile?.stats;

  async function handleSaveProfile() {
    if (!currentUser?.uid) {
      return;
    }

    if (!editForm.username.trim()) {
      setSaveState({ type: 'error', message: 'Username is required.' });
      toast({
        title: 'Profile save failed',
        description: 'Enter a username before saving.',
        variant: 'destructive',
      });
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

    setSaveState({ type: '', message: '' });
    setIsSavingProfile(true);
    try {
      const existingProfile = await ensureUserProfile(currentUser);
      let avatarUrl = existingProfile?.avatarUrl || '';

      if (editForm.avatarFile) {
        avatarUrl = await uploadProfileAvatar(currentUser.uid, editForm.avatarFile);
      }

      const nextProfile = await updateUserProfile(currentUser.uid, {
        username: editForm.username,
        bio: editForm.bio,
        avatarUrl,
        favoriteGenres: editForm.favoriteGenres,
        privacy: {
          profileVisibility: editForm.profileVisibility,
          whoCanMessage: editForm.whoCanMessage,
          reviewsVisibility: editForm.reviewsVisibility,
          listsVisibility: editForm.listsVisibility,
          activityVisibility: editForm.activityVisibility,
        },
      });

      await updateAuthProfileFields({ displayName: editForm.username, photoURL: avatarUrl });

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
        avatarFile: null,
        currentPassword: '',
        nextPassword: '',
      }));
      setSaveState({ type: 'success', message: 'Profile changes saved successfully.' });
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
    } catch (error) {
      console.error('Failed to respond to follow request', error);
      toast({
        title: 'Request update failed',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center pt-16 text-white"><div className="section-panel w-full max-w-md px-6 py-10 text-center"><p className="section-kicker">Loading</p><h1 className="heading-display mt-3 text-4xl text-white">Opening profile</h1></div></div>;
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
              <ProfileAvatar profile={profile} className="h-24 w-24 text-3xl" />
              <div>
                <p className="section-kicker">Profile</p>
                <h1 className="heading-display mt-2 text-4xl text-white">{profile.username}</h1>
                <p className="mt-2 text-sm text-white/55">Joined {formatJoinedDate(profile.joinedAt)}</p>
                {access.canViewProfile ? (
                  <>
                    {profile.bio ? <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">{profile.bio}</p> : null}
                    {profile.favoriteGenres.length ? <div className="mt-4 flex flex-wrap gap-2">{profile.favoriteGenres.map((genre) => <span key={genre} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/72">{genre}</span>)}</div> : null}
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">This profile is only visible to approved followers.</div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {isOwner ? (
                <>
                  <Link to={`/profile/${profile.userId}/followers`} className="btn-outline rounded-full px-5 py-2.5 text-sm">Followers</Link>
                  <Link to={`/profile/${profile.userId}/following`} className="btn-outline rounded-full px-5 py-2.5 text-sm">Following</Link>
                </>
              ) : (
                <>
                  <Button className={`rounded-full px-5 ${followState.isFollowing ? 'btn-outline' : 'btn-primary'}`} onClick={() => void handleFollowAction()} disabled={isUpdatingFollow}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {isUpdatingFollow ? 'Updating...' : followState.isFollowing ? 'Unfollow' : followState.hasPendingRequest ? 'Requested' : 'Follow'}
                  </Button>
                  {access.canMessage ? <Button className="btn-outline rounded-full px-5" onClick={() => navigate(`/messages?user=${profile.userId}`)}><Mail className="mr-2 h-4 w-4" />Message</Button> : null}
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
              { label: 'Followers', value: visibleStats?.followersCount ?? 0, href: `/profile/${profile.userId}/followers` },
              { label: 'Following', value: visibleStats?.followingCount ?? 0, href: `/profile/${profile.userId}/following` },
            ].map((item) => item.href ? <Link key={item.label} to={item.href} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-all hover:border-[#d26d47]/35 hover:bg-white/[0.05]"><p className="text-xs uppercase tracking-[0.24em] text-white/45">{item.label}</p><p className="mt-2 text-2xl font-semibold text-white">{item.value}</p></Link> : <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-[0.24em] text-white/45">{item.label}</p><p className="mt-2 text-2xl font-semibold text-white">{item.value}</p></div>)}
          </div>
        </section>

        {isOwner ? (
          <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_380px]">
            <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="section-kicker">Edit profile</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Account settings</h2>
                </div>
                <label className="inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/72 transition-all hover:border-[#d26d47]/35 hover:text-white">
                  <Camera className="mr-2 h-4 w-4" />
                  Change avatar
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setEditForm((current) => ({ ...current, avatarFile: event.target.files?.[0] ?? null }))} />
                </label>
              </div>

              <div className="mt-6 grid gap-5">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.24em] text-white/50">Username</span>
                  <input value={editForm.username} onChange={(event) => setEditForm((current) => ({ ...current, username: event.target.value }))} className="input-cinematic mt-3 w-full" />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.24em] text-white/50">Bio</span>
                  <textarea value={editForm.bio} onChange={(event) => setEditForm((current) => ({ ...current, bio: event.target.value }))} rows={4} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#d26d47]/45" />
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
                <Button className="btn-outline" onClick={() => void logOut()}>Logout</Button>
              </div>
              {saveState.message ? (
                <p className={`mt-4 text-sm ${saveState.type === 'success' ? 'text-emerald-300' : 'text-red-200'}`}>
                  {saveState.message}
                </p>
              ) : null}
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
                            <Link to={`/profile/${request.userId}`} className="truncate font-medium text-white hover:text-[#f4b684]">{request.username}</Link>
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
                  <Lock className="h-5 w-5 text-[#f4b684]" />
                  <h2 className="text-xl font-semibold text-white">Privacy snapshot</h2>
                </div>
                <div className="mt-4 space-y-3 text-sm text-white/72">
                  <p>Profile: {profile.privacy.profileVisibility.replaceAll('_', ' ')}</p>
                  <p>Messages: {profile.privacy.whoCanMessage.replaceAll('_', ' ')}</p>
                  <p>Reviews: {profile.privacy.reviewsVisibility.replaceAll('_', ' ')}</p>
                  <p>Lists: {profile.privacy.listsVisibility.replaceAll('_', ' ')}</p>
                  <p>Activity: {profile.privacy.activityVisibility.replaceAll('_', ' ')}</p>
                </div>
              </div>
            </aside>
          </section>
        ) : (
          <section className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { label: 'Reviews', allowed: access.canViewReviews },
              { label: 'Lists', allowed: access.canViewLists },
              { label: 'Activity', allowed: access.canViewActivity },
            ].map((item) => (
              <div key={item.label} className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold text-white">{item.label}</h2>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  {item.allowed
                    ? `${profile.username}'s ${item.label.toLowerCase()} will appear here as this social layer grows.`
                    : `${profile.username} only shares ${item.label.toLowerCase()} with approved followers.`}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
