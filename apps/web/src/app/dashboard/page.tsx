import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Sword, Calendar, TrendingUp } from 'lucide-react';

const stats = [
  {
    name: 'Active Raiders',
    value: '25',
    description: '+2 this month',
    icon: Users,
    color: 'text-primary',
  },
  {
    name: 'Items Distributed',
    value: '142',
    description: 'This phase',
    icon: Sword,
    color: 'text-quality-epic',
  },
  {
    name: 'Avg Attendance',
    value: '94%',
    description: 'Last 30 days',
    icon: Calendar,
    color: 'text-accent',
  },
  {
    name: 'BiS Completion',
    value: '67%',
    description: 'Guild average',
    icon: TrendingUp,
    color: 'text-wow-hunter',
  },
];

const recentLoot = [
  { item: 'Warglaive of Azzinoth', player: 'Angrypickle', wowClass: 'Warrior', response: 'BiS', date: '2025-01-10' },
  { item: 'Skull of Guldan', player: 'Sulu', wowClass: 'Mage', response: 'BiS', date: '2025-01-10' },
  { item: 'Bulwark of Azzinoth', player: 'Shredd', wowClass: 'Paladin', response: 'BiS', date: '2025-01-09' },
  { item: 'Memento of Tyrande', player: 'Smiker', wowClass: 'Druid', response: 'Greater Upgrade', date: '2025-01-09' },
  { item: 'Madness of the Betrayer', player: 'Tlx', wowClass: 'Priest', response: 'BiS', date: '2025-01-08' },
];

const classColors: Record<string, string> = {
  Druid: 'text-wow-druid',
  Hunter: 'text-wow-hunter',
  Mage: 'text-wow-mage',
  Paladin: 'text-wow-paladin',
  Priest: 'text-wow-priest',
  Rogue: 'text-wow-rogue',
  Shaman: 'text-wow-shaman',
  Warlock: 'text-wow-warlock',
  Warrior: 'text-wow-warrior',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here is your guild overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Loot</CardTitle>
            <CardDescription>Latest items distributed by the loot council</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLoot.map((loot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-quality-epic">{loot.item}</p>
                    <p className="text-sm">
                      <span className={classColors[loot.wowClass]}>{loot.player}</span>
                      <span className="text-muted-foreground"> - {loot.response}</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{loot.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loot Council Criteria</CardTitle>
            <CardDescription>How we evaluate loot distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <CriteriaItem
                title="Engagement"
                description="Active participation in raids, strategy discussions, and consistent effort to improve."
              />
              <CriteriaItem
                title="Attendance / Reliability"
                description="Maintaining high presence and being prepared before raids start."
              />
              <CriteriaItem
                title="Performance"
                description="DPS/HPS output, teamwork, following strategies, and handling boss mechanics."
              />
              <CriteriaItem
                title="Magnitude of Upgrade"
                description="How much the item improves the character. BiS items are prioritized."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leadership</CardTitle>
          <CardDescription>Your loot council team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <LeadershipBadge name="Johnnypapa" role="Guildmaster" />
            <LeadershipBadge name="Quest" role="Officer" />
            <LeadershipBadge name="Shredd" role="Officer" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CriteriaItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-l-2 border-primary pl-4">
      <h4 className="font-medium text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function LeadershipBadge({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-2">
      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
        <span className="text-sm font-medium text-primary">{name.slice(0, 2)}</span>
      </div>
      <div>
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}
