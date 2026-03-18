import {
  addDoc,
  collectionGroup,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  uploadBytesResumable,
  ref,
} from 'firebase/storage';
import { assertFirebaseStorageReady, db, getFirebaseDiagnostics, storage } from '@/lib/firebase';
import { getUserDisplayName, getUserInitials } from '@/lib/user-display';

const USER_PROFILES = 'userProfiles';
const USER_PROFILE_HANDLES = 'userProfileHandles';
const DEFAULT_PAGE_SIZE = 20;

export const PROFILE_VISIBILITY_OPTIONS = ['public', 'followers_only', 'private'];
export const MESSAGE_PERMISSION_OPTIONS = ['everyone', 'followers_only', 'nobody'];
export const CONTENT_VISIBILITY_OPTIONS = ['public', 'followers_only', 'private'];

const defaultPrivacy = Object.freeze({
  profileVisibility: 'public',
  whoCanMessage: 'everyone',
  reviewsVisibility: 'public',
  listsVisibility: 'public',
  activityVisibility: 'public',
});

const defaultStats = Object.freeze({
  watchedCount: 0,
  watchlistCount: 0,
  reviewsCount: 0,
  favoritesCount: 0,
  followersCount: 0,
  followingCount: 0,
});

const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,28}[a-zA-Z0-9])?$/;

function nowIso() {
  return new Date().toISOString();
}

function sanitizeText(value, maxLength = 160) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizeGenreList(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((entry) => sanitizeText(entry, 32)).filter(Boolean))].slice(0, 6)
    : [];
}

function profileDocRef(userId) {
  return doc(db, USER_PROFILES, userId);
}

function publicProfileIdDocRef(publicProfileId) {
  return doc(db, USER_PROFILE_HANDLES, publicProfileId);
}

export function getProfilePath(profileOrIdentifier) {
  if (!profileOrIdentifier) {
    return '/profile';
  }

  if (typeof profileOrIdentifier === 'string') {
    return `/profile/${profileOrIdentifier}`;
  }

  const identifier = sanitizeText(profileOrIdentifier.publicProfileId, 80) || sanitizeText(profileOrIdentifier.userId, 128);
  return identifier ? `/profile/${identifier}` : '/profile';
}

function subcollectionRef(userId, subcollectionName) {
  return collection(db, USER_PROFILES, userId, subcollectionName);
}

function activityReviewDocRef(userId, reviewId) {
  return doc(db, USER_PROFILES, userId, 'reviews', reviewId);
}

function conversationDocRef(conversationId) {
  return doc(db, 'conversations', conversationId);
}

function messageCollectionRef(conversationId) {
  return collection(db, 'conversations', conversationId, 'messages');
}

function conversationInboxRef(userId, conversationId) {
  return doc(db, USER_PROFILES, userId, 'conversations', conversationId);
}

