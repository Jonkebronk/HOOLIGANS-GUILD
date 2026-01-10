'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, Circle, Shield, Heart, Sword } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { getSpecIconUrl, getItemIconUrl, refreshWowheadTooltips, SLOT_ICONS } from '@/lib/wowhead';

const WOW_CLASSES = ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];

const GEAR_SLOTS = [
  { slot: 'Head', label: 'Head' },
  { slot: 'Neck', label: 'Neck' },
  { slot: 'Shoulder', label: 'Shoulder' },
  { slot: 'Back', label: 'Back' },
  { slot: 'Chest', label: 'Chest' },
  { slot: 'Wrist', label: 'Wrist' },
  { slot: 'Hands', label: 'Hands' },
  { slot: 'Waist', label: 'Waist' },
  { slot: 'Legs', label: 'Legs' },
  { slot: 'Feet', label: 'Feet' },
  { slot: 'Finger1', label: 'Ring 1' },
  { slot: 'Finger2', label: 'Ring 2' },
  { slot: 'Trinket1', label: 'Trinket 1' },
  { slot: 'Trinket2', label: 'Trinket 2' },
  { slot: 'MainHand', label: 'Main Hand' },
  { slot: 'OffHand', label: 'Off Hand' },
  { slot: 'Ranged', label: 'Ranged/Relic' },
];

