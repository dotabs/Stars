import { Link } from 'react-router-dom';
import { Star, Twitter, Instagram, Youtube, Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]" style={{ background: 'rgba(10, 10, 15, 0.9)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)' }}>
                <Star className="w-5 h-5 fill-white text-white" />
              </div>
              <span className="text-2xl font-bold heading-gradient">STARS</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every film earns its verdict. Discover, review, and track the movies that matter.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Discover */}
          <div>
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider">Discover</h3>
            <ul className="space-y-3">
              <li><Link to="/browse" className="text-sm text-muted-foreground hover:text-white transition-colors">Browse All</Link></li>
              <li><Link to="/explore" className="text-sm text-muted-foreground hover:text-white transition-colors">Explore by Country</Link></li>
              <li><Link to="/lists" className="text-sm text-muted-foreground hover:text-white transition-colors">Editor Lists</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground hover:text-white transition-colors">New Releases</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground hover:text-white transition-colors">Classics</Link></li>
            </ul>
          </div>

          {/* Browse By */}
          <div>
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider">Browse By</h3>
            <ul className="space-y-3">
              <li><Link to="/browse" className="text-sm text-muted-foreground hover:text-white transition-colors">Decade</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground hover:text-white transition-colors">Genre</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground hover:text-white transition-colors">Actors</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground hover:text-white transition-colors">Directors</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground hover:text-white transition-colors">Streaming</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-white transition-colors">About</Link></li>
              <li><Link to="/ethics" className="text-sm text-muted-foreground hover:text-white transition-colors">Review Ethics</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-white transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 STARS. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Made with passion for cinema
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
