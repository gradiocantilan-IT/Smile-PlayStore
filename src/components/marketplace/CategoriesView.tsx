import React from 'react';
import { Layers, FolderOpen, ArrowRight } from 'lucide-react';
import { CategoryRecord } from '../../types/index.ts';

interface CategoriesViewProps {
  categories: CategoryRecord[];
  onSelectCategory: (categoryName: string) => void;
  onAdminAction?: () => void;
  isAdminLoggedIn?: boolean;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  onSelectCategory,
  onAdminAction,
  isAdminLoggedIn,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#202124] tracking-tight">
          Browse by Category
        </h2>
        <p className="text-sm text-[#6B7280] mt-1">
          Explore Android applications grouped by genuine published classifications.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="py-16 px-4 text-center max-w-md mx-auto bg-white rounded-3xl border border-[#F3F4F6] p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF7F0] flex items-center justify-center text-[#FF7A00] mx-auto mb-4">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#202124]">No categories active</h3>
          <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">
            Marketplace categories are derived exclusively from verified published applications. As new applications are approved, their respective categories will appear here automatically.
          </p>

          {onAdminAction && (
            <button
              onClick={onAdminAction}
              className="mt-6 px-4 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E56E00] text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              {isAdminLoggedIn ? 'Upload First APK' : 'Administrator Sign-in'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.name)}
              className="group p-5 bg-white rounded-2xl border border-[#F3F4F6] hover:border-[#FFE2CC] text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#FFF7F0] text-[#FF7A00] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-[#202124] group-hover:text-[#FF7A00] transition-colors">
                  {cat.name}
                </h4>
                <p className="text-xs text-[#6B7280] mt-1">
                  {cat.appCount} verified {cat.appCount === 1 ? 'application' : 'applications'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F9FAFB] flex items-center justify-between text-xs font-semibold text-[#FF7A00]">
                <span>View catalog</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