const mockPlayerBis: Record<string, {
  wowClass: string;
  spec: string;
  slots: Record<string, { current: { name: string; icon: string; id: number } | null; bis: { name: string; icon: string; id: number } }>;
}> = {
  'Johnnypapa': {
    wowClass: 'Rogue',
    spec: 'RogueCombat',
    slots: {
      Head: { current: { name: 'Slayers Helm', icon: 'inv_helmet_70', id: 31027 }, bis: { name: 'Slayers Helm', icon: 'inv_helmet_70', id: 31027 } },
      Neck: { current: { name: 'Pendant of Titans', icon: 'inv_jewelry_necklace_36', id: 34359 }, bis: { name: 'Pendant of Titans', icon: 'inv_jewelry_necklace_36', id: 34359 } },
      Shoulder: { current: null, bis: { name: 'Slayers Shoulderpads', icon: 'inv_shoulder_75', id: 31030 } },
      Back: { current: { name: 'Tattered Cape of Antonidas', icon: 'inv_misc_cape_20', id: 34242 }, bis: { name: 'Tattered Cape of Antonidas', icon: 'inv_misc_cape_20', id: 34242 } },
      Chest: { current: { name: 'Slayers Chestguard', icon: 'inv_chest_leather_15', id: 31028 }, bis: { name: 'Slayers Chestguard', icon: 'inv_chest_leather_15', id: 31028 } },
      Wrist: { current: null, bis: { name: 'Bracers of Eradication', icon: 'inv_bracer_16', id: 34448 } },
      Hands: { current: { name: 'Slayers Handguards', icon: 'inv_gauntlets_62', id: 31026 }, bis: { name: 'Slayers Handguards', icon: 'inv_gauntlets_62', id: 31026 } },
      Waist: { current: null, bis: { name: 'Belt of One-Hundred Deaths', icon: 'inv_belt_34', id: 34558 } },
      Legs: { current: { name: 'Slayers Legguards', icon: 'inv_pants_leather_23', id: 31029 }, bis: { name: 'Slayers Legguards', icon: 'inv_pants_leather_23', id: 31029 } },
      Feet: { current: null, bis: { name: 'Shadowmaster Boots', icon: 'inv_boots_chain_11', id: 34575 } },
      Finger1: { current: { name: 'Hard Khorium Band', icon: 'inv_jewelry_ring_53naxxramas', id: 34189 }, bis: { name: 'Hard Khorium Band', icon: 'inv_jewelry_ring_53naxxramas', id: 34189 } },
      Finger2: { current: null, bis: { name: 'Ring of Lethality', icon: 'inv_jewelry_ring_54', id: 34361 } },
      Trinket1: { current: { name: 'Warp-Spring Coil', icon: 'inv_gizmo_khoriumpowercore', id: 30450 }, bis: { name: 'Shard of Contempt', icon: 'inv_datacrystal02', id: 34472 } },
      Trinket2: { current: { name: 'Shard of Contempt', icon: 'inv_datacrystal02', id: 34472 }, bis: { name: 'Warp-Spring Coil', icon: 'inv_gizmo_khoriumpowercore', id: 30450 } },
      MainHand: { current: null, bis: { name: 'Warglaive of Azzinoth', icon: 'inv_weapon_glave_01', id: 32837 } },
      OffHand: { current: null, bis: { name: 'Warglaive of Azzinoth', icon: 'inv_weapon_glave_01', id: 32838 } },
      Ranged: { current: { name: 'Bristleblitz Striker', icon: 'inv_weapon_bow_38', id: 34529 }, bis: { name: 'Bristleblitz Striker', icon: 'inv_weapon_bow_38', id: 34529 } },
    }
  },
  'Smiker': {
    wowClass: 'Druid',
    spec: 'DruidRestoration',
    slots: {
      Head: { current: { name: 'Thunderheart Cover', icon: 'inv_helmet_95', id: 31037 }, bis: { name: 'Thunderheart Cover', icon: 'inv_helmet_95', id: 31037 } },
      Neck: { current: { name: 'Nadinas Pendant of Purity', icon: 'inv_jewelry_necklace_31', id: 34359 }, bis: { name: 'Nadinas Pendant of Purity', icon: 'inv_jewelry_necklace_31', id: 34359 } },
      Shoulder: { current: { name: 'Thunderheart Pauldrons', icon: 'inv_shoulder_95', id: 31047 }, bis: { name: 'Thunderheart Pauldrons', icon: 'inv_shoulder_95', id: 31047 } },
      Back: { current: null, bis: { name: 'Shroud of Redeemed Souls', icon: 'inv_misc_cape_naxxramas_01', id: 34485 } },
      Chest: { current: { name: 'Thunderheart Chestguard', icon: 'inv_chest_leather_20', id: 31041 }, bis: { name: 'Thunderheart Chestguard', icon: 'inv_chest_leather_20', id: 31041 } },
      Wrist: { current: { name: 'Blessed Band of Karabor', icon: 'inv_bracer_09', id: 32516 }, bis: { name: 'Blessed Band of Karabor', icon: 'inv_bracer_09', id: 32516 } },
      Hands: { current: null, bis: { name: 'Thunderheart Gauntlets', icon: 'inv_gauntlets_59', id: 31032 } },
      Waist: { current: { name: 'Belt of Primal Majesty', icon: 'inv_belt_26', id: 30038 }, bis: { name: 'Belt of Primal Majesty', icon: 'inv_belt_26', id: 30038 } },
      Legs: { current: { name: 'Thunderheart Leggings', icon: 'inv_pants_leather_24', id: 31044 }, bis: { name: 'Thunderheart Leggings', icon: 'inv_pants_leather_24', id: 31044 } },
      Feet: { current: { name: 'Thunderheart Boots', icon: 'inv_boots_cloth_15', id: 31048 }, bis: { name: 'Thunderheart Boots', icon: 'inv_boots_cloth_15', id: 31048 } },
      Finger1: { current: null, bis: { name: 'Ring of Flowing Life', icon: 'inv_jewelry_ring_55', id: 32528 } },
      Finger2: { current: { name: 'Band of the Eternal Champion', icon: 'inv_jewelry_ring_53naxxramas', id: 29305 }, bis: { name: 'Band of the Eternal Champion', icon: 'inv_jewelry_ring_53naxxramas', id: 29305 } },
      Trinket1: { current: { name: 'Memento of Tyrande', icon: 'inv_jewelry_necklace_21', id: 32496 }, bis: { name: 'Memento of Tyrande', icon: 'inv_jewelry_necklace_21', id: 32496 } },
      Trinket2: { current: null, bis: { name: 'Rejuvenating Gem', icon: 'inv_misc_gem_pearl_06', id: 32532 } },
      MainHand: { current: { name: 'Grand Magestrix Staff', icon: 'inv_staff_59', id: 34182 }, bis: { name: 'Grand Magestrix Staff', icon: 'inv_staff_59', id: 34182 } },
      OffHand: { current: null, bis: { name: 'Chronicle of Dark Secrets', icon: 'inv_misc_book_04', id: 32500 } },
      Ranged: { current: { name: 'Idol of the Raven Goddess', icon: 'inv_relics_idolofferocity', id: 32387 }, bis: { name: 'Idol of the Raven Goddess', icon: 'inv_relics_idolofferocity', id: 32387 } },
    }
  },
};

