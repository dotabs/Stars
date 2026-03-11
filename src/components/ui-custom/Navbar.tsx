import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Bell, Menu, Search, Star, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '');

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

  useEffect(() => {
    if (location.pathname === '/browse') {
      setSearchValue(searchParams.get('q') ?? '');
    }
  }, [location.pathname, searchParams]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchValue.trim();

    navigate(query ? `/browse?q=${encodeURIComponent(query)}` : '/browse');
    setMobileMenuOpen(false);
  };

  const clearSearch = () => {
    setSearchValue('');

    if (location.pathname === '/browse' && searchParams.get('q')) {
      navigate('/browse');
    }
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
            <form
              onSubmit={submitSearch}
              className="search-input-shell hidden lg:block"
              role="search"
              aria-label="Search movies"
            >
              <Search className="search-input-icon" />
              <Input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search movies"
                className="search-input-field search-input-field-with-action h-10 w-56 rounded-full border-white/10 bg-black/20 text-sm text-white placeholder:text-muted-foreground hover:border-white/20 focus-visible:ring-white/20"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-11 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 flex h-7 min-w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-2 text-[11px] font-semibold text-white transition-all hover:border-white/20 hover:bg-white/[0.08]"
                aria-label="Submit search"
              >
                Go
              </button>
            </form>
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
            <form onSubmit={submitSearch} className="mb-3 md:hidden" role="search" aria-label="Search movies">
              <div className="search-input-shell">
                <Search className="search-input-icon" />
                <Input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search movies"
                  className="search-input-field search-input-field-with-clear-and-action h-11 rounded-xl border-white/10 bg-black/20 text-white"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white -translate-y-1/2"
                >
                  Search
                </button>
              </div>
            </form>
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
