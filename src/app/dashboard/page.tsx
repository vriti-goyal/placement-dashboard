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
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {session.user?.name}</p>
        </div>
        <div className="bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm">
          <span className="text-sm font-medium text-gray-600">{session.user?.email}</span>
        </div>
      </div>
      
      <EmailList />
    </div>
  );
}
