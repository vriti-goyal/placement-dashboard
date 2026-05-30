import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import EmailList from "./email-list";

import { LogoutButton } from "@/components/LogoutButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none z-0"></div>
      <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 bg-[#F7931A] opacity-10 blur-[120px] rounded-full pointer-events-none z-0"></div>
      
      <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-12 py-24">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-white mb-2">
              Welcome back, <span className="bg-gradient-to-r from-[#F7931A] to-[#FFD600] bg-clip-text text-transparent">{session.user?.name}</span>
            </h1>
            <p className="text-[#94A3B8] font-mono tracking-wide text-sm uppercase">Secure Terminal Access Granted</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-[0_0_20px_rgba(247,147,26,0.1)]">
              <span className="text-sm font-mono text-[#94A3B8]">{session.user?.email}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
        
        <EmailList />
      </div>
    </div>
  );
}
