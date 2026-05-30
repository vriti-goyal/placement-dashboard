"use client";

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { signIn } from 'next-auth/react';
import { parseEmail, ParsedJob } from '@/lib/parser';
import { JobCard, JobStatus } from '@/components/JobCard';
import { RefreshCw, FilterX, Search, DollarSign, AlertCircle, Filter, X, Mail } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileModal, UserProfile } from '@/components/ProfileModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useDebounce } from '@/lib/useDebounce';

const CalendarView = dynamic(() => import('@/components/CalendarView').then(mod => mod.CalendarView), { 
  ssr: false,
  loading: () => <CalendarSkeleton />
});

function JobCardSkeleton() {
  return (
    <div className="border border-white/10 rounded-2xl p-8 bg-[#0F1115] h-full space-y-4 shadow-[0_0_30px_-10px_rgba(247,147,26,0.1)] animate-pulse">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-3 w-full">
          <div className="h-7 bg-white/5 rounded w-2/3"></div>
          <div className="h-4 bg-white/5 rounded w-1/3"></div>
        </div>
        <div className="h-6 w-20 bg-white/10 rounded-full shrink-0"></div>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-6">
        <div className="h-12 bg-white/5 rounded border-b-2 border-white/10"></div>
        <div className="h-12 bg-white/5 rounded border-b-2 border-white/10"></div>
      </div>
      <div className="h-10 bg-white/5 rounded mt-6"></div>
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

export default function EmailList() {
  const [jobs, setJobs] = useState<ParsedJob[]>([]);
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>({});
  const [profile, setProfile] = useState<UserProfile>({ cgpa: '', branch: '', geminiKey: '' });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<string>('all');
  const [roleSearch, setRoleSearch] = useState('');
  const [minStipend, setMinStipend] = useState('');
  
  const [dismissedJobs, setDismissedJobs] = useState<string[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const debouncedRoleSearch = useDebounce(roleSearch, 300);
  const debouncedMinStipend = useDebounce(minStipend, 300);

  // Load initial state
  useEffect(() => {
    const p = localStorage.getItem("userProfile");
    if (p) {
      try { setProfile(JSON.parse(p)); } catch(e){}
    }
    const s = localStorage.getItem("jobStatuses");
    if (s) {
      try { setJobStatuses(JSON.parse(s)); } catch(e){}
    }
    const d = localStorage.getItem("dismissedJobs");
    if (d) {
      try { setDismissedJobs(JSON.parse(d)); } catch(e){}
    }
    fetchEmails();
  }, []);

  const handleStatusChange = (id: string, status: JobStatus) => {
    setJobStatuses(prev => {
      const next = { ...prev, [id]: status };
      localStorage.setItem("jobStatuses", JSON.stringify(next));
      return next;
    });
  };

  const handleDismissJob = (id: string) => {
    setDismissedJobs(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem("dismissedJobs", JSON.stringify(next));
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
      
      // Get the latest profile for geminiKey
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
              parsedJobs.push(JSON.parse(cachedStr));
              continue;
            } catch (e) {}
          }
        }
        
        // Manual heuristics parse first
        let parsed = parseEmail(email);
        
        // Auto-Parse via AI if critical fields are missing and key exists
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
          // Slight delay to avoid hammering the free API
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

  // Filtering Logic
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Tab filter
      const status = jobStatuses[job.id] || 'none';
      if (activeTab !== 'all' && status !== activeTab) return false;

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

      // Role Search
      if (debouncedRoleSearch && job.role && !job.role.toLowerCase().includes(debouncedRoleSearch.toLowerCase())) return false;

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

      return true;
    });
  }, [jobs, jobStatuses, profile, activeTab, debouncedRoleSearch, debouncedMinStipend]);

  const clearFilters = () => {
    setRoleSearch('');
    setMinStipend('');
  };

  const counts = {
    total: jobs.length,
    interested: Object.values(jobStatuses).filter(s => s === 'interested').length,
    applied: Object.values(jobStatuses).filter(s => s === 'applied').length,
    oa: Object.values(jobStatuses).filter(s => s === 'oa').length,
    interview: Object.values(jobStatuses).filter(s => s === 'interview').length,
  };

  return (
    <div className="space-y-8 pb-12">
      <OnboardingModal />
      
      {!profile.geminiKey && (
        <div className="bg-[#EA580C]/10 border border-[#EA580C]/30 text-white px-6 py-4 rounded-2xl flex items-start gap-4 shadow-[0_0_20px_rgba(234,88,12,0.15)] holographic-gradient">
          <AlertCircle className="w-6 h-6 text-[#F7931A] shrink-0 mt-0.5 animate-pulse" />
          <div className="text-sm">
            <p className="font-heading font-semibold text-[#F7931A] text-base">Action Required: Enable Advanced AI Parsing</p>
            <p className="mt-1 text-[#94A3B8]">To automatically extract missing details from tricky emails, click <strong>Preferences</strong> and enter your free Gemini API key.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-heading font-bold tracking-tight text-white flex items-center gap-3">
          <div className="w-2 h-8 bg-gradient-to-b from-[#F7931A] to-[#EA580C] rounded-full"></div>
          Opportunities
        </h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            className="lg:hidden w-full sm:w-auto border-white/20 text-white"
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter className="w-4 h-4 mr-2 text-[#F7931A]" /> Filters
          </Button>
          <ProfileModal onProfileUpdate={setProfile} />
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

      <div className="flex flex-col lg:flex-row gap-8 relative">
        {/* Mobile Filter Drawer Overlay */}
        {isFilterOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" 
            onClick={() => setIsFilterOpen(false)} 
          />
        )}
        
        {/* Filter Sidebar / Drawer */}
        <div className={`fixed inset-y-0 right-0 z-50 w-80 bg-[#0F1115] shadow-2xl p-6 border-l border-white/10 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-72 lg:rounded-2xl lg:border lg:h-fit ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
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

          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-xs text-[#F7931A] font-mono uppercase tracking-widest">Role Search</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-4 text-[#94A3B8]" />
                <Input 
                  placeholder="e.g. SDE" 
                  value={roleSearch} 
                  onChange={e => setRoleSearch(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs text-[#F7931A] font-mono uppercase tracking-widest">Min Stipend</Label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-4 text-[#94A3B8]" />
                <Input 
                  placeholder="e.g. 40000" 
                  value={minStipend} 
                  onChange={e => setMinStipend(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            {profile.cgpa || profile.branch ? (
              <div className="pt-6 mt-6 border-t border-white/10">
                <Label className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-3 block">Active Profile Node</Label>
                {profile.cgpa && <div className="text-sm font-mono text-[#FFD600] bg-[#FFD600]/10 border border-[#FFD600]/20 px-3 py-1.5 rounded-lg inline-block mb-2 mr-2">CGPA &ge; {profile.cgpa}</div>}
                {profile.branch && <div className="text-sm font-mono text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg inline-block">Branch: {profile.branch}</div>}
              </div>
            ) : null}
          </div>
        </div>

        {/* Main Content */}
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
                <TabsTrigger value="calendar" className="data-[state=active]:bg-[#1E293B] data-[state=active]:text-white rounded-lg px-4 py-2">Calendar</TabsTrigger>
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

          {activeTab === 'calendar' ? (
            <CalendarView 
              jobs={jobs} 
              jobStatuses={jobStatuses} 
              dismissedJobs={dismissedJobs}
              onDismiss={handleDismissJob}
              showDismissed={showDismissed}
              onToggleShowDismissed={() => setShowDismissed(!showDismissed)}
              onStatusChange={handleStatusChange}
            />
          ) : loading && !jobs.length ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map(i => <JobCardSkeleton key={i} />)}
            </div>
          ) : !loading && jobs.length === 0 ? (
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {filteredJobs.map((job) => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  status={jobStatuses[job.id] || 'none'}
                  onStatusChange={(s) => handleStatusChange(job.id, s)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