function normalizeDate(value) {
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

function slugifyProfileIdentifier(value) {
  const sanitized = sanitizeText(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return sanitized || 'user';
}

function buildPublicProfileId({ userId, username, email }) {
  const baseId = slugifyProfileIdentifier(username || email || 'user');
  const uidSuffix = sanitizeText(userId, 24).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'member';
  return `${baseId}-${uidSuffix}`.slice(0, 48);
}

function buildFallbackProfile({
  userId = '',
  email = '',
  username = '',
  avatarUrl = '',
  avatarStoragePath = '',
  bio = '',
  favoriteGenres = [],
  publicProfileId = '',
  joinedAt = '',
  updatedAt = '',
  privacy = {},
  stats = {},
} = {}) {
  const safeUsername = sanitizeText(username, 40) || sanitizeText(email.split('@')[0], 40) || 'Signed in';

  return {
    id: userId,
    userId,
    email: sanitizeText(email, 200),
    username: safeUsername,
    publicProfileId: sanitizeText(publicProfileId, 80) || buildPublicProfileId({ userId, username: safeUsername, email }),
    avatarUrl: sanitizeText(avatarUrl, 1000),
    avatarStoragePath: sanitizeText(avatarStoragePath, 300),
    bio: sanitizeText(bio, 280),
    favoriteGenres: Array.isArray(favoriteGenres) ? favoriteGenres.filter(Boolean).slice(0, 6) : [],
    joinedAt: normalizeDate(joinedAt),
    updatedAt: normalizeDate(updatedAt),
    initials: getUserInitials({ displayName: safeUsername, email }),
    privacy: {
      profileVisibility: PROFILE_VISIBILITY_OPTIONS.includes(privacy.profileVisibility) ? privacy.profileVisibility : defaultPrivacy.profileVisibility,
      whoCanMessage: MESSAGE_PERMISSION_OPTIONS.includes(privacy.whoCanMessage) ? privacy.whoCanMessage : defaultPrivacy.whoCanMessage,
      reviewsVisibility: CONTENT_VISIBILITY_OPTIONS.includes(privacy.reviewsVisibility) ? privacy.reviewsVisibility : defaultPrivacy.reviewsVisibility,
      listsVisibility: CONTENT_VISIBILITY_OPTIONS.includes(privacy.listsVisibility) ? privacy.listsVisibility : defaultPrivacy.listsVisibility,
      activityVisibility: CONTENT_VISIBILITY_OPTIONS.includes(privacy.activityVisibility) ? privacy.activityVisibility : defaultPrivacy.activityVisibility,
    },
    stats: {
      watchedCount: Number(stats.watchedCount) || 0,
      watchlistCount: Number(stats.watchlistCount) || 0,
      reviewsCount: Number(stats.reviewsCount) || 0,
      favoritesCount: Number(stats.favoritesCount) || 0,
      followersCount: Number(stats.followersCount) || 0,
      followingCount: Number(stats.followingCount) || 0,
    },
  };
}

function normalizeProfile(snapshot) {
  const data = snapshot?.data?.() ?? snapshot ?? {};
  return buildFallbackProfile({
    userId: data.userId || snapshot?.id || '',
    email: data.email || '',
    username: data.username,
    publicProfileId: data.publicProfileId,
    avatarUrl: data.avatarUrl,
    avatarStoragePath: data.avatarStoragePath,
    bio: data.bio,
    favoriteGenres: data.favoriteGenres,
    joinedAt: data.joinedAt,
    updatedAt: data.updatedAt,
    privacy: data.privacy,
    stats: data.stats,
  });
}

function normalizeRelationship(snapshot) {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    userId: data.userId || snapshot.id,
    username: sanitizeText(data.username, 40) || 'Signed in',
    avatarUrl: sanitizeText(data.avatarUrl, 1000),
    publicProfileId: sanitizeText(data.publicProfileId, 80),
    createdAt: normalizeDate(data.createdAt),
  };
}

function normalizeNotification(snapshot) {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    type: data.type || 'system',
    actorId: data.actorId || '',
    actorName: data.actorName || '',
    actorAvatarUrl: data.actorAvatarUrl || '',
    actorPublicProfileId: data.actorPublicProfileId || '',
    targetId: data.targetId || '',
    conversationId: data.conversationId || '',
    message: data.message || '',
    read: Boolean(data.read),
    createdAt: normalizeDate(data.createdAt),
  };
}

function normalizeConversation(snapshot) {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
    counterpartId: data.counterpartId || '',
    counterpartName: data.counterpartName || '',
    counterpartAvatarUrl: data.counterpartAvatarUrl || '',
    lastMessageText: data.lastMessageText || '',
    lastMessageAt: normalizeDate(data.lastMessageAt),
    unreadCount: Number(data.unreadCount) || 0,
  };
}

function normalizeMessage(snapshot) {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    text: data.text || '',
    senderId: data.senderId || '',
    senderName: data.senderName || '',
    createdAt: normalizeDate(data.createdAt),
  };
}

function buildProfilePayload(user, overrides = {}) {
  const username = sanitizeText(overrides.username, 40) || sanitizeText(user?.displayName, 40) || getUserDisplayName(user);
  const email = sanitizeText(overrides.email ?? user?.email, 200);
  const userId = sanitizeText(overrides.userId ?? user?.uid, 128);
  const publicProfileId = sanitizeText(overrides.publicProfileId, 80) || buildPublicProfileId({
    userId,
    username,
    email,
  });

  return {
    userId,
    email,
    username,
    publicProfileId,
    avatarUrl: sanitizeText(overrides.avatarUrl ?? user?.photoURL, 1000),
    avatarStoragePath: sanitizeText(overrides.avatarStoragePath, 300),
    bio: sanitizeText(overrides.bio, 280),
    favoriteGenres: sanitizeGenreList(overrides.favoriteGenres),
    privacy: {
      ...defaultPrivacy,
      ...(overrides.privacy ?? {}),
    },
    stats: {
      ...defaultStats,
      ...(overrides.stats ?? {}),
    },
    joinedAt: overrides.joinedAt || nowIso(),
    updatedAt: nowIso(),
  };
}

