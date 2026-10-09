import React from 'react';
import { ShieldCheck, UploadCloud, Plus } from 'lucide-react';

interface EmptyStateProps {
  onAdminAction?: () => void;
  isAdminLoggedIn?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onAdminAction,
  isAdminLoggedIn,
}) => {
  return (
    <div className="py-16 px-4 text-center max-w-lg mx-auto">
      {/* Friendly warm illustration with custom logo */}
      <div className="w-24 h-24 mx-auto rounded-3xl bg-[#FFF7F0] border border-[#FFE7D4] flex items-center justify-center p-3 shadow-xs mb-6 overflow-hidden">
        <img
          src="/logo.png"
          alt="Smile PlayStore"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://raw.githubusercontent.com/gradiocantilan-IT/LocalDocument/main/orangeware.png';
          }}
        />
      </div>

      {/* Mandatory exact heading */}
      <h3 className="text-2xl font-bold tracking-tight text-[#202124]">
        No apps available yet.
      </h3>

      {/* Explanation that new apps will appear after administrator approval */}
      <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">
        Smile PlayStore maintains a strict zero-dummy, cryptographically verified catalog.
        New Android applications will appear here as soon as they complete cryptographic signature verification and receive administrator publication approval.
      </p>

      {/* Trust bullet features (clean unboxed text) */}
      <div className="mt-6 pt-6 border-t border-[#F3F4F6] flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-[#6B7280]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#16803D]" />
          <span>Cryptographic Signature Scheme v2/v3</span>
        </div>
        <span aria-hidden="true" className="hidden sm:inline text-[#D1D5DB]">·</span>
        <div className="flex items-center gap-1.5">
          <UploadCloud className="w-4 h-4 text-[#FF7A00]" />
          <span>Private Cloudflare R2 Storage</span>
        </div>
      </div>

      {/* Action to upload / access admin console */}
      {onAdminAction && (
        <div className="mt-8">
          <button
            onClick={onAdminAction}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E56E00] text-white text-xs font-semibold shadow-sm transition-all hover:shadow cursor-pointer min-h-[44px]"
          >
            {isAdminLoggedIn ? (
              <>
                <Plus className="w-4 h-4" />
                <span>Upload APK in Admin Console</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Administrator Sign-in to Publish Apps</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
