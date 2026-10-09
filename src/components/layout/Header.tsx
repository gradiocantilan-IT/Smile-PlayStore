import React from 'react';
import { Search, Shield, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentTab: 'home' | 'categories' | 'updates' | 'admin';
  setCurrentTab: (tab: 'home' | 'categories' | 'updates' | 'admin') => void;
  onOpenSearch: () => void;
  isAdminLoggedIn: boolean;
  onOpenAdminLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenSearch,
  isAdminLoggedIn,
  onOpenAdminLogin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#FFF7F0] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <button
          onClick={() => setCurrentTab('home')}
          className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-hidden"
          aria-label="Smile Store Home"
        >
          {/* Custom Smile Store Logo */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF9F43] flex items-center justify-center shadow-sm text-white shrink-0 group-hover:scale-105 transition-transform duration-200">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Android smiling face */}
              <circle cx="12" cy="12" r="9" />
              <path d="M8 14c1.5 2 6.5 2 8 0" />
              <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
              <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-[#202124] leading-tight">
              Smile <span className="text-[#FF7A00]">Store</span>
            </span>
            <span className="text-[11px] font-medium text-[#6B7280] hidden sm:inline leading-none">
              Android Marketplace
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links (Clean unboxed single-line typography) */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => setCurrentTab('home')}
            className={`text-sm font-semibold transition-colors cursor-pointer py-1 ${
              currentTab === 'home'
                ? 'text-[#FF7A00] border-b-2 border-[#FF7A00]'
                : 'text-[#6B7280] hover:text-[#202124]'
            }`}
          >
            Storefront
          </button>
          <button
            onClick={() => setCurrentTab('categories')}
            className={`text-sm font-semibold transition-colors cursor-pointer py-1 ${
              currentTab === 'categories'
                ? 'text-[#FF7A00] border-b-2 border-[#FF7A00]'
                : 'text-[#6B7280] hover:text-[#202124]'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setCurrentTab('updates')}
            className={`text-sm font-semibold transition-colors cursor-pointer py-1 ${
              currentTab === 'updates'
                ? 'text-[#FF7A00] border-b-2 border-[#FF7A00]'
                : 'text-[#6B7280] hover:text-[#202124]'
            }`}
          >
            Updates
          </button>
        </nav>

        {/* Right Zone: Search trigger + Admin access */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FFF7F0] hover:bg-[#FFEEDD] text-[#6B7280] hover:text-[#202124] transition-colors text-xs font-medium min-h-[44px] cursor-pointer"
            aria-label="Search applications"
          >
            <Search className="w-4 h-4 text-[#FF7A00]" />
            <span className="hidden sm:inline">Search apps...</span>
          </button>

          {isAdminLoggedIn ? (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[44px] cursor-pointer transition-all ${
                currentTab === 'admin'
                  ? 'bg-[#FF7A00] text-white shadow-xs'
                  : 'bg-[#FFF7F0] text-[#FF7A00] hover:bg-[#FFEEDD]'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Console</span>
            </button>
          ) : (
            <button
              onClick={onOpenAdminLogin}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#FF7A00] text-[#202124] hover:text-[#FF7A00] text-xs font-semibold min-h-[44px] transition-colors cursor-pointer"
            >
              <Shield className="w-4 h-4 text-[#6B7280]" />
              <span className="hidden sm:inline">Admin Login</span>
              <span className="sm:hidden">Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
