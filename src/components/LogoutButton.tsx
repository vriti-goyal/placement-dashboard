"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => signOut({ callbackUrl: '/login' })}
      title="Logout"
      className="text-[#94A3B8] hover:text-white hover:bg-white/10"
    >
      <LogOut className="w-5 h-5" />
    </Button>
  );
}
