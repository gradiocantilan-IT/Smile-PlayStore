import React, { useState } from 'react';
import {
  X,
  Download,
  ShieldCheck,
  Calendar,
  Layers,
  FileCode,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { AppRecord } from '../../types/index.ts';

interface AppDetailsModalProps {
  app: AppRecord | null;
  onClose: () => void;
  onDownloadSuccess?: (appId: string) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return 'Unknown size';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
}

function formatDate(isoString?: string): string {
  if (!isoString) return 'Not available';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export const AppDetailsModal: React.FC<AppDetailsModalProps> = ({
  app,
  onClose,
  onDownloadSuccess,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!app) return null;

  const isPublishedAndVerified = app.status === 'published' && app.signatureVerified;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownload = async () => {
    if (!isPublishedAndVerified) return;

    setDownloading(true);
    setDownloadError(null);

    try {
      const res = await fetch(`/api/v1/apps/${app.id}/download`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to generate download URL');
      }

      // Safe browser download trigger using hidden anchor with download attribute
      const link = document.createElement('a');
      link.href = data.data.downloadUrl;
      link.download = data.data.filename || `${app.slug}.apk`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onDownloadSuccess) {
        onDownloadSuccess(app.id);
      }
    } catch (err) {
      console.error('Download error:', err);
      setDownloadError((err as Error).message || 'Download initialization failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#F3F4F6] relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky close header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between z-10">
          <span className="text-xs font-semibold text-[#6B7280]">Application Specification</span>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F9FAFB] hover:bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:text-[#202124] transition-colors cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-[#FFF7F0] border border-[#FFE7D4] flex items-center justify-center text-[#FF7A00] font-bold text-3xl shadow-sm shrink-0 overflow-hidden">
              {app.iconUrl ? (
                <img
                  src={app.iconUrl}
                  alt={app.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{app.title.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-extrabold text-[#202124] tracking-tight">
                {app.title}
              </h2>
              <p className="text-sm font-medium text-[#6B7280] mt-0.5">
                {app.developerName}
              </p>

              {/* Zero-Pill unboxed metadata */}
              <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-2 flex-wrap">
                <span className="font-medium text-[#202124]">{app.category}</span>
                <span aria-hidden="true" className="text-[#D1D5DB]">·</span>
                <span>Version {app.versionName}</span>
                <span aria-hidden="true" className="text-[#D1D5DB]">·</span>
                <span className="font-mono tabular-nums">{formatBytes(app.apkSizeBytes)}</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button Bar */}
          <div>
            {isPublishedAndVerified ? (
              <div>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full h-13 rounded-2xl bg-[#FF7A00] hover:bg-[#E56E00] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#FF7A00]/20 transition-all cursor-pointer disabled:opacity-70"
                >
                  <Download className="w-5 h-5" />
                  <span>{downloading ? 'Preparing Signed Link...' : 'Download Verified APK'}</span>
                </button>
                <p className="text-[11px] text-[#6B7280] text-center mt-2">
                  Direct short-lived presigned URL from Cloudflare R2 · Expires in 5 minutes
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-[#D97706]" />
                <div>
                  <p className="font-semibold">Download Unavailable</p>
                  <p className="mt-0.5">
                    This application status is {app.status} and does not meet the verified publication criteria.
                  </p>
                </div>
              </div>
            )}

            {downloadError && (
              <div className="mt-3 p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#DC2626]">
                {downloadError}
              </div>
            )}
          </div>

          {/* Description Section */}
          <div>
            <h3 className="text-sm font-bold text-[#202124] tracking-tight uppercase tracking-wider text-xs text-[#6B7280]">
              About this app
            </h3>
            <p className="text-sm text-[#202124] leading-relaxed mt-2.5 whitespace-pre-line">
              {app.description}
            </p>
          </div>

          {/* Technical Metadata Grid */}
          <div className="pt-6 border-t border-[#F3F4F6]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-4">
              Verified Technical Metadata
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6]">
                <span className="text-[#6B7280] block mb-1">Android Package Name</span>
                <div className="flex items-center justify-between gap-2 font-mono text-[#202124] break-all">
                  <span>{app.packageName}</span>
                  <button
                    onClick={() => handleCopy(app.packageName, 'package')}
                    className="p-1 hover:text-[#FF7A00] cursor-pointer"
                    aria-label="Copy package name"
                  >
                    {copiedField === 'package' ? <Check className="w-3.5 h-3.5 text-[#16803D]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6]">
                <span className="text-[#6B7280] block mb-1">Version Code</span>
                <span className="font-mono text-[#202124] font-semibold">{app.versionCode}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6]">
                <span className="text-[#6B7280] block mb-1">Published Date</span>
                <span className="text-[#202124]">{formatDate(app.publishedAt || app.createdAt)}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6]">
                <span className="text-[#6B7280] block mb-1">Total Downloads</span>
                <span className="font-mono text-[#202124] font-semibold tabular-nums">
                  {app.downloadCount.toLocaleString()} verified installations
                </span>
              </div>
            </div>
          </div>

          {/* Cryptographic Signature Integrity */}
          <div className="pt-6 border-t border-[#F3F4F6]">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-[#16803D]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                Cryptographic Signature & Hash Verification
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6]">
                <span className="text-[#6B7280] block mb-1">APK File SHA-256 Digest</span>
                <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-[#202124] break-all">
                  <span>{app.apkSha256 || 'Calculated during upload verification'}</span>
                  {app.apkSha256 && (
                    <button
                      onClick={() => handleCopy(app.apkSha256, 'sha')}
                      className="p-1 hover:text-[#FF7A00] cursor-pointer"
                      aria-label="Copy SHA-256"
                    >
                      {copiedField === 'sha' ? <Check className="w-3.5 h-3.5 text-[#16803D]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {app.signingCertificateSha256 && (
                <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6]">
                  <span className="text-[#6B7280] block mb-1">Developer Signing Certificate Fingerprint</span>
                  <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-[#202124] break-all">
                    <span>{app.signingCertificateSha256}</span>
                    <button
                      onClick={() => handleCopy(app.signingCertificateSha256, 'cert')}
                      className="p-1 hover:text-[#FF7A00] cursor-pointer"
                      aria-label="Copy certificate fingerprint"
                    >
                      {copiedField === 'cert' ? <Check className="w-3.5 h-3.5 text-[#16803D]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Declared Android Permissions */}
          {app.permissions && app.permissions.length > 0 && (
            <div className="pt-6 border-t border-[#F3F4F6]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
                Declared Android Permissions ({app.permissions.length})
              </h3>
              <ul className="divide-y divide-[#F3F4F6] text-xs">
                {app.permissions.map((perm, idx) => (
                  <li key={idx} className="py-2 flex items-center justify-between gap-3 font-mono text-[#4B5563]">
                    <span className="truncate">{perm}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16803D] shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
