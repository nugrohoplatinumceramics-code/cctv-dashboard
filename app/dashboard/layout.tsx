import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardNav } from './_components/dashboard-nav';
import { DashboardHeader } from './_components/dashboard-header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader session={session} />
      <div className="flex">
        <DashboardNav session={session} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
