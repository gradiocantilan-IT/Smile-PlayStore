import React from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { AppRecord } from '../../types/index.ts';

interface AppCardProps {
  app: AppRecord;
  onSelect: (app: AppRecord) => void;
  onQuickDownload?: (app: AppRecord, e: React.MouseEvent) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export const AppCard: React.FC<AppCardProps> = ({
  app,
  onSelect,
  onQuickDownload,
}) => {
  const isPublishedAndVerified = app.status === 'published' && app.signatureVerified;
  const formattedSize = formatBytes(app.apkSizeBytes);

  return (
    <div
      onClick={() => onSelect(app)}
      className="group bg-white rounded-2xl border border-[#F3F4F6] hover:border-[#FFE2CC] p-4 sm:p-5 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start gap-3.5">
          {/* App Icon */}
          <div className="w-14 h-14 rounded-2xl bg-[#FFF7F0] border border-[#FFE7D4] overflow-hidden shrink-0 flex items-center justify-center text-[#FF7A00] font-bold text-xl group-hover:scale-105 transition-transform duration-200">
            {app.iconUrl ? (
              <img
                src={app.iconUrl}
                alt={app.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span>{app.title.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Title & Developer */}
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-[#202124] group-hover:text-[#FF7A00] transition-colors truncate">
              {app.title}
            </h4>
            <p className="text-xs font-medium text-[#6B7280] truncate mt-0.5">
              {app.developerName}
            </p>

            {/* Verified unboxed metadata with typographic separators (Zero-Pill discipline) */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mt-1.5 flex-wrap">
              <span>{app.category}</span>
              {app.versionName && (
                <>
                  <span aria-hidden="true" className="text-[#D1D5DB]">·</span>
                  <span>v{app.versionName}</span>
                </>
              )}
              {formattedSize && (
                <>
                  <span aria-hidden="true" className="text-[#D1D5DB]">·</span>
                  <span className="font-mono tabular-nums">{formattedSize}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Short description preview */}
        {app.description && (
          <p className="text-xs text-[#6B7280] line-clamp-2 mt-3 leading-relaxed">
            {app.description}
          </p>
        )}
      </div>

      {/* Card footer: Verified badge & Action button */}
      <div className="mt-4 pt-3 border-t border-[#F9FAFB] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[11px] text-[#16803D] font-medium">
          {app.signatureVerified ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Signature Verified</span>
            </>
          ) : (
            <span className="text-[#D97706]">Pending Verification</span>
          )}
        </div>

        {/* Download button only for published verified apps */}
        {isPublishedAndVerified && onQuickDownload && (
          <button
            onClick={(e) => onQuickDownload(app, e)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF7F0] hover:bg-[#FF7A00] text-[#FF7A00] hover:text-white text-xs font-semibold transition-colors min-h-[36px] cursor-pointer"
            aria-label={`Download ${app.title}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        )}
      </div>
    </div>
  );
};
