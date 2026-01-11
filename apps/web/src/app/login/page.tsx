import { redirect } from 'next/navigation';
import Image from 'next/image';
import { auth, signIn } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  // If already logged in, redirect to team selection
  if (session) {
    redirect('/select-team');
  }

  const error = params.error;
  const callbackUrl = params.callbackUrl || '/select-team';

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image - Dark Portal */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/login-bg.jpg"
          alt="The Dark Portal"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Login Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* HLG Icon */}
        <div className="mb-4">
          <Image
            src="/hlg-logo.png"
            alt="HOOLIGANS"
            width={220}
            height={220}
            className="drop-shadow-2xl"
          />
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome to HOOLIGANS</h1>
          <p className="text-gray-400">Smarter management for guilds and pugs.</p>
        </div>

        {/* Login Card */}
        <Card className="w-full max-w-md bg-black/80 backdrop-blur-sm border-border/30">
          <CardContent className="space-y-4 pt-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error === 'OAuthSignin' && 'Error starting the sign in process.'}
                {error === 'OAuthCallback' && 'Error during the OAuth callback.'}
                {error === 'OAuthAccountNotLinked' && 'This account is linked to another sign in method.'}
                {error === 'default' && 'An error occurred during sign in.'}
                {!['OAuthSignin', 'OAuthCallback', 'OAuthAccountNotLinked', 'default'].includes(error) && error}
              </div>
            )}

            <form
              action={async () => {
                'use server';
                await signIn('discord', { redirectTo: callbackUrl });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium transition-colors"
              >
                <DiscordIcon className="h-5 w-5" />
                Sign in with Discord
              </button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
