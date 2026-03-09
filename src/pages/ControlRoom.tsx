import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  Palette, 
  Compass, 
  Layout, 
  Globe, 
  Shield, 
  Heart,
  GripVertical,
  X,
  Check
} from 'lucide-react';

const menuItems = [
  { id: 'taste', label: 'My Taste', icon: Heart },
  { id: 'discovery', label: 'Discovery Rules', icon: Compass },
  { id: 'theme', label: 'Visual Theme', icon: Palette },
  { id: 'layout', label: 'Home Layout', icon: Layout },
  { id: 'globe', label: 'Globe Settings', icon: Globe },
  { id: 'safety', label: 'Spoilers & Safety', icon: Shield },
];

const genres = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 
  'Drama', 'Family', 'Fantasy', 'Horror', 'Musical', 'Mystery', 
  'Romance', 'Sci-Fi', 'Thriller'
];

const homeSections = [
  { id: 'spotlight', label: 'Curated Spotlight', enabled: true },
  { id: 'latest', label: 'Latest Reviews', enabled: true },
  { id: 'explore', label: 'Explore the World', enabled: true },
  { id: 'trending', label: 'Trending Now', enabled: true },
  { id: 'lists', label: 'Editor Lists', enabled: false },
];

export function ControlRoom() {
  const [activeMenu, setActiveMenu] = useState('taste');
  
  // Taste preferences
  const [genreWeights, setGenreWeights] = useState<Record<string, number>>({
    'Drama': 8, 'Sci-Fi': 9, 'Thriller': 7, 'Comedy': 5
  });
  const [preferredGenres, setPreferredGenres] = useState<string[]>(['Drama', 'Sci-Fi', 'Thriller']);
  
  // Discovery rules
  const [spotlightFrequency, setSpotlightFrequency] = useState('weekly');
  const [spotlightSource, setSpotlightSource] = useState('editors');
  
  // Visual theme
  const [reduceMotion, setReduceMotion] = useState(false);
  const [safeImagery, setSafeImagery] = useState(false);
  
  // Globe settings
  const [globeBias, setGlobeBias] = useState(50);
  const [pinnedCountries, setPinnedCountries] = useState<string[]>(['USA', 'Japan', 'UK']);
  
  // Layout
  const [sections, setSections] = useState(homeSections);
  
  // Safety
  const [spoilerBlur, setSpoilerBlur] = useState(true);
  const [contentWarnings, setContentWarnings] = useState(true);

  const toggleGenre = (genre: string) => {
    if (preferredGenres.includes(genre)) {
      setPreferredGenres(preferredGenres.filter(g => g !== genre));
    } else {
      setPreferredGenres([...preferredGenres, genre]);
    }
  };

  const toggleSection = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const removePinnedCountry = (country: string) => {
    setPinnedCountries(pinnedCountries.filter(c => c !== country));
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'taste':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Preferred Genres</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Select genres you enjoy. We'll prioritize these in your recommendations.
              </p>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      preferredGenres.includes(genre)
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {preferredGenres.includes(genre) && <Check className="w-3 h-3 inline mr-1" />}
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Genre Weighting</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Adjust how heavily each genre influences your recommendations.
              </p>
              <div className="space-y-6">
                {Object.entries(genreWeights).map(([genre, weight]) => (
                  <div key={genre}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">{genre}</span>
                      <span className="text-sm text-muted-foreground">{weight}/10</span>
                    </div>
                    <Slider 
                      value={[weight]}
                      onValueChange={([v]) => setGenreWeights({...genreWeights, [genre]: v})}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'discovery':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Spotlight Frequency</h3>
              <p className="text-muted-foreground text-sm mb-4">
                How often should we refresh your featured spotlight?
              </p>
              <div className="flex gap-3">
                {['daily', 'twice-weekly', 'weekly'].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setSpotlightFrequency(freq)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      spotlightFrequency === freq
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {freq === 'twice-weekly' ? 'Twice a week' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Spotlight Source</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Whose recommendations should appear in your spotlight?
              </p>
              <div className="flex gap-3">
                {[
                  { id: 'editors', label: 'Editors Only' },
                  { id: 'community', label: 'Community' },
                  { id: 'both', label: 'Both' }
                ].map((source) => (
                  <button
                    key={source.id}
                    onClick={() => setSpotlightSource(source.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      spotlightSource === source.id
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {source.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'theme':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div>
                <h3 className="font-semibold">Reduce Motion</h3>
                <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
              </div>
              <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div>
                <h3 className="font-semibold">Safe Imagery</h3>
                <p className="text-sm text-muted-foreground">Blur potentially disturbing poster images</p>
              </div>
              <Switch checked={safeImagery} onCheckedChange={setSafeImagery} />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Theme Preview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-card border border-white/[0.06]">
                  <p className="text-mono text-xs uppercase text-muted-foreground mb-2">Current</p>
                  <div className="h-20 rounded-lg bg-gradient-to-br from-[#0B0B0D] to-[#121216] flex items-center justify-center">
                    <span className="text-primary font-bold">STARS</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-card border border-white/[0.06] opacity-50">
                  <p className="text-mono text-xs uppercase text-muted-foreground mb-2">Alternative</p>
                  <div className="h-20 rounded-lg bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] flex items-center justify-center">
                    <span className="text-primary font-bold">STARS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'layout':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Home Section Order</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Enable/disable sections and drag to reorder your homepage.
              </p>
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <div 
                    key={section.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                    <span className="flex-1">{section.label}</span>
                    <Switch 
                      checked={section.enabled} 
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'globe':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">International Bias</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Adjust how much international cinema appears in your recommendations.
              </p>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Hollywood</span>
                <Slider 
                  value={[globeBias]}
                  onValueChange={([v]) => setGlobeBias(v)}
                  min={0}
                  max={100}
                  step={10}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">International</span>
              </div>
              <p className="text-center text-sm text-primary mt-2">{globeBias}% International</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Pinned Countries</h3>
              <p className="text-muted-foreground text-sm mb-4">
                These countries will always appear on your globe.
              </p>
              <div className="flex flex-wrap gap-2">
                {pinnedCountries.map((country) => (
                  <span 
                    key={country}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/20 text-primary text-sm"
                  >
                    {country}
                    <button onClick={() => removePinnedCountry(country)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button className="px-3 py-1.5 rounded-full border border-dashed border-white/20 text-muted-foreground text-sm hover:bg-white/5">
                  + Add Country
                </button>
              </div>
            </div>
          </div>
        );

      case 'safety':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div>
                <h3 className="font-semibold">Spoiler Blur</h3>
                <p className="text-sm text-muted-foreground">Blur spoiler content until clicked</p>
              </div>
              <Switch checked={spoilerBlur} onCheckedChange={setSpoilerBlur} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div>
                <h3 className="font-semibold">Content Warnings</h3>
                <p className="text-sm text-muted-foreground">Show warnings for sensitive content</p>
              </div>
              <Switch checked={contentWarnings} onCheckedChange={setContentWarnings} />
            </div>

            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <h3 className="font-semibold text-amber-500 mb-2">Blocked Content</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You haven't blocked any movies or keywords yet.
              </p>
              <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-500">
                Manage Blocked Content
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="flex min-h-[calc(100vh-64px)] flex-col lg:flex-row">
        {/* Mobile / Tablet Menu */}
        <aside className="lg:hidden border-b border-white/[0.06] bg-card/30 px-4 py-4">
          <h2 className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Control Room
          </h2>
          <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all ${
                  activeMenu === item.id
                    ? 'bg-primary/20 text-primary'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Desktop Menu */}
        <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0 bg-card/30 border-r border-white/[0.06] p-4 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          <h2 className="text-mono text-xs uppercase tracking-wider text-muted-foreground mb-4 px-3">
            Control Room
          </h2>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  activeMenu === item.id
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl">
            <h1 className="heading-display text-3xl mb-2">
              {menuItems.find(m => m.id === activeMenu)?.label}
            </h1>
            <p className="text-muted-foreground mb-8">
              Tune the algorithm, change the vibe, protect the experience.
            </p>
            
            {renderContent()}

            <div className="mt-12 pt-8 border-t border-white/[0.06]">
              <Button className="btn-primary">
                Save Changes
              </Button>
              <Button variant="outline" className="ml-3 btn-outline">
                Reset to Default
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
