// Auth provider: exposes the signed-in Firebase user to the rest of the app.
// Why it exists: pages should consume one shared auth state instead of each one subscribing separately.
// Connection: when Firebase auth changes, we also ensure the matching social profile exists in Firestore.
import { useEffect, useState } from 'react';
import { AuthContext } from '@/components/auth/auth-context';
import { getAuthUserSnapshot, logOut, refreshCurrentAuthUser, subscribeToAuthState } from '@/lib/firebase';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      if (user) {
        void import('@/lib/social')
          .then(({ ensureUserProfile }) => ensureUserProfile(user))
          .catch((error) => {
            console.error('Failed to ensure user profile', error);
          });
      }
      setCurrentUser(getAuthUserSnapshot(user));
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authReady,
        currentUser,
        isAuthenticated: Boolean(currentUser),
        logOut,
        async refreshCurrentUser() {
          const nextUser = await refreshCurrentAuthUser();
          setCurrentUser(nextUser);
          return nextUser;
        },
        updateCurrentUser(nextUser) {
          setCurrentUser(nextUser ? { ...nextUser } : null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
