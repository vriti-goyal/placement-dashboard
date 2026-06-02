import { useState, useEffect } from "react";
import { ParsedJob } from "@/lib/parser";
import { Trophy, BookOpen, Bell, FileText, ChevronDown, ChevronUp, CheckCircle, ArrowLeftRight, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OtherMailCardProps {
  job: ParsedJob;
  onMoveToJobs: (id: string) => void;
  onClick: () => void;
}

export function OtherMailCard({ job, onMoveToJobs, onClick }: OtherMailCardProps) {
  const [isRead, setIsRead] = useState(false);

  useEffect(() => {
    const readMails = JSON.parse(localStorage.getItem("readOtherMails") || "[]");
    if (readMails.includes(job.id)) {
      setIsRead(true);
    }
  }, [job.id]);

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const readMails = JSON.parse(localStorage.getItem("readOtherMails") || "[]");
    if (!readMails.includes(job.id)) {
      readMails.push(job.id);
      localStorage.setItem("readOtherMails", JSON.stringify(readMails));
      setIsRead(true);
    }
  };

  const handleMoveToJobs = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveToJobs(job.id);
  };

  const cType = job.classification?.type || "Other";
  
  let Icon = FileText;
  if (cType === "Hackathon") Icon = Trophy;
  else if (cType === "Workshop" || cType === "Seminar") Icon = BookOpen;
  else if (cType === "Notice") Icon = Bell;

  return (
    <div 
      className={`flex items-center gap-4 p-4 border-b transition-colors cursor-pointer group ${isRead ? 'bg-[#0F1115]/50 border-white/5 opacity-60 hover:opacity-100 hover:bg-white/5' : 'bg-[#0F1115] border-white/10 hover:bg-white/5'}`}
      onClick={onClick}
    >
      <div className="w-8 shrink-0 flex justify-center">
        <Icon className={`w-5 h-5 ${isRead ? 'text-[#94A3B8]' : 'text-[#F7931A]'}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <span className={`font-heading font-semibold block truncate ${isRead ? 'text-[#94A3B8]' : 'text-white'} group-hover:text-[#F7931A] transition-colors`}>
          {job.subject}
        </span>
      </div>

      <div className="w-24 shrink-0 flex justify-center">
        <span className="text-[10px] text-[#94A3B8] font-mono">{new Date(job.date).toLocaleDateString()}</span>
      </div>

      <div className="w-24 shrink-0 flex justify-center">
        <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider px-1.5 h-5 ${isRead ? 'border-white/10 text-[#94A3B8]' : 'border-[#F7931A]/30 text-[#F7931A]'}`}>
          {cType}
        </Badge>
      </div>

      <div className="w-40 shrink-0 flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
        {!isRead && (
          <Button variant="ghost" size="icon" onClick={handleMarkAsRead} className="h-8 w-8 text-green-400 hover:bg-green-500/10 hover:text-green-400" title="Mark as Read">
            <CheckCircle className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={handleMoveToJobs} className="h-8 w-8 text-[#94A3B8] hover:text-[#F7931A] hover:bg-[#F7931A]/10" title="Move to Jobs">
          <ArrowLeftRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-8 shrink-0 flex justify-end text-[#94A3B8] group-hover:text-[#F7931A] transition-colors">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  );
}
