import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import EmailList from "./email-list";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none z-0"></div>
      <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 bg-[#F7931A] opacity-10 blur-[120px] rounded-full pointer-events-none z-0"></div>
      
      <div className="relative z-10 flex w-full h-full">
        {/* Pass session to EmailList so it can render the sidebar and header */}
        <EmailList session={session} />
      </div>
    </div>
  );
}
