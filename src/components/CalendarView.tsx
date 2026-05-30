"use client";

import { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { differenceInDays, isSameDay, isToday, isTomorrow, startOfDay } from 'date-fns';
import { ParsedJob } from '@/lib/parser';
import { JobStatus, JobCard } from './JobCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { EyeOff, Eye, CalendarClock } from 'lucide-react';
import { Badge } from './ui/badge';

interface CalendarViewProps {
  jobs: ParsedJob[];
  jobStatuses: Record<string, JobStatus>;
  dismissedJobs: string[];
  onDismiss: (id: string) => void;
  showDismissed: boolean;
  onToggleShowDismissed: () => void;
  onStatusChange: (id: string, status: JobStatus) => void;
}

export function parseDeadlineDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    let year = parseInt(parts[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
}

export function CalendarView({
  jobs,
  jobStatuses,
  dismissedJobs,
  onDismiss,
  showDismissed,
  onToggleShowDismissed,
  onStatusChange
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Parse dates and filter jobs
  const jobsWithDates = useMemo(() => {
    return jobs
      .map(job => ({ ...job, parsedDate: parseDeadlineDate(job.deadline) }))
      .filter(job => job.parsedDate !== null);
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    return showDismissed ? jobsWithDates : jobsWithDates.filter(j => !dismissedJobs.includes(j.id));
  }, [jobsWithDates, dismissedJobs, showDismissed]);

  const upcomingJobs = useMemo(() => {
    const today = startOfDay(new Date());
    return visibleJobs
      .filter(j => {
        const days = differenceInDays(j.parsedDate!, today);
        return days >= 0 && days <= 14;
      })
      .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());
  }, [visibleJobs]);

  const getJobsForDate = (date: Date) => {
    return visibleJobs.filter(j => isSameDay(j.parsedDate!, date));
  };

  const handleDayClick = (value: Date) => {
    const jobsOnDay = getJobsForDate(value);
    if (jobsOnDay.length > 0) {
      setSelectedDate(value);
      setIsDialogOpen(true);
    }
  };

  const getDotColor = (status: JobStatus, date: Date) => {
    if (status === 'applied') return 'bg-green-500';
    if (status === 'interested') return 'bg-blue-500';
    if (isToday(date) || isTomorrow(date)) return 'bg-red-500';
    return 'bg-gray-400';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="w-full lg:flex-1 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Deadline Calendar</h3>
          <Button variant="ghost" size="sm" onClick={onToggleShowDismissed} className="text-xs">
            {showDismissed ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showDismissed ? "Hide Dismissed" : "Show Dismissed"}
          </Button>
        </div>
        
        <div className="calendar-container">
          <Calendar
            onClickDay={(value) => handleDayClick(value as Date)}
            tileContent={({ date, view }) => {
              if (view === 'month') {
                const dayJobs = getJobsForDate(date);
                if (dayJobs.length > 0) {
                  return (
                    <div className="flex flex-wrap justify-center gap-1 mt-1">
                      {dayJobs.map(j => (
                        <div 
                          key={j.id} 
                          className={`w-2 h-2 rounded-full ${getDotColor(jobStatuses[j.id] || 'none', date)}`} 
                          title={j.company || 'Job'} 
                        />
                      ))}
                    </div>
                  );
                }
              }
              return null;
            }}
            className="w-full rounded-lg border-none shadow-sm p-4 font-sans text-sm"
          />
        </div>
      </div>

      <div className="w-full lg:w-80 shrink-0 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-900">Upcoming Deadlines (Next 14 Days)</h3>
        {upcomingJobs.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
             <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
               <CalendarClock className="w-6 h-6 text-gray-300" />
             </div>
             <p className="text-sm font-medium text-gray-600">No deadlines in next 14 days</p>
             <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingJobs.map(job => {
              const daysLeft = differenceInDays(job.parsedDate!, startOfDay(new Date()));
              return (
                <div key={job.id} className="p-3 border rounded-lg hover:bg-gray-50 flex flex-col gap-2 transition-colors relative group">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-sm text-gray-900">{job.company || 'Unknown Company'}</div>
                    <Badge variant={daysLeft <= 1 ? "destructive" : "secondary"} className="text-[10px]">
                      {daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft} days`}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 truncate">{job.role || 'No Role'}</div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onDismiss(job.id)} 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2 text-[10px]"
                  >
                    Dismiss
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Jobs due on {selectedDate?.toLocaleDateString()}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {selectedDate && getJobsForDate(selectedDate).map(job => (
              <JobCard 
                key={job.id} 
                job={job} 
                status={jobStatuses[job.id] || 'none'} 
                onStatusChange={(s) => onStatusChange(job.id, s)} 
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
