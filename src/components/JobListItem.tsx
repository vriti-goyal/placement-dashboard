import { useState } from 'react';
import { ParsedJob } from "@/lib/parser";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, MessageSquare } from "lucide-react";
import { JobStatus } from "./JobCard";

interface JobListItemProps {
  job: ParsedJob;
  status: JobStatus;
  onStatusChange: (status: JobStatus) => void;
  onClick: () => void;
}

export function JobListItem({ job, status, onStatusChange, onClick }: JobListItemProps) {
  const isApplied = status === 'applied';
  const isInterested = status === 'interested';
  const isOa = status === 'oa';
  const isInterview = status === 'interview';

  const formatDeadline = (deadlineStr: string | null) => {
    if (!deadlineStr) return "N/A";
    
    // Attempt to parse the deadline
    // Handles formats like "DD/MM/YYYY" or "DD-MM-YYYY"
    const parts = deadlineStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (!parts) return deadlineStr;

    let [, day, month, year] = parts;
    if (year.length === 2) year = `20${year}`;
    
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isNaN(d.getTime())) return deadlineStr;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Passed";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `${diffDays}d left`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDeadlineColor = (deadlineStr: string | null) => {
    const formatted = formatDeadline(deadlineStr);
    if (formatted === "Today" || formatted === "Tomorrow" || formatted === "Passed") return "text-red-400";
    if (formatted.includes("left")) return "text-[#FFD600]";
    return "text-[#94A3B8]";
  };

  const getStatusColor = (s: JobStatus) => {
    switch (s) {
      case 'interested': return 'bg-[#FFD600]/20 text-[#FFD600] border-[#FFD600]/50';
      case 'applied': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'oa': return 'bg-[#EA580C]/20 text-[#EA580C] border-[#EA580C]/50';
      case 'interview': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      default: return 'bg-white/5 text-[#94A3B8] border-white/10';
    }
  };

  return (
    <div 
      className="flex items-center p-4 border-b border-white/5 bg-[#0F1115] hover:bg-white/5 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex flex-col md:flex-row flex-1 min-w-0 md:items-center gap-2 md:gap-4">
        {/* Mobile Line 1: Company + Dropdown | Desktop: Company */}
        <div className="flex items-center justify-between md:w-[30%] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-heading font-bold text-white truncate group-hover:text-[#F7931A] transition-colors" title={job.company ? undefined : job.subject}>
              {job.company || (job.classification?.type !== 'Placement' && job.classification?.type !== 'Internship' ? job.subject : "Not specified")}
            </span>
            {job.messages && job.messages.length > 1 && (
              <Badge variant="outline" className="bg-white/5 text-[#94A3B8] border-white/10 shrink-0 text-[10px] h-5 px-1.5 font-mono hidden md:inline-flex">
                ↩ {job.messages.length - 1}
              </Badge>
            )}
          </div>
          <div className="md:hidden shrink-0 ml-2" onClick={e => e.stopPropagation()}>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value as JobStatus)}
              className={`h-8 rounded-lg text-xs font-medium px-2 outline-none cursor-pointer border ${getStatusColor(status)}`}
            >
              <option value="none" className="bg-[#0F1115] text-white">None</option>
              <option value="interested" className="bg-[#0F1115] text-[#FFD600]">Interested</option>
              <option value="applied" className="bg-[#0F1115] text-green-400">Applied</option>
              <option value="oa" className="bg-[#0F1115] text-[#EA580C]">OA Received</option>
              <option value="interview" className="bg-[#0F1115] text-purple-400">Interview</option>
            </select>
          </div>
        </div>

        {/* Mobile Line 2: Role + Tag + Deadline | Desktop: Role + Tag */}
        <div className="flex items-center justify-between md:flex-1 min-w-0 md:w-[25%] mt-1 md:mt-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-sm font-medium text-[#94A3B8] md:max-w-[120px] lg:max-w-none truncate block" title={job.role ? undefined : (job.company ? job.subject : undefined)}>
              {job.role || (job.company ? job.subject : "Details inside")}
            </span>
            <Badge variant="outline" className="shrink-0 bg-[#F7931A]/5 text-[#F7931A] border-[#F7931A]/30 font-mono text-[10px] uppercase tracking-wider px-1.5 h-5 hidden sm:inline-flex">
              {job.classification?.type || 'Placement'}
            </Badge>
          </div>
          <div className="md:hidden shrink-0 ml-2 flex items-center gap-2">
            <Badge variant="outline" className="sm:hidden bg-[#F7931A]/5 text-[#F7931A] border-[#F7931A]/30 font-mono text-[10px] uppercase tracking-wider px-1.5 h-5">
              {job.classification?.type || 'Placement'}
            </Badge>
            <span className={`text-xs font-mono font-medium ${getDeadlineColor(job.deadline)}`}>
              {formatDeadline(job.deadline)}
            </span>
          </div>
        </div>

        {/* Desktop Only: CG */}
        <div className="hidden md:flex w-16 shrink-0 justify-center">
          {job.cgCutoff ? (
            <Badge variant="outline" className="bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/30 font-mono text-[10px] px-1.5 h-5">
              {job.cgCutoff}
            </Badge>
          ) : (
            <span className="text-xs text-white/30 font-mono">-</span>
          )}
        </div>

        {/* Desktop Only: Deadline */}
        <div className="hidden md:flex w-24 shrink-0 justify-center">
          <span className={`text-xs font-mono font-medium ${getDeadlineColor(job.deadline)}`}>
            {formatDeadline(job.deadline)}
          </span>
        </div>

        {/* Desktop Only: Dropdown */}
        <div className="hidden md:flex w-32 shrink-0 justify-end" onClick={e => e.stopPropagation()}>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as JobStatus)}
            className={`h-8 w-full rounded-lg text-xs font-medium px-2 outline-none appearance-none cursor-pointer border ${getStatusColor(status)}`}
          >
            <option value="none" className="bg-[#0F1115] text-white">None</option>
            <option value="interested" className="bg-[#0F1115] text-[#FFD600]">Interested</option>
            <option value="applied" className="bg-[#0F1115] text-green-400">Applied</option>
            <option value="oa" className="bg-[#0F1115] text-[#EA580C]">OA Received</option>
            <option value="interview" className="bg-[#0F1115] text-purple-400">Interview</option>
          </select>
        </div>
      </div>

      <div className="w-8 shrink-0 flex justify-end text-[#94A3B8] group-hover:text-[#F7931A] transition-colors ml-2 md:ml-0">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  );
}
