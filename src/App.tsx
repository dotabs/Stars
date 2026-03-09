import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar, Footer } from '@/components/ui-custom';
import { 
  Home, 
  Explore, 
  Browse, 
  Review, 
  Watchlist, 
  Lists, 
  ControlRoom, 
  Login, 
  Signup 
} from '@/pages';
import './App.css';

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
      <main className={isAuthPage ? '' : ''}>
        {children}
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/control-room" element={<ControlRoom />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