const mockPlayers = [
  { id: '1', name: 'Wiz', wowClass: 'Druid', spec: 'DruidGuardian', bisPercent: 85 },
  { id: '2', name: 'Johnnypapa', wowClass: 'Rogue', spec: 'RogueCombat', bisPercent: 78 },
  { id: '3', name: 'Angrypickle', wowClass: 'Warrior', spec: 'WarriorFury', bisPercent: 92 },
  { id: '4', name: 'Kapnozug', wowClass: 'Paladin', spec: 'PaladinRetribution', bisPercent: 71 },
  { id: '5', name: 'Tel', wowClass: 'Shaman', spec: 'ShamanEnhancement', bisPercent: 65 },
  { id: '6', name: 'Lejon', wowClass: 'Druid', spec: 'DruidFeral', bisPercent: 58 },
  { id: '7', name: 'Vicke', wowClass: 'Warrior', spec: 'WarriorFury', bisPercent: 45 },
  { id: '8', name: 'Eonir', wowClass: 'Hunter', spec: 'HunterBeastMastery', bisPercent: 72 },
  { id: '9', name: 'Smiker', wowClass: 'Druid', spec: 'DruidRestoration', bisPercent: 88 },
  { id: '10', name: 'Shredd', wowClass: 'Paladin', spec: 'PaladinProtection', bisPercent: 91 },
  { id: '11', name: 'Quest', wowClass: 'Paladin', spec: 'PaladinHoly', bisPercent: 76 },
  { id: '12', name: 'Bibitrix', wowClass: 'Priest', spec: 'PriestHoly', bisPercent: 69 },
];

