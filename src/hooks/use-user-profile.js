import { useEffect, useState } from 'react';
import { ensureUserProfile, getUserProfile } from '@/lib/social';

export function useUserProfile(userId, options = {}) {
  const { currentUser = null, autoCreateForCurrentUser = false } = options;
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState({
    requestedUserId: null,
    resolvedUserId: null,
    profile: null,
    isLoading: Boolean(userId),
    error: '',
  });

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setState({
        requestedUserId: null,
        resolvedUserId: null,
        profile: null,
        isLoading: false,
        error: '',
      });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({
      ...current,
      requestedUserId: userId,
      isLoading: true,
      error: '',
    }));

    async function loadProfile() {
      try {
        if (autoCreateForCurrentUser && currentUser?.uid && currentUser.uid === userId) {
          await ensureUserProfile(currentUser);
        }

        const profile = await getUserProfile(userId);
        if (!cancelled) {
          setState({
            requestedUserId: userId,
            resolvedUserId: profile?.userId || null,
            profile,
            isLoading: false,
            error: profile ? '' : 'Profile not found.',
          });
        }
      } catch (error) {
        console.error('Failed to load user profile', error);
        if (!cancelled) {
          setState({
            requestedUserId: userId,
            resolvedUserId: null,
            profile: null,
            isLoading: false,
            error: 'Failed to load profile.',
          });
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [autoCreateForCurrentUser, currentUser, reloadToken, userId]);

  return {
    ...state,
    reload() {
      setReloadToken((current) => current + 1);
    },
  };
}
