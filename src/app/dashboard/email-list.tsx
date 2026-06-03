"use client";

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { signIn } from 'next-auth/react';
import { parseEmail, ParsedJob } from '@/lib/parser';
import { JobStatus } from '@/components/JobCard';
import { JobListItem } from '@/components/JobListItem';
import { RefreshCw, FilterX, Search, DollarSign, AlertCircle, Filter, X, Mail, ChevronDown, ChevronUp, Menu, Briefcase, Calendar as CalendarIcon, Settings as SettingsIcon, ArrowUpDown } from 'lucide-react';
import { OtherMailCard } from '@/components/OtherMailCard';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingModal } from '@/components/OnboardingModal';
import { useDebounce } from '@/lib/useDebounce';
import { LogoutButton } from '@/components/LogoutButton';
import { SettingsView } from '@/components/SettingsView';
import { UserProfile } from '@/components/ProfileModal';
import { EmailDrawer } from '@/components/EmailDrawer';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, getDocs, query, writeBatch } from 'firebase/firestore';

const CalendarView = dynamic(() => import('@/components/CalendarView').then(mod => mod.CalendarView), { 
  ssr: false,
  loading: () => <CalendarSkeleton />
});

function JobListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-white/5 bg-[#0F1115] animate-pulse">
      <div className="flex-1 w-[30%] min-w-0">
        <div className="h-5 bg-white/5 rounded w-2/3"></div>
      </div>
      <div className="flex-1 w-[25%] min-w-0">
        <div className="h-4 bg-white/5 rounded w-1/2"></div>
      </div>
      <div className="w-16 shrink-0 flex justify-center">
        <div className="h-5 w-8 bg-white/5 rounded"></div>
      </div>
      <div className="w-24 shrink-0 flex justify-center">
        <div className="h-4 w-12 bg-white/5 rounded"></div>
      </div>
      <div className="w-32 shrink-0 flex justify-end">
        <div className="h-8 w-full bg-white/5 rounded-lg"></div>
      </div>
      <div className="w-8 shrink-0 flex justify-end">
        <div className="w-5 h-5 bg-white/5 rounded-full"></div>
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-pulse">
      <div className="w-full lg:flex-1 h-96 bg-[#0F1115] border border-white/10 rounded-2xl shadow-[0_0_30px_-10px_rgba(247,147,26,0.1)]"></div>
      <div className="w-full lg:w-80 shrink-0 h-96 bg-[#0F1115] border border-white/10 rounded-2xl shadow-[0_0_30px_-10px_rgba(247,147,26,0.1)]"></div>
    </div>
  );
}

interface EmailListProps {
  session?: any;
}

