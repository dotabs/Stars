import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui-custom/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAuthErrorMessage, logInWithEmail } from '@/lib/firebase';
export function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Preserve the protected route the user originally tried to visit before being redirected to sign in.
    const redirectTo = location.state?.from?.pathname || '/';
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setIsSubmitting(true);
        try {
            await logInWithEmail({
                email: email.trim(),
                password,
            });
            navigate(redirectTo, { replace: true });
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
            background: 'radial-gradient(circle at 18% 20%, rgba(210,109,71,0.28) 0%, transparent 28%), radial-gradient(circle at 76% 18%, rgba(244,182,132,0.18) 0%, transparent 24%), radial-gradient(circle at 28% 78%, rgba(164,56,32,0.18) 0%, transparent 26%), radial-gradient(circle at 82% 72%, rgba(255,255,255,0.08) 0%, transparent 22%), linear-gradient(135deg, rgba(23,17,15,0.98) 0%, rgba(10,8,7,0.96) 42%, rgba(18,20,28,0.94) 100%)',
            filter: 'blur(48px) saturate(115%)'
        }}/>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/60"/>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <BrandLogo
              className="mb-5 justify-center"
              stacked
              markClassName="h-16 w-16"
              titleClassName="text-[2.4rem]"
              taglineClassName="text-[11px] tracking-[0.34em] text-white/42"
            />
            <h1 className="heading-display text-3xl">Welcome Back</h1>
            <p className="text-muted-foreground mt-2">Sign in to continue your cinematic journey</p>
          </div>

          {/* Form Card */}
          <div className="card-cinematic p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input-cinematic" required/>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Password</label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-cinematic pr-10" required/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-white/20 bg-transparent"/>
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <span className="text-muted-foreground">Email/password sign-in</span>
              </div>

              {errorMessage && (<p className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </p>)}

              <Button type="submit" className="w-full btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Continue'}
                <ArrowRight className="w-4 h-4 ml-2"/>
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>);
}
