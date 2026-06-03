import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, ShieldCheck, User } from "lucide-react";

export interface UserProfile {
  cgpa: string;
  branch: string;
  geminiKey: string;
}

interface ProfileModalProps {
  onProfileUpdate: (profile: UserProfile) => void;
}

export function ProfileModal({ onProfileUpdate }: ProfileModalProps) {
  const [open, setOpen] = useState(false);
  const [cgpa, setCgpa] = useState("");
  const [branch, setBranch] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [isEditingKey, setIsEditingKey] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("userProfile");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        setCgpa(p.cgpa || "");
        setBranch(p.branch || "");
        setGeminiKey(p.geminiKey || "");
        if (p.geminiKey) setIsEditingKey(false);
        else setIsEditingKey(true);
      } catch (e) {
        setIsEditingKey(true);
      }
    } else {
      setIsEditingKey(true);
    }
  }, []);

  const handleSave = () => {
    const profile = { cgpa, branch, geminiKey };
    localStorage.setItem("userProfile", JSON.stringify(profile));
    onProfileUpdate(profile);
    if (geminiKey) setIsEditingKey(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 rounded-full shadow-sm border-white/20 text-[#94A3B8] hover:text-white hover:bg-white/10 hover:border-white/40 group" />}>
        <User className="w-4 h-4 transition-transform duration-500" />
        <span className="hidden sm:inline">Profile</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-[#0F1115] border border-white/10 text-white shadow-[0_0_50px_-10px_rgba(247,147,26,0.2)]">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-white">Profile Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
          <div className="space-y-2">
            <Label htmlFor="geminiKey" className="font-mono text-[#F7931A] text-xs tracking-widest uppercase">Gemini API Key</Label>
            {geminiKey && !isEditingKey ? (
              <div className="flex items-center justify-between bg-[#F7931A]/10 px-4 py-3 border border-[#F7931A]/20 rounded-xl shadow-[0_0_15px_rgba(247,147,26,0.1)]">
                <span className="text-sm font-mono text-[#F7931A] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Securely configured
                </span>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingKey(true)} className="h-6 text-xs text-[#94A3B8] hover:text-white">
                  CHANGE
                </Button>
              </div>
            ) : (
              <>
                <Input id="geminiKey" type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="font-mono bg-black/40 border-white/10 text-white placeholder:text-white/20" />
                <p className="text-xs text-[#94A3B8]">Required for AI parsing. Get a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-[#F7931A] hover:underline hover:text-[#FFD600] transition-colors">Google AI Studio</a>.</p>
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cgpa" className="font-mono text-white/50 text-xs tracking-widest uppercase">Your CGPA</Label>
            <Input id="cgpa" type="number" step="0.01" value={cgpa} onChange={e => setCgpa(e.target.value)} placeholder="e.g. 8.5" className="font-mono bg-black/40 border-white/10 text-white placeholder:text-white/20" />
            <p className="text-xs text-[#94A3B8]">Filters out blocks with higher required limits.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch" className="font-mono text-white/50 text-xs tracking-widest uppercase">Your Branch</Label>
            <select 
              id="branch"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              className="w-full font-mono bg-black/40 border border-white/10 text-white rounded-md px-3 py-2 h-10 appearance-none focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              <option value="" disabled className="bg-[#0F1115] text-white/50">Select your branch...</option>
              {["BT", "CE", "CIOT", "CSAI", "CSDA", "CSDS", "CSE", "ECAM", "ECE", "ECIOT", "EE", "GI", "ICE", "IT", "ITNS", "MAC", "ME", "MEEV"].map(b => (
                <option key={b} value={b} className="bg-[#0F1115] text-white">{b}</option>
              ))}
            </select>
            <p className="text-xs text-[#94A3B8]">Filters blocks by eligible node branches.</p>
          </div>
        </div>
        <Button onClick={handleSave} className="w-full mt-2 group border border-[#F7931A]/30 hover:border-[#F7931A] hover:shadow-[0_0_15px_rgba(247,147,26,0.3)]">
          <span className="group-hover:text-[#F7931A] transition-colors">Save Parameters</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
