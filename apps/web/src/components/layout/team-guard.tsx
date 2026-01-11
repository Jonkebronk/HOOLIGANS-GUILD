'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTeam } from '@/components/providers/team-provider';

export function TeamGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { selectedTeam, loading } = useTeam();

  useEffect(() => {
    if (!loading && !selectedTeam) {
      router.push('/select-team');
    }
  }, [loading, selectedTeam, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!selectedTeam) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
