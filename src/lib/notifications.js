import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function notificationsCollectionRef(userId) {
  return collection(db, 'userProfiles', userId, 'notifications');
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

function normalizeNotification(snapshot) {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    read: Boolean(data.read),
    createdAt: normalizeDate(data.createdAt),
  };
}

export async function getUnreadNotificationsCount(userId) {
  if (!userId) {
    return 0;
  }

  const snapshot = await getDocs(
    query(notificationsCollectionRef(userId), orderBy('createdAt', 'desc'), limit(50))
  );

  return snapshot.docs.map(normalizeNotification).filter((notification) => !notification.read).length;
}
