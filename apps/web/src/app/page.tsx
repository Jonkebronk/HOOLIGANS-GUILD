import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-8 max-w-2xl">
        {/* Guild Logo/Title */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            HOOLIGANS
          </h1>
          <p className="text-xl text-muted-foreground">
            Loot Council - Team Sweden
          </p>
        </div>

        {/* Description */}
        <p className="text-muted-foreground leading-relaxed">
          Manage your guild&apos;s loot distribution with transparency and fairness.
          Track BiS progress, attendance, and make informed loot decisions.
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
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
    <div className="p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
