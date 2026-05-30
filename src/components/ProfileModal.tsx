import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

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

  useEffect(() => {
    const stored = localStorage.getItem("userProfile");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        setCgpa(p.cgpa || "");
        setBranch(p.branch || "");
        setGeminiKey(p.geminiKey || "");
      } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    const profile = { cgpa, branch, geminiKey };
    localStorage.setItem("userProfile", JSON.stringify(profile));
    onProfileUpdate(profile);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full shadow-sm">
          <Settings className="w-4 h-4" />
          Preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Your Preferences</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label htmlFor="geminiKey" className="font-semibold text-blue-600">Gemini API Key</Label>
            <Input id="geminiKey" type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." />
            <p className="text-xs text-gray-500">Required for advanced AI parsing. Get a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cgpa">Your CGPA</Label>
            <Input id="cgpa" type="number" step="0.01" value={cgpa} onChange={e => setCgpa(e.target.value)} placeholder="e.g. 8.5" />
            <p className="text-xs text-gray-500">Used to filter out jobs with a higher cutoff.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch">Your Branch</Label>
            <Input id="branch" value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. CSE" />
            <p className="text-xs text-gray-500">Used to filter jobs by eligible branches.</p>
          </div>
        </div>
        <Button onClick={handleSave} className="w-full">Save Preferences</Button>
      </DialogContent>
    </Dialog>
  );
}
