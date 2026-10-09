import React from 'react';
import { Home, Grid, RefreshCw, Shield } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'home' | 'categories' | 'updates' | 'admin';
  setCurrentTab: (tab: 'home' | 'categories' | 'updates' | 'admin') => void;
  isAdminLoggedIn: boolean;
  onOpenAdminLogin: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  setCurrentTab,
  isAdminLoggedIn,
  onOpenAdminLogin,
}) => {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#F3F4F6] shadow-lg"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
        {/* Tab 1: Home */}
        <button
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center justify-center min-h-[48px] w-full transition-colors cursor-pointer ${
            currentTab === 'home' ? 'text-[#FF7A00]' : 'text-[#6B7280]'
          }`}
          aria-label="Home"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">Home</span>
        </button>

        {/* Tab 2: Categories */}
        <button
          onClick={() => setCurrentTab('categories')}
          className={`flex flex-col items-center justify-center min-h-[48px] w-full transition-colors cursor-pointer ${
            currentTab === 'categories' ? 'text-[#FF7A00]' : 'text-[#6B7280]'
          }`}
          aria-label="Categories"
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">Categories</span>
        </button>

        {/* Tab 3: Updates */}
        <button
          onClick={() => setCurrentTab('updates')}
          className={`flex flex-col items-center justify-center min-h-[48px] w-full transition-colors cursor-pointer ${
            currentTab === 'updates' ? 'text-[#FF7A00]' : 'text-[#6B7280]'
          }`}
          aria-label="Updates"
        >
          <RefreshCw className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">Updates</span>
        </button>

        {/* Tab 4: Admin */}
        <button
          onClick={() => {
            if (isAdminLoggedIn) {
              setCurrentTab('admin');
            } else {
              onOpenAdminLogin();
            }
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] w-full transition-colors cursor-pointer ${
            currentTab === 'admin' ? 'text-[#FF7A00]' : 'text-[#6B7280]'
          }`}
          aria-label="Admin"
        >
          <Shield className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">
            {isAdminLoggedIn ? 'Admin' : 'Login'}
          </span>
        </button>
      </div>
    </nav>
  );
};