async function syncPublicProfileHandle({ userId, username, publicProfileId, previousPublicProfileId = '' }) {
  if (!userId || !publicProfileId) {
    return;
  }

  await setDoc(publicProfileIdDocRef(publicProfileId), {
    userId,
    username: sanitizeText(username, 40),
    publicProfileId,
    updatedAt: nowIso(),
  }, { merge: true });

  if (previousPublicProfileId && previousPublicProfileId !== publicProfileId) {
    await deleteDoc(publicProfileIdDocRef(previousPublicProfileId)).catch(() => {});
  }
}

async function readCount(userId, subcollectionName) {
  const snapshot = await getCountFromServer(query(subcollectionRef(userId, subcollectionName)));
  return snapshot.data().count;
}

async function createNotification(userId, payload) {
  await addDoc(subcollectionRef(userId, 'notifications'), {
    ...payload,
    read: false,
    createdAt: nowIso(),
  });
}

export async function ensureUserProfile(user) {
  if (!user?.uid) {
    return null;
  }

  const profileRef = profileDocRef(user.uid);
  const snapshot = await getDoc(profileRef);
  const existingProfile = snapshot.exists() ? normalizeProfile(snapshot) : null;
  const nextProfile = buildProfilePayload(user, {
    userId: user.uid,
    email: user.email || existingProfile?.email || '',
    username: sanitizeText(user.displayName, 40) || existingProfile?.username || getUserDisplayName(user),
    publicProfileId: existingProfile?.publicProfileId,
    avatarUrl: existingProfile?.avatarUrl || user.photoURL || '',
    avatarStoragePath: existingProfile?.avatarStoragePath || '',
    bio: existingProfile?.bio || '',
    favoriteGenres: existingProfile?.favoriteGenres || [],
    privacy: existingProfile?.privacy || defaultPrivacy,
    stats: existingProfile?.stats || defaultStats,
    joinedAt: existingProfile?.joinedAt || nowIso(),
  });

  await setDoc(profileRef, nextProfile, { merge: true });
  await syncPublicProfileHandle({
    userId: user.uid,
    username: nextProfile.username,
    publicProfileId: nextProfile.publicProfileId,
    previousPublicProfileId: existingProfile?.publicProfileId || '',
  });

  return normalizeProfile({ ...nextProfile, id: user.uid });
}

export async function resolveUserProfileId(userIdentifier) {
  const normalizedIdentifier = sanitizeText(userIdentifier, 128);
  if (!normalizedIdentifier || normalizedIdentifier === 'undefined' || normalizedIdentifier === 'null') {
    return '';
  }

  const directProfileSnapshot = await getDoc(profileDocRef(normalizedIdentifier));
  if (directProfileSnapshot.exists()) {
    return directProfileSnapshot.id;
  }

  const handleSnapshot = await getDoc(publicProfileIdDocRef(normalizedIdentifier));
  if (handleSnapshot.exists()) {
    return sanitizeText(handleSnapshot.data()?.userId, 128);
  }

  return '';
}

export async function getUserProfile(userIdentifier) {
  const resolvedUserId = await resolveUserProfileId(userIdentifier);
  const fallbackPublicProfileId = sanitizeText(userIdentifier, 80);

  if (!resolvedUserId) {
    return null;
  }

  const snapshot = await getDoc(profileDocRef(resolvedUserId));
  if (snapshot.exists()) {
    return normalizeProfile(snapshot);
  }

  const handleSnapshot = await getDoc(publicProfileIdDocRef(fallbackPublicProfileId));
  const handleData = handleSnapshot.exists() ? handleSnapshot.data() ?? {} : {};

  return buildFallbackProfile({
    userId: resolvedUserId,
    username: handleData.username || '',
    publicProfileId: handleData.publicProfileId || fallbackPublicProfileId,
  });
}

