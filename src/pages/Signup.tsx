import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const genres = [
  'Action', 'Comedy', 'Drama', 'Horror', 
  'Sci-Fi', 'Romance', 'Documentary', 'Thriller', 'Animation'
];

export function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [safeImagery, setSafeImagery] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      // Mock signup - would connect to auth service
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at 14% 18%, rgba(244,182,132,0.24) 0%, transparent 26%), radial-gradient(circle at 82% 14%, rgba(210,109,71,0.22) 0%, transparent 24%), radial-gradient(circle at 74% 80%, rgba(159,71,42,0.18) 0%, transparent 22%), radial-gradient(circle at 24% 78%, rgba(255,255,255,0.07) 0%, transparent 20%), linear-gradient(135deg, rgba(19,14,12,0.98) 0%, rgba(11,9,8,0.97) 38%, rgba(19,18,28,0.94) 100%)',
            filter: 'blur(48px) saturate(118%)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 fill-white text-white" />
            </div>
            <h1 className="heading-display text-3xl">
              {step === 1 ? 'Create Your Account' : 'Personalize Your Feed'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {step === 1 
                ? 'Join the STARS community' 
                : 'Pick a few genres to get started'}
            </p>
          </div>

          {/* Progress */}
          <div className="flex justify-center gap-2 mb-6">
            <div className={`w-8 h-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-white/20'}`} />
            <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-white/20'}`} />
          </div>

          {/* Form Card */}
          <div className="card-cinematic p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {step === 1 ? (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Full Name</label>
                    <Input 
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-cinematic"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <Input 
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-cinematic"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Password</label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-cinematic pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Must be at least 8 characters
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-white/20 bg-transparent" required />
                    <span className="text-sm text-muted-foreground">
                      I agree to the{' '}
                      <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                      {' '}and{' '}
                      <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium mb-4 block">
                      Select your favorite genres ({selectedGenres.length} selected)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {genres.map((genre) => (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => toggleGenre(genre)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            selectedGenres.includes(genre)
                              ? 'bg-primary text-white'
                              : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                          }`}
                        >
                          {selectedGenres.includes(genre) && (
                            <Check className="w-3 h-3 inline mr-1" />
                          )}
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">Safe imagery</span>
                        <p className="text-xs text-muted-foreground">Blur potentially disturbing images</p>
                      </div>
                      <Switch checked={safeImagery} onCheckedChange={setSafeImagery} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">Reduce motion</span>
                        <p className="text-xs text-muted-foreground">Minimize animations</p>
                      </div>
                      <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full btn-primary">
                {step === 1 ? (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            {step === 1 && (
              <>
                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-muted-foreground uppercase">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Social Login */}
                <div className="space-y-3">
                  <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
