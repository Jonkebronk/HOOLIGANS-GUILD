import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-8">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/login-bg.png"
          alt="Big League Hooligans"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 text-center">
        <Link
          href="/login"
          className="px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-medium transition-colors text-lg shadow-lg"
        >
          Sign in with Discord
        </Link>
      </div>
    </div>
  );
}
