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
      className="flex items-center gap-4 p-4 border-b border-white/5 bg-[#0F1115] hover:bg-white/5 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex-1 w-[30%] min-w-0 flex items-center gap-2">
        <span className="font-heading font-bold text-white truncate group-hover:text-[#F7931A] transition-colors">
          {job.company || "Not specified"}
        </span>
        {job.messages && job.messages.length > 1 && (
          <Badge variant="outline" className="bg-white/5 text-[#94A3B8] border-white/10 shrink-0 text-[10px] h-5 px-1.5 font-mono">
            ↩ {job.messages.length - 1}
          </Badge>
        )}
      </div>

      <div className="flex-1 w-[25%] min-w-0">
        <span className="text-sm font-medium text-[#94A3B8] truncate block">
          {job.role || "Role not specified"}
        </span>
      </div>

      <div className="w-16 shrink-0 flex justify-center">
        {job.cgCutoff ? (
          <Badge variant="outline" className="bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/30 font-mono text-[10px] px-1.5 h-5">
            {job.cgCutoff}
          </Badge>
        ) : (
          <span className="text-xs text-white/30 font-mono">-</span>
        )}
      </div>

      <div className="w-24 shrink-0 flex justify-center">
        <span className={`text-xs font-mono font-medium ${getDeadlineColor(job.deadline)}`}>
          {formatDeadline(job.deadline)}
        </span>
      </div>

      <div className="w-32 shrink-0 flex justify-end" onClick={e => e.stopPropagation()}>
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

      <div className="w-8 shrink-0 flex justify-end text-[#94A3B8] group-hover:text-[#F7931A] transition-colors">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  );
}
