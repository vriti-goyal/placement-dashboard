import { ParsedJob } from "@/lib/parser";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, GraduationCap, IndianRupee, CalendarClock, AlertCircle, FileText, CheckCircle2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type JobStatus = 'none' | 'interested' | 'applied' | 'oa' | 'interview';

interface JobCardProps {
  job: ParsedJob;
  status: JobStatus;
  onStatusChange: (status: JobStatus) => void;
}

export function JobCard({ job, status, onStatusChange }: JobCardProps) {
  const isApplied = status === 'applied';
  const isInterested = status === 'interested';
  const isOa = status === 'oa';
  const isInterview = status === 'interview';

  const borderColor = isInterview ? 'border-purple-500/50' : isOa ? 'border-[#EA580C]/50' : isApplied ? 'border-green-500/50' : isInterested ? 'border-[#FFD600]/50' : 'border-white/10';
  const bgColor = isInterview ? 'bg-purple-500/5' : isOa ? 'bg-[#EA580C]/5' : isApplied ? 'bg-green-500/5' : isInterested ? 'bg-[#FFD600]/5' : 'bg-[#0F1115]';
  const shadowGlow = isInterview ? 'shadow-[0_0_20px_rgba(168,85,247,0.15)]' : isOa ? 'shadow-[0_0_20px_rgba(234,88,12,0.15)]' : isApplied ? 'shadow-[0_0_20px_rgba(34,197,94,0.15)]' : isInterested ? 'shadow-[0_0_20px_rgba(255,214,0,0.15)]' : '';

  return (
    <Card className={`flex flex-col h-full ${bgColor} ${borderColor} ${shadowGlow} hover:-translate-y-1 hover:shadow-[0_0_30px_-10px_rgba(247,147,26,0.3)] transition-all duration-300`}>
      <CardHeader className="pb-4 border-b border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-white/5 blur-2xl rounded-full"></div>
        <div className="flex justify-between items-start gap-4 relative z-10">
          <div>
            <CardTitle className="text-xl font-heading font-bold tracking-tight text-white group-hover/card:text-[#F7931A] transition-colors">
              {job.company || "Not specified"}
            </CardTitle>
            <CardDescription className="text-sm font-medium mt-1.5 text-[#94A3B8] flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-[#F7931A]/70" />
              {job.role || "Role not specified"}
            </CardDescription>
          </div>
          <Badge variant={job.deadline ? "destructive" : "outline"} className="whitespace-nowrap shadow-sm font-mono tracking-widest text-[10px]">
            <CalendarClock className="w-3 h-3 mr-1.5" />
            {job.deadline || "No deadline found"}
          </Badge>
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
          <Dialog>
            <DialogTrigger render={<Button variant="ghost" size="sm" className="h-8 px-3 text-[11px] font-mono text-[#F7931A] hover:text-white hover:bg-[#F7931A]/20" />}>
              <FileText className="w-3.5 h-3.5 mr-1.5" /> RAW DATA
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#0F1115] border-white/10 text-white shadow-[0_0_50px_-10px_rgba(247,147,26,0.2)]">
              <DialogHeader>
                <DialogTitle className="font-heading text-[#F7931A]">{job.subject}</DialogTitle>
              </DialogHeader>
              <pre className="whitespace-pre-wrap text-sm text-[#94A3B8] bg-black/50 p-6 rounded-xl border border-white/5 font-mono">
                {job.rawBody}
              </pre>
            </DialogContent>
          </Dialog>
        </div>
        <div className="shrink-0 tracking-widest">{new Date(job.date).toLocaleDateString()}</div>
      </CardFooter>
    </Card>
  );
}
