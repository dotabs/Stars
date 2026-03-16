import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/useAuth';
import { getEmptyUserLibrary, subscribeToUserLibrary } from '@/lib/user-library';

export function useUserLibrary() {
  const { authReady, currentUser, isAuthenticated } = useAuth();
  const [libraryState, setLibraryState] = useState(() => ({
    userId: null,
    library: getEmptyUserLibrary(),
  }));

  useEffect(() => {
    if (!authReady) {
      return () => {};
    }

    return subscribeToUserLibrary(currentUser?.uid, (nextLibrary) => {
      setLibraryState({
        userId: currentUser?.uid ?? null,
        library: nextLibrary,
      });
    });
  }, [authReady, currentUser?.uid]);

  const isLoading = !authReady || Boolean(currentUser && libraryState.userId !== currentUser.uid);

  return {
    authReady,
    currentUser,
    isAuthenticated,
    isLoading,
    library: libraryState.library,
  };
}
