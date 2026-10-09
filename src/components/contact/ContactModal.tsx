import React, { useState } from 'react';
import { X, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  appId?: string;
  appTitle?: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  appId,
  appTitle,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(appTitle ? `Report concerning: ${appTitle}` : '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          appId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit inquiry');
      }

      setStatus({
        type: 'success',
        message: 'Your report or message was transmitted securely. Thank you.',
      });
      setTimeout(() => {
        onClose();
        setName('');
        setEmail('');
        setMessage('');
        setStatus(null);
      }, 2000);
    } catch (err) {
      setStatus({
        type: 'error',
        message: (err as Error).message || 'Failed to submit report',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#F3F4F6] relative my-auto p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6] mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#FF7A00]" />
            <h3 className="text-xl font-bold text-[#202124]">
              {appTitle ? `Report ${appTitle}` : 'Contact Marketplace'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F9FAFB] hover:bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:text-[#202124] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {status && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 mb-6 ${
              status.type === 'success'
                ? 'bg-[#F0FDF4] text-[#16803D] border border-[#BBF7D0]'
                : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1.5">Your Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#FF7A00] text-xs font-medium text-[#202124] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#FF7A00] text-xs font-medium text-[#202124] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1.5">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of issue"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#FF7A00] text-xs font-medium text-[#202124] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1.5">Details / Description</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue, defect, or feedback in detail..."
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#FF7A00] text-xs font-medium text-[#202124] focus:outline-hidden"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E56E00] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Send Message'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
