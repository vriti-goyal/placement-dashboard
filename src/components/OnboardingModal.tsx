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
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Welcome to tnpDash</DialogTitle>
            <DialogDescription className="text-blue-100 mt-2 text-sm">
              Your intelligent placement cell assistant. Let's get you set up in 3 quick steps.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= 1 ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-400'}`}>
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-semibold ${step >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>1. Connect Gmail</h3>
              <p className="text-sm text-gray-500 mt-1">We securely scan your inbox for emails from the TNP cell. We don't read anything else.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 mb-6">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= 2 ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-400'}`}>
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-semibold ${step >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>2. Set Preferences</h3>
              <p className="text-sm text-gray-500 mt-1">Set your CGPA and Branch in the top-right menu to automatically filter out jobs you aren't eligible for.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= 3 ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-gray-200 text-gray-400'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-semibold ${step >= 3 ? 'text-gray-900' : 'text-gray-500'}`}>3. AI Magic</h3>
              <p className="text-sm text-gray-500 mt-1">We use AI to parse job roles, stipends, and deadlines directly from the email body.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <div className="flex gap-1.5">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-blue-600' : i < step ? 'w-2 bg-blue-300' : 'w-2 bg-gray-200'}`} />
            ))}
          </div>
          <Button onClick={step === 3 ? handleComplete : nextStep} className="min-w-[100px]">
            {step === 3 ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Get Started</>
            ) : 'Next'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