export default function EmailList({ session }: EmailListProps) {
  const [jobs, setJobs] = useState<ParsedJob[]>([]);
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>({});
  const [taskTimes, setTaskTimes] = useState<Record<string, { time: string }>>({});
  const [profile, setProfile] = useState<UserProfile>({ cgpa: '', branch: '', geminiKey: '' });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Sidebar State
  const [activeSidebarView, setActiveSidebarView] = useState<'jobs' | 'calendar' | 'settings'>('jobs');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<string>('all'); // job filter tabs
  const [roleSearch, setRoleSearch] = useState('');
  const [minStipend, setMinStipend] = useState('');
  const [techFilter, setTechFilter] = useState<'all' | 'tech' | 'non-tech'>('all');
  
  const [sortBy, setSortBy] = useState<'company' | 'deadline'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [dismissedJobs, setDismissedJobs] = useState<string[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [reclassifications, setReclassifications] = useState<Record<string, 'A'|'B'>>({});
  const [showOtherMails, setShowOtherMails] = useState(false);
  const [readOtherMails, setReadOtherMails] = useState<string[]>([]);

  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [selectedJobData, setSelectedJobData] = useState<ParsedJob | null>(null);

  const debouncedRoleSearch = useDebounce(roleSearch, 300);
  const debouncedMinStipend = useDebounce(minStipend, 300);

  // Load initial state
  useEffect(() => {
    const p = localStorage.getItem("userProfile");
    if (p) {
      try { setProfile(JSON.parse(p)); } catch(e){}
    }
    const d = localStorage.getItem("dismissedJobs");
    if (d) {
      try { setDismissedJobs(JSON.parse(d)); } catch(e){}
    }
    const cj = localStorage.getItem("customJobs");
    if (cj) {
      try { setCustomJobs(JSON.parse(cj)); } catch(e){}
    }
    const rc = localStorage.getItem("reclassifications");
    if (rc) {
      try { setReclassifications(JSON.parse(rc)); } catch(e){}
    }
    const loadReadMails = () => {
      const rm = localStorage.getItem("readOtherMails");
      if (rm) {
        try { setReadOtherMails(JSON.parse(rm)); } catch(e){}
      }
    };
    loadReadMails();
    window.addEventListener('readOtherMailsChanged', loadReadMails);
    fetchEmails();
    return () => window.removeEventListener('readOtherMailsChanged', loadReadMails);
  }, []);

  // Firebase status load / migration
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const migrateAndLoad = async () => {
      const migrationDone = localStorage.getItem('jobStatusesMigrationDone');
      
      if (!migrationDone) {
        // Run migration
        try {
          const statusesStr = localStorage.getItem('jobStatuses');
          const localStatuses = statusesStr ? JSON.parse(statusesStr) : {};
          const batch = writeBatch(db);
          let hasEntries = false;
          
          for (const [jobId, status] of Object.entries(localStatuses)) {
            if (status && status !== 'none') {
              hasEntries = true;
              const docRef = doc(db, `users/${session.user.id}/taggedCompanies/${jobId}`);
              batch.set(docRef, { status, updatedAt: serverTimestamp() });
            }
          }
          
          if (hasEntries) {
            await batch.commit();
          }
          
          localStorage.setItem('jobStatusesMigrationDone', 'true');
          localStorage.removeItem('jobStatuses');
          setJobStatuses(localStatuses);
        } catch (e) {
          console.error('Migration to Firestore failed', e);
        }
      } else {
        // Just load from Firestore
        try {
          const q = query(collection(db, `users/${session.user.id}/taggedCompanies`));
          const querySnapshot = await getDocs(q);
          const statuses: Record<string, JobStatus> = {};
          querySnapshot.forEach((d) => {
            statuses[d.id] = d.data().status as JobStatus;
          });
          setJobStatuses(statuses);
        } catch (e) {
          console.error('Failed to load statuses from Firestore', e);
        }
      }
    };
    
    const loadTaskTimes = async () => {
      try {
        const q = query(collection(db, `users/${session.user.id}/taskTimes`));
        const querySnapshot = await getDocs(q);
        const times: Record<string, { time: string }> = {};
        querySnapshot.forEach((d) => {
          times[d.id] = { time: d.data().time };
        });
        setTaskTimes(times);
      } catch (e) {
        console.error('Failed to load taskTimes from Firestore', e);
      }
    };
    
    migrateAndLoad();
    loadTaskTimes();
  }, [session?.user?.id]);

  const handleStatusChange = async (id: string, status: JobStatus) => {
    setJobStatuses(prev => {
      const next = { ...prev, [id]: status };
      if (status === 'none') delete next[id];
      return next;
    });

    if (!session?.user?.id) return;

    try {
      const docRef = doc(db, `users/${session.user.id}/taggedCompanies/${id}`);
      if (status === 'none') {
        await deleteDoc(docRef);
      } else {
        const job = jobs.find(j => j.id === id);
        await setDoc(docRef, { 
          status,
          company: job?.company || 'Unknown',
          role: job?.role || 'Unknown',
          deadline: job?.deadline || null,
          updatedAt: serverTimestamp() 
        }, { merge: true });
      }
    } catch (e) {
      console.error('Failed to update status in Firestore', e);
    }
  };

  const handleDismissJob = (id: string) => {
    setDismissedJobs(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem("dismissedJobs", JSON.stringify(next));
      return next;
    });
  };

  const handleReclassify = (id: string, newBucket: 'A'|'B') => {
    setReclassifications(prev => {
      const next = { ...prev, [id]: newBucket };
      localStorage.setItem("reclassifications", JSON.stringify(next));
      return next;
    });
  };

  const fetchEmails = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      const url = forceRefresh ? '/api/emails?refresh=true' : '/api/emails';
      const res = await fetch(url);
      
      if (res.status === 401) {
        signIn("google");
        return;
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch emails');

      const emails = data.emails || [];
      
      let currentKey = '';
      const p = localStorage.getItem("userProfile");
      if (p) {
        try { currentKey = JSON.parse(p).geminiKey || ''; } catch(e){}
      }

      const parsedJobs: ParsedJob[] = [];
      
      for (const email of emails) {
        const cacheKey = `parsed_email_${email.id}`;
        
        if (!forceRefresh) {
          const cachedStr = localStorage.getItem(cacheKey);
          if (cachedStr) {
            try { 
              let cachedJob = JSON.parse(cachedStr);
              if (!cachedJob.messages) {
                cachedJob.messages = [{
                  messageId: cachedJob.id,
                  subject: cachedJob.subject,
                  date: cachedJob.date,
                  body: cachedJob.rawBody,
                  snippet: ''
                }];
                localStorage.setItem(cacheKey, JSON.stringify(cachedJob));
              }
              if (!email.messages || cachedJob.messages.length === email.messages.length) {
                parsedJobs.push(cachedJob);
                continue;
              }
            } catch (e) {}
          }
        }
        
        let parsed = parseEmail(email);
        
        if ((!parsed.company || !parsed.role) && currentKey) {
          try {
            const aiRes = await fetch('/api/parse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subject: parsed.subject, body: parsed.rawBody, apiKey: currentKey })
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              parsed = { ...parsed, ...aiData };
            }
          } catch (e) {
            console.error("Auto AI Parse failed for", email.id, e);
          }
          await new Promise(r => setTimeout(r, 1000));
        }

        localStorage.setItem(cacheKey, JSON.stringify(parsed));
        parsedJobs.push(parsed);
      }

      setJobs(parsedJobs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [customJobs, setCustomJobs] = useState<ParsedJob[]>([]);

  const handleAddCustomJob = (job: ParsedJob) => {
    setCustomJobs(prev => {
      const next = [...prev, job];
      localStorage.setItem("customJobs", JSON.stringify(next));
      return next;
    });
  };

  const bucketA = useMemo(() => {
    return [...customJobs, ...jobs];
  }, [jobs, customJobs]);

  const bucketB: ParsedJob[] = []; // Kept for type safety in other components, but always empty.

  const parseDateForSort = (dateStr: string | null) => {
    if (!dateStr) return Number.MAX_SAFE_INTEGER;
    const parts = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (!parts) return Number.MAX_SAFE_INTEGER;
    let [, day, month, year] = parts;
    if (year.length === 2) year = `20${year}`;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isNaN(d.getTime())) return Number.MAX_SAFE_INTEGER;
    return d.getTime();
  };

  // Filtering Logic
  // Base Filtering Logic (Search, Profile, Min Stipend, Tech Filter)
  const baseFilteredJobs = useMemo(() => {
    return bucketA.filter(job => {
      // Profile CGPA filter
      if (profile.cgpa && job.cgCutoff) {
        const myCg = parseFloat(profile.cgpa);
        const reqCg = parseFloat(job.cgCutoff);
        if (!isNaN(myCg) && !isNaN(reqCg) && reqCg > myCg) {
          return false;
        }
      }

      // Profile Branch filter
      if (profile.branch && job.branches && job.branches.length > 0) {
        const myBranch = profile.branch.toLowerCase();
        const matchesBranch = job.branches.some(b => b.toLowerCase().includes(myBranch));
        if (!matchesBranch) return false;
      }

      // Role or Tag Search
      if (debouncedRoleSearch) {
        const searchLower = debouncedRoleSearch.toLowerCase();
        const roleMatch = job.role && job.role.toLowerCase().includes(searchLower);
        const typeMatch = job.classification?.type && job.classification.type.toLowerCase().includes(searchLower);
        if (!roleMatch && !typeMatch) return false;
      }

      // Stipend Minimum
      if (debouncedMinStipend && job.stipend) {
        const minVal = parseInt(debouncedMinStipend.replace(/\D/g, ''));
        const stipVal = parseInt(job.stipend.replace(/\D/g, ''));
        if (!isNaN(minVal) && !isNaN(stipVal)) {
           let adjustedStip = stipVal;
           if (job.stipend.toLowerCase().includes('k') && stipVal < 1000) adjustedStip *= 1000;
           let adjustedMin = minVal;
           if (debouncedMinStipend.toLowerCase().includes('k') && minVal < 1000) adjustedMin *= 1000;
           
           if (adjustedStip < adjustedMin) return false;
        }
      }

      // Tech / Non-Tech Filter
      if (techFilter !== 'all') {
        if (!job.role) return false;
        const roleLower = job.role.toLowerCase();
        
        if (techFilter === 'tech') {
          const techPattern = /\b(engineer|developer|sde|software|data|ml|ai|qa|devops|cloud|cyber|network|system|it|backend|frontend|fullstack|web)\b/i;
          const techLong = ['engineer', 'developer', 'software', 'devops', 'cyber', 'backend', 'frontend', 'fullstack'];
          const matchesTech = techPattern.test(roleLower) || techLong.some(kw => roleLower.includes(kw));
          if (!matchesTech) return false;
        } else if (techFilter === 'non-tech') {
          const nonTechPattern = /\b(manager|consultant|finance|hr|marketing|sales|operations|business|analyst|management|executive|associate|trainee|intern)\b/i;
          const nonTechLong = ['manager', 'consultant', 'finance', 'marketing', 'operations', 'business', 'analyst', 'management', 'executive'];
          const matchesNonTech = nonTechPattern.test(roleLower) || nonTechLong.some(kw => roleLower.includes(kw));
          if (!matchesNonTech) return false;
        }
      }

      return true;
    });
  }, [bucketA, profile, debouncedRoleSearch, debouncedMinStipend, techFilter]);

  // Tab Filtering & Sorting Logic
  const filteredJobs = useMemo(() => {
    return baseFilteredJobs.filter(job => {
      // Tab filter
      const status = jobStatuses[job.id] || 'none';
      if (activeTab !== 'all' && status !== activeTab) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'company') {
        const compA = (a.company || '').toLowerCase();
        const compB = (b.company || '').toLowerCase();
        return sortOrder === 'asc' ? compA.localeCompare(compB) : compB.localeCompare(compA);
      } else {
        const dateA = parseDateForSort(a.deadline);
        const dateB = parseDateForSort(b.deadline);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });
  }, [baseFilteredJobs, jobStatuses, activeTab, sortBy, sortOrder]);

  const clearFilters = () => {
    setRoleSearch('');
    setMinStipend('');
    setTechFilter('all');
  };

  const counts = useMemo(() => ({
    total: baseFilteredJobs.length,
    placements: baseFilteredJobs.filter(j => j.classification?.type === 'Placement' || !j.classification?.type).length,
    internships: baseFilteredJobs.filter(j => j.classification?.type === 'Internship').length,
    other: bucketB.length,
    interested: baseFilteredJobs.filter(j => (jobStatuses[j.id] || 'none') === 'interested').length,
    applied: baseFilteredJobs.filter(j => (jobStatuses[j.id] || 'none') === 'applied').length,
    oa: baseFilteredJobs.filter(j => (jobStatuses[j.id] || 'none') === 'oa').length,
    interview: baseFilteredJobs.filter(j => (jobStatuses[j.id] || 'none') === 'interview').length,
  }), [baseFilteredJobs, bucketB.length, jobStatuses]);

  return (
    <div className="flex w-full h-full text-foreground bg-transparent font-body overflow-hidden">
      <OnboardingModal />

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-full md:w-16 lg:w-64 bg-[#0F1115] border-r border-white/10 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between md:justify-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F7931A] to-[#EA580C] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(247,147,26,0.5)]">
              <span className="font-heading font-bold text-white text-lg">T</span>
            </div>
            <span className="font-heading font-bold text-xl tracking-tight md:hidden lg:inline">TNP Dash</span>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-[#94A3B8] hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-4 py-2 flex flex-col gap-2 flex-1 items-center lg:items-stretch">
          <Button 
            variant="ghost" 
            className={`w-full justify-start md:justify-center lg:justify-start gap-3 px-4 py-6 rounded-xl transition-all ${activeSidebarView === 'jobs' ? 'bg-[#F7931A]/10 text-[#F7931A] hover:bg-[#F7931A]/20 hover:text-[#F7931A]' : 'text-[#94A3B8] hover:text-white hover:bg-white/5'}`}
            onClick={() => { setActiveSidebarView('jobs'); setIsSidebarOpen(false); }}
            title="Jobs"
          >
            <Briefcase className="w-5 h-5 shrink-0" />
            <span className="font-medium text-base md:hidden lg:inline">Jobs</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full justify-start md:justify-center lg:justify-start gap-3 px-4 py-6 rounded-xl transition-all ${activeSidebarView === 'calendar' ? 'bg-[#F7931A]/10 text-[#F7931A] hover:bg-[#F7931A]/20 hover:text-[#F7931A]' : 'text-[#94A3B8] hover:text-white hover:bg-white/5'}`}
            onClick={() => { setActiveSidebarView('calendar'); setIsSidebarOpen(false); }}
            title="Calendar"
          >
            <CalendarIcon className="w-5 h-5 shrink-0" />
            <span className="font-medium text-base md:hidden lg:inline">Calendar</span>
          </Button>
        </div>

        <div className="p-4 mt-auto flex flex-col items-center lg:items-stretch">
          <div className="w-full h-px bg-white/10 mb-4"></div>
          <Button 
            variant="ghost" 
            className={`w-full justify-start md:justify-center lg:justify-start gap-3 px-4 py-6 rounded-xl transition-all ${activeSidebarView === 'settings' ? 'bg-[#F7931A]/10 text-[#F7931A] hover:bg-[#F7931A]/20 hover:text-[#F7931A]' : 'text-[#94A3B8] hover:text-white hover:bg-white/5'}`}
            onClick={() => { setActiveSidebarView('settings'); setIsSidebarOpen(false); }}
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5 shrink-0" />
            <span className="font-medium text-base md:hidden lg:inline">Settings</span>
          </Button>
          
          {session && (
            <div className="mt-6 flex items-center justify-between lg:px-2 flex-col lg:flex-row gap-4 lg:gap-0">
              <div className="flex flex-col truncate pr-2 md:hidden lg:flex items-center lg:items-start text-center lg:text-left">
                <span className="text-sm font-medium text-white truncate w-full">{session.user?.name}</span>
                <span className="text-xs text-[#94A3B8] truncate w-full">{session.user?.email}</span>
              </div>
              <LogoutButton />
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0F1115]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F7931A] to-[#EA580C] flex items-center justify-center shadow-[0_0_15px_rgba(247,147,26,0.5)]">
              <span className="font-heading font-bold text-white text-lg">T</span>
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-white">TNP Dash</span>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative">
          
          {activeSidebarView === 'settings' && (
            <SettingsView profile={profile} onProfileUpdate={setProfile} />
          )}

          {activeSidebarView === 'calendar' && (
            <div className="max-w-7xl mx-auto space-y-8">
               <h2 className="text-3xl font-heading font-bold tracking-tight text-white mb-8 flex items-center gap-3">
                  <div className="w-2 h-8 bg-gradient-to-b from-[#F7931A] to-[#EA580C] rounded-full"></div>
                  Calendar Overview
               </h2>
               <CalendarView 
                  jobs={bucketA} 
                  jobStatuses={jobStatuses} 
                  taskTimes={taskTimes}
                  userId={session?.user?.id}
                  dismissedJobs={dismissedJobs}
                  onDismiss={handleDismissJob}
                  showDismissed={showDismissed}
                  onToggleShowDismissed={() => setShowDismissed(!showDismissed)}
                  onStatusChange={handleStatusChange}
                  onAddCustomJob={handleAddCustomJob}
                  onTaskTimeChange={(id, time) => {
                    setTaskTimes(prev => ({ ...prev, [id]: { time } }));
                  }}
                  onViewJob={(job) => {
                    setSelectedMessage(job.messages?.[0] || { messageId: 'root', subject: job.subject, date: job.date, body: job.rawBody || '' });
                    setSelectedJobData(job);
                  }}
                />
            </div>
          )}

          {activeSidebarView === 'jobs' && (
            <div className="max-w-7xl mx-auto space-y-8">
              {!profile.geminiKey && (
                <div className="bg-[#EA580C]/10 border border-[#EA580C]/30 text-white px-6 py-4 rounded-2xl flex items-start gap-4 shadow-[0_0_20px_rgba(234,88,12,0.15)] holographic-gradient">
                  <AlertCircle className="w-6 h-6 text-[#F7931A] shrink-0 mt-0.5 animate-pulse" />
                  <div className="text-sm">
                    <p className="font-heading font-semibold text-[#F7931A] text-base">Action Required: Enable Advanced AI Parsing</p>
                    <p className="mt-1 text-[#94A3B8]">To automatically extract missing details from tricky emails, head to <strong>Settings</strong> and enter your free Gemini API key.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-heading font-bold tracking-tight text-white flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-[#F7931A] to-[#EA580C] rounded-full"></div>
                    Opportunities
                  </h2>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="md:hidden w-full sm:w-auto border-white/20 text-white"
                    onClick={() => setIsFilterOpen(true)}
                  >
                    <Filter className="w-4 h-4 mr-2 text-[#F7931A]" /> 
                    Filters
                    {(debouncedRoleSearch || debouncedMinStipend || techFilter !== 'all') && (
                      <Badge className="ml-2 bg-[#F7931A] text-black h-5 px-1.5 min-w-[20px] rounded-full text-[10px]">
                        {[debouncedRoleSearch, debouncedMinStipend, techFilter !== 'all'].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    onClick={() => fetchEmails(true)} 
                    disabled={loading} 
                    variant="outline" 
                    className="group w-full sm:w-auto shrink-0 border-[#F7931A]/30 text-[#F7931A] hover:border-[#F7931A] hover:bg-[#F7931A]/10 hover:shadow-[0_0_15px_rgba(247,147,26,0.3)]"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Scanning...' : 'Fetch Latest'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 relative">
                {isFilterOpen && (
                  <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" 
                    onClick={() => setIsFilterOpen(false)} 
                  />
                )}
                
                <div className={`fixed inset-y-0 right-0 z-50 w-72 bg-[#0F1115] shadow-2xl p-6 border-l border-white/10 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-64 lg:shadow-lg lg:rounded-2xl lg:border lg:border-white/10 lg:h-fit flex flex-col ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-heading font-semibold text-white text-lg">Filters</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-[#94A3B8] hover:text-white">
                        <FilterX className="w-3 h-3 mr-1" /> Clear
                      </Button>
                      <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 text-[#94A3B8] hover:text-white" onClick={() => setIsFilterOpen(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-3">
                      <Label className="text-xs text-[#F7931A] font-mono uppercase tracking-widest">Role Category</Label>
                      <Tabs value={techFilter} onValueChange={(val: any) => setTechFilter(val)} className="w-full">
                        <TabsList className="w-full bg-black/40 border border-white/5 rounded-xl h-auto p-1 flex flex-col gap-1">
                          <TabsTrigger value="all" className="w-full text-xs data-[state=active]:bg-[#1E293B] data-[state=active]:text-white rounded-lg justify-start px-3 py-2">All Roles</TabsTrigger>
                          <TabsTrigger value="tech" className="w-full text-xs data-[state=active]:bg-[#1E293B] data-[state=active]:text-white rounded-lg justify-start px-3 py-2">Tech</TabsTrigger>
                          <TabsTrigger value="non-tech" className="w-full text-xs data-[state=active]:bg-[#1E293B] data-[state=active]:text-white rounded-lg justify-start px-3 py-2">Non-Tech</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs text-[#F7931A] font-mono uppercase tracking-widest">Role Search</Label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-[#94A3B8]" />
                        <Input 
                          placeholder="e.g. SDE" 
                          value={roleSearch} 
                          onChange={e => setRoleSearch(e.target.value)}
                          className="pl-10 h-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs text-[#F7931A] font-mono uppercase tracking-widest">Min Stipend</Label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 absolute left-3 top-3 text-[#94A3B8]" />
                        <Input 
                          placeholder="e.g. 40000" 
                          value={minStipend} 
                          onChange={e => setMinStipend(e.target.value)}
                          className="pl-10 h-10"
                        />
                      </div>
                    </div>

                    {profile.cgpa || profile.branch ? (
                      <div className="pt-6 border-t border-white/10 mt-6">
                        <Label className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-3 block">Active Profile Node</Label>
                        {profile.cgpa && <div className="text-sm font-mono text-[#FFD600] bg-[#FFD600]/10 border border-[#FFD600]/20 px-3 py-1.5 rounded-lg mb-2">CGPA &ge; {profile.cgpa}</div>}
                        {profile.branch && <div className="text-sm font-mono text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">Branch: {profile.branch}</div>}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-6 lg:hidden">
                    <Button className="w-full bg-[#F7931A] text-black font-semibold hover:bg-[#EA580C] h-12" onClick={() => setIsFilterOpen(false)}>
                      Apply Filters
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-6 min-w-0">
                  {error && (
                    <div className={`p-5 rounded-2xl text-sm flex items-start gap-3 border ${error.includes('rate limit') ? 'bg-[#EA580C]/10 border-[#EA580C]/30 text-white shadow-[0_0_20px_rgba(234,88,12,0.15)]' : 'bg-destructive/10 border-destructive/30 text-white shadow-[0_0_20px_rgba(220,38,38,0.15)]'}`}>
                      <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${error.includes('rate limit') ? 'text-[#F7931A]' : 'text-destructive'}`} />
                      <div>
                        <span className="font-heading font-semibold text-base mb-1 block">{error.includes('rate limit') ? 'API Rate Limit Exceeded' : 'System Error'}</span>
                        <p className="text-[#94A3B8]">{error}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0F1115] p-2 rounded-2xl border border-white/10 shadow-lg overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto overflow-x-auto no-scrollbar">
                      <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-black/40 p-1 text-[#94A3B8] w-max min-w-full">
                        <TabsTrigger value="all" className="data-[state=active]:bg-[#1E293B] data-[state=active]:text-white rounded-lg px-4 py-2">All</TabsTrigger>
                        <TabsTrigger value="interested" className="data-[state=active]:bg-[#1E293B] data-[state=active]:text-white rounded-lg px-4 py-2">Interested</TabsTrigger>
                        <TabsTrigger value="applied" className="data-[state=active]:bg-[#1E293B] data-[state=active]:text-white rounded-lg px-4 py-2">Applied</TabsTrigger>
                        <TabsTrigger value="oa" className="data-[state=active]:bg-[#1E293B] data-[state=active]:text-white rounded-lg px-4 py-2">OA</TabsTrigger>
                        <TabsTrigger value="interview" className="data-[state=active]:bg-[#1E293B] data-[state=active]:text-white rounded-lg px-4 py-2">Interview</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="text-xs text-[#94A3B8] font-mono px-4 flex flex-wrap gap-4 py-2 sm:py-0">
                      <span className="text-white">[{counts.total}] Total</span>
                      <span className="text-[#FFD600]">[{counts.interested}] Interested</span>
                      <span className="text-green-400">[{counts.applied}] Applied</span>
                      <span className="text-[#EA580C]">[{counts.oa}] OA</span>
                      <span className="text-purple-400">[{counts.interview}] Interview</span>
                    </div>
                  </div>

                  {loading && !bucketA.length ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map(i => <JobListItemSkeleton key={i} />)}
                    </div>
                  ) : !loading && bucketA.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-24 border border-white/10 rounded-2xl bg-[#0F1115] text-center holographic-gradient">
                      <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-[0_0_30px_-10px_rgba(247,147,26,0.2)]">
                        <Mail className="w-10 h-10 text-[#F7931A] opacity-50" />
                      </div>
                      <h3 className="text-2xl font-heading font-semibold text-white">No Transmissions Found</h3>
                      <p className="text-[#94A3B8] mt-3 max-w-md">The network is quiet. We couldn't locate any placement block entries in your designated inbox.</p>
                    </div>
                  ) : filteredJobs.length === 0 ? (
                    <div className="p-24 text-center border border-white/10 rounded-2xl bg-[#0F1115] holographic-gradient">
                      <p className="text-white font-medium text-lg">No nodes match your current parameters.</p>
                      <Button variant="link" onClick={clearFilters} className="mt-4 text-[#F7931A]">Reset all parameters</Button>
                    </div>
                  ) : (
                    <div className="border border-white/10 rounded-2xl bg-[#0F1115] shadow-lg overflow-hidden flex flex-col">
                      {/* Mobile Sort By Header */}
                      <div className="md:hidden p-3 border-b border-white/10 bg-black/40 flex justify-end">
                        <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono">
                          <span>Sort by:</span>
                          <select 
                            className="bg-transparent border border-white/20 rounded px-2 py-1 text-white outline-none focus:border-[#F7931A]"
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                              const [s, o] = e.target.value.split('-');
                              setSortBy(s as any);
                              setSortOrder(o as any);
                            }}
                          >
                            <option value="deadline-asc" className="bg-[#0F1115]">Deadline (Earliest)</option>
                            <option value="deadline-desc" className="bg-[#0F1115]">Deadline (Latest)</option>
                            <option value="company-asc" className="bg-[#0F1115]">Company (A-Z)</option>
                            <option value="company-desc" className="bg-[#0F1115]">Company (Z-A)</option>
                          </select>
                        </div>
                      </div>

                      {/* Desktop Grid Header */}
                      <div className="hidden md:flex items-center gap-4 p-4 border-b border-white/10 bg-black/40 sticky top-0 z-10 text-xs font-mono text-[#94A3B8] uppercase tracking-wider">
                        <div 
                          className="flex-1 w-[30%] min-w-0 flex items-center gap-2 cursor-pointer hover:text-white"
                          onClick={() => {
                            if (sortBy === 'company') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            else { setSortBy('company'); setSortOrder('asc'); }
                          }}
                        >
                          Company {sortBy === 'company' && <ArrowUpDown className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 w-[25%] min-w-0">Role</div>
                        <div className="w-16 shrink-0 text-center">CG</div>
                        <div 
                          className="w-24 shrink-0 flex items-center justify-center gap-1 cursor-pointer hover:text-white"
                          onClick={() => {
                            if (sortBy === 'deadline') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            else { setSortBy('deadline'); setSortOrder('asc'); }
                          }}
                        >
                          Deadline {sortBy === 'deadline' && <ArrowUpDown className="w-3 h-3" />}
                        </div>
                        <div className="w-32 shrink-0 text-right pr-2">Status</div>
                        <div className="w-8 shrink-0"></div>
                      </div>
                      <div className="divide-y divide-white/5">
                        {filteredJobs.map((job) => (
                          <JobListItem 
                            key={job.id} 
                            job={job} 
                            status={jobStatuses[job.id] || 'none'}
                            onStatusChange={(s) => handleStatusChange(job.id, s)}
                            onClick={() => {
                              setSelectedMessage(job.messages?.[0] || { messageId: 'root', subject: job.subject, date: job.date, body: job.rawBody || '' });
                              setSelectedJobData(job);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {selectedMessage && selectedJobData && (
        <EmailDrawer 
          isOpen={!!selectedMessage} 
          onClose={() => {
            setSelectedMessage(null);
            setSelectedJobData(null);
          }} 
          message={selectedMessage} 
          jobData={selectedJobData} 
        />
      )}
    </div>
  );
}
