import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, ChevronRight, Heart, Share2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PosterImage, VerdictBadge } from '@/components/ui-custom';
import { useToast } from '@/hooks/use-toast';
import { useUserLibrary } from '@/hooks/use-user-library';
import { shareUrl } from '@/lib/browser';
import { fetchTmdbCollections } from '@/lib/tmdb-movies';
import { isLibraryAuthError, toggleLibraryItem } from '@/lib/user-library';
export function Lists() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { currentUser, library } = useUserLibrary();
    const [followedLists, setFollowedLists] = useState(['trending-week']);
    const [selectedList, setSelectedList] = useState(null);
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        async function loadCollections() {
            setIsLoading(true);
            try {
                const response = await fetchTmdbCollections();
                if (!cancelled) {
                    setCollections(response);
                }
            }
            catch (error) {
                console.error('Failed to load TMDB collections', error);
            }
            finally {
                if (!cancelled)
                    setIsLoading(false);
            }
        }
        void loadCollections();
        return () => {
            cancelled = true;
        };
    }, []);
    const handleFollow = (listId) => {
        if (followedLists.includes(listId)) {
            setFollowedLists(followedLists.filter((id) => id !== listId));
            return;
        }
        setFollowedLists([...followedLists, listId]);
    };
    const handleListShare = async (listTitle) => {
        const currentUrl = typeof window === 'undefined' ? '' : window.location.href;
        await shareUrl(currentUrl, listTitle, `Explore the ${listTitle} collection on STARS`);
    };
    const handleToggleSaveMovie = async (movieId) => {
        try {
            await toggleLibraryItem({
                userId: currentUser?.uid,
                listName: 'watchlist',
                movieId,
            });
        }
        catch (error) {
            if (isLibraryAuthError(error)) {
                toast({
                    title: 'Sign in required',
                    description: 'Sign in to save collection picks to your watchlist.',
                    variant: 'destructive',
                });
                return;
            }
            console.error('Failed to update watchlist', error);
            toast({
                title: 'Watchlist update failed',
                description: 'Please try again in a moment.',
                variant: 'destructive',
            });
        }
    };
    if (isLoading && !collections.length) {
        return (<div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="section-panel w-full max-w-md px-6 py-10 text-center">
          <p className="section-kicker">Loading</p>
          <h1 className="heading-display mt-3 text-4xl text-white">Opening collections</h1>
        </div>
      </div>);
    }
    if (selectedList) {
        const list = collections.find((entry) => entry.id === selectedList);
        if (!list)
            return null;
        return (<div className="min-h-screen bg-background pt-16">
        <header className="relative">
          <div className="absolute inset-0 h-80">
            <div className="absolute inset-0 bg-cover bg-center" style={{
                backgroundImage: `url(${list.movies[0]?.backdrop || list.movies[0]?.poster || ''})`,
                filter: 'blur(50px) brightness(0.2)',
            }}/>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"/>
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 lg:px-8">
            <button type="button" onClick={() => setSelectedList(null)} className="mb-6 flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4 rotate-180"/>
              Back to Collections
            </button>

            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-2 text-mono text-xs uppercase tracking-wider text-muted-foreground">Live TMDB Collection</p>
                <h1 className="heading-display text-4xl md:text-5xl lg:text-6xl">{list.title}</h1>
                <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{list.description}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4"/>
                  <span className="text-sm">{list.movies.length} films</span>
                </div>
                <Button onClick={() => handleFollow(list.id)} className={followedLists.includes(list.id) ? 'btn-outline' : 'btn-primary'}>
                  <Heart className={`mr-2 h-4 w-4 ${followedLists.includes(list.id) ? 'fill-current' : ''}`}/>
                  {followedLists.includes(list.id) ? 'Following' : 'Follow'}
                </Button>
                <Button className="btn-outline" onClick={() => void handleListShare(list.title)}>
                  <Share2 className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {list.movies.map((movie, index) => (<div key={movie.id} onClick={() => navigate(`/review/${movie.id}`)} className="group flex cursor-pointer gap-6 rounded-2xl border border-white/[0.06] bg-card/40 p-6 hover:border-white/[0.12]">
                <div className="w-16 flex-shrink-0 text-center">
                  <span className="text-5xl font-bold text-white/[0.08]">{index + 1}</span>
                </div>

                <div className="h-36 w-24 flex-shrink-0 overflow-hidden rounded-xl">
                  <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover transition-transform group-hover:scale-105"/>
                </div>

                <div className="flex-1">
                  <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm"/>
                  <h3 className="mt-3 text-xl font-semibold">{movie.title}</h3>
                  <p className="text-muted-foreground">{movie.year}</p>
                  <p className="mt-3 line-clamp-2 text-muted-foreground">{movie.synopsis}</p>
                </div>

                <button type="button" aria-pressed={library.watchlist.includes(movie.id)} onClick={(event) => {
                    event.stopPropagation();
                    void handleToggleSaveMovie(movie.id);
                }} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 hover:bg-white/5">
                  <Bookmark className="h-4 w-4"/>
                </button>
              </div>))}
          </div>
        </main>
      </div>);
    }
    return (<div className="min-h-screen bg-background pt-16">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h1 className="heading-display text-4xl md:text-5xl">Live Collections</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Curated from live TMDB endpoints instead of the old static catalog.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((list) => (<div key={list.id} onClick={() => setSelectedList(list.id)} className="group cursor-pointer">
              <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-2xl">
                <div className="absolute inset-0 flex">
                  {list.movies.slice(0, 4).map((movie, index) => (<div key={index} className="flex-1" style={{
                    backgroundImage: `url(${movie.poster})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                    filter: 'brightness(0.6)',
                }}/>))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"/>
                <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
                  <Users className="h-3 w-3"/>
                  <span className="text-xs">{list.movies.length}</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-primary/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded-full bg-background/90 px-4 py-2 text-sm font-medium">View Collection</span>
                </div>
              </div>

              <h3 className="text-xl font-semibold transition-colors group-hover:text-primary">{list.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{list.description}</p>
            </div>))}
        </div>
      </div>
    </div>);
}
