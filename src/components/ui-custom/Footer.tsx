import { Link } from 'react-router-dom';
import { ArrowUpRight, Instagram, Star, Twitter, Youtube } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/[0.06]" style={{ background: 'rgba(10, 8, 7, 0.92)' }}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr_0.9fr_1fr] lg:gap-12">
          <div>
            <Link to="/" className="group mb-5 flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl transition-all group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #d26d47 0%, #9f472a 100%)',
                  boxShadow: '0 12px 26px rgba(159, 71, 42, 0.35)',
                }}
              >
                <Star className="h-5 w-5 fill-white text-white" />
              </div>
              <div>
                <span className="heading-display heading-gradient block text-3xl">STARS</span>
                <span className="section-kicker !text-[0.58rem] !tracking-[0.28em] text-white/45">
                  Editorial Film Guide
                </span>
              </div>
            </Link>
            <p className="max-w-sm text-sm leading-7 text-muted-foreground">
              A sharper-looking front page deserves a sharper closing note. STARS should read like a publication,
              not a utility dashboard.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Discover</h3>
            <ul className="space-y-3">
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Browse All</Link></li>
              <li><Link to="/explore" className="text-sm text-muted-foreground transition-colors hover:text-white">Explore by Country</Link></li>
              <li><Link to="/lists" className="text-sm text-muted-foreground transition-colors hover:text-white">Editor Lists</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">New Releases</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Classics</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Browse By</h3>
            <ul className="space-y-3">
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Decade</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Genre</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Actors</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Directors</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Streaming</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Newsletter</h3>
            <p className="max-w-xs text-sm leading-7 text-muted-foreground">
              Weekly notes on new releases, archive picks, and the reviews worth opening first.
            </p>
            <Link
              to="/signup"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#d26d47]/30 bg-[#d26d47]/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-[#d26d47]/45 hover:bg-[#d26d47]/15"
            >
              Join the list
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">Copyright 2026 STARS. All rights reserved.</p>
            <p className="text-sm text-muted-foreground">
              Built to feel more like a journal and less like a dashboard.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

