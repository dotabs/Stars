import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Share2, Bookmark, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PosterImage, VerdictBadge } from '@/components/ui-custom';
import { resolvePosterUrl } from '@/lib/posters';
import { editorLists, getMovieById } from '@/data/movies';

export function Lists() {
  const navigate = useNavigate();
  const [followedLists, setFollowedLists] = useState<string[]>(['best-of-2024']);
  const [selectedList, setSelectedList] = useState<string | null>(null);

  const handleFollow = (listId: string) => {
    if (followedLists.includes(listId)) {
      setFollowedLists(followedLists.filter(id => id !== listId));
    } else {
      setFollowedLists([...followedLists, listId]);
    }
  };

  // If a list is selected, show its detail view
  if (selectedList) {
    const list = editorLists.find(l => l.id === selectedList);
    if (!list) return null;

    const listMovies = list.movieIds.map(id => getMovieById(id)).filter(Boolean);

    return (
      <div className="min-h-screen bg-background pt-16">
        {/* List Header */}
        <header className="relative">
          <div className="absolute inset-0 h-80">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ 
                backgroundImage: `url(${resolvePosterUrl(listMovies[0]?.poster, listMovies[0]?.title ?? list.title, { width: 600, height: 900 })})`,
                filter: 'blur(50px) brightness(0.2)'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
            <button 
              onClick={() => setSelectedList(null)}
              className="text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to Lists
            </button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Editorial List by {list.author}
                </p>
                <h1 className="heading-display text-4xl md:text-5xl lg:text-6xl">{list.title}</h1>
                <p className="text-lg text-muted-foreground mt-4 max-w-2xl">{list.description}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{list.followers.toLocaleString()} followers</span>
                </div>
                <Button 
                  onClick={() => handleFollow(list.id)}
                  className={followedLists.includes(list.id) ? 'btn-outline' : 'btn-primary'}
                >
                  <Heart className={`w-4 h-4 mr-2 ${followedLists.includes(list.id) ? 'fill-current' : ''}`} />
                  {followedLists.includes(list.id) ? 'Following' : 'Follow'}
                </Button>
                <Button className="btn-outline">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Ranked List */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-6">
            {listMovies.map((movie, index) => movie && (
              <div 
                key={movie.id}
                onClick={() => navigate(`/review/${movie.id}`)}
                className="flex gap-6 p-6 rounded-2xl bg-card/40 border border-white/[0.06] hover:border-white/[0.12] cursor-pointer group"
              >
                {/* Rank Number */}
                <div className="flex-shrink-0 w-16 text-center">
                  <span className="text-5xl font-bold text-white/[0.08]">{index + 1}</span>
                </div>

                {/* Poster */}
                <div className="w-24 h-36 rounded-xl overflow-hidden flex-shrink-0">
                  <PosterImage 
                    src={movie.poster} 
                    title={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
                  <h3 className="text-xl font-semibold mt-3">{movie.title}</h3>
                  <p className="text-muted-foreground">{movie.year} • {movie.director}</p>
                  <p className="text-muted-foreground mt-3 line-clamp-2">{movie.synopsis}</p>
                  <div className="flex gap-2 mt-4">
                    {movie.genres.slice(0, 3).map(g => (
                      <span key={g} className="text-xs px-2 py-1 rounded-full bg-white/5">{g}</span>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 flex-shrink-0">
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Lists overview
  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="heading-display text-4xl md:text-5xl">Editorial Collections</h1>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Curated lists for every mood—rewatchables, deep cuts, and festival standouts.
          </p>
        </div>

        {/* Lists Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {editorLists.map((list) => {
            const listMovies = list.movieIds.map(id => getMovieById(id)).filter(Boolean);
            
            return (
              <div 
                key={list.id}
                onClick={() => setSelectedList(list.id)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-4">
                  {/* Movie Posters Collage */}
                  <div className="absolute inset-0 flex">
                    {listMovies.slice(0, 4).map((movie, idx) => movie && (
                      <div 
                        key={idx}
                        className="flex-1"
                        style={{ 
                          backgroundImage: `url(${resolvePosterUrl(movie.poster, movie.title, { width: 300, height: 450 })})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          filter: 'brightness(0.6)'
                        }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                  
                  {/* Followers Badge */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                    <Users className="w-3 h-3" />
                    <span className="text-xs">{list.followers.toLocaleString()}</span>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-4 py-2 rounded-full bg-background/90 text-sm font-medium">
                      View List
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                  {list.title}
                </h3>
                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                  {list.description}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {list.movieIds.length} films
                </p>
              </div>
            );
          })}
        </div>

        {/* Create List CTA */}
        <div className="mt-16 p-8 rounded-2xl bg-card/40 border border-white/[0.06] text-center">
          <h2 className="text-2xl font-semibold mb-2">Create Your Own List</h2>
          <p className="text-muted-foreground mb-6">
            Share your recommendations with the STARS community.
          </p>
          <Button className="btn-primary">
            Start a List
          </Button>
        </div>
      </div>
    </div>
  );
}
