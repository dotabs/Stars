import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui-custom/BrandLogo';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/[0.06]" style={{ background: 'rgba(10, 8, 7, 0.92)' }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-[0.95fr_0.9fr_0.9fr_1fr] lg:gap-12">
          <div className="border-b border-white/[0.06] pb-6 sm:border-b-0 sm:pb-0">
            <Link to="/" className="group mb-4 flex items-center gap-3 sm:mb-5">
              <BrandLogo
                showTagline={false}
                markClassName="transition-all duration-300 group-hover:scale-105"
                titleClassName="text-3xl"
              />
            </Link>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              A faster way to jump back into reviews, lists, and live movie discovery.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:contents">
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-white/72 sm:mb-4 sm:text-sm sm:tracking-wider">Discover</h3>
              <ul className="space-y-3">
                <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Browse All</Link></li>
                <li><Link to="/explore" className="text-sm text-muted-foreground transition-colors hover:text-white">Explore by Country</Link></li>
                <li><Link to="/lists" className="text-sm text-muted-foreground transition-colors hover:text-white">Editor Lists</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-white/72 sm:mb-4 sm:text-sm sm:tracking-wider">Browse By</h3>
              <ul className="space-y-3">
                <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Decade</Link></li>
                <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Genre</Link></li>
                <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Actors</Link></li>
                <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Directors</Link></li>
                <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Streaming</Link></li>
              </ul>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-white/72 sm:mb-4 sm:text-sm sm:tracking-wider">Start Here</h3>
              <p className="max-w-xs text-sm leading-6 text-muted-foreground sm:leading-7">
                Jump back into live discovery with the sections people actually use most.
              </p>
              <Link to="/browse" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#d26d47]/30 bg-[#d26d47]/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-[#d26d47]/45 hover:bg-[#d26d47]/15">
                Open Browse
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <p><Link to="/lists" className="transition-colors hover:text-white">See live collections</Link></p>
                <p><Link to="/watchlist" className="transition-colors hover:text-white">Open your watchlist</Link></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center md:justify-start">
            <p className="text-sm text-muted-foreground">Copyright 2026 STARS. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
