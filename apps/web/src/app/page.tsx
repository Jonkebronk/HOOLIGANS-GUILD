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
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10 text-center space-y-8 max-w-2xl">
        {/* Guild Logo */}
        <div className="flex justify-center">
          <Image
            src="/images/logo.png"
            alt="HOOLIGANS Logo"
            width={200}
            height={200}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* Description */}
        <p className="text-muted-foreground leading-relaxed text-lg">
          Manage your guild&apos;s loot distribution with transparency and fairness.
          Track BiS progress, attendance, and make informed loot decisions.
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-medium transition-colors"
          >
            Sign in with Discord
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            View Dashboard
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
          <FeatureCard title="Roster" description="Manage players & specs" />
          <FeatureCard title="Loot Council" description="Track all drops" />
          <FeatureCard title="BiS Lists" description="Phase progression" />
          <FeatureCard title="Attendance" description="Raid participation" />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border hover:border-primary/50 transition-colors">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
