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

  const borderColor = isInterview ? 'border-purple-400' : isOa ? 'border-orange-400' : isApplied ? 'border-green-400' : isInterested ? 'border-blue-400' : 'border-gray-200';
  const bgColor = isInterview ? 'bg-purple-50/20' : isOa ? 'bg-orange-50/20' : isApplied ? 'bg-green-50/10' : isInterested ? 'bg-blue-50/10' : 'bg-white';

  return (
    <Card className={`hover:shadow-lg transition-all duration-300 flex flex-col h-full ${bgColor} ${borderColor} border-2`}>
      <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/30">
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-gray-900">
              {job.company || "Not specified"}
            </CardTitle>
            <CardDescription className="text-sm font-medium mt-1.5 text-gray-600 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-gray-400" />
              {job.role || "Role not specified"}
            </CardDescription>
          </div>
          <Badge variant={job.deadline ? "destructive" : "secondary"} className="whitespace-nowrap shadow-sm">
            <CalendarClock className="w-3 h-3 mr-1.5" />
            {job.deadline || "Deadline Unknown"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded-md">
              <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-1">CGPA Cutoff</span>
              <span className="font-medium leading-none">{job.cgCutoff || "N/A"}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 rounded-md">
              <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-1">Stipend / CTC</span>
              <span className="font-medium leading-none">{job.stipend || "N/A"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 col-span-2">
            <div className="p-1.5 bg-amber-50 rounded-md">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-1">Active Backlogs Allowed</span>
              <span className="font-medium leading-none">{job.backlogs || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Eligible Branches</h4>
          <div className="flex flex-wrap gap-1.5">
            {job.branches && job.branches.length > 0 ? (
              job.branches.map((branch, i) => (
                <Badge key={i} variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100/50 font-medium px-2 py-0">
                  {branch}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-gray-500 italic">Not specified</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
           <Button 
             variant={isInterested ? "default" : "outline"} 
             size="sm" 
             className={`flex-1 min-w-[80px] text-xs ${isInterested ? 'bg-blue-600 hover:bg-blue-700 text-white border-transparent' : ''}`}
             onClick={() => onStatusChange(isInterested ? 'none' : 'interested')}
           >
             Interested
           </Button>
           <Button 
             variant={isApplied ? "default" : "outline"} 
             size="sm" 
             className={`flex-1 min-w-[80px] text-xs ${isApplied ? 'bg-green-600 hover:bg-green-700 text-white border-transparent' : ''}`}
             onClick={() => onStatusChange(isApplied ? 'none' : 'applied')}
           >
             Applied
           </Button>
           <Button 
             variant={isOa ? "default" : "outline"} 
             size="sm" 
             className={`flex-1 min-w-[80px] text-xs ${isOa ? 'bg-orange-600 hover:bg-orange-700 text-white border-transparent' : ''}`}
             onClick={() => onStatusChange(isOa ? 'none' : 'oa')}
           >
             OA
           </Button>
           <Button 
             variant={isInterview ? "default" : "outline"} 
             size="sm" 
             className={`flex-1 min-w-[80px] text-xs ${isInterview ? 'bg-purple-600 hover:bg-purple-700 text-white border-transparent' : ''}`}
             onClick={() => onStatusChange(isInterview ? 'none' : 'interview')}
           >
             Interview
           </Button>
         </div>
      </CardContent>
      
      <CardFooter className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 bg-gray-50/50 flex justify-between items-center rounded-b-xl">
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium text-gray-600">
                <FileText className="w-3 h-3 mr-1" /> Open
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{job.subject}</DialogTitle>
              </DialogHeader>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-md border font-sans">
                {job.rawBody}
              </pre>
            </DialogContent>
          </Dialog>
        </div>
        <div className="shrink-0">{new Date(job.date).toLocaleDateString()}</div>
      </CardFooter>
    </Card>
  );
}
