"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { differenceInDays, isSameDay, isToday, startOfDay, format } from 'date-fns';
import { ParsedJob } from '@/lib/parser';
import { JobStatus, JobCard } from './JobCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { EyeOff, Eye, CalendarClock, Pencil, Check, X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

interface CalendarViewProps {
  jobs: ParsedJob[];
  jobStatuses: Record<string, JobStatus>;
  taskTimes: Record<string, { time: string }>;
  userId?: string;
  dismissedJobs: string[];
  onDismiss: (id: string) => void;
  showDismissed: boolean;
  onToggleShowDismissed: () => void;
  onStatusChange: (id: string, status: JobStatus) => void;
  onAddCustomJob?: (job: ParsedJob) => void;
  onTaskTimeChange: (id: string, time: string) => void;
  onViewJob: (job: ParsedJob) => void;
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

function extractTime(text: string): string | null {
  if (!text) return null;
  const match = text.match(/\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*([AP]M)\b|\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/i);
  if (match) return match[0];
  const simpleMatch = text.match(/\bat\s*(1[0-2]|0?[1-9])\s*([AP]M)\b/i);
  if (simpleMatch) return `${simpleMatch[1]} ${simpleMatch[2]}`;
  return null;
}

function TaskItem({ 
  job, 
  status, 
  timeData, 
  onSaveTime, 
  onView 
}: { 
  job: ParsedJob, 
  status: JobStatus, 
  timeData: { time: string } | undefined, 
  onSaveTime: (time: string) => void,
  onView: () => void 
}) {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeVal, setEditTimeVal] = useState(timeData?.time || '');

  const extractedTime = useMemo(() => extractTime(job.rawBody), [job.rawBody]);
  const displayTime = timeData?.time || extractedTime;

  const handleSave = () => {
    onSaveTime(editTimeVal);
    setIsEditingTime(false);
  };