export async function updateUserProfile(userId, updates) {
  if (!userId) {
    throw new Error('A valid user id is required.');
  }

  const nextUsername = sanitizeText(updates.username, 40);
  const nextBio = sanitizeText(updates.bio, 280);
  const nextFavoriteGenres = Array.isArray(updates.favoriteGenres) ? sanitizeGenreList(updates.favoriteGenres) : undefined;

  if (!nextUsername) {
    throw new Error('Username is required.');
  }

  if (nextUsername.length < 3 || nextUsername.length > 30) {
    throw new Error('Username must be between 3 and 30 characters.');
  }

  if (!USERNAME_PATTERN.test(nextUsername)) {
    throw new Error('Username can only use letters, numbers, periods, underscores, and hyphens.');
  }

  const snapshot = await getDoc(profileDocRef(userId));
  const existingProfile = snapshot.exists() ? normalizeProfile(snapshot) : buildFallbackProfile({ userId, username: updates.username || '' });
  const nextProfile = buildProfilePayload({ uid: userId, email: existingProfile.email }, {
    userId,
    email: existingProfile.email,
    username: nextUsername || existingProfile.username,
    publicProfileId: existingProfile.publicProfileId,
    avatarUrl: updates.avatarUrl ?? existingProfile.avatarUrl,
    avatarStoragePath: updates.avatarStoragePath ?? existingProfile.avatarStoragePath,
    bio: nextBio,
    favoriteGenres: nextFavoriteGenres ?? existingProfile.favoriteGenres,
    privacy: {
      ...existingProfile.privacy,
      ...(updates.privacy ?? {}),
    },
    stats: existingProfile.stats,
    joinedAt: existingProfile.joinedAt || nowIso(),
  });

  await setDoc(profileDocRef(userId), nextProfile, { merge: true });
  await syncPublicProfileHandle({
    userId,
    username: nextProfile.username,
    publicProfileId: nextProfile.publicProfileId,
    previousPublicProfileId: existingProfile.publicProfileId,
  });

  return nextProfile;
}

function normalizeStorageUploadError(error) {
  if (!error?.code) {
    return error?.message || 'Avatar upload failed before it could complete.';
  }

  const storageMessages = {
    'storage/canceled': 'Avatar upload was canceled.',
    'storage/invalid-checksum': 'Upload verification failed. Try again.',
    'storage/object-not-found': 'The uploaded avatar could not be found after upload.',
    'storage/project-not-found': 'Firebase Storage project configuration is invalid.',
    'storage/quota-exceeded': 'Firebase Storage quota was exceeded.',
    'storage/retry-limit-exceeded': 'The upload timed out before finishing. Try again.',
    'storage/server-file-wrong-size': 'The uploaded file size did not match. Try again.',
    'storage/unauthenticated': 'You must be signed in to upload an avatar.',
    'storage/unauthorized': 'Storage rules blocked this upload. Check Firebase Storage rules for profile-avatars.',
    'storage/unknown': 'Firebase Storage returned an unknown error while uploading your avatar.',
  };

  return storageMessages[error.code] || error.message || 'Avatar upload failed.';
}

