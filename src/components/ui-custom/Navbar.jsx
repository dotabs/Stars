import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Bell, LogIn, Mail, Menu, User, X } from 'lucide-react';
import { useAuth } from '@/components/auth/useAuth';
import { BrandLogo } from '@/components/ui-custom/BrandLogo';
import { SiteSearch } from '@/components/ui-custom/SiteSearch';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { preloadAppRoute } from '@/lib/route-preload';
import { getUserDisplayName, getUserInitials } from '@/lib/user-display';
import { useUnreadNotificationsCount } from '@/hooks/use-unread-notifications-count';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages-count';

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/explore', label: 'Explore' },
  { path: '/browse', label: 'Browse' },
  { path: '/lists', label: 'Lists' },
  { path: '/watchlist', label: 'Watchlist' },
];

function UserAvatar({ initials, photoURL = '', className = 'h-10 w-10' }) {
  const [hasImageError, setHasImageError] = useState(false);

  if (photoURL && !hasImageError) {
    return <img src={photoURL} alt="Profile avatar" className={`${className} rounded-full object-cover`} onError={() => setHasImageError(true)} />;
  }

  return (
    <span
      className={`flex items-center justify-center rounded-full text-sm font-bold text-white ${className}`}
      style={{
        background: 'linear-gradient(135deg, #d26d47 0%, #9f472a 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 10px 24px rgba(159, 71, 42, 0.24)',
      }}
    >
      {initials}
    </span>
  );
}

