import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { AppRecord } from '../../types/index.ts';
import { AppCard } from './AppCard.tsx';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  apps: AppRecord[];
  onSelectApp: (app: AppRecord) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  apps,
  onSelectApp,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const filteredApps = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return apps.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.developerName.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.packageName.toLowerCase().includes(q)
    );
  }, [apps, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 pt-12 sm:pt-20 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#F3F4F6] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-[#F3F4F6] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#FF7A00] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, developer, category, or package..."
            className="flex-1 text-sm sm:text-base font-medium text-[#202124] placeholder-[#9CA3AF] bg-transparent focus:outline-hidden"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#9CA3AF] hover:text-[#202124] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#6B7280] hover:text-[#202124] px-2 py-1 rounded-lg cursor-pointer"
          >
            Esc
          </button>
        </div>

        {/* Results Area */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
          {query.trim() === '' ? (
            <div className="text-center py-10 text-xs text-[#6B7280]">
              <p className="font-medium text-[#202124]">Search the marketplace catalog</p>
              <p className="mt-1">Type keywords above to find verified published applications.</p>
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#6B7280] mb-3">
                Found {filteredApps.length} published {filteredApps.length === 1 ? 'application' : 'applications'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onSelect={(a) => {
                      onSelectApp(a);
                      onClose();
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-[#6B7280]">
              <p className="text-sm font-semibold text-[#202124]">No applications match "{query}"</p>
              <p className="text-xs mt-1">Try different keywords or check spelling.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
