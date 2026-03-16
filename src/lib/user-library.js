import {
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLLECTION_NAME = 'userLibraries';
const LIBRARY_UPDATED_EVENT = 'stars:library-updated';
const AUTH_REQUIRED_ERROR = 'library/auth-required';

const emptyLibraryState = Object.freeze({
  itemsById: {},
  watchlist: [],
  watched: [],
  favorites: [],
});

let cachedLibraryState = emptyLibraryState;

function encodeMovieKey(movieId) {
  return encodeURIComponent(movieId);
}

function sortByDateDescending(entries) {
  return [...entries].sort((left, right) => right[1].localeCompare(left[1]));
}

function normalizeLibraryState(data) {
  const rawItems = data?.items ?? {};
  const itemsById = {};

  Object.values(rawItems).forEach((entry) => {
    if (!entry?.movieId) {
      return;
    }

    itemsById[entry.movieId] = {
      movieId: entry.movieId,
      addedAt: entry.addedAt ?? '',
      updatedAt: entry.updatedAt ?? '',
      inWatchlist: Boolean(entry.inWatchlist),
      isFavorite: Boolean(entry.isFavorite),
      isWatched: Boolean(entry.isWatched),
      watchlistAddedAt: entry.watchlistAddedAt ?? '',
      favoriteAddedAt: entry.favoriteAddedAt ?? '',
      watchedAt: entry.watchedAt ?? '',
    };
  });

  const watchlist = sortByDateDescending(
    Object.values(itemsById)
      .filter((entry) => entry.inWatchlist)
      .map((entry) => [entry.movieId, entry.watchlistAddedAt || entry.addedAt || ''])
  ).map(([movieId]) => movieId);

  const watched = sortByDateDescending(
    Object.values(itemsById)
      .filter((entry) => entry.isWatched)
      .map((entry) => [entry.movieId, entry.watchedAt || entry.updatedAt || entry.addedAt || ''])
  ).map(([movieId]) => movieId);

  const favorites = sortByDateDescending(
    Object.values(itemsById)
      .filter((entry) => entry.isFavorite)
      .map((entry) => [entry.movieId, entry.favoriteAddedAt || entry.updatedAt || entry.addedAt || ''])
  ).map(([movieId]) => movieId);

  return {
    itemsById,
    watchlist,
    watched,
    favorites,
  };
}

function setCachedLibraryState(nextState) {
  cachedLibraryState = nextState;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LIBRARY_UPDATED_EVENT, { detail: nextState }));
  }
}

function getUserLibraryRef(userId) {
  return doc(db, COLLECTION_NAME, userId);
}

function buildAuthRequiredError() {
  const error = new Error('Sign in to manage your library.');
  error.code = AUTH_REQUIRED_ERROR;
  return error;
}

function createDefaultLibraryItem(movieId, now) {
  return {
    movieId,
    addedAt: now,
    updatedAt: now,
    inWatchlist: false,
    isFavorite: false,
    isWatched: false,
    watchlistAddedAt: '',
    favoriteAddedAt: '',
    watchedAt: '',
  };
}

function getFieldConfig(listName) {
  if (listName === 'watchlist') {
    return { flag: 'inWatchlist', timestamp: 'watchlistAddedAt' };
  }

  if (listName === 'favorites') {
    return { flag: 'isFavorite', timestamp: 'favoriteAddedAt' };
  }

  if (listName === 'watched') {
    return { flag: 'isWatched', timestamp: 'watchedAt' };
  }

  throw new Error(`Unsupported library list "${listName}"`);
}

async function readLibraryState(userId) {
  const snapshot = await getDoc(getUserLibraryRef(userId));
  return normalizeLibraryState(snapshot.data());
}

async function writeLibraryItem(userId, movieId, nextItem) {
  const key = encodeMovieKey(movieId);

  await setDoc(
    getUserLibraryRef(userId),
    {
      items: {
        [key]: nextItem,
      },
    },
    { merge: true }
  );
}

export function getEmptyUserLibrary() {
  return emptyLibraryState;
}

export function getUserLibrary() {
  return cachedLibraryState;
}

export function subscribeToUserLibrary(userId, callback) {
  if (!userId) {
    const nextState = getEmptyUserLibrary();
    setCachedLibraryState(nextState);
    callback(nextState);
    return () => {};
  }

  return onSnapshot(
    getUserLibraryRef(userId),
    (snapshot) => {
      const nextState = normalizeLibraryState(snapshot.data());
      setCachedLibraryState(nextState);
      callback(nextState);
    },
    (error) => {
      console.error('Failed to subscribe to user library', error);
      const nextState = getEmptyUserLibrary();
      setCachedLibraryState(nextState);
      callback(nextState);
    }
  );
}

export async function setLibraryItemState({ userId, listName, movieId, enabled }) {
  if (!userId) {
    throw buildAuthRequiredError();
  }

  const now = new Date().toISOString();
  const currentLibrary = await readLibraryState(userId);
  const fieldConfig = getFieldConfig(listName);
  const currentItem = currentLibrary.itemsById[movieId] ?? createDefaultLibraryItem(movieId, now);
  const nextItem = {
    ...currentItem,
    updatedAt: now,
    [fieldConfig.flag]: enabled,
    [fieldConfig.timestamp]: enabled ? currentItem[fieldConfig.timestamp] || now : '',
  };
  const hasAnyState = nextItem.inWatchlist || nextItem.isFavorite || nextItem.isWatched;

  if (!hasAnyState) {
    try {
      await updateDoc(getUserLibraryRef(userId), {
        [`items.${encodeMovieKey(movieId)}`]: deleteField(),
      });
    } catch (error) {
      if (error?.code !== 'not-found') {
        throw error;
      }
    }

    return;
  }

  await writeLibraryItem(userId, movieId, nextItem);
}

export async function toggleLibraryItem({ userId, listName, movieId }) {
  if (!userId) {
    throw buildAuthRequiredError();
  }

  const currentLibrary = await readLibraryState(userId);
  const fieldConfig = getFieldConfig(listName);
  const currentValue = Boolean(currentLibrary.itemsById[movieId]?.[fieldConfig.flag]);

  await setLibraryItemState({
    userId,
    listName,
    movieId,
    enabled: !currentValue,
  });

  return !currentValue;
}

export async function removeLibraryItem({ userId, movieId }) {
  await setLibraryItemState({
    userId,
    listName: 'watchlist',
    movieId,
    enabled: false,
  });
}

export function isLibraryAuthError(error) {
  return error?.code === AUTH_REQUIRED_ERROR;
}

export function getLibraryUpdatedEventName() {
  return LIBRARY_UPDATED_EVENT;
}
