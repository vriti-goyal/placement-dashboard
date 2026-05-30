"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Settings, Sparkles, CheckCircle2 } from "lucide-react";

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const onboarded = localStorage.getItem('onboarded');
    if (!onboarded) {
      setIsOpen(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('onboarded', 'true');
    setIsOpen(false);
  };

  const nextStep = () => setStep(prev => prev + 1);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && step === 3) handleComplete();
    }}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-[#0F1115] border border-white/10 text-white shadow-[0_0_50px_-10px_rgba(247,147,26,0.3)]">
        <div className="bg-black/40 border-b border-white/10 p-6 relative overflow-hidden holographic-gradient">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-[#F7931A]/10 blur-3xl rounded-full"></div>
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-heading font-bold text-white flex items-center gap-3">
              <div className="w-2 h-6 bg-gradient-to-b from-[#F7931A] to-[#EA580C] rounded-full"></div>
              Welcome to tnpDash
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8] mt-2 text-sm">
              Your intelligent placement cell node. Let's initialize your parameters in 3 quick steps.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= 1 ? 'border-[#F7931A] bg-[#F7931A]/10 text-[#F7931A] shadow-[0_0_15px_rgba(247,147,26,0.3)]' : 'border-white/10 text-white/30'}`}>
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-heading font-semibold ${step >= 1 ? 'text-white' : 'text-[#94A3B8]'}`}>1. Connect Inbox</h3>
              <p className="text-sm text-[#94A3B8] mt-1">We securely scan your inbox for transmissions from the TNP cell. We ignore all other traffic.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 mb-6">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= 2 ? 'border-[#FFD600] bg-[#FFD600]/10 text-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.3)]' : 'border-white/10 text-white/30'}`}>
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-heading font-semibold ${step >= 2 ? 'text-white' : 'text-[#94A3B8]'}`}>2. Set Parameters</h3>
              <p className="text-sm text-[#94A3B8] mt-1">Set your CGPA and Branch in the top-right menu to automatically drop blocks you aren't eligible for.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= 3 ? 'border-green-400 bg-green-500/10 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'border-white/10 text-white/30'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-heading font-semibold ${step >= 3 ? 'text-white' : 'text-[#94A3B8]'}`}>3. AI Parsing</h3>
              <p className="text-sm text-[#94A3B8] mt-1">We use AI to extract job roles, stipends, and deadlines directly from the raw data.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-black/40 border-t border-white/10 flex justify-between items-center">
          <div className="flex gap-1.5">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-[#F7931A] shadow-[0_0_10px_rgba(247,147,26,0.5)]' : i < step ? 'w-2 bg-[#F7931A]/30' : 'w-2 bg-white/10'}`} />
            ))}
          </div>
          <Button onClick={step === 3 ? handleComplete : nextStep} className="min-w-[100px] border border-[#F7931A]/50 hover:bg-[#F7931A]/20">
            {step === 3 ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Initialize</>
            ) : 'Next Phase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
