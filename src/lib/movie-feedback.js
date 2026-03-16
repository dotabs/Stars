import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ensureUserProfile, syncUserReviewStat } from '@/lib/social';
import { getUserDisplayName } from '@/lib/user-display';

const COLLECTION_NAME = 'movieFeedback';
const AUTH_REQUIRED_ERROR = 'movie-feedback/auth-required';

function getMovieFeedbackCollectionRef(movieId) {
  return collection(db, COLLECTION_NAME, movieId, 'entries');
}

function getMovieFeedbackDocRef(movieId, userId) {
  return doc(db, COLLECTION_NAME, movieId, 'entries', userId);
}

function buildAuthRequiredError() {
  const error = new Error('Sign in to rate or review this movie.');
  error.code = AUTH_REQUIRED_ERROR;
  return error;
}

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

function normalizeEntry(snapshot) {
  const data = snapshot.data() ?? {};
  const rating = Number(data.rating);

  return {
    id: snapshot.id,
    userId: data.userId || snapshot.id,
    movieId: data.movieId || '',
    userDisplayName: data.userDisplayName?.trim() || 'Signed in',
    userUsername: data.userUsername?.trim() || '',
    userAvatarUrl: data.userAvatarUrl?.trim() || '',
    userPublicProfileId: data.userPublicProfileId?.trim() || '',
    rating: Number.isFinite(rating) && rating > 0 ? Math.max(1, Math.min(10, rating)) : null,
    reviewText: data.reviewText?.trim() || '',
    spoilerText: data.spoilerText?.trim() || '',
    containsSpoilers: Boolean(data.spoilerText?.trim()),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function buildRatingBreakdown(entries) {
  return Array.from({ length: 10 }, (_, index) => {
    const rating = 10 - index;
    const count = entries.filter((entry) => entry.rating === rating).length;

    return {
      rating,
      count,
    };
  });
}

function summarizeEntries(entries) {
  const normalizedEntries = [...entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const ratingEntries = normalizedEntries.filter((entry) => entry.rating !== null);
  const reviewEntries = normalizedEntries.filter((entry) => entry.reviewText);
  const spoilerEntries = normalizedEntries.filter((entry) => entry.spoilerText);
  const totalRatings = ratingEntries.length;
  const averageRating = totalRatings
    ? Number((ratingEntries.reduce((sum, entry) => sum + entry.rating, 0) / totalRatings).toFixed(1))
    : null;

  return {
    entries: normalizedEntries,
    ratings: ratingEntries,
    reviews: reviewEntries,
    spoilers: spoilerEntries,
    totalRatings,
    totalReviews: reviewEntries.length,
    averageRating,
    ratingBreakdown: buildRatingBreakdown(ratingEntries),
  };
}

export function subscribeToMovieFeedback(movieId, callback) {
  if (!movieId) {
    callback(summarizeEntries([]));
    return () => {};
  }

  const feedbackQuery = query(getMovieFeedbackCollectionRef(movieId), orderBy('updatedAt', 'desc'));

  return onSnapshot(
    feedbackQuery,
    (snapshot) => {
      callback(summarizeEntries(snapshot.docs.map(normalizeEntry)));
    },
    (error) => {
      console.error('Failed to subscribe to movie feedback', error);
      callback(summarizeEntries([]));
    }
  );
}

export async function saveMovieFeedback({ movieId, user, rating, reviewText, spoilerText }) {
  if (!user?.uid) {
    throw buildAuthRequiredError();
  }

  const normalizedReviewText = reviewText?.trim() || '';
  const normalizedSpoilerText = spoilerText?.trim() || '';
  const normalizedRating = Number(rating);
  const hasRating = Number.isFinite(normalizedRating) && normalizedRating >= 1 && normalizedRating <= 10;

  if (!hasRating && !normalizedReviewText && !normalizedSpoilerText) {
    await deleteDoc(getMovieFeedbackDocRef(movieId, user.uid)).catch((error) => {
      if (error?.code !== 'not-found') {
        throw error;
      }
    });
    await syncUserReviewStat(user.uid, movieId, false);
    return;
  }

  const now = new Date().toISOString();
  const userProfile = await ensureUserProfile(user);

  await setDoc(
    getMovieFeedbackDocRef(movieId, user.uid),
    {
      movieId,
      userId: user.uid,
      userDisplayName: userProfile?.username || getUserDisplayName(user),
      userUsername: userProfile?.username || '',
      userAvatarUrl: userProfile?.avatarUrl || '',
      userPublicProfileId: userProfile?.publicProfileId || '',
      rating: hasRating ? Math.round(normalizedRating) : null,
      reviewText: normalizedReviewText,
      spoilerText: normalizedSpoilerText,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );
  await syncUserReviewStat(user.uid, movieId, true);
}

export function isMovieFeedbackAuthError(error) {
  return error?.code === AUTH_REQUIRED_ERROR;
}
