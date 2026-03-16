import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  getAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { appEnv } from '@/lib/env';

const firebaseConfig = {
  apiKey: appEnv.firebaseApiKey,
  authDomain: appEnv.firebaseAuthDomain,
  projectId: appEnv.firebaseProjectId,
  storageBucket: appEnv.firebaseStorageBucket,
  messagingSenderId: appEnv.firebaseMessagingSenderId,
  appId: appEnv.firebaseAppId,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

const persistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to enable Firebase auth persistence.', error);
});

export async function signUpWithEmail({ name, email, password }) {
  await persistenceReady;
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (name.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() });
  }

  return credential.user;
}

export async function logInWithEmail({ email, password }) {
  await persistenceReady;
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export function logOut() {
  return signOut(auth);
}

export function subscribeToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'That email is already in use. Try logging in instead.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Wait a bit and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/weak-password': 'Password must be at least 6 characters.',
};

export function getAuthErrorMessage(error) {
  if (!error?.code) {
    return 'Something went wrong. Please try again.';
  }

  return AUTH_ERROR_MESSAGES[error.code] || 'Something went wrong. Please try again.';
}