export function createProfileAvatarUpload(userId, file, options = {}) {
  const {
    onProgress,
    onStateChange,
    logger = console,
  } = options;

  if (!userId || !file) {
    throw new Error('Select an image before uploading.');
  }

  assertFirebaseStorageReady();

  const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

  if (!acceptedTypes.has(file.type)) {
    throw new Error('Upload a JPG, PNG, WEBP, or GIF image.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Avatar images must be 5 MB or smaller.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80) || 'avatar';
  const avatarStoragePath = `profile-avatars/${userId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, avatarStoragePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    cacheControl: 'public,max-age=3600',
  });

  let hasProgressEvent = false;
  let progressTimeoutId = null;
  let hangTimeoutId = null;
  const diagnostics = getFirebaseDiagnostics();

  const promise = new Promise((resolve, reject) => {
    if (typeof onStateChange === 'function') {
      onStateChange('starting');
    }

    progressTimeoutId = setTimeout(() => {
      if (!hasProgressEvent) {
        logger.warn('Avatar upload started without a progress event yet.', {
          userId,
          avatarStoragePath,
          storageBucket: diagnostics.storageBucket,
          projectId: diagnostics.projectId,
          fileType: file.type,
          fileSize: file.size,
        });
        if (typeof onStateChange === 'function') {
          onStateChange('uploading');
        }
      }
    }, 1200);
    hangTimeoutId = setTimeout(() => {
      const hangError = new Error('Avatar upload did not receive progress from Firebase Storage.');
      hangError.code = 'storage/no-progress';
      uploadTask.cancel();
      reject(Object.assign(hangError, {
        userMessage: `Avatar upload could not start properly. Check the Firebase Storage bucket and deploy storage rules for ${diagnostics.projectId}.`,
        diagnostics: {
          ...diagnostics,
          avatarStoragePath,
          fileType: file.type,
          fileSize: file.size,
        },
      }));
    }, 15000);

    uploadTask.on(
      'state_changed',
      async (snapshot) => {
        hasProgressEvent = true;
        if (hangTimeoutId) {
          clearTimeout(hangTimeoutId);
          hangTimeoutId = null;
        }
        if (typeof onStateChange === 'function') {
          onStateChange(snapshot.state || 'uploading');
        }
        if (typeof onProgress === 'function' && snapshot.totalBytes > 0) {
          const ratio = snapshot.bytesTransferred / snapshot.totalBytes;
          const nextProgress = Math.max(1, Math.min(99, Math.round(ratio * 100)));
          onProgress(snapshot.bytesTransferred >= snapshot.totalBytes ? 100 : nextProgress);
        }
      },
      (error) => {
        if (progressTimeoutId) {
          clearTimeout(progressTimeoutId);
        }
        if (hangTimeoutId) {
          clearTimeout(hangTimeoutId);
        }
        reject(Object.assign(error, {
          userMessage: normalizeStorageUploadError(error),
          diagnostics: {
            ...diagnostics,
            avatarStoragePath,
            fileType: file.type,
            fileSize: file.size,
          },
        }));
      },
      async () => {
        try {
          if (progressTimeoutId) {
            clearTimeout(progressTimeoutId);
          }
          if (hangTimeoutId) {
            clearTimeout(hangTimeoutId);
          }
          const avatarUrl = await getDownloadURL(storageRef);
          resolve({
            avatarUrl,
            avatarStoragePath,
          });
        } catch (error) {
          reject(Object.assign(error, {
            userMessage: 'The avatar uploaded, but the download URL could not be retrieved.',
            diagnostics: {
              ...diagnostics,
              avatarStoragePath,
            },
          }));
        }
      }
    );
  });

  return {
    avatarStoragePath,
    cancel() {
      uploadTask.cancel();
    },
    promise,
  };
}

export async function uploadProfileAvatar(userId, file, options = {}) {
  const upload = createProfileAvatarUpload(userId, file, options);
  return upload.promise;
}

export async function clearProfileAvatarFromStorage(avatarStoragePath) {
  if (!avatarStoragePath) {
    return;
  }
  try {
    await deleteObject(ref(storage, avatarStoragePath));
  } catch (error) {
    console.error('Failed to delete old avatar from storage', error);
  }
}

async function commitChunkedUpdates(entries) {
  for (let index = 0; index < entries.length; index += 400) {
    const batch = writeBatch(db);
    entries.slice(index, index + 400).forEach(({ ref: documentRef, data }) => {
      batch.update(documentRef, data);
    });
    await batch.commit();
  }
}

export async function syncProfileIdentityReferences(userId, profile) {
  if (!userId || !profile) {
    return;
  }

  const updateEntries = [];
  const {
    username = '',
    avatarUrl = '',
    publicProfileId = '',
  } = profile;

  const [followersSnapshot, followingSnapshot, requestsSnapshot, conversationsSnapshot, feedbackEntriesSnapshot, notificationsSnapshot] = await Promise.all([
    getDocs(query(collectionGroup(db, 'followers'), where('userId', '==', userId))),
    getDocs(query(collectionGroup(db, 'following'), where('userId', '==', userId))),
    getDocs(query(collectionGroup(db, 'followRequests'), where('userId', '==', userId))),
    getDocs(query(collectionGroup(db, 'conversations'), where('counterpartId', '==', userId))),
    getDocs(query(collectionGroup(db, 'entries'), where('userId', '==', userId))),
    getDocs(query(collectionGroup(db, 'notifications'), where('actorId', '==', userId))),
  ]);

  followersSnapshot.docs.forEach((snapshot) => {
    updateEntries.push({
      ref: snapshot.ref,
      data: { username, avatarUrl, publicProfileId },
    });
  });
  followingSnapshot.docs.forEach((snapshot) => {
    updateEntries.push({
      ref: snapshot.ref,
      data: { username, avatarUrl, publicProfileId },
    });
  });
  requestsSnapshot.docs.forEach((snapshot) => {
    updateEntries.push({
      ref: snapshot.ref,
      data: { username, avatarUrl, publicProfileId },
    });
  });
  conversationsSnapshot.docs.forEach((snapshot) => {
    updateEntries.push({
      ref: snapshot.ref,
      data: { counterpartName: username, counterpartAvatarUrl: avatarUrl },
    });
  });
  feedbackEntriesSnapshot.docs.forEach((snapshot) => {
    updateEntries.push({
      ref: snapshot.ref,
      data: {
        userDisplayName: username,
        userUsername: username,
        userAvatarUrl: avatarUrl,
        userPublicProfileId: publicProfileId,
      },
    });
  });
  notificationsSnapshot.docs.forEach((snapshot) => {
    updateEntries.push({
      ref: snapshot.ref,
      data: {
        actorName: username,
        actorAvatarUrl: avatarUrl,
        actorPublicProfileId: publicProfileId,
      },
    });
  });

  if (updateEntries.length) {
    await commitChunkedUpdates(updateEntries);
  }
}

export async function syncUserProfileStats(userId, statsUpdates) {
  if (!userId) {
    return;
  }
  await setDoc(profileDocRef(userId), {
    stats: {
      ...statsUpdates,
    },
    updatedAt: nowIso(),
  }, { merge: true });
}

export async function syncUserReviewStat(userId, reviewId, hasReview) {
  if (!userId || !reviewId) {
    return;
  }

  if (hasReview) {
    await setDoc(activityReviewDocRef(userId, reviewId), {
      reviewId,
      updatedAt: nowIso(),
    }, { merge: true });
  } else {
    await deleteDoc(activityReviewDocRef(userId, reviewId)).catch(() => {});
  }

  const reviewsCount = await readCount(userId, 'reviews');
  await syncUserProfileStats(userId, { reviewsCount });
}

export async function getFollowState({ viewerId, profileUserId }) {
  if (!viewerId || !profileUserId || viewerId === profileUserId) {
    return {
      isFollowing: false,
      hasPendingRequest: false,
      isRequestedByViewer: false,
    };
  }

  const [followingSnap, requestSnap] = await Promise.all([
    getDoc(doc(db, USER_PROFILES, viewerId, 'following', profileUserId)),
    getDoc(doc(db, USER_PROFILES, profileUserId, 'followRequests', viewerId)),
  ]);

  return {
    isFollowing: followingSnap.exists(),
    hasPendingRequest: requestSnap.exists(),
    isRequestedByViewer: requestSnap.exists(),
  };
}

async function upsertRelationshipPair({ followerProfile, targetProfile }) {
  const createdAt = nowIso();
  await Promise.all([
    setDoc(doc(db, USER_PROFILES, targetProfile.userId, 'followers', followerProfile.userId), {
      userId: followerProfile.userId,
      username: followerProfile.username,
      avatarUrl: followerProfile.avatarUrl || '',
      publicProfileId: followerProfile.publicProfileId || '',
      createdAt,
    }, { merge: true }),
    setDoc(doc(db, USER_PROFILES, followerProfile.userId, 'following', targetProfile.userId), {
      userId: targetProfile.userId,
      username: targetProfile.username,
      avatarUrl: targetProfile.avatarUrl || '',
      publicProfileId: targetProfile.publicProfileId || '',
      createdAt,
    }, { merge: true }),
  ]);
}

async function refreshFollowCounts(userIds) {
  await Promise.all(userIds.map(async (userId) => {
    const [followersCount, followingCount] = await Promise.all([
      readCount(userId, 'followers'),
      readCount(userId, 'following'),
    ]);
    await syncUserProfileStats(userId, { followersCount, followingCount });
  }));
}

export async function requestOrFollowUser({ currentUser, targetUserId }) {
  if (!currentUser?.uid || !targetUserId || currentUser.uid === targetUserId) {
    return { status: 'noop' };
  }

  const [currentProfile, targetProfile] = await Promise.all([
    ensureUserProfile(currentUser),
    getUserProfile(targetUserId),
  ]);

  if (!targetProfile) {
    throw new Error('Profile not found.');
  }

  if (targetProfile.privacy.profileVisibility === 'private') {
    await setDoc(doc(db, USER_PROFILES, targetUserId, 'followRequests', currentUser.uid), {
      userId: currentUser.uid,
      username: currentProfile.username,
      avatarUrl: currentProfile.avatarUrl || '',
      publicProfileId: currentProfile.publicProfileId || '',
      createdAt: nowIso(),
    }, { merge: true });

    await createNotification(targetUserId, {
      type: 'follow_request',
      actorId: currentUser.uid,
      actorName: currentProfile.username,
      actorAvatarUrl: currentProfile.avatarUrl || '',
      actorPublicProfileId: currentProfile.publicProfileId || '',
      message: `${currentProfile.username} requested to follow you.`,
    });

    return { status: 'requested' };
  }

  await upsertRelationshipPair({ followerProfile: currentProfile, targetProfile });
  await refreshFollowCounts([currentUser.uid, targetUserId]);

  await createNotification(targetUserId, {
    type: 'new_follower',
    actorId: currentUser.uid,
    actorName: currentProfile.username,
    actorAvatarUrl: currentProfile.avatarUrl || '',
    actorPublicProfileId: currentProfile.publicProfileId || '',
    message: `${currentProfile.username} started following you.`,
  });

  return { status: 'following' };
}

export async function unfollowUser({ currentUserId, targetUserId }) {
  if (!currentUserId || !targetUserId) {
    return;
  }

  await Promise.all([
    deleteDoc(doc(db, USER_PROFILES, currentUserId, 'following', targetUserId)).catch(() => {}),
    deleteDoc(doc(db, USER_PROFILES, targetUserId, 'followers', currentUserId)).catch(() => {}),
    deleteDoc(doc(db, USER_PROFILES, targetUserId, 'followRequests', currentUserId)).catch(() => {}),
  ]);

  await refreshFollowCounts([currentUserId, targetUserId]);
}

export async function listFollowRequests(userId, cursor = null, pageSize = DEFAULT_PAGE_SIZE) {
  const constraints = [orderBy('createdAt', 'desc'), limit(pageSize)];
  if (cursor) {
    constraints.splice(1, 0, startAfter(cursor));
  }
  const snapshot = await getDocs(query(subcollectionRef(userId, 'followRequests'), ...constraints));
  return {
    items: snapshot.docs.map(normalizeRelationship),
    cursor: snapshot.docs[snapshot.docs.length - 1] ?? null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export async function respondToFollowRequest({ currentUser, requesterUserId, accept }) {
  if (!currentUser?.uid || !requesterUserId) {
    return;
  }

  const requesterProfile = await getUserProfile(requesterUserId);
  const currentProfile = await ensureUserProfile(currentUser);
  await deleteDoc(doc(db, USER_PROFILES, currentUser.uid, 'followRequests', requesterUserId)).catch(() => {});

  if (!accept || !requesterProfile) {
    return;
  }

  await upsertRelationshipPair({ followerProfile: requesterProfile, targetProfile: currentProfile });
  await refreshFollowCounts([requesterUserId, currentUser.uid]);

  await createNotification(requesterUserId, {
    type: 'follow_accepted',
    actorId: currentUser.uid,
    actorName: currentProfile.username,
    actorAvatarUrl: currentProfile.avatarUrl || '',
    actorPublicProfileId: currentProfile.publicProfileId || '',
    message: `${currentProfile.username} accepted your follow request.`,
  });
}

export async function listRelationships(userId, kind, cursor = null, pageSize = DEFAULT_PAGE_SIZE) {
  const constraints = [orderBy('createdAt', 'desc'), limit(pageSize)];
  if (cursor) {
    constraints.splice(1, 0, startAfter(cursor));
  }
  const snapshot = await getDocs(query(subcollectionRef(userId, kind), ...constraints));
  return {
    items: snapshot.docs.map(normalizeRelationship),
    cursor: snapshot.docs[snapshot.docs.length - 1] ?? null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export function canViewerAccessPrivacyLevel(level, { isOwner, isFollower }) {
  if (isOwner) {
    return true;
  }
  if (level === 'public') {
    return true;
  }
  if (level === 'followers_only') {
    return isFollower;
  }
  return false;
}

export function canMessageProfile(profile, { isOwner, isFollower }) {
  if (isOwner) {
    return true;
  }
  if (profile.privacy.whoCanMessage === 'everyone') {
    return true;
  }
  if (profile.privacy.whoCanMessage === 'followers_only') {
    return isFollower;
  }
  return false;
}

function getConversationId(leftUserId, rightUserId) {
  return [leftUserId, rightUserId].sort().join('__');
}

export async function sendDirectMessage({ senderUser, recipientProfile, text }) {
  const messageText = sanitizeText(text, 1000);
  if (!senderUser?.uid || !recipientProfile?.userId || !messageText) {
    throw new Error('A valid recipient and message are required.');
  }

  const senderProfile = await ensureUserProfile(senderUser);
  const conversationId = getConversationId(senderUser.uid, recipientProfile.userId);
  const createdAt = nowIso();

  await setDoc(conversationDocRef(conversationId), {
    participantIds: [senderUser.uid, recipientProfile.userId],
    updatedAt: createdAt,
    lastMessageText: messageText,
    lastMessageAt: createdAt,
  }, { merge: true });

  await addDoc(messageCollectionRef(conversationId), {
    text: messageText,
    senderId: senderUser.uid,
    senderName: senderProfile.username,
    createdAt,
  });

  await Promise.all([
    setDoc(conversationInboxRef(senderUser.uid, conversationId), {
      participantIds: [senderUser.uid, recipientProfile.userId],
      counterpartId: recipientProfile.userId,
      counterpartName: recipientProfile.username,
      counterpartAvatarUrl: recipientProfile.avatarUrl || '',
      lastMessageText: messageText,
      lastMessageAt: createdAt,
      unreadCount: 0,
    }, { merge: true }),
    setDoc(conversationInboxRef(recipientProfile.userId, conversationId), {
      participantIds: [senderUser.uid, recipientProfile.userId],
      counterpartId: senderUser.uid,
      counterpartName: senderProfile.username,
      counterpartAvatarUrl: senderProfile.avatarUrl || '',
      lastMessageText: messageText,
      lastMessageAt: createdAt,
      unreadCount: 1,
    }, { merge: true }),
  ]);

  await createNotification(recipientProfile.userId, {
    type: 'new_message',
    actorId: senderUser.uid,
    actorName: senderProfile.username,
    actorAvatarUrl: senderProfile.avatarUrl || '',
    actorPublicProfileId: senderProfile.publicProfileId || '',
    conversationId,
    message: `${senderProfile.username} sent you a message.`,
  });

  return conversationId;
}

export async function listConversations(userId, cursor = null, pageSize = DEFAULT_PAGE_SIZE) {
  const constraints = [orderBy('lastMessageAt', 'desc'), limit(pageSize)];
  if (cursor) {
    constraints.splice(1, 0, startAfter(cursor));
  }
  const snapshot = await getDocs(query(subcollectionRef(userId, 'conversations'), ...constraints));
  return {
    items: snapshot.docs.map(normalizeConversation),
    cursor: snapshot.docs[snapshot.docs.length - 1] ?? null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export async function listMessages(conversationId, cursor = null, pageSize = DEFAULT_PAGE_SIZE) {
  const constraints = [orderBy('createdAt', 'desc'), limit(pageSize)];
  if (cursor) {
    constraints.splice(1, 0, startAfter(cursor));
  }
  const snapshot = await getDocs(query(messageCollectionRef(conversationId), ...constraints));
  return {
    items: snapshot.docs.map(normalizeMessage),
    cursor: snapshot.docs[snapshot.docs.length - 1] ?? null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export async function markConversationRead(userId, conversationId) {
  if (!userId || !conversationId) {
    return;
  }
  await updateDoc(conversationInboxRef(userId, conversationId), {
    unreadCount: 0,
  }).catch(() => {});
}

export async function listNotifications(userId, cursor = null, pageSize = DEFAULT_PAGE_SIZE) {
  const constraints = [orderBy('createdAt', 'desc'), limit(pageSize)];
  if (cursor) {
    constraints.splice(1, 0, startAfter(cursor));
  }
  const snapshot = await getDocs(query(subcollectionRef(userId, 'notifications'), ...constraints));
  return {
    items: snapshot.docs.map(normalizeNotification),
    cursor: snapshot.docs[snapshot.docs.length - 1] ?? null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export async function markNotificationsRead(userId, notificationIds) {
  await Promise.all(notificationIds.map((notificationId) => updateDoc(doc(db, USER_PROFILES, userId, 'notifications', notificationId), {
    read: true,
  }).catch(() => {})));
}

export async function getUnreadNotificationsCount(userId) {
  if (!userId) {
    return 0;
  }
  const snapshot = await getDocs(query(subcollectionRef(userId, 'notifications'), orderBy('createdAt', 'desc'), limit(50)));
  return snapshot.docs.map(normalizeNotification).filter((notification) => !notification.read).length;
}
