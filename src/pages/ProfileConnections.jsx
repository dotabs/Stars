import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { canViewerAccessPrivacyLevel, getFollowState, getProfilePath, listRelationships } from '@/lib/social';

function ProfileAvatar({ entry }) {
  const [hasImageError, setHasImageError] = useState(false);

  if (entry.avatarUrl && !hasImageError) {
    return <img src={entry.avatarUrl} alt={entry.username} className="h-12 w-12 rounded-full object-cover" onError={() => setHasImageError(true)} />;
  }

  return <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d26d47,#9f472a)] text-sm font-bold text-white">{(entry.username || 'U').slice(0, 2).toUpperCase()}</div>;
}

export function ProfileConnections() {
  const { userId: profileIdentifier, kind } = useParams();
  const { currentUser } = useAuth();
  const { profile, isLoading: isProfileLoading, resolvedUserId, error } = useUserProfile(profileIdentifier, {
    currentUser,
    autoCreateForCurrentUser: Boolean(currentUser?.uid && profileIdentifier && currentUser.uid === profileIdentifier),
  });
  const [followState, setFollowState] = useState({ isFollowing: false });
  const [state, setState] = useState({ items: [], cursor: null, hasMore: false, isLoading: true, error: '' });
  const isOwner = Boolean(currentUser?.uid && resolvedUserId === currentUser.uid);

  // Followers can unlock this view for private profiles, so follow state has to load before the list does.
  useEffect(() => {
    let cancelled = false;

    if (!currentUser?.uid || !resolvedUserId || isOwner) {
      queueMicrotask(() => {
        if (!cancelled) {
          setFollowState({ isFollowing: false });
        }
      });
      return () => {
        cancelled = true;
      };
    }

    void getFollowState({ viewerId: currentUser.uid, profileUserId: resolvedUserId })
      .then((nextState) => {
        if (!cancelled) {
          setFollowState({ isFollowing: nextState.isFollowing });
        }
      })
      .catch((nextError) => {
        console.error('Failed to load follow state', nextError);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, isOwner, resolvedUserId]);

  const canViewConnections = useMemo(
    () => canViewerAccessPrivacyLevel(profile?.privacy.profileVisibility || 'public', {
      isOwner,
      isFollower: followState.isFollowing,
    }),
    [followState.isFollowing, isOwner, profile?.privacy.profileVisibility]
  );

  // Reset to an empty, non-loading state when the route is invalid or privacy blocks access.
  useEffect(() => {
    let cancelled = false;

    if (!resolvedUserId || !kind || !['followers', 'following'].includes(kind) || !canViewConnections) {
      queueMicrotask(() => {
        if (!cancelled) {
          setState((current) => ({ ...current, items: [], cursor: null, hasMore: false, isLoading: false, error: '' }));
        }
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setState({ items: [], cursor: null, hasMore: false, isLoading: true, error: '' });
      }
    });

    void listRelationships(resolvedUserId, kind)
      .then((response) => {
        if (!cancelled) {
          setState({ ...response, isLoading: false, error: '' });
        }
      })
      .catch((nextError) => {
        console.error(`Failed to load ${kind}`, nextError);
        if (!cancelled) {
          setState({ items: [], cursor: null, hasMore: false, isLoading: false, error: 'This connection list could not be loaded right now.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canViewConnections, kind, resolvedUserId]);

  async function loadMore() {
    if (!resolvedUserId) {
      return;
    }

    const response = await listRelationships(resolvedUserId, kind, state.cursor);
    setState((current) => ({
      items: [...current.items, ...response.items],
      cursor: response.cursor,
      hasMore: response.hasMore,
      isLoading: false,
      error: '',
    }));
  }

  if (!['followers', 'following'].includes(kind || '')) {
    return <Navigate to={profile ? getProfilePath(profile) : '/profile'} replace />;
  }

  return (
    <div className="min-h-screen bg-background pt-20 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
          <p className="section-kicker">{kind}</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">{kind === 'followers' ? 'Followers' : 'Following'}</h1>
          {profile ? <p className="mt-3 text-sm text-white/55">{profile.username}</p> : null}
          {isProfileLoading ? (
            <p className="mt-6 text-sm text-white/55">Loading profile...</p>
          ) : !profile ? (
            <p className="mt-6 text-sm text-white/55">{error || 'This profile could not be found.'}</p>
          ) : !canViewConnections ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/65">
              This profile only shares connections with approved followers.
            </div>
          ) : state.isLoading ? (
            <p className="mt-6 text-sm text-white/55">Loading {kind}...</p>
          ) : state.error ? (
            <p className="mt-6 text-sm text-red-200">{state.error}</p>
          ) : state.items.length === 0 ? (
            <p className="mt-6 text-sm text-white/55">No profiles to show yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {state.items.map((entry) => (
                <Link key={entry.userId} to={getProfilePath(entry)} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition-all hover:border-[#d26d47]/35 hover:bg-white/[0.04]">
                  <ProfileAvatar entry={entry} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{entry.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {canViewConnections && state.hasMore ? <button type="button" onClick={() => void loadMore()} className="btn-outline mt-6 rounded-full px-5 py-2.5 text-sm">Load more</button> : null}
        </section>
      </div>
    </div>
  );
}
