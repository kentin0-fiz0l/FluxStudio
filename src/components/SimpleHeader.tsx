// React import not needed with JSX transform
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function SimpleHeader() {
  // Updated with comprehensive navigation menu
  let user = null;
  let isAuthenticated = false;
  let logout = null;

  try {
    const auth = useAuth();
    user = auth.user;
    isAuthenticated = auth.isAuthenticated;
    logout = auth.logout;
  } catch (error) {
    console.warn('Auth context not available, using fallback values');
  }

  const handleLogout = async () => {
    if (logout) {
      try {
        await logout();
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-white font-bold text-xl hover:text-blue-400 transition-colors">
              FluxStudio
            </Link>
          </div>

          {/* Navigation Menu */}
          <div className="flex items-center space-x-1">
            {isAuthenticated ? (
              <>
                {/* Main Navigation */}
                <nav className="hidden md:flex items-center space-x-1">
                  <Link to="/home">
                    <button className="text-white font-medium px-3 py-2 hover:bg-white/10 rounded-lg transition-colors">
                      Dashboard
                    </button>
                  </Link>
                  <Link to="/organization">
                    <button className="text-white font-medium px-3 py-2 hover:bg-white/10 rounded-lg transition-colors">
                      Organization
                    </button>
                  </Link>
                  <Link to="/team">
                    <button className="text-white font-medium px-3 py-2 hover:bg-white/10 rounded-lg transition-colors">
                      Team
                    </button>
                  </Link>
                  <Link to="/file">
                    <button className="text-white font-medium px-3 py-2 hover:bg-white/10 rounded-lg transition-colors">
                      File
                    </button>
                  </Link>
                  <Link to="/dashboard/messages">
                    <button className="text-white font-medium px-3 py-2 hover:bg-white/10 rounded-lg transition-colors">
                      Messages
                    </button>
                  </Link>
                  <Link to="/projects">
                    <button className="text-white font-medium px-3 py-2 hover:bg-white/10 rounded-lg transition-colors">
                      Projects
                    </button>
                  </Link>
                </nav>

                {/* User Menu */}
                <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-white/20">
                  <Link to="/profile" className="text-white/70 hover:text-white text-sm hidden sm:block transition-colors">
                    Hi, {user?.name || user?.email}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-white/70 hover:text-white font-medium px-3 py-2 hover:bg-red-600/20 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <button className="text-white font-medium px-4 py-2 hover:bg-white/10 rounded-lg transition-colors">
                    Sign In
                  </button>
                </Link>
                <Link to="/signup">
                  <button className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Sign Up
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}