import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listRelationships } from '@/lib/social';

function ProfileAvatar({ entry }) {
  if (entry.avatarUrl) {
    return <img src={entry.avatarUrl} alt={entry.username} className="h-12 w-12 rounded-full object-cover" />;
  }

  return <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d26d47,#9f472a)] text-sm font-bold text-white">{entry.username.slice(0, 2).toUpperCase()}</div>;
}

export function ProfileConnections() {
  const { userId, kind } = useParams();
  const [state, setState] = useState({ items: [], cursor: null, hasMore: false, isLoading: true });

  useEffect(() => {
    let cancelled = false;
    setState({ items: [], cursor: null, hasMore: false, isLoading: true });
    void listRelationships(userId, kind)
      .then((response) => {
        if (!cancelled) {
          setState({ ...response, isLoading: false });
        }
      })
      .catch((error) => {
        console.error(`Failed to load ${kind}`, error);
        if (!cancelled) {
          setState({ items: [], cursor: null, hasMore: false, isLoading: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [kind, userId]);

  async function loadMore() {
    const response = await listRelationships(userId, kind, state.cursor);
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
          <p className="section-kicker">{kind}</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">{kind === 'followers' ? 'Followers' : 'Following'}</h1>
          {state.isLoading ? (
            <p className="mt-6 text-sm text-white/55">Loading...</p>
          ) : state.items.length === 0 ? (
            <p className="mt-6 text-sm text-white/55">No profiles to show.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {state.items.map((entry) => (
                <Link key={entry.userId} to={`/profile/${entry.userId || entry.publicProfileId}`} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition-all hover:border-[#d26d47]/35 hover:bg-white/[0.04]">
                  <ProfileAvatar entry={entry} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{entry.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {state.hasMore ? <button type="button" onClick={() => void loadMore()} className="btn-outline mt-6 rounded-full px-5 py-2.5 text-sm">Load more</button> : null}
        </section>
      </div>
    </div>
  );
}
