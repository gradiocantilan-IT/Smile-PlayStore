import React from 'react';
import { X, Shield } from 'lucide-react';

interface LegalModalProps {
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-[#F3F4F6] relative my-auto p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6] mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#FF7A00]" />
            <h3 className="text-xl font-bold text-[#202124]">
              {type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F9FAFB] hover:bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:text-[#202124] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs sm:text-sm text-[#4B5563] space-y-4 leading-relaxed">
          {type === 'privacy' ? (
            <>
              <p>
                <strong>Last Updated: October 2026</strong>
              </p>
              <p>
                Smile Store respects your privacy. We are committed to transparency and minimal data collection across our cloud Android marketplace.
              </p>
              <h4 className="font-bold text-[#202124] pt-2">1. Information We Collect</h4>
              <p>
                We collect server access logs and basic aggregated download counters necessary for marketplace operations and infrastructure health. We do not track personal identifying information of public visitors downloading applications.
              </p>
              <h4 className="font-bold text-[#202124] pt-2">2. Administrator Accounts</h4>
              <p>
                For authorized administrators, email addresses are stored securely via Firebase Authentication to authenticate administrative actions and maintain audit logs.
              </p>
              <h4 className="font-bold text-[#202124] pt-2">3. Storage & Third-Party Services</h4>
              <p>
                Verified Android APK packages and public icons are stored in private Cloudflare R2 buckets. Download URLs are delivered using short-lived signed URLs directly to the client.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Last Updated: October 2026</strong>
              </p>
              <p>
                By accessing Smile Store and downloading Android application packages (APKs), you agree to the following terms:
              </p>
              <h4 className="font-bold text-[#202124] pt-2">1. Open Catalog & Cryptographic Verification</h4>
              <p>
                Smile Store cryptographically verifies Android APK Signature Scheme (v2/v3) and hashes files prior to publication. <em>Cryptographic signature verification confirms file integrity and developer certificate identity; it does not constitute an absolute guarantee of software behavior.</em> Users install applications at their own discretion.
              </p>
              <h4 className="font-bold text-[#202124] pt-2">2. Intellectual Property</h4>
              <p>
                Applications hosted on Smile Store remain the property of their respective developers. Developers retain copyright over their software.
              </p>
              <h4 className="font-bold text-[#202124] pt-2">3. Prohibited Content</h4>
              <p>
                Applications containing malware, spyware, unauthorized modifications, or copyright infringement will be rejected or immediately archived by administrators upon notice.
              </p>
            </>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-[#F3F4F6] text-right">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#202124] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
