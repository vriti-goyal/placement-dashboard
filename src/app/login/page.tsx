"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 max-w-sm w-full p-8 bg-white border rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Placement Dashboard</h1>
        <p className="text-sm text-gray-500">Sign in to view your emails</p>
        <Button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className="w-full">
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