  return (
    <div className="bg-black/20 border border-white/10 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:border-[#F7931A]/30 transition-colors">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <div className="font-heading font-semibold text-white truncate">{job.company || 'Unknown Node'}</div>
          <div className="text-xs text-[#94A3B8] truncate">{job.role || 'No Function Defined'}</div>
        </div>
        <Badge className={`text-[10px] font-mono tracking-wider whitespace-nowrap shrink-0 ${status === 'interview' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-amber-500 hover:bg-amber-600'} text-white border-none`}>
          {status === 'interview' ? 'INTERVIEW' : 'OA'}
        </Badge>
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#94A3B8]" />
          {isEditingTime ? (
            <div className="flex items-center gap-1">
              <input
                type="time"
                value={editTimeVal}
                onChange={(e) => setEditTimeVal(e.target.value)}
                className="bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#F7931A]"
              />
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-6 w-6 text-green-400 hover:text-green-300 hover:bg-green-400/10">
                <Check className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsEditingTime(false)} className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-400/10">
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <span className={`text-xs ${displayTime ? 'text-white' : 'text-[#94A3B8]'}`}>
                {displayTime || 'Time not set'}
              </span>
              <button onClick={() => setIsEditingTime(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#94A3B8] hover:text-[#F7931A]">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <Button variant="ghost" size="sm" onClick={onView} className="h-7 px-3 text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/5">
          VIEW
        </Button>
      </div>
    </div>
  );
}

export function CalendarView({
  jobs,
  jobStatuses,
  taskTimes,
  userId,
  dismissedJobs,
  onDismiss,
  showDismissed,
  onToggleShowDismissed,
  onStatusChange,
  onAddCustomJob,
  onTaskTimeChange,
  onViewJob
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeDateFilter, setActiveDateFilter] = useState<string>('all');
  const dateScrollRef = useRef<HTMLDivElement>(null);

  const jobsWithDates = useMemo(() => {
    return jobs
      .map(job => ({ ...job, parsedDate: parseDeadlineDate(job.deadline) }))
      .filter(job => job.parsedDate !== null);
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    return showDismissed ? jobsWithDates : jobsWithDates.filter(j => !dismissedJobs.includes(j.id));
  }, [jobsWithDates, dismissedJobs, showDismissed]);

  const today = startOfDay(new Date());

  // Section 1: Today's Tasks
  const todaysTasks = useMemo(() => {
    return visibleJobs
      .filter(j => {
        const status = jobStatuses[j.id];
        return (status === 'oa' || status === 'interview') && isToday(j.parsedDate!);
      })
      .sort((a, b) => {
        const timeA = taskTimes[a.id]?.time || extractTime(a.rawBody) || '24:00';
        const timeB = taskTimes[b.id]?.time || extractTime(b.rawBody) || '24:00';
        return timeA.localeCompare(timeB);
      });
  }, [visibleJobs, jobStatuses, taskTimes]);

  // Section 2: Upcoming Tasks
  const upcomingTasksRaw = useMemo(() => {
    return visibleJobs
      .filter(j => {
        const status = jobStatuses[j.id];
        return (status === 'oa' || status === 'interview') && differenceInDays(j.parsedDate!, today) > 0;
      })
      .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());
  }, [visibleJobs, jobStatuses, today]);

  const upcomingDates = useMemo(() => {
    const dates = new Set<string>();
    upcomingTasksRaw.forEach(t => dates.add(t.parsedDate!.toISOString()));
    return Array.from(dates).map(d => new Date(d));
  }, [upcomingTasksRaw]);

  const groupedUpcomingTasks = useMemo(() => {
    const groups: Record<string, ParsedJob[]> = {};
    upcomingTasksRaw.forEach(job => {
      const dateKey = job.parsedDate!.toISOString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(job);
    });
    return Object.keys(groups)
      .map(k => ({ date: new Date(k), jobs: groups[k] }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [upcomingTasksRaw]);

  const filteredGroupedTasks = useMemo(() => {
    if (activeDateFilter === 'all') return groupedUpcomingTasks;
    return groupedUpcomingTasks.filter(g => g.date.toISOString() === activeDateFilter);
  }, [groupedUpcomingTasks, activeDateFilter]);

  // Calendar Logic
  const getJobsForDate = (date: Date) => {
    return visibleJobs.filter(j => isSameDay(j.parsedDate!, date));
  };

  const handleDayClick = (value: Date) => {
    setSelectedDate(value);
    setIsDialogOpen(true);
  };

  const getDotColor = (status: JobStatus) => {
    switch (status) {
      case 'interview': return 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]';
      case 'oa': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]';
      case 'applied': return 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]';
      case 'interested': return 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]';
      default: return 'bg-gray-400 shadow-[0_0_8px_rgba(156,163,175,0.6)]';
    }
  };

  const dbSaveTaskTime = async (id: string, time: string) => {
    onTaskTimeChange(id, time);
    if (!userId) return;
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const docRef = doc(db, `users/${userId}/taskTimes/${id}`);
      await setDoc(docRef, { time, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error('Failed to save task time', e);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start h-full">
      {/* Left Column: Tasks */}
      <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6 custom-scrollbar lg:h-[calc(100vh-200px)] lg:overflow-y-auto pr-1">
        
        {/* Section 1: Today's Tasks */}
        <div className="bg-[#0F1115] p-5 rounded-2xl border border-white/10 shadow-[0_0_30px_-10px_rgba(247,147,26,0.1)] relative">
          <div className="sticky top-0 bg-[#0F1115] z-10 pb-4 mb-2 border-b border-white/10">
            <h3 className="font-heading font-semibold text-white text-lg flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[#EA580C]" />
              Today — {format(today, 'E, MMM d')}
            </h3>
          </div>
          
          {todaysTasks.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center opacity-70">
              <Check className="w-8 h-8 text-[#94A3B8] mb-2" />
              <p className="text-sm text-[#94A3B8]">No OA or Interviews today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaysTasks.map(job => (
                <TaskItem 
                  key={job.id} 
                  job={job} 
                  status={jobStatuses[job.id]} 
                  timeData={taskTimes[job.id]} 
                  onSaveTime={(time) => dbSaveTaskTime(job.id, time)}
                  onView={() => onViewJob(job)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Upcoming Tasks */}
        <div className="bg-[#0F1115] p-5 rounded-2xl border border-white/10 shadow-[0_0_30px_-10px_rgba(247,147,26,0.1)] relative">
          <div className="sticky top-0 bg-[#0F1115] z-10 pb-4 mb-2 border-b border-white/10">
            <h3 className="font-heading font-semibold text-white text-lg flex items-center gap-2 mb-3">
              <CalendarIcon className="w-5 h-5 text-[#F7931A]" />
              Upcoming
            </h3>
            {upcomingDates.length > 0 && (
              <div 
                className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" 
                ref={dateScrollRef}
              >
                <Badge 
                  variant={activeDateFilter === 'all' ? 'default' : 'outline'}
                  className={`cursor-pointer whitespace-nowrap ${activeDateFilter === 'all' ? 'bg-[#F7931A] text-black hover:bg-[#EA580C]' : 'text-[#94A3B8] border-white/10 hover:text-white'}`}
                  onClick={() => setActiveDateFilter('all')}
                >
                  All
                </Badge>
                {upcomingDates.map(date => {
                  const dateStr = date.toISOString();
                  const isTomorrowDate = differenceInDays(date, today) === 1;
                  const label = isTomorrowDate ? `Tomorrow ${format(date, 'MMM d')}` : format(date, 'E MMM d');
                  return (
                    <Badge 
                      key={dateStr}
                      variant={activeDateFilter === dateStr ? 'default' : 'outline'}
                      className={`cursor-pointer whitespace-nowrap ${activeDateFilter === dateStr ? 'bg-[#F7931A] text-black hover:bg-[#EA580C]' : 'text-[#94A3B8] border-white/10 hover:text-white'}`}
                      onClick={() => setActiveDateFilter(dateStr)}
                    >
                      {label}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {filteredGroupedTasks.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center opacity-70">
              <CalendarIcon className="w-8 h-8 text-[#94A3B8] mb-2" />
              <p className="text-sm text-[#94A3B8]">No upcoming OA or Interviews</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroupedTasks.map(group => {
                const isTomorrowDate = differenceInDays(group.date, today) === 1;
                const headerLabel = isTomorrowDate ? `Tomorrow — ${format(group.date, 'E, MMM d')}` : format(group.date, 'E, MMM d');
                return (
                  <div key={group.date.toISOString()} className="space-y-3">
                    <div className="text-xs font-mono text-[#F7931A] uppercase tracking-wider pl-1">
                      {headerLabel}
                    </div>
                    {group.jobs.map(job => (
                      <TaskItem 
                        key={job.id} 
                        job={job} 
                        status={jobStatuses[job.id]} 
                        timeData={taskTimes[job.id]} 
                        onSaveTime={(time) => dbSaveTaskTime(job.id, time)}
                        onView={() => onViewJob(job)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Calendar Divider */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent h-full"></div>

      {/* Right Column: Calendar Grid */}
      <div className="w-full lg:flex-1 bg-[#0F1115] p-6 rounded-2xl border border-white/10 shadow-[0_0_30px_-10px_rgba(247,147,26,0.1)]">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <h3 className="font-heading font-semibold text-white text-lg">Deadline Ledger</h3>
          <Button variant="ghost" size="sm" onClick={onToggleShowDismissed} className="text-xs font-mono text-[#94A3B8] hover:text-white">
            {showDismissed ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showDismissed ? "[HIDE DISMISSED]" : "[SHOW DISMISSED]"}
          </Button>
        </div>
        
        <div className="calendar-container">
          <Calendar
            onClickDay={(value) => handleDayClick(value as Date)}
            tileContent={({ date, view }) => {
              if (view === 'month') {
                const dayJobs = getJobsForDate(date);
                if (dayJobs.length > 0) {
                  const displayDots = dayJobs.slice(0, 3);
                  const extra = dayJobs.length - 3;
                  return (
                    <div className="flex flex-wrap justify-center items-center gap-1 mt-1.5">
                      {displayDots.map(j => (
                        <div 
                          key={j.id} 
                          className={`w-1.5 h-1.5 rounded-full ${getDotColor(jobStatuses[j.id] || 'none')}`} 
                          title={j.company || 'Job'} 
                        />
                      ))}
                      {extra > 0 && (
                        <span className="text-[8px] font-mono text-[#94A3B8] ml-0.5">+{extra}</span>
                      )}
                    </div>
                  );
                }
              }
              return null;
            }}
            className="w-full rounded-lg border-none shadow-sm p-2 md:p-4 font-body text-xs md:text-sm bg-transparent text-white mobile-calendar-grid"
          />
        </div>
      </div>

      {/* Pop-up for Date Click */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[420px] w-full max-h-[60vh] overflow-hidden flex flex-col bg-[#0F1115] border border-white/10 text-white shadow-[0_0_50px_-10px_rgba(247,147,26,0.2)] md:rounded-xl rounded-t-2xl rounded-b-none md:rounded-b-xl fixed bottom-0 md:bottom-auto md:top-[50%] md:translate-y-[-50%] translate-y-0 transition-transform duration-300 m-0 p-0">
          <DialogHeader className="p-6 pb-4 border-b border-white/10">
            <DialogTitle className="font-heading text-xl text-white flex justify-between items-center pr-8">
              <span>Deadlines on <span className="text-[#F7931A]">{selectedDate ? format(selectedDate, 'MMM d, yyyy') : ''}</span></span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4 custom-scrollbar">
            {selectedDate && getJobsForDate(selectedDate).length > 0 ? (
              getJobsForDate(selectedDate).map(job => {
                const status = jobStatuses[job.id] || 'none';
                const time = taskTimes[job.id]?.time || extractTime(job.rawBody);
                return (
                  <div key={job.id} className="bg-black/20 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="font-heading font-semibold text-white truncate">{job.company || 'Unknown'}</div>
                        <div className="text-xs text-[#94A3B8] truncate">{job.role}</div>
                      </div>
                      <Badge className={`text-[10px] font-mono tracking-wider capitalize whitespace-nowrap ${getDotColor(status)} text-white bg-opacity-80`}>
                        {status === 'none' ? 'No Status' : status}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-[#94A3B8] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {time || 'No time set'}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setIsDialogOpen(false);
                          onViewJob(job);
                        }} 
                        className="h-6 px-3 text-[10px] bg-white/5 hover:bg-white/10"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-[#94A3B8] flex flex-col items-center">
                <CalendarIcon className="w-8 h-8 mb-3 opacity-50" />
                <p>No deadlines on this date.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
