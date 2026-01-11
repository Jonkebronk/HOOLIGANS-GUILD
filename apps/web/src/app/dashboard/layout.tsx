import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { TeamGuard } from '@/components/layout/team-guard';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/login');
  }

  const user = {
    name: session.user.name || 'Unknown',
    image: session.user.image || undefined,
    role: session.user.role || 'Raider',
  };

  return (
    <TeamGuard>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="pl-64">
          <Header user={user} />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </TeamGuard>
  );
}