export function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const { currentUser, isAuthenticated, logOut } = useAuth();
  const displayName = getUserDisplayName(currentUser);
  const initials = getUserInitials(currentUser);
  const unreadNotificationsCount = useUnreadNotificationsCount(currentUser?.uid);
  const unreadMessagesCount = useUnreadMessagesCount(currentUser?.uid);
  const showNavbarSearch = location.pathname === '/';

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    setLogoutError('');

    try {
      await logOut();
      setMobileMenuOpen(false);
    } catch (error) {
      setLogoutError('Unable to log out right now. Please try again.');
      console.error(error);
    }
  };

  return (
    <nav
      className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] backdrop-blur-xl"
      style={{ background: 'linear-gradient(180deg, rgba(9, 8, 8, 0.9) 0%, rgba(9, 8, 8, 0.72) 100%)' }}
    >
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-[4.5rem] items-center justify-between gap-4">
          <Link to="/" className="group flex items-center gap-3">
            <BrandLogo markClassName="transition-all duration-300 group-hover:scale-105" />
          </Link>

          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/22 p-1.5 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.9)] md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onMouseEnter={() => preloadAppRoute(link.path)}
                onFocus={() => preloadAppRoute(link.path)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${isActive(link.path) ? 'text-white' : 'text-muted-foreground hover:text-white'}`}
                style={
                  isActive(link.path)
                    ? {
                        background: 'linear-gradient(135deg, rgba(210, 109, 71, 0.2) 0%, rgba(132, 58, 36, 0.16) 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px rgba(166, 66, 34, 0.16)',
                      }
                    : {}
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {showNavbarSearch ? <SiteSearch variant="desktop" /> : null}
            {isAuthenticated ? (
              <>
                <Link to="/notifications" className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white transition-all hover:border-[#d26d47]/35 hover:bg-white/[0.06] sm:flex">
                  <Bell className="h-4 w-4" />
                  {unreadNotificationsCount > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-[#d26d47] px-1.5 py-0.5 text-[10px] font-semibold text-white">{Math.min(unreadNotificationsCount, 99)}</span> : null}
                </Link>
                <Link to="/messages" className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white transition-all hover:border-[#d26d47]/35 hover:bg-white/[0.06] sm:flex">
                  <Mail className="h-4 w-4" />
                  {unreadMessagesCount > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-[#d26d47] px-1.5 py-0.5 text-[10px] font-semibold text-white">{Math.min(unreadMessagesCount, 99)}</span> : null}
                </Link>
                <HoverCard openDelay={120}>
                  <HoverCardTrigger asChild>
                    <button className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-4 text-left transition-all duration-300 hover:border-[#d26d47]/35 hover:bg-white/[0.06] sm:flex">
                      <UserAvatar initials={initials} photoURL={currentUser?.photoURL} />
                      <span className="min-w-0">
                        <span className="block max-w-[9rem] truncate text-sm font-semibold text-white">{displayName}</span>
                        <span className="block text-xs text-white/45">Account</span>
                      </span>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    align="end"
                    className="w-56 rounded-2xl border-white/10 bg-[#14100f]/95 p-2 text-white shadow-[0_24px_60px_-32px_rgba(0,0,0,0.95)] backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                      <UserAvatar initials={initials} photoURL={currentUser?.photoURL} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                        <p className="text-xs text-muted-foreground">Signed in</p>
                      </div>
                    </div>
                    <Link to="/profile" className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/82 transition-all hover:bg-white/[0.05] hover:text-white">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link to="/notifications" className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/82 transition-all hover:bg-white/[0.05] hover:text-white">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </Link>
                    <Link to="/messages" className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/82 transition-all hover:bg-white/[0.05] hover:text-white">
                      <Mail className="h-4 w-4" />
                      Messages
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="mt-1 w-full rounded-xl border border-[#d26d47]/25 bg-[#d26d47]/10 px-3 py-2 text-left text-sm font-semibold text-white transition-all hover:border-[#d26d47]/45 hover:bg-[#d26d47]/15"
                    >
                      Logout
                    </button>
                  </HoverCardContent>
                </HoverCard>

                <button
                  onClick={handleLogout}
                  className="flex h-10 min-w-10 items-center justify-center overflow-hidden rounded-full px-3 text-sm font-bold transition-all hover:scale-105 sm:hidden"
                  style={{
                    background: 'linear-gradient(135deg, #d26d47 0%, #9f472a 100%)',
                    boxShadow: '0 0 15px rgba(210, 109, 71, 0.24)',
                  }}
                >
                  {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="Profile avatar" className="h-full w-full object-cover" /> : initials}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden items-center gap-2 rounded-full border border-[#d26d47]/25 bg-[#d26d47]/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-[#d26d47]/45 hover:bg-[#d26d47]/15 sm:flex">
                  Sign in
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  aria-label="Sign in"
                  className="flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-white transition-all hover:scale-105 sm:hidden"
                  style={{
                    background: 'linear-gradient(135deg, #d26d47 0%, #9f472a 100%)',
                    boxShadow: '0 0 15px rgba(210, 109, 71, 0.24)',
                  }}
                >
                  <LogIn className="h-4 w-4" />
                  <span className="sr-only">Sign in</span>
                </Link>
              </>
            )}

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
        <div className="border-t border-white/[0.06] backdrop-blur-xl md:hidden" style={{ background: 'rgba(12, 9, 8, 0.96)' }}>
          <div className="space-y-1 px-4 py-4">
            {isAuthenticated && (
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                <UserAvatar initials={initials} photoURL={currentUser?.photoURL} className="h-11 w-11" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                  <p className="text-xs text-muted-foreground">Account</p>
                </div>
              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onMouseEnter={() => preloadAppRoute(link.path)}
                onFocus={() => preloadAppRoute(link.path)}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-xl px-4 py-3 font-medium transition-all ${isActive(link.path) ? 'text-white' : 'text-muted-foreground'}`}
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

            {isAuthenticated ? (
              <>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="mt-3 block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white">Profile</Link>
                <Link to="/notifications" onClick={() => setMobileMenuOpen(false)} className="mt-2 block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white">Notifications</Link>
                <Link to="/messages" onClick={() => setMobileMenuOpen(false)} className="mt-2 block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white">Messages</Link>
                <button onClick={handleLogout} className="mt-3 block w-full rounded-xl border border-[#d26d47]/30 bg-[#d26d47]/10 px-4 py-3 text-left text-sm font-semibold text-white">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="mt-3 block rounded-xl border border-[#d26d47]/30 bg-[#d26d47]/10 px-4 py-3 text-sm font-semibold text-white">
                Sign in
              </Link>
            )}

            {logoutError && <p className="pt-3 text-sm text-red-300">{logoutError}</p>}
          </div>
        </div>
      )}
    </nav>
  );
}
