/**
 * Navbar Component
 * Top navigation with logo, user info, and navigation links
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Code2, History, LogOut, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-panel-bg border-b border-gray-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white hover:text-blue-400 transition">
          <Code2 className="w-6 h-6 text-blue-500" />
          <span>CodeReview AI</span>
        </Link>

        {user && (
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className={`flex items-center gap-2 text-sm font-medium transition ${
                isActive('/') ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Code2 className="w-4 h-4" />
              Editor
            </Link>
            <Link
              to="/history"
              className={`flex items-center gap-2 text-sm font-medium transition ${
                isActive('/history') ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              History
            </Link>

            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <User className="w-4 h-4 text-gray-500" />
                <span className="hidden sm:inline">{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
