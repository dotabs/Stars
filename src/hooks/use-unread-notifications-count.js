import { useEffect, useState } from 'react';
import { getUnreadNotificationsCount } from '@/lib/notifications';

export function useUnreadNotificationsCount(userId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      queueMicrotask(() => {
        if (!cancelled) {
          setCount(0);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    void getUnreadNotificationsCount(userId)
      .then((nextCount) => {
        if (!cancelled) {
          setCount(nextCount);
        }
      })
      .catch((error) => {
        console.error('Failed to load unread notification count', error);
        if (!cancelled) {
          setCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return count;
}
