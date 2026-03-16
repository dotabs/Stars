import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAuthErrorMessage, signUpWithEmail } from '@/lib/firebase';
export function Signup() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters.');
            return;
        }
        setIsSubmitting(true);
        try {
            await signUpWithEmail({
                name,
                email: email.trim(),
                password,
            });
            navigate('/', { replace: true });
        }
        catch (error) {
            setErrorMessage(getAuthErrorMessage(error));
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-30" style={{
            background: 'radial-gradient(circle at 14% 18%, rgba(244,182,132,0.24) 0%, transparent 26%), radial-gradient(circle at 82% 14%, rgba(210,109,71,0.22) 0%, transparent 24%), radial-gradient(circle at 74% 80%, rgba(159,71,42,0.18) 0%, transparent 22%), radial-gradient(circle at 24% 78%, rgba(255,255,255,0.07) 0%, transparent 20%), linear-gradient(135deg, rgba(19,14,12,0.98) 0%, rgba(11,9,8,0.97) 38%, rgba(19,18,28,0.94) 100%)',
            filter: 'blur(48px) saturate(118%)'
        }}/>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/60"/>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 fill-white text-white"/>
            </div>
            <h1 className="heading-display text-3xl">Create Your Account</h1>
            <p className="text-muted-foreground mt-2">Join the STARS community</p>
          </div>

          {/* Form Card */}
          <div className="card-cinematic p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Full Name</label>
                <Input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="input-cinematic" required/>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input-cinematic" required/>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Password</label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-cinematic pr-10" required/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Must be at least 6 characters
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-white/20 bg-transparent" required/>
                <span className="text-sm text-muted-foreground">
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </span>
              </div>

              {errorMessage && (<p className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </p>)}

              <Button type="submit" className="w-full btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
                <ArrowRight className="w-4 h-4 ml-2"/>
              </Button>
            </form>
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
    </div>);
}
