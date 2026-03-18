import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { movies as localMovies } from '@/data/movies';
import { db } from '@/lib/firebase';
import { fetchTvShowById } from '@/lib/tmdb-search';
import { fetchMoviesByRouteIds } from '@/lib/tmdb-movies';
import { readUserLibrarySnapshot } from '@/lib/user-library';

const MOVIE_FEEDBACK_COLLECTION = 'movieFeedback';
const USER_PROFILES_COLLECTION = 'userProfiles';

function toIsoString(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  return '';
}

function clampString(value, maxLength = 280) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeReviewEntry(snapshot, movie) {
  const data = snapshot.data() ?? {};
  const rating = Number(data.rating);

  return {
    id: snapshot.id,
    movieId: data.movieId || '',
    userId: data.userId || '',
    userDisplayName: clampString(data.userDisplayName, 80) || 'Signed in',
    userUsername: clampString(data.userUsername, 40),
    userAvatarUrl: clampString(data.userAvatarUrl, 1000),
    userPublicProfileId: clampString(data.userPublicProfileId, 80),
    rating: Number.isFinite(rating) && rating >= 1 && rating <= 10 ? Math.round(rating) : null,
    reviewText: clampString(data.reviewText, 2000),
    spoilerText: clampString(data.spoilerText, 2000),
    updatedAt: toIsoString(data.updatedAt),
    createdAt: toIsoString(data.createdAt),
    movie: movie ?? null,
  };
}

function mapMovieById(movies) {
  return new Map(movies.map((movie) => [movie.id, movie]));
}

async function hydrateMovies(routeIds) {
  const uniqueRouteIds = [...new Set(routeIds.filter(Boolean))];

  if (!uniqueRouteIds.length) {
    return new Map();
  }

  const localMatches = localMovies.filter((movie) => uniqueRouteIds.includes(movie.id));
  const remoteIds = uniqueRouteIds.filter((movieId) => movieId.startsWith('tmdb-'));
  const tvIds = uniqueRouteIds
    .filter((movieId) => movieId.startsWith('tv-'))
    .map((movieId) => Number(movieId.replace('tv-', '')))
    .filter((movieId) => Number.isFinite(movieId));
  const remoteMatches = remoteIds.length ? await fetchMoviesByRouteIds(remoteIds) : [];
  const tvMatches = tvIds.length
    ? await Promise.all(tvIds.map((id) => fetchTvShowById(id).catch(() => null)))
    : [];

  return mapMovieById([
    ...localMatches,
    ...remoteMatches,
    ...tvMatches
      .filter(Boolean)
      .map((show) => ({
        id: `tv-${show.id}`,
        title: show.title,
        year: show.firstAirYear,
        poster: show.posterUrl,
        posterUrl: show.posterUrl,
        firstAirYear: show.firstAirYear,
      })),
  ]);
}

function mapLibraryItems(routeIds, library, movieMap, limitCount) {
  return routeIds
    .slice(0, limitCount)
    .map((movieId) => {
      const movie = movieMap.get(movieId);
      const entry = library.itemsById[movieId];

      if (!movie || !entry) {
        return null;
      }

      return {
        movieId,
        movie,
        entry,
      };
    })
    .filter(Boolean);
}

export async function loadProfileLibrarySections(userId, options = {}) {
  const {
    watchlistLimit = 6,
    favoritesLimit = 6,
    watchedLimit = 6,
  } = options;
  const library = await readUserLibrarySnapshot(userId);
  const movieMap = await hydrateMovies([
    ...library.watchlist.slice(0, watchlistLimit),
    ...library.favorites.slice(0, favoritesLimit),
    ...library.watched.slice(0, watchedLimit),
  ]);

  return {
    library,
    watchlistItems: mapLibraryItems(library.watchlist, library, movieMap, watchlistLimit),
    favoriteItems: mapLibraryItems(library.favorites, library, movieMap, favoritesLimit),
    watchedItems: mapLibraryItems(library.watched, library, movieMap, watchedLimit),
  };
}

export async function loadProfileReviewEntries(userId, limitCount = 6) {
  if (!userId) {
    return [];
  }

  const reviewRefsQuery = query(
    collection(db, USER_PROFILES_COLLECTION, userId, 'reviews'),
    orderBy('updatedAt', 'desc'),
    limit(limitCount)
  );
  const reviewRefsSnapshot = await getDocs(reviewRefsQuery);
  const reviewRefs = reviewRefsSnapshot.docs.map((snapshot) => {
    const data = snapshot.data() ?? {};
    return {
      movieId: data.reviewId || snapshot.id,
      updatedAt: toIsoString(data.updatedAt),
    };
  }).filter((entry) => entry.movieId);

  if (!reviewRefs.length) {
    return [];
  }

  const movieMap = await hydrateMovies(reviewRefs.map((entry) => entry.movieId));
  const reviewSnapshots = await Promise.all(
    reviewRefs.map((entry) => getDoc(doc(db, MOVIE_FEEDBACK_COLLECTION, entry.movieId, 'entries', userId)))
  );

  return reviewSnapshots
    .map((snapshot) => {
      if (!snapshot.exists()) {
        return null;
      }

      return normalizeReviewEntry(snapshot, movieMap.get(snapshot.data()?.movieId || snapshot.id) ?? null);
    })
    .filter(Boolean)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
