"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
      title="Logout"
    >
      <LogOut className="w-5 h-5" />
    </button>
  );
}
