import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header.tsx';
import { BottomNav } from '../components/layout/BottomNav.tsx';
import { Footer } from '../components/layout/Footer.tsx';
import { EmptyState } from '../components/marketplace/EmptyState.tsx';
import { AppCard } from '../components/marketplace/AppCard.tsx';
import { AppDetailsModal } from '../components/marketplace/AppDetailsModal.tsx';
import { SearchModal } from '../components/marketplace/SearchModal.tsx';
import { CategoriesView } from '../components/marketplace/CategoriesView.tsx';
import { UpdatesView } from '../components/marketplace/UpdatesView.tsx';
import { LegalModal } from '../components/legal/LegalModal.tsx';
import { ContactModal } from '../components/contact/ContactModal.tsx';
import { AppRecord, CategoryRecord, AdminUser } from '../types/index.ts';
import { ShieldCheck } from 'lucide-react';

export function Marketplace() {
  const [currentTab, setCurrentTab] = useState<'home' | 'categories' | 'updates'>('home');
  const [publishedApps, setPublishedApps] = useState<AppRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  // Modals & Overlays
  const [selectedApp, setSelectedApp] = useState<AppRecord | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactAppTarget, setContactAppTarget] = useState<{ id?: string; title?: string }>({});

  const fetchMarketplaceData = async () => {
    try {
      setLoading(true);
      const [appsRes, catRes] = await Promise.all([
        fetch('/api/v1/apps'),
        fetch('/api/v1/categories'),
      ]);

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setPublishedApps(appsData.data || []);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.data || []);
      }
    } catch (err) {
      console.error('Failed to load marketplace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const displayApps =
    selectedCategory === 'All'
      ? publishedApps
      : publishedApps.filter(
          (a) => a.category.toLowerCase() === selectedCategory.toLowerCase()
        );

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col font-sans selection:bg-[#FF7A00]/20 selection:text-[#FF7A00]">
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <main className="flex-1 pb-16 md:pb-6">
        {currentTab === 'home' && (
          <div>
            <div className="bg-gradient-to-b from-[#FFF7F0] via-white to-white border-b border-[#F9FAFB] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-[#202124] tracking-tight">
                    Friendly, Verified <span className="text-[#FF7A00]">Android</span> Apps
                  </h1>
                  <p className="text-sm sm:text-base text-[#6B7280] mt-2 max-w-2xl leading-relaxed">
                    Direct cryptographic signature verification on every APK package. Clean, ad-free downloads straight from private cloud storage.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-[#FFE2CC] text-xs font-semibold text-[#FF7A00] shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-[#16803D]" />
                    <span>Signature Scheme v2/v3</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {categories.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer min-h-[40px] ${
                      selectedCategory === 'All'
                        ? 'bg-[#FF7A00] text-white shadow-xs'
                        : 'bg-[#FFF7F0] text-[#6B7280] hover:text-[#202124]'
                    }`}
                  >
                    All ({publishedApps.length})
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.name)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer min-h-[40px] ${
                        selectedCategory === c.name
                          ? 'bg-[#FF7A00] text-white shadow-xs'
                          : 'bg-[#FFF7F0] text-[#6B7280] hover:text-[#202124]'
                      }`}
                    >
                      {c.name} ({c.appCount})
                    </button>
                  ))}
                </div>
              )}
              {publishedApps.length === 0 ? (
                <EmptyState isAdminLoggedIn={false} onAdminAction={() => {}} />
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#202124] tracking-tight">
                      {selectedCategory === 'All' ? 'Recently Published' : selectedCategory}
                    </h2>
                    <span className="text-xs text-[#6B7280] font-medium">
                      {displayApps.length} {displayApps.length === 1 ? 'app' : 'apps'}
                    </span>
                  </div>
                  {displayApps.length === 0 ? (
                    <div className="text-center py-12 text-xs text-[#6B7280]">
                      No applications found in {selectedCategory}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                      {displayApps.map((app) => (
                        <AppCard
                          key={app.id}
                          app={app}
                          onSelect={(a) => setSelectedApp(a)}
                          onQuickDownload={(a, e) => {
                            e.stopPropagation();
                            setSelectedApp(a);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {currentTab === 'categories' && (
          <CategoriesView
            categories={categories}
            onSelectCategory={(catName) => {
              setSelectedCategory(catName);
              setCurrentTab('home');
            }}
            isAdminLoggedIn={false}
            onAdminAction={() => {}}
          />
        )}
        {currentTab === 'updates' && (
          <UpdatesView
            apps={publishedApps}
            onSelectApp={(app) => setSelectedApp(app)}
          />
        )}
      </main>
      <Footer
        onOpenPrivacy={() => setLegalModalType('privacy')}
        onOpenTerms={() => setLegalModalType('terms')}
        onOpenContact={() => {
          setContactAppTarget({});
          setIsContactOpen(true);
        }}
      />
      <BottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isAdminLoggedIn={false}
        onOpenAdminLogin={() => {}}
      />
      <AppDetailsModal
        app={selectedApp}
        onClose={() => setSelectedApp(null)}
        onDownloadSuccess={() => fetchMarketplaceData()}
      />
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        apps={publishedApps}
        onSelectApp={(a) => setSelectedApp(a)}
      />
      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        appId={contactAppTarget.id}
        appTitle={contactAppTarget.title}
      />
    </div>
  );
}
