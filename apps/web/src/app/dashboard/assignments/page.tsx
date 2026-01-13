'use client';

import { ExternalLink } from 'lucide-react';

const TIER_ASSIGNMENTS = [
  {
    tier: 'Tier 4',
    raids: 'Karazhan, Gruul\'s Lair, Magtheridon\'s Lair',
    url: 'https://docs.google.com/spreadsheets/d/1e4vNjyKwtOC3HTEQ16VOXRjIBgsVHV1vVoSaNivJOAQ/edit?gid=1112278956#gid=1112278956',
    color: '#3FC7EB', // Mage blue
  },
  {
    tier: 'Tier 5',
    raids: 'Serpentshrine Cavern, Tempest Keep',
    url: 'https://docs.google.com/spreadsheets/d/1SxZMGDUUe80YgwZ27UFBHhm95ZWfzW8GhUqsc-z_BNQ/edit?gid=724690107#gid=724690107',
    color: '#AAD372', // Hunter green
  },
  {
    tier: 'Tier 6',
    raids: 'Black Temple, Mount Hyjal',
    url: 'https://docs.google.com/spreadsheets/d/1Lk8Utts0wO57-VYA3qzZvdoALS55RXm7-XrDVRm_X7M/edit',
    color: '#8788EE', // Warlock purple
  },
  {
    tier: 'Tier 6.5',
    raids: 'Zul\'Aman, Sunwell Plateau',
    url: 'https://docs.google.com/spreadsheets/d/1DK2AebZpWR1yoET4x1A3qbzWQbL41vgdUWemf-jSp3E/edit?gid=407225357#gid=407225357',
    color: '#FF7C0A', // Druid orange
  },
];

export default function AssignmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assignments</h1>
        <p className="text-muted-foreground">Raid encounter assignments by tier</p>
      </div>

      <div className="space-y-2 max-w-2xl">
        {TIER_ASSIGNMENTS.map((tier) => (
          <a
            key={tier.tier}
            href={tier.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              <span
                className="text-lg font-bold min-w-[80px]"
                style={{ color: tier.color }}
              >
                {tier.tier}
              </span>
              <span className="text-sm text-muted-foreground">
                {tier.raids}
              </span>
            </div>
            <ExternalLink
              className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
