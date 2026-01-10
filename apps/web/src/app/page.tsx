import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth();

  // If logged in, go to dashboard; otherwise go to login
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
