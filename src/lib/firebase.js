// Firebase gateway: initializes Auth, Firestore, and Storage for all account and social features.
// Why it exists: authentication, profile storage, notifications, messages, and library persistence all depend on it.
// Connection: this file is the main bridge from the React app into Firebase services.
import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reload,
  reauthenticateWithCredential,
  updatePassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  getAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { appEnv, hasFirebaseConfig, hasFirebaseStorageConfig } from '@/lib/env';

// Read Firebase project settings from the normalized env layer so deployment config stays in one place.
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
const normalizedStorageBucket = appEnv.firebaseStorageBucket.replace(/^gs:\/\//, '').trim();
const storageBucketUrl = normalizedStorageBucket ? `gs://${normalizedStorageBucket}` : undefined;
export const storage = storageBucketUrl ? getStorage(firebaseApp, storageBucketUrl) : getStorage(firebaseApp);

export function getFirebaseDiagnostics() {
  return {
    hasFirebaseConfig,
    hasFirebaseStorageConfig,
    projectId: appEnv.firebaseProjectId,
    authDomain: appEnv.firebaseAuthDomain,
    storageBucket: appEnv.firebaseStorageBucket,
  };
}

export function assertFirebaseStorageReady() {
  if (!hasFirebaseConfig) {
    throw new Error('Firebase is not configured. Add the VITE_FIREBASE_* environment variables.');
  }

  if (!hasFirebaseStorageConfig) {
    throw new Error('Firebase Storage is not configured. Set VITE_FIREBASE_STORAGE_BUCKET for this project.');
  }
}

export function getAuthUserSnapshot(user = auth.currentUser) {
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email || '',
    emailVerified: Boolean(user.emailVerified),
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
  };
}

// Keep users signed in between visits because most features are account-driven.
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

export async function updateAuthProfileFields({ displayName, photoURL }) {
  if (!auth.currentUser) {
    throw new Error('No authenticated user is available.');
  }

  await updateProfile(auth.currentUser, {
    displayName: displayName ?? auth.currentUser.displayName ?? '',
    photoURL: photoURL ?? auth.currentUser.photoURL ?? '',
  });

  return getAuthUserSnapshot(auth.currentUser);
}

export async function refreshCurrentAuthUser() {
  if (!auth.currentUser) {
    return null;
  }

  await reload(auth.currentUser);
  return getAuthUserSnapshot(auth.currentUser);
}

export async function updateAuthPassword({ currentPassword, nextPassword }) {
  if (!auth.currentUser?.email) {
    throw new Error('No authenticated user is available.');
  }

  const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
  await updatePassword(auth.currentUser, nextPassword);
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
