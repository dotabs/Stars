import { useEffect, useState } from 'react';
import { AuthContext } from '@/components/auth/auth-context';
import { logOut, subscribeToAuthState } from '@/lib/firebase';
import { ensureUserProfile } from '@/lib/social';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      if (user) {
        void ensureUserProfile(user).catch((error) => {
          console.error('Failed to ensure user profile', error);
        });
      }
      setCurrentUser(user);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
