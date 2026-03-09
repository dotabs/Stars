import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Bookmark, RotateCw, Plane, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterChips, PosterImage } from '@/components/ui-custom';
import { movies, genres } from '@/data/movies';

interface CountryData {
  name: string;
  flag: string;
  count: number;
  x: number;
  y: number;
}

const countryData: CountryData[] = [
  { name: 'USA', flag: '🇺🇸', count: 85, x: 22, y: 35 },
  { name: 'UK', flag: '🇬🇧', count: 42, x: 47, y: 28 },
  { name: 'France', flag: '🇫🇷', count: 38, x: 49, y: 32 },
  { name: 'Germany', flag: '🇩🇪', count: 31, x: 52, y: 30 },
  { name: 'Italy', flag: '🇮🇹', count: 28, x: 52, y: 35 },
  { name: 'Spain', flag: '🇪🇸', count: 24, x: 47, y: 36 },
  { name: 'Japan', flag: '🇯🇵', count: 35, x: 82, y: 36 },
  { name: 'South Korea', flag: '🇰🇷', count: 28, x: 80, y: 38 },
  { name: 'China', flag: '🇨🇳', count: 32, x: 75, y: 38 },
  { name: 'India', flag: '🇮🇳', count: 26, x: 68, y: 45 },
  { name: 'Brazil', flag: '🇧🇷', count: 22, x: 32, y: 62 },
  { name: 'Australia', flag: '🇦🇺', count: 18, x: 85, y: 72 },
  { name: 'Canada', flag: '🇨🇦', count: 25, x: 20, y: 28 },
  { name: 'Mexico', flag: '🇲🇽', count: 19, x: 18, y: 45 },
  { name: 'Russia', flag: '🇷🇺', count: 21, x: 65, y: 22 },
];

