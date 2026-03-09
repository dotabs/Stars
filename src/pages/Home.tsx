import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Bookmark, BookOpen, Globe, ChevronRight, Star, TrendingUp, Clock, Calendar, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VerdictBadge, MovieCard, PosterImage } from '@/components/ui-custom';
import { resolvePosterUrl } from '@/lib/posters';
import { movies, getTrendingMovies, getLatestMovies, getClassicMovies, editorLists, getMoviesByDecade } from '@/data/movies';

export function Home() {
  const navigate = useNavigate();
  const [activeDecade, setActiveDecade] = useState<number | null>(null);
  
  const spotlightMovie = movies.find(m => m.id === 'sinners-2025') || movies[0];
  const trendingMovies = getTrendingMovies().slice(0, 5);
  const latestMovies = getLatestMovies().slice(0, 4);
  const classicMovies = getClassicMovies().slice(0, 4);
  const decades = [2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950, 1940];

  const decadeMovies = activeDecade ? getMoviesByDecade(activeDecade).slice(0, 6) : [];

  return (
    <div className="min-h-screen pt-16">
      {/* Animated Background */}
      <div className="animated-bg" />
      
      {/* Hero Section - Curated Spotlight */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ 
              backgroundImage: `url(${resolvePosterUrl(spotlightMovie.poster, spotlightMovie.title, { width: 600, height: 900 })})`,
              filter: 'blur(80px) saturate(1.5)'
            }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,15,0.5) 50%, rgba(10,10,15,1) 100%)' }} />
          
          {/* Glow Effect */}
          <div className="hero-glow" style={{ top: '20%', left: '50%', transform: 'translateX(-50%)' }} />
        </div>

        {/* Spotlight Card */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="card-cinematic p-6 md:p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Poster */}
              <div className="lg:w-2/5 flex-shrink-0">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden"
                  style={{ boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.8)' }}>
                  <PosterImage 
                    src={spotlightMovie.poster} 
                    title={spotlightMovie.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 ring-1 ring-white/10 rounded-2xl" />
                  
                  {/* Spotlight Badge */}
                  <div className="absolute top-4 left-4 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider"
                    style={{ 
                      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      boxShadow: '0 0 30px rgba(220, 38, 38, 0.5)'
                    }}>
                    This Week's Spotlight
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="lg:w-3/5 flex flex-col justify-center">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="heading-display text-4xl md:text-5xl lg:text-6xl text-white"
                      style={{ textShadow: '0 0 40px rgba(220, 38, 38, 0.3)' }}>
                      {spotlightMovie.title}
                    </h1>
                    <p className="text-lg text-muted-foreground mt-3 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {spotlightMovie.year}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <span>{spotlightMovie.genres.join(' / ')}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {spotlightMovie.runtime} min
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <VerdictBadge verdict={spotlightMovie.verdict} score={spotlightMovie.score} size="lg" />
                </div>

                <p className="text-muted-foreground mt-6 text-lg leading-relaxed line-clamp-3">
                  {spotlightMovie.synopsis}
                </p>

                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <span>Directed by <span className="text-white font-medium">{spotlightMovie.director}</span></span>
                </div>

                <div className="flex flex-wrap gap-3 mt-8">
                  <Button 
                    onClick={() => navigate(`/review/${spotlightMovie.id}`)}
                    className="btn-primary"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Read Review
                  </Button>
                  <Button className="btn-outline">
                    <Play className="w-4 h-4 mr-2" />
                    Watch Trailer
                  </Button>
                  <Button variant="outline" className="btn-outline">
                    <Bookmark className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>

                {/* Cast Preview */}
                <div className="mt-8 pt-6 border-t border-white/[0.06]">
                  <p className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Starring</p>
                  <div className="flex flex-wrap gap-2">
                    {spotlightMovie.cast.slice(0, 4).map((actor, idx) => (
                      <span key={idx} className="px-3 py-1.5 rounded-full text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Now Playing in Theaters */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="heading-display text-2xl">Now Playing</h2>
                <p className="text-sm text-muted-foreground">In theaters now</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/browse')}
              className="flex items-center gap-1 text-sm font-medium hover:text-red-400 transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {movies.filter(m => m.streaming?.includes('Theaters')).slice(0, 6).map((movie) => (
              <div 
                key={movie.id}
                onClick={() => navigate(`/review/${movie.id}`)}
                className="flex-shrink-0 w-36 cursor-pointer group"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden"
                  style={{ boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)' }}>
                  <PosterImage 
                    src={movie.poster} 
                    title={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm font-semibold mt-2 truncate group-hover:text-red-400 transition-colors">{movie.title}</p>
                <p className="text-xs font-bold" style={{ color: '#ef4444' }}>{movie.score.toFixed(1)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Reviews Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h2 className="heading-display text-2xl">Latest Reviews</h2>
                <p className="text-sm text-muted-foreground">Fresh verdicts on new releases</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/browse')}
              className="flex items-center gap-1 text-sm font-medium hover:text-red-400 transition-colors"
            >
              Browse All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {latestMovies.map((movie) => (
              <MovieCard 
                key={movie.id}
                movie={movie}
                variant="compact"
                onClick={() => navigate(`/review/${movie.id}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trending Now */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="heading-display text-2xl">Trending Now</h2>
                <p className="text-sm text-muted-foreground">Most-read reviews this week</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {trendingMovies.map((movie, index) => (
              <div key={movie.id} className="relative">
                <span className="absolute -top-2 -left-2 text-6xl font-bold opacity-10 z-10"
                  style={{ color: index === 0 ? '#f59e0b' : index === 1 ? '#9ca3af' : index === 2 ? '#b45309' : '#6b7280' }}>
                  {index + 1}
                </span>
                <MovieCard 
                  movie={movie} 
                  variant="compact"
                  onClick={() => navigate(`/review/${movie.id}`)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Decade */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="heading-display text-2xl">Browse by Decade</h2>
              <p className="text-sm text-muted-foreground">Explore cinema through the ages</p>
            </div>
          </div>

          {/* Decade Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveDecade(null)}
              className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
                activeDecade === null 
                  ? 'text-white' 
                  : 'text-muted-foreground hover:text-white'
              }`}
              style={activeDecade === null ? {
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)',
                boxShadow: '0 0 20px rgba(220, 38, 38, 0.2)'
              } : { background: 'rgba(255,255,255,0.05)' }}
            >
              All Time
            </button>
            {decades.map((decade) => (
              <button
                key={decade}
                onClick={() => setActiveDecade(decade)}
                className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
                  activeDecade === decade 
                    ? 'text-white' 
                    : 'text-muted-foreground hover:text-white'
                }`}
                style={activeDecade === decade ? {
                  background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)',
                  boxShadow: '0 0 20px rgba(220, 38, 38, 0.2)'
                } : { background: 'rgba(255,255,255,0.05)' }}
              >
                {decade}s
              </button>
            ))}
          </div>

          {/* Decade Movies */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(activeDecade ? decadeMovies : classicMovies).map((movie) => (
              <MovieCard 
                key={movie.id}
                movie={movie}
                variant="compact"
                onClick={() => navigate(`/review/${movie.id}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Explore the World Teaser */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-20"
            style={{ 
              background: 'radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.3) 0%, transparent 60%)'
            }}
          />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ 
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              boxShadow: '0 0 60px rgba(220, 38, 38, 0.4)'
            }}>
            <Globe className="w-10 h-10" />
          </div>
          <h2 className="heading-display text-5xl md:text-6xl text-white mb-4"
            style={{ textShadow: '0 0 40px rgba(220, 38, 38, 0.3)' }}>
            Explore the World
          </h2>
          <h3 className="text-2xl md:text-3xl text-muted-foreground mb-6">
            Scene by Scene
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Find films by country, city, and landscape. Discover cinema from every corner of the globe.
          </p>
          <Button 
            onClick={() => navigate('/explore')}
            className="btn-primary text-lg px-8 py-4"
          >
            <Globe className="w-5 h-5 mr-2" />
            Open the Globe
          </Button>
        </div>
      </section>

      {/* Editor Lists */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}>
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="heading-display text-2xl">Editor Lists</h2>
                <p className="text-sm text-muted-foreground">Curated collections for every mood</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/lists')}
              className="flex items-center gap-1 text-sm font-medium hover:text-red-400 transition-colors"
            >
              See All Lists <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {editorLists.slice(0, 3).map((list) => {
              const listMovies = list.movieIds.map(id => movies.find(m => m.id === id)).filter(Boolean);
              
              return (
                <div 
                  key={list.id}
                  onClick={() => navigate('/lists')}
                  className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(20, 20, 28, 0.9) 0%, rgba(15, 15, 22, 0.95) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  {/* List Preview */}
                  <div className="relative h-40 overflow-hidden">
                    <div className="absolute inset-0 flex">
                      {listMovies.slice(0, 4).map((movie, idx) => movie && (
                        <div 
                          key={idx}
                          className="flex-1"
                          style={{ 
                            backgroundImage: `url(${resolvePosterUrl(movie.poster, movie.title, { width: 600, height: 900 })})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'brightness(0.5)'
                          }}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
                    
                    {/* Followers Badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}>
                      <Star className="w-3 h-3" />
                      {list.followers.toLocaleString()}
                    </div>
                  </div>

                  {/* List Info */}
                  <div className="p-5">
                    <h3 className="font-bold text-lg group-hover:text-red-400 transition-colors">{list.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{list.description}</p>
                    <p className="text-sm font-medium mt-3" style={{ color: '#ef4444' }}>
                      {list.movieIds.length} films
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Classic Cinema */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="heading-display text-2xl">Classic Cinema</h2>
                <p className="text-sm text-muted-foreground">Timeless masterpieces</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/browse')}
              className="flex items-center gap-1 text-sm font-medium hover:text-red-400 transition-colors"
            >
              View Classics <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {classicMovies.map((movie) => (
              <MovieCard 
                key={movie.id}
                movie={movie}
                variant="compact"
                onClick={() => navigate(`/review/${movie.id}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold" style={{ 
                background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>{movies.length}+</p>
              <p className="text-sm text-muted-foreground mt-1">Movies Reviewed</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold" style={{ 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>80+</p>
              <p className="text-sm text-muted-foreground mt-1">Years Covered</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold" style={{ 
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>50+</p>
              <p className="text-sm text-muted-foreground mt-1">Actor Profiles</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold" style={{ 
                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>20+</p>
              <p className="text-sm text-muted-foreground mt-1">Editor Lists</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
