import { Suspense, lazy } from 'react';
import { BrowserRouter, HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppErrorBoundary, Footer, Navbar } from '@/components/ui-custom';
import { appEnv } from '@/lib/env';
import './App.css';

const Home = lazy(() => import('@/pages/Home').then((module) => ({ default: module.Home })));
const Explore = lazy(() => import('@/pages/Explore').then((module) => ({ default: module.Explore })));
const Browse = lazy(() => import('@/pages/Browse').then((module) => ({ default: module.Browse })));
const SearchResults = lazy(() =>
  import('@/pages/SearchResults').then((module) => ({ default: module.SearchResults })),
);
const Review = lazy(() => import('@/pages/Review').then((module) => ({ default: module.Review })));
const TvShow = lazy(() => import('@/pages/TvShow').then((module) => ({ default: module.TvShow })));
const Person = lazy(() => import('@/pages/Person').then((module) => ({ default: module.Person })));
const Watchlist = lazy(() =>
  import('@/pages/Watchlist').then((module) => ({ default: module.Watchlist })),
);
const Lists = lazy(() => import('@/pages/Lists').then((module) => ({ default: module.Lists })));
const ControlRoom = lazy(() =>
  import('@/pages/ControlRoom').then((module) => ({ default: module.ControlRoom })),
);
const Login = lazy(() => import('@/pages/Login').then((module) => ({ default: module.Login })));
const Signup = lazy(() => import('@/pages/Signup').then((module) => ({ default: module.Signup })));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-16">
      <div className="section-panel w-full max-w-md px-6 py-10 text-center">
        <p className="section-kicker">Loading</p>
        <h2 className="heading-display mt-3 text-3xl text-white">Opening page</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Preparing the next view and splitting non-critical code out of the initial bundle.
        </p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="section-panel w-full max-w-md px-6 py-10 text-center">
        <p className="section-kicker">404</p>
        <h2 className="heading-display mt-3 text-3xl text-white">Page not found</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          This route does not exist in the current build.
        </p>
      </div>
    </div>
  );
}

// Layout component that conditionally shows navbar/footer
function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  
  return (
    <div className="min-h-screen relative">
      {/* Animated Background */}
      <div className="animated-bg" />
      
      {/* Film Grain Overlay */}
      <div className="film-grain" />
      
      {!isAuthPage && <Navbar />}
      <main>
        <Suspense fallback={<RouteFallback />}>{children}</Suspense>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

function App() {
  const Router = appEnv.routerMode === 'browser' ? BrowserRouter : HashRouter;

  return (
    <AppErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/review/:id" element={<Review />} />
            <Route path="/tv/:id" element={<TvShow />} />
            <Route path="/person/:id" element={<Person />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/lists" element={<Lists />} />
            <Route path="/control-room" element={<ControlRoom />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
