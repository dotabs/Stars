import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { getProfilePath, listNotifications, markNotificationsRead } from '@/lib/social';

export function Notifications() {
  const { currentUser } = useAuth();
  const [state, setState] = useState({ items: [], cursor: null, hasMore: false, isLoading: true });

  // Notifications are marked read as part of the initial fetch so the badge state clears naturally after viewing.
  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.uid) {
      queueMicrotask(() => {
        if (!cancelled) {
          setState({ items: [], cursor: null, hasMore: false, isLoading: false });
        }
      });
      return () => {
        cancelled = true;
      };
    }

    void listNotifications(currentUser.uid)
      .then(async (response) => {
        if (!cancelled) {
          setState({ ...response, isLoading: false });
        }

        const unreadIds = response.items.filter((item) => !item.read).map((item) => item.id);
        if (unreadIds.length) {
          await markNotificationsRead(currentUser.uid, unreadIds);
        }
      })
      .catch((error) => {
        console.error('Failed to load notifications', error);
        if (!cancelled) {
          setState({ items: [], cursor: null, hasMore: false, isLoading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  async function loadMore() {
    const response = await listNotifications(currentUser.uid, state.cursor);
    setState((current) => ({
      items: [...current.items, ...response.items],
      cursor: response.cursor,
      hasMore: response.hasMore,
      isLoading: false,
    }));
  }

  return (
    <div className="min-h-screen bg-background pt-20 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
          <p className="section-kicker">Inbox</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">Notifications</h1>
          {!currentUser?.uid ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/12 bg-black/20 p-6">
              <p className="text-base text-white">Sign in to see your notifications.</p>
              <p className="mt-2 text-sm leading-6 text-white/60">Notifications are stored per account in Firebase.</p>
            </div>
          ) : state.isLoading ? (
            <p className="mt-6 text-sm text-white/55">Loading notifications...</p>
          ) : state.items.length === 0 ? (
            <p className="mt-6 text-sm text-white/55">No notifications yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {state.items.map((notification) => (
                <div key={notification.id} className={`rounded-2xl border p-4 ${notification.read ? 'border-white/[0.08] bg-black/20' : 'border-[#d26d47]/25 bg-[#d26d47]/8'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{notification.message}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/45">{notification.type.replaceAll('_', ' ')}</p>
                    </div>
                    {notification.actorId ? <Link to={getProfilePath(notification.actorPublicProfileId || notification.actorId)} className="text-sm text-[#f4b684] hover:text-white">View</Link> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          {currentUser?.uid && state.hasMore ? <button type="button" onClick={() => void loadMore()} className="btn-outline mt-6 rounded-full px-5 py-2.5 text-sm">Load more</button> : null}
        </section>
      </div>
    </div>
  );
}
