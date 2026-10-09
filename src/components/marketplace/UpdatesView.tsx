import React from 'react';
import { RefreshCw, Download, Calendar, ShieldCheck } from 'lucide-react';
import { AppRecord } from '../../types/index.ts';

interface UpdatesViewProps {
  apps: AppRecord[];
  onSelectApp: (app: AppRecord) => void;
}

function formatDate(isoString?: string): string {
  if (!isoString) return 'Recent';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export const UpdatesView: React.FC<UpdatesViewProps> = ({ apps, onSelectApp }) => {
  const publishedApps = apps.filter((a) => a.status === 'published' && a.signatureVerified);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#202124] tracking-tight">
          Release Updates
        </h2>
        <p className="text-sm text-[#6B7280] mt-1">
          Chronological changelogs and version releases for verified applications.
        </p>
      </div>

      {publishedApps.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-3xl border border-[#F3F4F6] p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF7F0] flex items-center justify-center text-[#FF7A00] mx-auto mb-4">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#202124]">No updates published yet</h3>
          <p className="text-xs text-[#6B7280] mt-2 max-w-sm mx-auto leading-relaxed">
            Release updates and version history appear here once applications are verified and published through the administrator workflow.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {publishedApps.map((app) => (
            <div
              key={app.id}
              onClick={() => onSelectApp(app)}
              className="p-5 bg-white rounded-2xl border border-[#F3F4F6] hover:border-[#FFE2CC] transition-all hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FFF7F0] border border-[#FFE7D4] flex items-center justify-center text-[#FF7A00] font-bold text-lg shrink-0 overflow-hidden">
                  {app.iconUrl ? (
                    <img src={app.iconUrl} alt={app.title} className="w-full h-full object-cover" />
                  ) : (
                    <span>{app.title.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-bold text-[#202124] hover:text-[#FF7A00] transition-colors">
                    {app.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-1 flex-wrap font-mono">
                    <span className="font-sans text-[#202124] font-medium">{app.developerName}</span>
                    <span aria-hidden="true" className="text-[#D1D5DB]">·</span>
                    <span>v{app.versionName}</span>
                    <span aria-hidden="true" className="text-[#D1D5DB]">·</span>
                    <span className="font-sans flex items-center gap-1 text-[#6B7280]">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(app.publishedAt || app.createdAt)}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="flex items-center gap-1 text-xs text-[#16803D] font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Verified v{app.versionName}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectApp(app);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FFF7F0] hover:bg-[#FF7A00] text-[#FF7A00] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  View Release
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
