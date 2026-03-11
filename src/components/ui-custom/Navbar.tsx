import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Bell, Menu, Star, X } from 'lucide-react';
import { SiteSearch } from './SiteSearch';

export function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/explore', label: 'Explore' },
    { path: '/browse', label: 'Browse' },
    { path: '/lists', label: 'Lists' },
    { path: '/watchlist', label: 'Watchlist' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] backdrop-blur-xl"
      style={{ background: 'rgba(10, 8, 7, 0.78)' }}
    >
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-[4.5rem] items-center justify-between gap-4">
          <Link to="/" className="group flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #d26d47 0%, #9f472a 100%)',
                boxShadow: '0 12px 24px rgba(159, 71, 42, 0.35)',
              }}
            >
              <Star className="h-4 w-4 fill-white text-white" />
            </div>
            <div className="leading-none">
              <span className="heading-display heading-gradient block text-2xl">STARS</span>
            </div>
          </Link>

          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.9)] md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  isActive(link.path) ? 'text-white' : 'text-muted-foreground hover:text-white'
                }`}
                style={
                  isActive(link.path)
                    ? {
                        background: 'linear-gradient(135deg, rgba(210, 109, 71, 0.18) 0%, rgba(132, 58, 36, 0.16) 100%)',
                        boxShadow: '0 0 20px rgba(166, 66, 34, 0.18)',
                      }
                    : {}
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <SiteSearch variant="desktop" />
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-all hover:border-white/10 hover:bg-white/5 hover:text-white">
              <Bell className="h-4 w-4" />
              <span
                className="absolute right-2 top-2 h-2 w-2 rounded-full"
                style={{ background: 'linear-gradient(135deg, #d26d47 0%, #f4b684 100%)' }}
              />
            </button>
            <Link
              to="/login"
              className="hidden items-center gap-2 rounded-full border border-[#d26d47]/25 bg-[#d26d47]/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-[#d26d47]/45 hover:bg-[#d26d47]/15 sm:flex"
            >
              Sign in
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all hover:scale-105 sm:hidden"
              style={{
                background: 'linear-gradient(135deg, #d26d47 0%, #9f472a 100%)',
                boxShadow: '0 0 15px rgba(210, 109, 71, 0.24)',
              }}
            >
              S
            </Link>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/5 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="border-t border-white/[0.06] backdrop-blur-xl md:hidden"
          style={{ background: 'rgba(12, 9, 8, 0.96)' }}
        >
          <div className="space-y-1 px-4 py-4">
            <div className="mb-3 md:hidden">
              <SiteSearch variant="mobile" onAfterNavigate={() => setMobileMenuOpen(false)} />
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-xl px-4 py-3 font-medium transition-all ${
                  isActive(link.path) ? 'text-white' : 'text-muted-foreground'
                }`}
                style={
                  isActive(link.path)
                    ? {
                        background: 'linear-gradient(135deg, rgba(210, 109, 71, 0.18) 0%, rgba(132, 58, 36, 0.16) 100%)',
                      }
                    : {}
                }
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-3 block rounded-xl border border-[#d26d47]/30 bg-[#d26d47]/10 px-4 py-3 text-sm font-semibold text-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
