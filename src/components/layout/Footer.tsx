import React from 'react';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenContact: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenPrivacy,
  onOpenTerms,
  onOpenContact,
}) => {
  return (
    <footer className="bg-white border-t border-[#F3F4F6] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#FF7A00] flex items-center justify-center text-white">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 14c1.5 2 6.5 2 8 0" />
                </svg>
              </div>
              <span className="text-base font-bold text-[#202124]">Smile Store</span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1 max-w-sm">
              Independent cloud Android marketplace with verified cryptographic signatures and private object storage.
            </p>
          </div>

          {/* Links with clean unboxed text and typographic separators */}
          <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-4 text-xs font-medium text-[#6B7280]">
            <button
              onClick={onOpenPrivacy}
              className="hover:text-[#FF7A00] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true" className="text-[#D1D5DB]">·</span>
            <button
              onClick={onOpenTerms}
              className="hover:text-[#FF7A00] transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span aria-hidden="true" className="text-[#D1D5DB]">·</span>
            <button
              onClick={onOpenContact}
              className="hover:text-[#FF7A00] transition-colors cursor-pointer"
            >
              Report an App
            </button>
            <span aria-hidden="true" className="text-[#D1D5DB]">·</span>
            <button
              onClick={onOpenContact}
              className="hover:text-[#FF7A00] transition-colors cursor-pointer"
            >
              Contact Developer
            </button>
          </div>
        </div>

        <div className="border-t border-[#F3F4F6] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#9CA3AF]">
          <p>© {new Date().getFullYear()} Smile Store. All rights reserved.</p>
          <p>Not affiliated with or endorsed by Google LLC or Android Open Source Project.</p>
        </div>
      </div>
    </footer>
  );
};
