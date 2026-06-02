"use client";

import { useEffect } from 'react';
import { X, CalendarClock, GraduationCap, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface EmailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  message: {
    messageId: string;
    subject: string;
    date: string;
    body: string;
    htmlBody?: string;
  } | null;
  jobData: {
    company: string | null;
    cgCutoff: string | null;
    branches: string[] | null;
    stipend: string | null;
    deadline: string | null;
  } | null;
}

export function EmailDrawer({ isOpen, onClose, message, jobData }: EmailDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  // Format clean text according to rules
  const formatText = (text: string) => {
    let cleanText = text.replace(/<[^>]*>?/gm, ''); // Strip remaining HTML tags
    const lines = cleanText.split('\n');
    const result: React.ReactNode[] = [];
    let consecutiveEmpty = 0;

    for (let i = 0; i < lines.length; i++) {
      const originalLine = lines[i];
      const trimmed = originalLine.trim();

      // Rule 2: Remove lines that are only dashes/underscores (decorative dividers)
      if (trimmed.length > 0 && /^[-_]+$/.test(trimmed)) {
        continue;
      }

      // Rule 3a: If empty -> insert paragraph break (skip consecutive empty lines)
      if (trimmed.length === 0) {
        if (consecutiveEmpty === 0) {
          result.push(<div key={`br-${i}`} className="h-4" />); // paragraph break
          consecutiveEmpty++;
        }
        continue;
      }

      // Reset empty counter since line has content
      consecutiveEmpty = 0;

      // Extract clickable links
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = trimmed.split(urlRegex);
      const formattedLine = parts.map((part, idx) => {
        if (part.match(urlRegex)) {
          return <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="text-[#F7931A] hover:underline break-all">{part}</a>;
        }
        return part;
      });

      // Rule 3b: If trimmed line is ALL CAPS and > 3 chars -> wrap in <h3>
      const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed);
      
      if (isAllCaps) {
        result.push(
          <h3 key={`h3-${i}`} className="font-heading font-bold text-[#F7931A] text-lg mt-6 mb-2">
            {formattedLine}
          </h3>
        );
      } else {
        // Normal text line
        result.push(<div key={`line-${i}`} className="mt-1">{formattedLine}</div>);
      }
    }

    return result;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        role="dialog" 
        aria-modal="true"
        className={`fixed top-0 right-0 bottom-0 w-full md:w-[480px] bg-[#0F1115] border-l border-white/10 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-heading font-bold text-white">{jobData?.company || "Not specified"}</h2>
              <div className="text-sm font-medium text-[#94A3B8] mt-1 line-clamp-2">{message.subject}</div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full text-[#94A3B8] hover:text-white hover:bg-white/10">
                <X className="w-5 h-5" />
              </Button>
              <div className="text-[10px] font-mono text-[#94A3B8] whitespace-nowrap">
                {new Date(message.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {jobData?.deadline && (
              <Badge variant="destructive" className="font-mono text-[9px] shadow-sm">
                <CalendarClock className="w-3 h-3 mr-1" /> {jobData.deadline}
              </Badge>
            )}
            {jobData?.cgCutoff && (
              <Badge variant="outline" className="font-mono text-[9px] bg-white/5 border-white/10 text-white">
                <GraduationCap className="w-3 h-3 mr-1 text-[#FFD600]" /> {jobData.cgCutoff}
              </Badge>
            )}
            {jobData?.stipend && (
              <Badge variant="outline" className="font-mono text-[9px] bg-white/5 border-white/10 text-white">
                <IndianRupee className="w-3 h-3 mr-1 text-green-400" /> {jobData.stipend}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-[#0B0C10]">
          <div className="text-sm text-[#E2E8F0] font-sans leading-[1.8] break-words">
            {formatText(message.body)}
          </div>
        </div>
      </div>
    </>
  );
}
