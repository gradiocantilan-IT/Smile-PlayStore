import React, { useState, useEffect } from 'react';
import {
  Shield,
  UploadCloud,
  Layers,
  FileCheck2,
  AlertTriangle,
  Trash2,
  Archive,
  CheckCircle,
  XCircle,
  Eye,
  LogOut,
  RefreshCw,
  Settings,
  History,
  FileCode,
  HardDrive,
  Copy,
  Check,
  Plus,
} from 'lucide-react';
import {
  AppRecord,
  AppStatus,
  AdminUser,
  CmsSettings,
  AuditLogRecord,
  VerificationResult,
} from '../../types/index.ts';

interface AdminDashboardProps {
  user: AdminUser;
  csrfToken: string;
  onLogout: () => void;
  onViewMarketplace: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  csrfToken,
  onLogout,
  onViewMarketplace,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'upload' | 'apps' | 'cms' | 'audit' | 'status'
  >('overview');

  const [apps, setApps] = useState<AppRecord[]>([]);
  const [appFilter, setAppFilter] = useState<AppStatus | 'all'>('all');
  const [cmsSettings, setCmsSettings] = useState<CmsSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDeveloper, setUploadDeveloper] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Tools & Utilities');
  const [selectedApkFile, setSelectedApkFile] = useState<File | null>(null);
  const [selectedIconFile, setSelectedIconFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Modal / Confirmations
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [inspectApp, setInspectApp] = useState<AppRecord | null>(null);

  // Fetch all apps & settings
  const refreshData = async () => {
    setLoading(true);
    try {
      // 1. Fetch apps
      const appsRes = await fetch('/api/v1/admin/apps', {
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        if (appsData.success) {
          setApps(appsData.data || []);
        }
      }

      // 2. Fetch CMS
      const cmsRes = await fetch('/api/v1/admin/cms', {
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (cmsRes.ok) {
        const cmsData = await cmsRes.json();
        if (cmsData.success) {
          setCmsSettings(cmsData.data);
        }
      }

      // 3. Fetch Audit Logs
      const logsRes = await fetch('/api/v1/admin/audit-logs', {
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.success) {
          setAuditLogs(logsData.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Calculate real genuine stats only
  const totalAppsCount = apps.length;
  const publishedCount = apps.filter((a) => a.status === 'published').length;
  const pendingCount = apps.filter((a) => a.status === 'pending').length;
  const draftCount = apps.filter((a) => a.status === 'draft').length;
  const rejectedArchivedCount = apps.filter((a) => a.status === 'rejected' || a.status === 'archived').length;
  const totalDownloads = apps.reduce((sum, a) => sum + (a.downloadCount || 0), 0);
  const totalStorageBytes = apps.reduce((sum, a) => sum + (a.apkSizeBytes || 0), 0);

  // Filter apps for management table
  const filteredApps = apps.filter((a) => (appFilter === 'all' ? true : a.status === appFilter));

  // Handle APK file reading & upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApkFile) {
      setStatusMessage({ type: 'error', text: 'Please select an APK file to upload.' });
      return;
    }

    setUploading(true);
    setStatusMessage(null);
    setVerificationResult(null);

    try {
      // Convert APK to base64
      const apkBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          // strip data:application/octet-stream;base64,
          const base64 = res.split(',')[1] || res;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedApkFile);
      });

      // Convert icon if present
      let iconBase64: string | undefined = undefined;
      if (selectedIconFile) {
        iconBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1] || res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedIconFile);
        });
      }

      const res = await fetch('/api/v1/admin/apps/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          title: uploadTitle,
          developerName: uploadDeveloper,
          description: uploadDescription,
          category: uploadCategory,
          apkBase64,
          iconBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      setVerificationResult(data.data.verification);
      setStatusMessage({
        type: 'success',
        text: `APK uploaded successfully to quarantine. Verification status: ${
          data.data.verification.signatureVerified ? 'VERIFIED' : 'FAILED/UNSIGNED'
        }.`,
      });

      // Reset form
      setUploadTitle('');
      setUploadDeveloper('');
      setUploadDescription('');
      setSelectedApkFile(null);
      setSelectedIconFile(null);

      // Refresh list
      await refreshData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: (err as Error).message || 'Failed to process APK upload' });
    } finally {
      setUploading(false);
    }
  };

  // Change App Status (publish, reject, archive)
  const handleStatusChange = async (appId: string, newStatus: AppStatus, rejectionReason?: string) => {
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/apps/${appId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ status: newStatus, rejectionReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to update app status');
      }

      setStatusMessage({
        type: 'success',
        text: `Application status updated to "${newStatus.toUpperCase()}".`,
      });
      await refreshData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: (err as Error).message });
    }
  };

  // Delete App permanently with confirmation
  const handleDeleteApp = async (appId: string) => {
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/apps/${appId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete app');
      }

      setStatusMessage({ type: 'success', text: 'Application deleted and storage cleaned up.' });
      setConfirmDeleteId(null);
      await refreshData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: (err as Error).message });
    }
  };

  // Explicit verification re-run
  const handleReverify = async (appId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/apps/${appId}/verify`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: 'Re-verification complete.' });
        setInspectApp(data.data.app);
        await refreshData();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: (err as Error).message });
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24 md:pb-12">
      {/* Top Admin Bar */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF7A00] flex items-center justify-center text-white shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#202124] leading-tight">
                Smile Store Admin Console
              </h1>
              <p className="text-xs text-[#6B7280]">
                Logged in as <span className="font-semibold text-[#202124]">{user.email}</span> ({user.role})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#6B7280] transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onViewMarketplace}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#FF7A00] text-xs font-semibold text-[#202124] hover:text-[#FF7A00] transition-colors cursor-pointer"
            >
              View Public Storefront
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FEF2F2] hover:bg-[#FEE2E2] text-xs font-semibold text-[#DC2626] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation (Clean segmented controls) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 border-t border-[#F3F4F6] pt-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'border-[#FF7A00] text-[#FF7A00]'
                : 'border-transparent text-[#6B7280] hover:text-[#202124]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors ${
              activeTab === 'upload'
                ? 'border-[#FF7A00] text-[#FF7A00]'
                : 'border-transparent text-[#6B7280] hover:text-[#202124]'
            }`}
          >
            Upload APK
          </button>
          <button
            onClick={() => setActiveTab('apps')}
            className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors ${
              activeTab === 'apps'
                ? 'border-[#FF7A00] text-[#FF7A00]'
                : 'border-transparent text-[#6B7280] hover:text-[#202124]'
            }`}
          >
            Manage Apps ({apps.length})
          </button>
          <button
            onClick={() => setActiveTab('cms')}
            className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors ${
              activeTab === 'cms'
                ? 'border-[#FF7A00] text-[#FF7A00]'
                : 'border-transparent text-[#6B7280] hover:text-[#202124]'
            }`}
          >
            CMS Settings
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors ${
              activeTab === 'audit'
                ? 'border-[#FF7A00] text-[#FF7A00]'
                : 'border-transparent text-[#6B7280] hover:text-[#202124]'
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-xs ${
              statusMessage.type === 'success'
                ? 'bg-[#F0FDF4] border border-[#BBF7D0] text-[#16803D]'
                : 'bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-bold hover:opacity-75 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: OVERVIEW (Real Stats Only) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-[#E5E7EB]">
                <span className="text-xs font-semibold text-[#6B7280]">Published Apps</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#202124] mt-1 tabular-nums">
                  {publishedCount}
                </p>
                <span className="text-[11px] text-[#16803D] mt-1 block">Active on storefront</span>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-[#E5E7EB]">
                <span className="text-xs font-semibold text-[#6B7280]">Pending Approval</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#202124] mt-1 tabular-nums">
                  {pendingCount}
                </p>
                <span className="text-[11px] text-[#D97706] mt-1 block">In quarantine</span>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-[#E5E7EB]">
                <span className="text-xs font-semibold text-[#6B7280]">Total Downloads</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#202124] mt-1 tabular-nums">
                  {totalDownloads}
                </p>
                <span className="text-[11px] text-[#6B7280] mt-1 block">Verified client requests</span>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-[#E5E7EB]">
                <span className="text-xs font-semibold text-[#6B7280]">Managed Artifacts</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#202124] mt-1 tabular-nums">
                  {totalAppsCount}
                </p>
                <span className="text-[11px] text-[#6B7280] mt-1 block">
                  {(totalStorageBytes / (1024 * 1024)).toFixed(1)} MB total size
                </span>
              </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#202124]">Pending Verification & Approvals</h3>
                  <button
                    onClick={() => {
                      setAppFilter('pending');
                      setActiveTab('apps');
                    }}
                    className="text-xs text-[#FF7A00] font-semibold hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                {pendingCount === 0 ? (
                  <div className="py-8 text-center text-xs text-[#6B7280]">
                    <CheckCircle className="w-8 h-8 text-[#16803D] mx-auto mb-2" />
                    <p className="font-semibold text-[#202124]">No applications awaiting review</p>
                    <p className="mt-0.5">Use the Upload APK tab to stage a new candidate.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F3F4F6]">
                    {apps
                      .filter((a) => a.status === 'pending')
                      .slice(0, 5)
                      .map((app) => (
                        <div key={app.id} className="py-3 flex items-center justify-between gap-4">
                          <div>
                            <h4 className="text-xs font-bold text-[#202124]">{app.title}</h4>
                            <p className="text-[11px] text-[#6B7280] font-mono">
                              {app.packageName} · v{app.versionName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setInspectApp(app)}
                              className="px-2.5 py-1 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] text-xs font-semibold text-[#202124] cursor-pointer"
                            >
                              Inspect
                            </button>
                            {app.signatureVerified ? (
                              <button
                                onClick={() => handleStatusChange(app.id, 'published')}
                                className="px-2.5 py-1 rounded-lg bg-[#16803D] hover:bg-[#15803d] text-white text-xs font-semibold cursor-pointer"
                              >
                                Approve & Publish
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-[#DC2626]">
                                Unverified
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Security Policy Reminder */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#FF7A00]" />
                  <h3 className="text-sm font-bold text-[#202124]">Marketplace Security Policy</h3>
                </div>
                <div className="text-xs text-[#6B7280] space-y-2 leading-relaxed">
                  <p>
                    <strong>1. Mandatory Cryptographic Signature:</strong> An application package can NEVER be published unless its APK Signature Scheme v2 or v3 block is present and matches the file digest.
                  </p>
                  <p>
                    <strong>2. Quarantine Storage:</strong> All new uploads reside in private quarantine storage until explicitly approved by an authorized administrator.
                  </p>
                  <p>
                    <strong>3. Presigned Delivery:</strong> Download URLs are short-lived presigned Cloudflare R2 links (5 min expiry).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: UPLOAD APK */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-[#E5E7EB] p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#202124]">Upload Android Application Package</h2>
              <p className="text-xs text-[#6B7280] mt-1">
                Uploads are quarantined and analyzed for cryptographic signatures, package identity, and permissions.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1.5">
                  APK Binary File (.apk) <span className="text-[#DC2626]">*</span>
                </label>
                <div className="border-2 border-dashed border-[#E5E7EB] hover:border-[#FF7A00] rounded-2xl p-6 text-center transition-colors cursor-pointer relative bg-[#F9FAFB]">
                  <input
                    type="file"
                    required
                    accept=".apk,application/vnd.android.package-archive"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedApkFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-8 h-8 text-[#FF7A00] mx-auto mb-2" />
                  {selectedApkFile ? (
                    <div>
                      <p className="text-xs font-bold text-[#202124]">{selectedApkFile.name}</p>
                      <p className="text-[11px] text-[#6B7280]">
                        {(selectedApkFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-[#202124]">
                        Click or drag Android APK file here
                      </p>
                      <p className="text-[11px] text-[#6B7280] mt-1">Max configured size: 150 MB</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1.5">
                  App Icon (PNG/JPEG)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedIconFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-[#6B7280] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FFF7F0] file:text-[#FF7A00] hover:file:bg-[#FFEEDD] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202124] mb-1.5">
                    Application Title <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Proton Calendar"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#FF7A00] text-xs font-medium text-[#202124] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202124] mb-1.5">
                    Developer Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadDeveloper}
                    onChange={(e) => setUploadDeveloper(e.target.value)}
                    placeholder="e.g. Proton AG"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#FF7A00] text-xs font-medium text-[#202124] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1.5">
                  Category <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#FF7A00] text-xs font-medium text-[#202124] focus:outline-hidden bg-white"
                >
                  <option value="Tools & Utilities">Tools & Utilities</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Communication">Communication</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Education">Education</option>
                  <option value="Finance">Finance</option>
                  <option value="Health & Fitness">Health & Fitness</option>
                  <option value="Lifestyle">Lifestyle</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1.5">
                  Application Description <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Provide an authentic description of functionality, features, and target devices..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#FF7A00] text-xs font-medium text-[#202124] focus:outline-hidden"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-3.5 rounded-2xl bg-[#FF7A00] hover:bg-[#E56E00] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{uploading ? 'Processing & Verifying Cryptographic Signatures...' : 'Upload & Verify APK'}</span>
                </button>
              </div>
            </form>

            {/* Display Verification Result Details if just uploaded */}
            {verificationResult && (
              <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#202124] mb-3">
                  Upload Verification Outcome
                </h3>
                <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Signature Scheme:</span>
                    <span className="font-mono font-bold text-[#202124]">
                      {verificationResult.signatureScheme}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Signature Verified:</span>
                    <span
                      className={`font-bold ${
                        verificationResult.signatureVerified ? 'text-[#16803D]' : 'text-[#DC2626]'
                      }`}
                    >
                      {verificationResult.signatureVerified ? 'YES (PASSED)' : 'NO (UNSIGNED OR INVALID)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Package Name:</span>
                    <span className="font-mono text-[#202124]">{verificationResult.packageName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Version:</span>
                    <span className="font-mono text-[#202124]">
                      {verificationResult.versionName} ({verificationResult.versionCode})
                    </span>
                  </div>
                  {verificationResult.signingCertificateSha256 && (
                    <div className="pt-2">
                      <span className="text-[#6B7280] block text-[11px]">Signer Certificate Fingerprint:</span>
                      <span className="font-mono text-[10px] text-[#202124] break-all">
                        {verificationResult.signingCertificateSha256}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: MANAGE APPS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'apps' && (
          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#E5E7EB]">
                {(['all', 'published', 'pending', 'draft', 'rejected', 'archived'] as const).map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => setAppFilter(f)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize cursor-pointer transition-colors ${
                        appFilter === f
                          ? 'bg-[#FF7A00] text-white shadow-xs'
                          : 'text-[#6B7280] hover:text-[#202124]'
                      }`}
                    >
                      {f}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setActiveTab('upload')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF7A00] text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload New APK</span>
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
              {filteredApps.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#6B7280]">
                  <p className="font-semibold text-[#202124]">No applications in this category</p>
                  <p className="mt-1">Uploaded APKs will appear here with publication controls.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
                      <tr>
                        <th className="px-4 py-3">Application</th>
                        <th className="px-4 py-3">Package / Version</th>
                        <th className="px-4 py-3">Verification</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Downloads</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                      {filteredApps.map((app) => (
                        <tr key={app.id} className="hover:bg-[#FFFDFB]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#FFF7F0] text-[#FF7A00] flex items-center justify-center font-bold text-xs shrink-0">
                                {app.iconUrl ? (
                                  <img src={app.iconUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  app.title.charAt(0)
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-[#202124] block">{app.title}</span>
                                <span className="text-[#6B7280] text-[11px]">{app.developerName}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 font-mono text-[11px] text-[#4B5563]">
                            <div>{app.packageName}</div>
                            <div className="text-[#9CA3AF]">v{app.versionName}</div>
                          </td>

                          <td className="px-4 py-3">
                            {app.signatureVerified ? (
                              <span className="inline-flex items-center gap-1 text-[#16803D] font-semibold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#DC2626] font-semibold">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Unverified</span>
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 font-semibold uppercase text-[10px]">
                            <span
                              className={`px-2 py-0.5 rounded-md ${
                                app.status === 'published'
                                  ? 'bg-[#F0FDF4] text-[#16803D]'
                                  : app.status === 'pending'
                                  ? 'bg-[#FFFBEB] text-[#D97706]'
                                  : app.status === 'draft'
                                  ? 'bg-[#F3F4F6] text-[#4B5563]'
                                  : 'bg-[#FEF2F2] text-[#DC2626]'
                              }`}
                            >
                              {app.status}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-mono tabular-nums text-[#202124]">
                            {app.downloadCount.toLocaleString()}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setInspectApp(app)}
                                className="p-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#202124] cursor-pointer"
                                title="Inspect Details & Verification"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Publish button: disabled if unverified */}
                              {app.status !== 'published' && (
                                <button
                                  onClick={() => handleStatusChange(app.id, 'published')}
                                  disabled={!app.signatureVerified}
                                  className="px-2.5 py-1 rounded-lg bg-[#16803D] hover:bg-[#15803d] text-white font-semibold text-[11px] cursor-pointer disabled:opacity-40"
                                  title={
                                    !app.signatureVerified
                                      ? 'Cannot publish unverified application'
                                      : 'Approve & Publish'
                                  }
                                >
                                  Publish
                                </button>
                              )}

                              {app.status === 'published' && (
                                <button
                                  onClick={() => handleStatusChange(app.id, 'archived')}
                                  className="px-2.5 py-1 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] font-semibold text-[11px] cursor-pointer"
                                  title="Archive Application"
                                >
                                  Archive
                                </button>
                              )}

                              <button
                                onClick={() => setConfirmDeleteId(app.id)}
                                className="p-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] cursor-pointer"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: CMS SETTINGS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'cms' && cmsSettings && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-[#E5E7EB] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[#202124] mb-4">Marketplace CMS Settings</h2>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#202124] mb-1">Site Title</label>
                <input
                  type="text"
                  value={cmsSettings.siteName}
                  onChange={(e) => setCmsSettings({ ...cmsSettings, siteName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-[#202124] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202124] mb-1">Tagline</label>
                <input
                  type="text"
                  value={cmsSettings.tagline}
                  onChange={(e) => setCmsSettings({ ...cmsSettings, tagline: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-[#202124] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202124] mb-1">Contact Email</label>
                <input
                  type="email"
                  value={cmsSettings.contactEmail}
                  onChange={(e) => setCmsSettings({ ...cmsSettings, contactEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-[#202124] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202124] mb-1">Max Upload Limit (MB)</label>
                <input
                  type="number"
                  value={cmsSettings.maxUploadSizeMb}
                  onChange={(e) =>
                    setCmsSettings({ ...cmsSettings, maxUploadSizeMb: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-[#202124] focus:outline-hidden"
                />
              </div>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/v1/admin/cms', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken,
                      },
                      body: JSON.stringify(cmsSettings),
                    });
                    if (res.ok) {
                      setStatusMessage({ type: 'success', text: 'CMS settings saved.' });
                    }
                  } catch (err) {
                    setStatusMessage({ type: 'error', text: 'Failed to update CMS.' });
                  }
                }}
                className="w-full py-3 rounded-xl bg-[#FF7A00] text-white font-semibold cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: AUDIT LOGS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4">
            <h2 className="text-base font-bold text-[#202124]">Administrator Audit Trail</h2>
            <p className="text-xs text-[#6B7280]">
              Chronological log of publications, uploads, status transitions, and administrative actions.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5">Actor</th>
                    <th className="px-3 py-2.5">Action</th>
                    <th className="px-3 py-2.5">Target</th>
                    <th className="px-3 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6] font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-3 py-2.5 text-[#6B7280] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()} · {new Date(log.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 text-[#202124] font-sans font-medium">
                        {log.actorEmail}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-[#FF7A00]">
                        {log.action}
                      </td>
                      <td className="px-3 py-2.5 text-[#4B5563]">
                        {log.targetType} {log.targetId ? `(${log.targetId.substring(0, 10)})` : ''}
                      </td>
                      <td className="px-3 py-2.5 text-[#6B7280] max-w-xs truncate">
                        {JSON.stringify(log.details || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Delete */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#202124]">Delete Application Permanently?</h3>
            <p className="text-xs text-[#6B7280]">
              This action cannot be undone. The application record, verified APK artifact in Cloudflare R2, and public icons will be purged.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#F3F4F6] text-[#202124] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteApp(confirmDeleteId)}
                className="flex-1 py-2.5 rounded-xl bg-[#DC2626] text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Application Modal */}
      {inspectApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-base font-bold text-[#202124]">Cryptographic Inspection</h3>
              <button
                onClick={() => setInspectApp(null)}
                className="text-xs font-semibold text-[#6B7280] hover:text-[#202124] cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#6B7280] block">Title & Developer:</span>
                <span className="font-bold text-[#202124]">
                  {inspectApp.title} · {inspectApp.developerName}
                </span>
              </div>

              <div>
                <span className="text-[#6B7280] block">Package Name:</span>
                <span className="font-mono text-[#202124]">{inspectApp.packageName}</span>
              </div>

              <div>
                <span className="text-[#6B7280] block">APK SHA-256 Digest:</span>
                <span className="font-mono text-[11px] text-[#202124] break-all">{inspectApp.apkSha256}</span>
              </div>

              <div>
                <span className="text-[#6B7280] block">Developer Certificate Fingerprint:</span>
                <span className="font-mono text-[11px] text-[#202124] break-all">
                  {inspectApp.signingCertificateSha256 || 'None'}
                </span>
              </div>

              <div>
                <span className="text-[#6B7280] block">Status & Storage Key:</span>
                <span className="font-mono text-[11px] text-[#4B5563]">{inspectApp.apkObjectKey}</span>
              </div>

              <div>
                <span className="text-[#6B7280] block">Declared Permissions:</span>
                <div className="mt-1 max-h-32 overflow-y-auto font-mono text-[11px] divide-y divide-[#F3F4F6]">
                  {inspectApp.permissions?.map((p, idx) => (
                    <div key={idx} className="py-1 text-[#4B5563]">{p}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <button
                onClick={() => handleReverify(inspectApp.id)}
                className="px-3 py-2 rounded-xl bg-[#F3F4F6] text-[#202124] text-xs font-semibold cursor-pointer"
              >
                Re-Run Signature Verification
              </button>

              {inspectApp.status !== 'published' && (
                <button
                  onClick={() => {
                    handleStatusChange(inspectApp.id, 'published');
                    setInspectApp(null);
                  }}
                  disabled={!inspectApp.signatureVerified}
                  className="px-4 py-2 rounded-xl bg-[#16803D] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                >
                  Approve & Publish Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
