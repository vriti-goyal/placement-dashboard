"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { signIn } from 'next-auth/react';
import { parseEmail, ParsedJob } from '@/lib/parser';
import { JobCard, JobStatus } from '@/components/JobCard';
import { RefreshCw, FilterX, Search, DollarSign, AlertCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileModal, UserProfile } from '@/components/ProfileModal';

export default function EmailList() {
  const [jobs, setJobs] = useState<ParsedJob[]>([]);
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>({});
  const [profile, setProfile] = useState<UserProfile>({ cgpa: '', branch: '', geminiKey: '' });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<string>('all');
  const [roleSearch, setRoleSearch] = useState('');
  const [minStipend, setMinStipend] = useState('');

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
    fetchEmails();
  }, []);

  const handleStatusChange = (id: string, status: JobStatus) => {
    setJobStatuses(prev => {
      const next = { ...prev, [id]: status };
      localStorage.setItem("jobStatuses", JSON.stringify(next));
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
      if (roleSearch && job.role && !job.role.toLowerCase().includes(roleSearch.toLowerCase())) return false;

      // Stipend Minimum
      if (minStipend && job.stipend) {
        const minVal = parseInt(minStipend.replace(/\D/g, ''));
        const stipVal = parseInt(job.stipend.replace(/\D/g, ''));
        if (!isNaN(minVal) && !isNaN(stipVal)) {
           let adjustedStip = stipVal;
           if (job.stipend.toLowerCase().includes('k') && stipVal < 1000) adjustedStip *= 1000;
           let adjustedMin = minVal;
           if (minStipend.toLowerCase().includes('k') && minVal < 1000) adjustedMin *= 1000;
           
           if (adjustedStip < adjustedMin) return false;
        }
      }

      return true;
    });
  }, [jobs, jobStatuses, profile, activeTab, roleSearch, minStipend]);

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
    <div className="space-y-6 pb-12">
      {!profile.geminiKey && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Action Required: Enable Advanced AI Parsing</p>
            <p className="mt-1 opacity-90">To automatically extract missing details from tricky emails, click <strong>Preferences</strong> and enter your free Gemini API key.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Opportunities</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <ProfileModal onProfileUpdate={setProfile} />
          <Button 
            onClick={() => fetchEmails(true)} 
            disabled={loading} 
            variant="outline" 
            className="shadow-sm hover:bg-gray-50 transition-all group w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 text-gray-500 group-hover:text-gray-900 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Scanning...' : 'Fetch Latest'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filter Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-6 bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-gray-500">
              <FilterX className="w-3 h-3 mr-1" /> Clear
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Role Search</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <Input 
                  placeholder="e.g. SDE" 
                  value={roleSearch} 
                  onChange={e => setRoleSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Min Stipend</Label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <Input 
                  placeholder="e.g. 40000" 
                  value={minStipend} 
                  onChange={e => setMinStipend(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {profile.cgpa || profile.branch ? (
              <div className="pt-4 border-t border-gray-100">
                <Label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Active Profile Filters</Label>
                {profile.cgpa && <div className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mb-1">CGPA: &ge; {profile.cgpa}</div>}
                <br />
                {profile.branch && <div className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block">Branch: {profile.branch}</div>}
              </div>
            ) : null}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm shadow-sm">{error}</div>}
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto overflow-x-auto">
              <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-max min-w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="interested">Interested</TabsTrigger>
                <TabsTrigger value="applied">Applied</TabsTrigger>
                <TabsTrigger value="oa">OA</TabsTrigger>
                <TabsTrigger value="interview">Interview</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="text-xs text-gray-500 px-4 font-medium flex flex-wrap gap-3">
              <span>{counts.total} Total</span>
              <span className="text-blue-600">{counts.interested} Interested</span>
              <span className="text-green-600">{counts.applied} Applied</span>
              <span className="text-orange-600">{counts.oa} OA</span>
              <span className="text-purple-600">{counts.interview} Interview</span>
            </div>
          </div>

          {loading && !jobs.length ? (
            <div className="flex flex-col items-center justify-center p-24 border-2 border-dashed border-gray-200 rounded-xl bg-white/50">
              <RefreshCw className="w-8 h-8 text-gray-300 animate-spin mb-4" />
              <p className="text-gray-500 font-medium animate-pulse">Scanning inbox for new opportunities...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-24 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white/50">
              <p className="text-gray-500 font-medium">No opportunities match your current filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