export default function BisListsPage() {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('Johnnypapa');
  const [classFilter, setClassFilter] = useState<string>('all');

  useEffect(() => {
    refreshWowheadTooltips();
  }, [selectedPlayer]);

  const filteredPlayers = mockPlayers.filter((player) => {
    return classFilter === 'all' || player.wowClass === classFilter;
  });

  const playerData = mockPlayerBis[selectedPlayer];

  const getRoleIcon = (spec: string) => {
    if (spec.includes('Protection') || spec.includes('Guardian')) return <Shield className="h-4 w-4 text-blue-400" />;
    if (spec.includes('Restoration') || spec.includes('Holy') || spec.includes('Discipline')) return <Heart className="h-4 w-4 text-green-400" />;
    return <Sword className="h-4 w-4 text-red-400" />;
  };

  const calculateBisPercent = () => {
    if (!playerData) return 0;
    const slots = Object.values(playerData.slots);
    const obtained = slots.filter(s => s.current && s.current.id === s.bis.id).length;
    return Math.round((obtained / slots.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">BiS Lists</h1>
          <p className="text-muted-foreground">Track Best in Slot gear progress</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Player List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Characters</CardTitle>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {WOW_CLASSES.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    <span style={{ color: CLASS_COLORS[cls] }}>{cls}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[700px] overflow-y-auto">
            {filteredPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player.name)}
                className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-3 ${
                  selectedPlayer === player.name
                    ? 'bg-primary/20 border border-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <img
                  src={getSpecIconUrl(player.spec)}
                  alt={player.spec}
                  className="w-8 h-8 rounded"
                  style={{ borderColor: CLASS_COLORS[player.wowClass], borderWidth: 2 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span style={{ color: CLASS_COLORS[player.wowClass] }} className="font-medium truncate">
                      {player.name}
                    </span>
                    <span className={`text-xs font-medium ${
                      player.bisPercent >= 80 ? 'text-green-400' :
                      player.bisPercent >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {player.bisPercent}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {player.spec.replace(player.wowClass, '')}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* BiS Gear Comparison - iddqd style */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {playerData && (
                  <img
                    src={getSpecIconUrl(playerData.spec)}
                    alt={playerData.spec}
                    className="w-12 h-12 rounded-lg"
                    style={{ borderColor: CLASS_COLORS[playerData.wowClass], borderWidth: 2 }}
                  />
                )}
                <div>
                  <CardTitle className="text-xl" style={{ color: playerData ? CLASS_COLORS[playerData.wowClass] : undefined }}>
                    {selectedPlayer}
                  </CardTitle>
                  {playerData && (
                    <p className="text-sm text-muted-foreground">
                      {playerData.spec.replace(playerData.wowClass, '')} {playerData.wowClass}
                    </p>
                  )}
                </div>
              </div>
              {playerData && (
                <div className="text-right">
                  <div className="text-3xl font-bold" style={{ color: calculateBisPercent() >= 80 ? '#22c55e' : calculateBisPercent() >= 60 ? '#eab308' : '#ef4444' }}>
                    {calculateBisPercent()}%
                  </div>
                  <p className="text-xs text-muted-foreground">BiS Complete</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {playerData ? (
              <div className="space-y-1">
                {GEAR_SLOTS.map(({ slot, label }) => {
                  const slotData = playerData.slots[slot];
                  if (!slotData) return null;
                  const hasBis = slotData.current && slotData.current.id === slotData.bis.id;

                  return (
                    <div
                      key={slot}
                      className={`flex items-center gap-4 p-2 rounded-lg ${
                        hasBis ? 'bg-green-500/10' : 'bg-muted/30'
                      }`}
                    >
                      {/* Slot icon */}
                      <img
                        src={getItemIconUrl(SLOT_ICONS[slot] || 'inv_misc_questionmark', 'medium')}
                        alt={label}
                        className="w-8 h-8 rounded opacity-50"
                      />

                      {/* Current item */}
                      <div className="flex-1 flex items-center gap-2">
                        {slotData.current ? (
                          <>
                            <img
                              src={getItemIconUrl(slotData.current.icon, 'small')}
                              alt=""
                              className="w-6 h-6 rounded border border-purple-500"
                            />
                            <a
                              href={`https://www.wowhead.com/tbc/item=${slotData.current.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-wowhead={`item=${slotData.current.id}&domain=tbc`}
                              className="text-sm text-purple-400 hover:underline truncate"
                            >
                              {slotData.current.name}
                            </a>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Empty</span>
                        )}
                      </div>

                      {/* BiS item */}
                      <div className="flex-1 flex items-center gap-2 justify-end">
                        <a
                          href={`https://www.wowhead.com/tbc/item=${slotData.bis.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-wowhead={`item=${slotData.bis.id}&domain=tbc`}
                          className={`text-sm hover:underline truncate ${hasBis ? 'text-green-400' : 'text-orange-400'}`}
                        >
                          {slotData.bis.name}
                        </a>
                        <img
                          src={getItemIconUrl(slotData.bis.icon, 'small')}
                          alt=""
                          className={`w-6 h-6 rounded border ${hasBis ? 'border-green-500' : 'border-orange-500'}`}
                        />
                      </div>

                      {/* Status icon */}
                      <div className="w-6">
                        {hasBis ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Select a player to view their BiS list</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
