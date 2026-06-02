"use client";

import { useState } from 'react';
import { ParsedJob } from "@/lib/parser";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, GraduationCap, IndianRupee, CalendarClock, AlertCircle, FileText, CheckCircle2, Bookmark, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmailDrawer } from "./EmailDrawer";

export type JobStatus = 'none' | 'interested' | 'applied' | 'oa' | 'interview';

interface JobCardProps {
  job: ParsedJob;
  status: JobStatus;
  onStatusChange: (status: JobStatus) => void;
  onMoveToOther?: (id: string) => void;
}

export function JobCard({ job, status, onStatusChange, onMoveToOther }: JobCardProps) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  
  const isApplied = status === 'applied';
  const isInterested = status === 'interested';
  const isOa = status === 'oa';
  const isInterview = status === 'interview';

  const borderColor = isInterview ? 'border-purple-500/50' : isOa ? 'border-[#EA580C]/50' : isApplied ? 'border-green-500/50' : isInterested ? 'border-[#FFD600]/50' : 'border-white/10';
  const bgColor = isInterview ? 'bg-purple-500/5' : isOa ? 'bg-[#EA580C]/5' : isApplied ? 'bg-green-500/5' : isInterested ? 'bg-[#FFD600]/5' : 'bg-[#0F1115]';
  const shadowGlow = isInterview ? 'shadow-[0_0_20px_rgba(168,85,247,0.15)]' : isOa ? 'shadow-[0_0_20px_rgba(234,88,12,0.15)]' : isApplied ? 'shadow-[0_0_20px_rgba(34,197,94,0.15)]' : isInterested ? 'shadow-[0_0_20px_rgba(255,214,0,0.15)]' : '';

  return (
    <>
      <Card className={`flex flex-col h-full ${bgColor} ${borderColor} ${shadowGlow} hover:-translate-y-1 hover:shadow-[0_0_30px_-10px_rgba(247,147,26,0.3)] transition-all duration-300`}>
        <CardHeader className="pb-4 border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-white/5 blur-2xl rounded-full"></div>
          <div className="flex justify-between items-start gap-4 relative z-10">
            <div>
              <CardTitle className="text-xl font-heading font-bold tracking-tight text-white group-hover/card:text-[#F7931A] transition-colors flex flex-wrap items-center gap-3">
                {job.company || "Not specified"}
                {job.messages && job.messages.length > 1 && (
                  <Badge 
                    variant="secondary" 
                    className="bg-white/10 hover:bg-white/20 cursor-pointer text-[#94A3B8] flex items-center gap-1 font-mono text-[10px]"
                    onClick={(e) => { e.stopPropagation(); setIsTimelineOpen(!isTimelineOpen); }}
                  >
                    <MessageSquare className="w-3 h-3" />
                    {job.messages.length - 1} followups
                    {isTimelineOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm font-medium mt-1.5 text-[#94A3B8] flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#F7931A]/70" />
                {job.role || "Role not specified"}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge variant={job.deadline ? "destructive" : "outline"} className="whitespace-nowrap shadow-sm font-mono tracking-widest text-[10px]">
                <CalendarClock className="w-3 h-3 mr-1.5" />
                {job.deadline || "No deadline found"}
              </Badge>
              {job.deadlineUpdated && (
                <Badge variant="outline" className="border-[#FFD600]/30 text-[#FFD600] bg-[#FFD600]/10 whitespace-nowrap shadow-sm font-mono tracking-widest text-[9px]">
                  📅 Deadline updated
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm text-white">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
                <GraduationCap className="w-4 h-4 text-[#FFD600] shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider leading-none mb-1.5">CGPA Cutoff</span>
                <span className="font-mono font-medium leading-none text-white">{job.cgCutoff || "N/A"}</span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
                <IndianRupee className="w-4 h-4 text-green-400 shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider leading-none mb-1.5">Stipend / CTC</span>
                <span className="font-mono font-medium leading-none text-white">{job.stipend || "N/A"}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 col-span-2">
              <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-[#EA580C] shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider leading-none mb-1.5">Active Backlogs Allowed</span>
                <span className="font-mono font-medium leading-none text-white">{job.backlogs || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Eligible Branches</h4>
            <div className="flex flex-wrap gap-2">
              {job.branches && job.branches.length > 0 ? (
                job.branches.map((branch, i) => (
                  <Badge key={i} variant="outline" className="bg-white/5 text-[#94A3B8] hover:text-white border-white/10 font-mono px-2 py-0.5">
                    {branch}
                 </Badge>
                ))
              ) : (
                <span className="text-sm font-mono text-white/30 italic">Not specified</span>
              )}
            </div>
          </div>

          {isTimelineOpen && job.messages && job.messages.length > 1 && (
            <div className="pt-6 mt-6 border-t border-white/10">
              <h4 className="text-xs font-mono text-[#F7931A] uppercase tracking-wider mb-4">Communication Timeline</h4>
              <div className="relative pl-4 border-l border-white/20 space-y-6">
                {job.messages.map((msg, idx) => (
                  <div key={msg.messageId} className="relative">
                    <div className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 ${idx === 0 ? 'bg-[#F7931A] border-[#F7931A]' : 'bg-[#0F1115] border-[#94A3B8]'}`} />
                    <div className="text-[10px] font-mono text-[#94A3B8] mb-1">
                      {new Date(msg.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    <div className="font-semibold text-white text-sm mb-2">{msg.subject}</div>
                    <div className="text-xs text-[#94A3B8] line-clamp-3 mb-3">{msg.snippet ? msg.snippet : (msg.body.length > 150 ? msg.body.substring(0, 150) + '...' : msg.body)}</div>
                    
                    <Button variant="outline" size="sm" className="h-6 px-3 text-[10px] font-mono text-[#F7931A] border-[#F7931A]/30 hover:bg-[#F7931A]/10 hover:text-[#F7931A]" onClick={() => setSelectedMessage(msg)}>
                      View full email
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/10">
             <Button 
               variant={isInterested ? "default" : "outline"} 
               size="xs" 
               className={`flex-1 min-w-[80px] text-[10px] h-8 rounded-lg uppercase tracking-wider ${isInterested ? 'bg-[#FFD600]/20 text-[#FFD600] border-[#FFD600]/50 hover:bg-[#FFD600]/30 shadow-[0_0_15px_rgba(255,214,0,0.3)]' : 'border-white/20 text-[#94A3B8] hover:text-white hover:bg-white/10'}`}
               onClick={() => onStatusChange(isInterested ? 'none' : 'interested')}
             >
               Interested
             </Button>
             <Button 
               variant={isApplied ? "default" : "outline"} 
               size="xs" 
               className={`flex-1 min-w-[80px] text-[10px] h-8 rounded-lg uppercase tracking-wider ${isApplied ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-white/20 text-[#94A3B8] hover:text-white hover:bg-white/10'}`}
               onClick={() => onStatusChange(isApplied ? 'none' : 'applied')}
             >
               Applied
             </Button>
             <Button 
               variant={isOa ? "default" : "outline"} 
               size="xs" 
               className={`flex-1 min-w-[80px] text-[10px] h-8 rounded-lg uppercase tracking-wider ${isOa ? 'bg-[#EA580C]/20 text-[#EA580C] border-[#EA580C]/50 hover:bg-[#EA580C]/30 shadow-[0_0_15px_rgba(234,88,12,0.3)]' : 'border-white/20 text-[#94A3B8] hover:text-white hover:bg-white/10'}`}
               onClick={() => onStatusChange(isOa ? 'none' : 'oa')}
             >
               OA
             </Button>
             <Button 
               variant={isInterview ? "default" : "outline"} 
               size="xs" 
               className={`flex-1 min-w-[80px] text-[10px] h-8 rounded-lg uppercase tracking-wider ${isInterview ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-white/20 text-[#94A3B8] hover:text-white hover:bg-white/10'}`}
               onClick={() => onStatusChange(isInterview ? 'none' : 'interview')}
             >
               Interview
             </Button>
           </div>
        </CardContent>
        
        <CardFooter className="pt-4 pb-4 border-t border-white/10 text-xs font-mono text-[#94A3B8] bg-black/20 flex justify-between items-center mt-auto">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-8 px-3 text-[11px] font-mono text-[#F7931A] hover:text-white hover:bg-[#F7931A]/20" onClick={() => setSelectedMessage(job.messages?.[0] || { messageId: 'root', subject: job.subject, date: job.date, body: job.rawBody || '' })}>
              <FileText className="w-3.5 h-3.5 mr-1.5" /> RAW DATA
            </Button>
          </div>
          <div className="flex items-center gap-4">
            {onMoveToOther && (
              <Button variant="ghost" size="sm" onClick={() => onMoveToOther(job.id)} className="text-[10px] text-[#94A3B8] hover:text-[#EA580C] h-6 px-2">
                Move to Other
              </Button>
            )}
            <div className="shrink-0 tracking-widest">{new Date(job.date).toLocaleDateString()}</div>
          </div>
        </CardFooter>
      </Card>
      
      <EmailDrawer 
        isOpen={!!selectedMessage} 
        onClose={() => setSelectedMessage(null)} 
        message={selectedMessage} 
        jobData={job} 
      />
    </>
  );
}