export function Explore() {
  const navigate = useNavigate();
  const globeRef = useRef<HTMLDivElement>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(countryData[6]); // Japan default
  const [activeTab, setActiveTab] = useState<'picks' | 'new' | 'genres'>('picks');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [pinnedCountries, setPinnedCountries] = useState<string[]>(['USA', 'Japan', 'UK']);
  const [searchQuery, setSearchQuery] = useState('');

  const countryMovies = movies.filter(m => 
    selectedCountry.name === 'USA' ? m.country === 'USA' : 
    selectedCountry.name === 'UK' ? m.country === 'UK' :
    selectedCountry.name === 'Japan' ? m.country === 'Japan' :
    selectedCountry.name === 'South Korea' ? m.country === 'South Korea' :
    selectedCountry.name === 'France' ? m.country === 'France' :
    true
  ).slice(0, 6);

  const handleSpin = () => {
    setIsSpinning(true);
    const spinDuration = 2000;
    const startRotation = rotation;
    const endRotation = startRotation + 720 + Math.random() * 360;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (endRotation - startRotation) * easeOut;
      
      setRotation(currentRotation);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        const randomCountry = countryData[Math.floor(Math.random() * countryData.length)];
        setSelectedCountry(randomCountry);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const togglePin = (country: string) => {
    if (pinnedCountries.includes(country)) {
      setPinnedCountries(pinnedCountries.filter(c => c !== country));
    } else {
      setPinnedCountries([...pinnedCountries, country]);
    }
  };

  return (
    <div className="min-h-screen pt-16">
      <div className="animated-bg" />
      
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        {/* Main Content - Globe Area */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-6 lg:p-10">
          {/* Title */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center z-10">
            <p className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">Movie Universe</p>
            <h1 className="heading-display text-2xl text-white">Explore by Location</h1>
          </div>

          {/* Search */}
          <div className="absolute top-6 left-6 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-cinematic pl-10 pr-4 py-2 w-48 lg:w-64 text-sm"
              />
            </div>
          </div>

          {/* Globe Container */}
          <div className="relative w-full max-w-lg aspect-square mt-16 lg:mt-0" ref={globeRef}>
            {/* Outer Glow Ring */}
            <div className="absolute inset-0 rounded-full"
              style={{ 
                background: 'radial-gradient(circle, transparent 60%, rgba(59, 130, 246, 0.1) 100%)',
                filter: 'blur(20px)'
              }} />
            
            {/* Globe Frame */}
            <div className="absolute inset-2 rounded-full border border-white/10" />
            <div className="absolute inset-4 rounded-full border border-white/5" />
            
            {/* The Globe */}
            <div 
              className="absolute inset-6 rounded-full overflow-hidden"
              style={{ 
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'none' : 'transform 0.5s ease-out',
                boxShadow: 'inset -30px -30px 80px rgba(0, 0, 0, 0.8), inset 20px 20px 50px rgba(100, 149, 237, 0.15)'
              }}
            >
              {/* Ocean Base */}
              <div className="absolute inset-0"
                style={{ 
                  background: 'linear-gradient(135deg, #1a3a5c 0%, #0d2137 50%, #1e3a5f 100%)'
                }} />
              
              {/* Continents - SVG Map */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ opacity: 0.8 }}>
                {/* North America */}
                <path d="M8 20 Q15 15 25 18 Q30 22 28 32 Q22 38 12 35 Q8 28 8 20 Z" 
                  fill="#2d5a3d" opacity="0.9" />
                {/* South America */}
                <path d="M18 45 Q28 42 30 52 Q28 68 22 75 Q15 68 16 55 Z" 
                  fill="#2d5a3d" opacity="0.9" />
                {/* Europe */}
                <path d="M42 22 Q52 18 58 24 Q55 32 48 30 Q42 28 42 22 Z" 
                  fill="#2d5a3d" opacity="0.9" />
                {/* Africa */}
                <path d="M45 35 Q58 32 60 45 Q58 62 50 68 Q42 58 44 42 Z" 
                  fill="#2d5a3d" opacity="0.9" />
                {/* Asia */}
                <path d="M58 18 Q78 15 82 28 Q78 42 65 40 Q55 35 58 18 Z" 
                  fill="#2d5a3d" opacity="0.9" />
                {/* Australia */}
                <path d="M72 65 Q85 62 88 72 Q85 82 72 78 Z" 
                  fill="#2d5a3d" opacity="0.9" />
                
                {/* Grid Lines */}
                <ellipse cx="50" cy="50" rx="48" ry="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
                <ellipse cx="50" cy="50" rx="48" ry="35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
                <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
                <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
              </svg>
              
              {/* Country Markers */}
              {countryData.map((country) => (
                <button
                  key={country.name}
                  onClick={() => setSelectedCountry(country)}
                  className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center text-lg transition-all duration-300 hover:scale-150 z-10"
                  style={{ 
                    left: `${country.x}%`, 
                    top: `${country.y}%`,
                    background: selectedCountry.name === country.name 
                      ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' 
                      : 'rgba(0,0,0,0.6)',
                    boxShadow: selectedCountry.name === country.name 
                      ? '0 0 20px rgba(220, 38, 38, 0.8)' 
                      : '0 0 10px rgba(0,0,0,0.5)',
                    border: selectedCountry.name === country.name ? '2px solid white' : '1px solid rgba(255,255,255,0.3)'
                  }}
                >
                  {country.flag}
                </button>
              ))}
              
              {/* Atmosphere Glow */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ 
                  background: 'radial-gradient(circle at 30% 30%, rgba(100, 180, 255, 0.2) 0%, transparent 50%)'
                }} />
            </div>

            {/* Outer Shadow */}
            <div className="absolute inset-6 rounded-full pointer-events-none"
              style={{ 
                background: 'linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.5) 100%)'
              }} />

            {/* Location Indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="relative">
                <div className="w-4 h-4 rounded-full animate-ping absolute"
                  style={{ background: 'rgba(220, 38, 38, 0.5)' }} />
                <div className="w-4 h-4 rounded-full relative border-2 border-white"
                  style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }} />
              </div>
            </div>
          </div>

          {/* Spin Button */}
          <Button 
            onClick={handleSpin}
            disabled={isSpinning}
            className="mt-8 w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
            style={{ 
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              boxShadow: '0 0 40px rgba(220, 38, 38, 0.4)'
            }}
          >
            <RotateCw className={`w-7 h-7 ${isSpinning ? 'animate-spin' : ''}`} />
          </Button>
          <p className="text-mono text-xs text-muted-foreground mt-3">Spin the Globe</p>

          {/* Pinned Countries */}
          <div className="absolute bottom-6 left-6">
            <p className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Pinned Countries</p>
            <div className="flex gap-2 flex-wrap">
              {pinnedCountries.map(country => (
                <button
                  key={country}
                  onClick={() => {
                    const c = countryData.find(cd => cd.name === country);
                    if (c) setSelectedCountry(c);
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110 ${
                    selectedCountry.name === country 
                      ? 'ring-2 ring-white' 
                      : ''
                  }`}
                  style={{ 
                    background: selectedCountry.name === country 
                      ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
                      : 'rgba(255,255,255,0.1)',
                    boxShadow: selectedCountry.name === country 
                      ? '0 0 20px rgba(220, 38, 38, 0.5)' 
                      : 'none'
                  }}
                >
                  {countryData.find(c => c.name === country)?.flag}
                </button>
              ))}
              <button className="w-10 h-10 rounded-full flex items-center justify-center border border-dashed border-white/30 text-muted-foreground hover:bg-white/5 transition-all">
                +
              </button>
            </div>
          </div>

          {/* Film Passport */}
          <div className="absolute bottom-6 right-6 text-right">
            <p className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">Film Passport</p>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ 
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>12</p>
                <p className="text-xs text-muted-foreground">countries</p>
              </div>
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(251, 191, 36, 0.2) 100%)',
                  border: '2px solid rgba(245, 158, 11, 0.5)'
                }}>
                <Plane className="w-6 h-6" style={{ color: '#fbbf24' }} />
              </div>
            </div>
            <button className="text-sm font-medium mt-2 hover:text-red-400 transition-colors"
              style={{ color: '#fbbf24' }}>
              Start World Tour
            </button>
          </div>
        </div>

        {/* Right Panel - Country Hub */}
        <div className="lg:w-96 flex-shrink-0 p-6 overflow-y-auto border-l border-white/[0.06]"
          style={{ background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(20px)' }}>
          {/* Location Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ 
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)',
                border: '1px solid rgba(220, 38, 38, 0.3)'
              }}>
              {selectedCountry.flag}
            </div>
            <div className="flex-1">
              <p className="text-mono text-xs uppercase tracking-wider text-muted-foreground">Scene Location</p>
              <h2 className="text-2xl font-bold">{selectedCountry.name}</h2>
            </div>
            <button 
              onClick={() => togglePin(selectedCountry.name)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                pinnedCountries.includes(selectedCountry.name) 
                  ? '' 
                  : 'hover:bg-white/5'
              }`}
              style={pinnedCountries.includes(selectedCountry.name) ? {
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)'
              } : { background: 'rgba(255,255,255,0.05)' }}
            >
              <Bookmark className={`w-4 h-4 ${pinnedCountries.includes(selectedCountry.name) ? 'fill-white' : ''}`} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 rounded-xl text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{selectedCountry.count}</p>
              <p className="text-xs text-muted-foreground">Films</p>
            </div>
            <div className="p-4 rounded-xl text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>8.4</p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(['picks', 'new', 'genres'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  activeTab === tab 
                    ? 'text-white' 
                    : 'text-muted-foreground hover:text-white'
                }`}
                style={activeTab === tab ? {
                  background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)',
                  boxShadow: '0 0 20px rgba(220, 38, 38, 0.2)'
                } : { background: 'rgba(255,255,255,0.05)' }}
              >
                {tab === 'picks' ? 'Top Picks' : tab === 'new' ? 'New' : 'Genres'}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Genre</label>
              <FilterChips 
                options={genres.slice(0, 6)} 
                selected={selectedGenres}
                onChange={setSelectedGenres}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Year</label>
                <select className="w-full input-cinematic text-sm py-2">
                  <option>All Years</option>
                  <option>2025</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2020s</option>
                  <option>2010s</option>
                </select>
              </div>
              <div>
                <label className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Score</label>
                <select className="w-full input-cinematic text-sm py-2">
                  <option>Any Score</option>
                  <option>9+</option>
                  <option>8+</option>
                  <option>7+</option>
                </select>
              </div>
            </div>
          </div>

          {/* Movie List */}
          <div className="space-y-3">
            <p className="text-mono text-xs uppercase tracking-wider text-muted-foreground">
              {countryMovies.length} films found
            </p>
            {countryMovies.map((movie) => (
              <div 
                key={movie.id}
                onClick={() => navigate(`/review/${movie.id}`)}
                className="flex gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                style={{ 
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <PosterImage src={movie.poster} title={movie.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{movie.title}</h4>
                  <p className="text-xs text-muted-foreground">{movie.year}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold" style={{ color: '#ef4444' }}>{movie.score.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{movie.genres[0]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button 
            onClick={() => navigate('/browse')}
            className="w-full btn-primary mt-6"
          >
            <Compass className="w-4 h-4 mr-2" />
            Explore {selectedCountry.name} Cinema
          </Button>
        </div>
      </div>
    </div>
  );
}
