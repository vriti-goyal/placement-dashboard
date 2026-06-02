"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { UserProfile } from "@/components/ProfileModal"; 
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface SettingsViewProps {
  profile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
}

export function SettingsView({ profile, onProfileUpdate }: SettingsViewProps) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  // Preferences State
  const [cgpa, setCgpa] = useState("");
  const [branch, setBranch] = useState("");
  const [backlogs, setBacklogs] = useState("0");
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefMessage, setPrefMessage] = useState("");

  // Gemini Key State
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [loadingKey, setLoadingKey] = useState(true);
  const [savingKey, setSavingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState("");

  // WhatsApp Reminders State
  const [phone, setPhone] = useState("");
  const [callMeBotKey, setCallMeBotKey] = useState("");
  const [enableReminders, setEnableReminders] = useState(false);
  const [hasReminderKey, setHasReminderKey] = useState(false);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [savingReminders, setSavingReminders] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [testingReminder, setTestingReminder] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  // Load Data
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      // 1. Load Preferences
      try {
        const prefDoc = await getDoc(doc(db, 'users', userId, 'preferences'));
        if (prefDoc.exists()) {
          const data = prefDoc.data();
          setCgpa(data.cgpa || "");
          setBranch(data.branch || "");
          setBacklogs(data.activeBacklogs !== undefined ? String(data.activeBacklogs) : "0");
          
          // Sync with parent for immediate use in filtering (preserving existing logic)
          const p = { cgpa: data.cgpa || "", branch: data.branch || "", geminiKey: profile.geminiKey };
          localStorage.setItem("userProfile", JSON.stringify(p));
          onProfileUpdate(p);
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      } finally {
        setLoadingPrefs(false);
      }

      // 2. Load Gemini Key status
      try {
        const res = await fetch('/api/settings/gemini-key');
        if (res.ok) {
          const data = await res.json();
          if (data.maskedKey) {
            setMaskedKey(data.maskedKey);
            setIsEditingKey(false);
            
            // Hack to make the warning banner disappear in email-list.tsx
            const currentProfileStr = localStorage.getItem("userProfile");
            const currentProfile = currentProfileStr ? JSON.parse(currentProfileStr) : { cgpa: '', branch: '' };
            currentProfile.geminiKey = 'saved';
            localStorage.setItem("userProfile", JSON.stringify(currentProfile));
            onProfileUpdate(currentProfile);
          } else {
            setIsEditingKey(true);
          }
        }
      } catch (error) {
        console.error("Error fetching Gemini key:", error);
        setIsEditingKey(true);
      } finally {
        setLoadingKey(false);
      }

      // 3. Load Reminder settings
      try {
        const res = await fetch('/api/settings/reminders');
        if (res.ok) {
          const data = await res.json();
          setPhone(data.phone || "");
          setEnableReminders(data.enabled || false);
          setHasReminderKey(data.hasKey || false);
        }
      } catch (error) {
        console.error("Error fetching reminder settings:", error);
      } finally {
        setLoadingReminders(false);
      }
    };

    loadData();
  }, [userId, onProfileUpdate, profile.geminiKey]); // Intentionally omitting full profile from deps

  const handleSavePreferences = async () => {
    if (!userId) return;
    setSavingPrefs(true);
    setPrefMessage("");
    try {
      await setDoc(doc(db, 'users', userId, 'preferences'), {
        cgpa,
        branch,
        activeBacklogs: parseInt(backlogs, 10) || 0,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      const updatedProfile = { cgpa, branch, geminiKey: profile.geminiKey };
      localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
      onProfileUpdate(updatedProfile);
      
      setPrefMessage("Preferences saved successfully!");
      setTimeout(() => setPrefMessage(""), 3000);
    } catch (error) {
      console.error("Error saving preferences:", error);
      setPrefMessage("Failed to save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) return;
    setSavingKey(true);
    setKeyMessage("");
    try {
      const res = await fetch('/api/settings/gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: geminiKeyInput.trim() })
      });
      
      if (res.ok) {
        setKeyMessage("API Key saved securely!");
        setGeminiKeyInput("");
        setIsEditingKey(false);
        // We know it's saved, just mask it locally for UI
        setMaskedKey(`sk-...${geminiKeyInput.trim().slice(-4)}`);
        
        // Update parent so warning banner disappears
        const updatedProfile = { ...profile, geminiKey: 'saved' };
        localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
        onProfileUpdate(updatedProfile);
      } else {
        setKeyMessage("Failed to save API Key.");
      }
    } catch (error) {
      setKeyMessage("An error occurred.");
    } finally {
      setSavingKey(false);
      setTimeout(() => setKeyMessage(""), 3000);
    }
  };

  const handleRemoveKey = async () => {
    setSavingKey(true);
    try {
      const res = await fetch('/api/settings/gemini-key', { method: 'DELETE' });
      if (res.ok) {
        setMaskedKey(null);
        setIsEditingKey(true);
        
        const updatedProfile = { ...profile, geminiKey: '' };
        localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
        onProfileUpdate(updatedProfile);
      }
    } catch (error) {
      console.error("Failed to remove key:", error);
    } finally {
      setSavingKey(false);
    }
  };

  const handleSaveReminders = async () => {
    setSavingReminders(true);
    setReminderMessage("");
    try {
      const res = await fetch('/api/settings/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, callMeBotKey, enabled: enableReminders })
      });
      
      if (res.ok) {
        setReminderMessage("Reminder settings saved successfully!");
        if (callMeBotKey) setHasReminderKey(true);
        setCallMeBotKey(""); // Clear input after saving
      } else {
        setReminderMessage("Failed to save reminder settings.");
      }
    } catch (error) {
      setReminderMessage("An error occurred.");
    } finally {
      setSavingReminders(false);
      setTimeout(() => setReminderMessage(""), 3000);
    }
  };

  const handleTestReminder = async () => {
    setTestingReminder(true);
    setTestMessage("");
    try {
      const res = await fetch('/api/reminders/test', {
        method: 'POST'
      });
      
      if (res.ok) {
        setTestMessage("Test message sent successfully!");
      } else {
        const data = await res.json();
        setTestMessage(data.error || "Failed to send test message.");
      }
    } catch (error) {
      setTestMessage("An error occurred.");
    } finally {
      setTestingReminder(false);
      setTimeout(() => setTestMessage(""), 3000);
    }
  };

  return (
    <div className="p-8 max-w-3xl space-y-12">
      <h2 className="text-3xl font-heading font-bold tracking-tight text-white flex items-center gap-3">
        <div className="w-2 h-8 bg-gradient-to-b from-[#F7931A] to-[#EA580C] rounded-full"></div>
        Settings
      </h2>
      
      {/* SECTION 1: PREFERENCES */}
      <section className="bg-[#0F1115] border border-white/10 rounded-2xl p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-40 h-40 bg-[#F7931A] opacity-5 blur-[80px] rounded-full pointer-events-none"></div>
        
        <h3 className="text-xl font-heading font-semibold text-white mb-6 border-b border-white/10 pb-4">Preferences</h3>
        
        {loadingPrefs ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-10 bg-white/5 rounded w-full"></div>
            <div className="h-10 bg-white/5 rounded w-full"></div>
            <div className="h-10 bg-white/5 rounded w-full"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cgpa" className="font-mono text-white/50 text-xs tracking-widest uppercase">CGPA</Label>
                <Input 
                  id="cgpa" 
                  type="number" 
                  min="0" 
                  max="10" 
                  step="0.01" 
                  value={cgpa} 
                  onChange={e => setCgpa(e.target.value)} 
                  placeholder="e.g. 8.50" 
                  className="font-mono bg-black/40 border-white/10 text-white placeholder:text-white/20 h-11" 
                />
                <p className="text-xs text-[#94A3B8]">Filters out opportunities with higher required limits.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch" className="font-mono text-white/50 text-xs tracking-widest uppercase">Branch</Label>
                <select 
                  id="branch"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  className="w-full font-mono bg-black/40 border border-white/10 text-white rounded-md px-3 py-2 h-11 appearance-none focus:outline-none focus:ring-2 focus:ring-[#F7931A]/50 focus:border-transparent"
                >
                  <option value="" disabled className="bg-[#0F1115] text-white/50">Select your branch...</option>
                  {["CSE", "IT", "ECE", "EE", "ME", "CE", "CH", "others"].map(b => (
                    <option key={b} value={b} className="bg-[#0F1115] text-white">{b}</option>
                  ))}
                </select>
                <p className="text-xs text-[#94A3B8]">Filters opportunities by eligible node branches.</p>
              </div>

              <div className="space-y-2 md:col-span-2 max-w-sm">
                <Label htmlFor="backlogs" className="font-mono text-white/50 text-xs tracking-widest uppercase">Active Backlogs</Label>
                <Input 
                  id="backlogs" 
                  type="number" 
                  min="0" 
                  step="1" 
                  value={backlogs} 
                  onChange={e => setBacklogs(e.target.value)} 
                  className="font-mono bg-black/40 border-white/10 text-white h-11" 
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-white/10 mt-6">
              <Button 
                onClick={handleSavePreferences} 
                disabled={savingPrefs}
                className="group border border-[#F7931A]/30 hover:border-[#F7931A] hover:shadow-[0_0_15px_rgba(247,147,26,0.3)] bg-transparent text-white px-8 h-11"
              >
                {savingPrefs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                <span className="group-hover:text-[#F7931A] transition-colors">Save Preferences</span>
              </Button>
              {prefMessage && (
                <span className={`text-sm ${prefMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                  {prefMessage}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: GEMINI API KEY */}
      <section className="bg-[#0F1115] border border-white/10 rounded-2xl p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-40 h-40 bg-purple-500 opacity-5 blur-[80px] rounded-full pointer-events-none"></div>
        
        <h3 className="text-xl font-heading font-semibold text-white mb-6 border-b border-white/10 pb-4">Gemini API Key</h3>
        
        {loadingKey ? (
          <div className="h-16 bg-white/5 rounded animate-pulse"></div>
        ) : (
          <div className="space-y-6">
            {!isEditingKey && maskedKey ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">Key Securely Stored</p>
                    <p className="font-mono text-xs text-[#94A3B8]">{maskedKey}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingKey(true)} className="text-[#94A3B8] hover:text-white">
                    Replace Key
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleRemoveKey} disabled={savingKey} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20">
                    {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-xl">
                <div className="space-y-2">
                  <Label htmlFor="geminiKeyInput" className="font-mono text-purple-400 text-xs tracking-widest uppercase">Secret Key</Label>
                  <Input 
                    id="geminiKeyInput" 
                    type="password" 
                    value={geminiKeyInput} 
                    onChange={e => setGeminiKeyInput(e.target.value)} 
                    placeholder="AIzaSy..." 
                    className="font-mono bg-black/40 border-white/10 text-white placeholder:text-white/20 h-11 focus-visible:ring-purple-500" 
                  />
                  <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                    This key enables Advanced AI Parsing. It is encrypted client-side and stored securely in Firestore using AES-256-GCM. 
                    Get a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline hover:text-purple-300 transition-colors">Google AI Studio</a>.
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <Button 
                    onClick={handleSaveGeminiKey} 
                    disabled={savingKey || !geminiKeyInput.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white h-11 px-8"
                  >
                    {savingKey ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Save Key
                  </Button>
                  {maskedKey && (
                    <Button variant="ghost" onClick={() => setIsEditingKey(false)} className="text-[#94A3B8]">
                      Cancel
                    </Button>
                  )}
                  {keyMessage && (
                    <span className={`text-sm ${keyMessage.includes('success') || keyMessage.includes('securely') ? 'text-green-400' : 'text-red-400'}`}>
                      {keyMessage}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTION 3: WHATSAPP REMINDERS */}
      <section className="bg-[#0F1115] border border-white/10 rounded-2xl p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-40 h-40 bg-[#25D366] opacity-5 blur-[80px] rounded-full pointer-events-none"></div>
        
        <h3 className="text-xl font-heading font-semibold text-white mb-6 border-b border-white/10 pb-4">WhatsApp Reminders</h3>
        
        {loadingReminders ? (
          <div className="h-32 bg-white/5 rounded animate-pulse"></div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              To get your CallMeBot API key, send <strong className="text-white">I allow callmebot to send me messages</strong> to <strong className="text-white">+34 644 59 79 13</strong> on WhatsApp. You'll receive your API key in reply.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-mono text-[#25D366] text-xs tracking-widest uppercase">Phone Number</Label>
                <Input 
                  id="phone" 
                  type="text" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="+91XXXXXXXXXX" 
                  className="font-mono bg-black/40 border-white/10 text-white placeholder:text-white/20 h-11 focus-visible:ring-[#25D366]" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callMeBotKey" className="font-mono text-[#25D366] text-xs tracking-widest uppercase">API Key</Label>
                <Input 
                  id="callMeBotKey" 
                  type="password" 
                  value={callMeBotKey} 
                  onChange={e => setCallMeBotKey(e.target.value)} 
                  placeholder={hasReminderKey ? "••••••••" : "Enter API Key"} 
                  className="font-mono bg-black/40 border-white/10 text-white placeholder:text-white/20 h-11 focus-visible:ring-[#25D366]" 
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <input
                type="checkbox"
                id="enableReminders"
                checked={enableReminders}
                onChange={e => setEnableReminders(e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-black/40 text-[#25D366] focus:ring-[#25D366] accent-[#25D366]"
              />
              <Label htmlFor="enableReminders" className="text-sm text-white cursor-pointer">Enable deadline reminders</Label>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-white/10 mt-6">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleSaveReminders} 
                  disabled={savingReminders}
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-semibold px-8 h-11"
                >
                  {savingReminders ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Settings
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleTestReminder} 
                  disabled={testingReminder || !hasReminderKey}
                  className="border-white/20 text-white hover:bg-white/5 h-11"
                >
                  {testingReminder ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Send Test Message
                </Button>
              </div>
              <div className="flex flex-col text-left">
                {reminderMessage && (
                  <span className={`text-sm ${reminderMessage.includes('success') ? 'text-[#25D366]' : 'text-red-400'}`}>
                    {reminderMessage}
                  </span>
                )}
                {testMessage && (
                  <span className={`text-sm ${testMessage.includes('success') ? 'text-[#25D366]' : 'text-red-400'}`}>
                    {testMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
