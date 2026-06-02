"use client";

import { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { differenceInDays, isSameDay, isToday, isTomorrow, startOfDay } from 'date-fns';
import { ParsedJob } from '@/lib/parser';
import { JobStatus, JobCard } from './JobCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { EyeOff, Eye, CalendarClock, List, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from './ui/badge';

interface CalendarViewProps {
  jobs: ParsedJob[];
  jobStatuses: Record<string, JobStatus>;
  dismissedJobs: string[];
  onDismiss: (id: string) => void;
  showDismissed: boolean;
  onToggleShowDismissed: () => void;
  onStatusChange: (id: string, status: JobStatus) => void;
  onAddCustomJob?: (job: ParsedJob) => void;
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
  onStatusChange,
  onAddCustomJob
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  
  // Custom event form state
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventCompany, setNewEventCompany] = useState('');
  const [newEventRole, setNewEventRole] = useState('');
  
  // Mobile view toggle
  const [mobileView, setMobileView] = useState<'agenda' | 'grid'>('agenda');

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

  const groupedAgendaJobs = useMemo(() => {
    const today = startOfDay(new Date());
    const upcoming = visibleJobs.filter(j => differenceInDays(j.parsedDate!, today) >= 0)
      .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());
    
    const groups: Record<string, ParsedJob[]> = {};
    upcoming.forEach(job => {
      const dateKey = job.parsedDate!.toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(job);
    });
    return Object.keys(groups).map(k => ({ date: new Date(k), jobs: groups[k] }));
  }, [visibleJobs]);

  const getJobsForDate = (date: Date) => {
    return visibleJobs.filter(j => isSameDay(j.parsedDate!, date));
  };

  const handleDayClick = (value: Date) => {
    setSelectedDate(value);
    setIsDialogOpen(true);
    setIsAddingEvent(false);
    setNewEventCompany('');
    setNewEventRole('');
  };

  const handleAddCustom = () => {
    if (!newEventCompany || !onAddCustomJob || !selectedDate) return;
    const newJob: ParsedJob = {
      id: `custom-${Date.now()}`,
      company: newEventCompany,
      role: newEventRole,
      deadline: `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`,
      date: new Date().toISOString(),
      subject: `Custom Event: ${newEventCompany}`,
      rawBody: '',
      classification: { type: 'Placement', bucket: 'A' },
      cgCutoff: '',
      branches: [],
      stipend: '',
      backlogs: ''
    };
    onAddCustomJob(newJob);
    setIsAddingEvent(false);
    setNewEventCompany('');
    setNewEventRole('');
  };

  const getDotColor = (status: JobStatus, date: Date) => {
    if (status === 'applied') return 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]';
    if (status === 'interested') return 'bg-[#FFD600] shadow-[0_0_8px_rgba(255,214,0,0.6)]';
    if (isToday(date) || isTomorrow(date)) return 'bg-[#EA580C] shadow-[0_0_8px_rgba(234,88,12,0.6)]';
    return 'bg-white/30';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="w-full lg:flex-1 bg-[#0F1115] p-6 rounded-2xl border border-white/10 shadow-[0_0_30px_-10px_rgba(247,147,26,0.1)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-white/10 gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-heading font-semibold text-white text-lg">Deadline Ledger</h3>
            <div className="flex bg-white/5 rounded-lg p-1 md:hidden">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 px-2 text-xs ${mobileView === 'agenda' ? 'bg-[#1E293B] text-white' : 'text-[#94A3B8]'}`}
                onClick={() => setMobileView('agenda')}
              >
                <List className="w-3 h-3 mr-1" /> Agenda
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 px-2 text-xs ${mobileView === 'grid' ? 'bg-[#1E293B] text-white' : 'text-[#94A3B8]'}`}
                onClick={() => setMobileView('grid')}
              >
                <CalendarIcon className="w-3 h-3 mr-1" /> Grid
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggleShowDismissed} className="text-xs font-mono text-[#94A3B8] hover:text-white">
            {showDismissed ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showDismissed ? "[HIDE DISMISSED]" : "[SHOW DISMISSED]"}
          </Button>
        </div>
        
        <div className={`calendar-container ${mobileView === 'agenda' ? 'hidden md:block' : 'block'}`}>
          <Calendar
            onClickDay={(value) => handleDayClick(value as Date)}
            tileContent={({ date, view }) => {
              if (view === 'month') {
                const dayJobs = getJobsForDate(date);
                if (dayJobs.length > 0) {
                  return (
                    <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                      {dayJobs.map(j => (
                        <div 
                          key={j.id} 
                          className={`w-1.5 h-1.5 rounded-full ${getDotColor(jobStatuses[j.id] || 'none', date)}`} 
                          title={j.company || 'Job'} 
                        />
                      ))}
                    </div>
                  );
                }
              }
              return null;
            }}
            className="w-full rounded-lg border-none shadow-sm p-2 md:p-4 font-body text-xs md:text-sm bg-transparent text-white mobile-calendar-grid"
          />
        </div>

        <div className={`md:hidden ${mobileView === 'agenda' ? 'block' : 'hidden'}`}>
          {groupedAgendaJobs.length === 0 ? (
            <div className="py-12 text-center text-[#94A3B8]">No upcoming deadlines.</div>
          ) : (
            <div className="space-y-6">
              {groupedAgendaJobs.map(group => (
                <div key={group.date.toISOString()}>
                  <div className="text-xs font-mono text-[#F7931A] mb-3 uppercase tracking-wider">
                    {group.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="space-y-3">
                    {group.jobs.map(job => (
                      <div key={job.id} className="bg-black/20 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <span className="font-heading font-semibold text-white">{job.company || 'Unknown'}</span>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedDate(group.date); setIsDialogOpen(true); }} className="h-6 px-2 text-[10px] bg-white/5 hover:bg-white/10">
                            View
                          </Button>
                        </div>
                        <span className="text-xs text-[#94A3B8] truncate">{job.role}</span>
                        <div className="mt-1">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getDotColor(jobStatuses[job.id] || 'none', group.date)}`} />
                          <span className="text-xs capitalize text-white/70">{jobStatuses[job.id] || 'None'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-80 shrink-0 bg-[#0F1115] p-6 rounded-2xl border border-white/10 shadow-[0_0_30px_-10px_rgba(247,147,26,0.1)] space-y-6">
        <h3 className="font-heading font-semibold text-white text-lg pb-4 border-b border-white/10">Upcoming Nodes (14d)</h3>
        {upcomingJobs.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
             <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(247,147,26,0.1)]">
               <CalendarClock className="w-8 h-8 text-[#94A3B8]" />
             </div>
             <p className="text-sm font-medium text-white">No active deadlines detected</p>
             <p className="text-xs text-[#94A3B8] font-mono mt-2">Network sync complete.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingJobs.map(job => {
              const daysLeft = differenceInDays(job.parsedDate!, startOfDay(new Date()));
              return (
                <div key={job.id} className="p-4 border border-white/10 bg-black/20 rounded-xl hover:border-[#F7931A]/30 flex flex-col gap-3 transition-colors relative group shadow-sm hover:shadow-[0_0_15px_rgba(247,147,26,0.15)]">
                  <div className="flex justify-between items-start">
                    <div className="font-heading font-semibold text-sm text-white">{job.company || 'Unknown Node'}</div>
                    <Badge variant={daysLeft <= 1 ? "destructive" : "outline"} className="text-[10px] font-mono tracking-wider">
                      {daysLeft === 0 ? "TODAY" : daysLeft === 1 ? "TOMORROW" : `${daysLeft} DAYS`}
                    </Badge>
                  </div>
                  <div className="text-xs text-[#94A3B8] truncate">{job.role || 'No Function Defined'}</div>
                  <div className="text-xs text-[#94A3B8] truncate">{job.role || 'No Function Defined'}</div>
                  
                  {confirmId === job.id ? (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => { onDismiss(job.id); setConfirmId(null); }}
                      onMouseLeave={() => setConfirmId(null)}
                      className="absolute top-2 right-2 transition-opacity h-6 px-2 text-[10px] font-mono"
                    >
                      CONFIRM DISMISS
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setConfirmId(job.id)} 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2 text-[10px] font-mono text-[#F7931A] hover:bg-[#F7931A]/10 hover:text-white"
                    >
                      DISMISS
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[85vh] overflow-y-auto bg-[#0F1115] border border-white/10 text-white shadow-[0_0_50px_-10px_rgba(247,147,26,0.2)] md:rounded-xl rounded-t-2xl rounded-b-none md:rounded-b-xl fixed bottom-0 md:bottom-auto md:top-[50%] md:translate-y-[-50%] translate-y-0 transition-transform duration-300 m-0">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl md:text-2xl text-white flex justify-between items-center pr-8">
              <span>Nodes on <span className="text-[#F7931A]">{selectedDate?.toLocaleDateString()}</span></span>
              {!isAddingEvent && (
                <Button variant="outline" size="sm" onClick={() => setIsAddingEvent(true)} className="border-[#F7931A]/30 text-[#F7931A] hover:bg-[#F7931A]/10">
                  + Add Event
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {isAddingEvent && (
            <div className="mt-4 p-4 border border-[#F7931A]/30 bg-[#F7931A]/5 rounded-xl space-y-4">
              <div className="space-y-3">
                <label className="text-xs font-mono text-[#94A3B8] uppercase">Company / Title</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newEventCompany} 
                  onChange={e => setNewEventCompany(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F7931A]/50"
                  placeholder="e.g. Google"
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-mono text-[#94A3B8] uppercase">Role / Description (Optional)</label>
                <input 
                  type="text" 
                  value={newEventRole} 
                  onChange={e => setNewEventRole(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F7931A]/50"
                  placeholder="e.g. Software Engineer"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCustom(); }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsAddingEvent(false)}>Cancel</Button>
                <Button variant="default" size="sm" onClick={handleAddCustom} disabled={!newEventCompany} className="bg-[#F7931A] text-black hover:bg-[#EA580C]">Save Event</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 mt-6">
            {selectedDate && getJobsForDate(selectedDate).map(job => (
              <JobCard 
                key={job.id} 
                job={job} 
                status={jobStatuses[job.id] || 'none'} 
                onStatusChange={(s) => onStatusChange(job.id, s)} 
              />
            ))}
            {selectedDate && getJobsForDate(selectedDate).length === 0 && !isAddingEvent && (
              <div className="py-12 text-center text-[#94A3B8]">
                No events on this date.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
