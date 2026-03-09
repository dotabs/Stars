import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bell, Star, Menu, X } from 'lucide-react';

interface NavbarProps {
  onSubscribe?: () => void;
}

export function Navbar({ }: NavbarProps) {
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
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/[0.06]"
      style={{ background: 'rgba(10, 10, 15, 0.85)' }}>
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)' }}>
              <Star className="w-4 h-4 fill-white text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight heading-gradient">STARS</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive(link.path) 
                    ? 'text-white' 
                    : 'text-muted-foreground hover:text-white'
                }`}
                style={isActive(link.path) ? {
                  background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)',
                  boxShadow: '0 0 20px rgba(220, 38, 38, 0.2)'
                } : {}}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-all">
              <Search className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-all relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" 
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }} />
            </button>
            <Link 
              to="/login"
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                boxShadow: '0 0 15px rgba(220, 38, 38, 0.3)'
              }}
            >
              JD
            </Link>
            
            {/* Mobile Menu Button */}
            <button 
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden backdrop-blur-xl border-t border-white/[0.06]"
          style={{ background: 'rgba(10, 10, 15, 0.95)' }}>
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-3 px-4 rounded-xl font-medium transition-all ${
                  isActive(link.path) 
                    ? 'text-white' 
                    : 'text-muted-foreground'
                }`}
                style={isActive(link.path) ? {
                  background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)'
                } : {}}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
