'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Team = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  softResUrl?: string;
  role: string;
  playerCount: number;
  memberCount: number;
};

type DiscordRoleInfo = {
  isGM: boolean;
  isOfficer: boolean;
  allRoles: string[];
};

type TeamContextType = {
  teams: Team[];
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team | null) => void;
  loading: boolean;
  refetchTeams: () => Promise<void>;
  isGM: boolean;
  isOfficer: boolean;
  discordRoles: string[];
  updateTeamSoftRes: (teamId: string, softResUrl: string) => Promise<boolean>;
};

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const SELECTED_TEAM_KEY = 'selectedTeamId';

// Team role name mappings (Discord role name pattern -> Team name)
const TEAM_ROLE_MAPPINGS: Record<string, string> = {
  'team sweden': 'Team Sweden',
  'team nato': 'Team Nato',
  'pugs': 'PuGs',
};

// Officer role patterns (case-insensitive)
const OFFICER_ROLE_PATTERNS = ['gm', 'officer'];

function checkIsOfficer(roles: string[]): boolean {
  const lowerRoles = roles.map(r => r.toLowerCase());
  return lowerRoles.some(role =>
    OFFICER_ROLE_PATTERNS.some(pattern => role.includes(pattern))
  );
}

function getAccessibleTeamNames(roles: string[]): string[] {
  const lowerRoles = roles.map(r => r.toLowerCase());
  const teamNames: string[] = [];

  for (const [rolePattern, teamName] of Object.entries(TEAM_ROLE_MAPPINGS)) {
    if (lowerRoles.some(role => role.includes(rolePattern))) {
      teamNames.push(teamName.toLowerCase());
    }
  }

  return teamNames;
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeamState] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGM, setIsGM] = useState(false);
  const [isOfficer, setIsOfficer] = useState(false);
  const [discordRoles, setDiscordRoles] = useState<string[]>([]);

  const fetchDiscordRoles = async (): Promise<DiscordRoleInfo> => {
    try {
      const res = await fetch('/api/discord/user-role');
      if (res.ok) {
        const data = await res.json();
        const roles = data.allRoles || [];
        const gm = data.isGM || false;
        const officer = gm || data.isOfficer || checkIsOfficer(roles);
        return { isGM: gm, isOfficer: officer, allRoles: roles };
      }
    } catch (error) {
      console.error('Failed to fetch Discord roles:', error);
    }
    return { isGM: false, isOfficer: false, allRoles: [] };
  };

  const fetchTeams = async (roleInfo?: DiscordRoleInfo) => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        let data: Team[] = await res.json();

        // Filter teams based on Discord roles (unless officer)
        if (roleInfo && !roleInfo.isOfficer) {
          const accessibleNames = getAccessibleTeamNames(roleInfo.allRoles);
          data = data.filter(team =>
            accessibleNames.includes(team.name.toLowerCase())
          );
        }

        setTeams(data);

        // Restore previously selected team from localStorage
        const savedTeamId = localStorage.getItem(SELECTED_TEAM_KEY);
        if (savedTeamId) {
          const savedTeam = data.find((t: Team) => t.id === savedTeamId);
          if (savedTeam) {
            setSelectedTeamState(savedTeam);
          } else if (data.length === 1) {
            // If saved team not accessible but only one team available, select it
            setSelectedTeamState(data[0]);
            localStorage.setItem(SELECTED_TEAM_KEY, data[0].id);
          }
        } else if (data.length === 1) {
          // Auto-select if only one team
          setSelectedTeamState(data[0]);
          localStorage.setItem(SELECTED_TEAM_KEY, data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const roleInfo = await fetchDiscordRoles();
      setIsGM(roleInfo.isGM);
      setIsOfficer(roleInfo.isOfficer);
      setDiscordRoles(roleInfo.allRoles);
      await fetchTeams(roleInfo);
    };
    init();
  }, []);

  const setSelectedTeam = (team: Team | null) => {
    setSelectedTeamState(team);
    if (team) {
      localStorage.setItem(SELECTED_TEAM_KEY, team.id);
    } else {
      localStorage.removeItem(SELECTED_TEAM_KEY);
    }
  };

  const refetchTeams = async () => {
    const roleInfo = { isGM, isOfficer, allRoles: discordRoles };
    await fetchTeams(roleInfo);
  };

  const updateTeamSoftRes = async (teamId: string, softResUrl: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, softResUrl }),
      });

      if (res.ok) {
        // Update local state
        setTeams(prev => prev.map(t =>
          t.id === teamId ? { ...t, softResUrl } : t
        ));
        if (selectedTeam?.id === teamId) {
          setSelectedTeamState({ ...selectedTeam, softResUrl });
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update soft-res URL:', error);
      return false;
    }
  };

  return (
    <TeamContext.Provider
      value={{
        teams,
        selectedTeam,
        setSelectedTeam,
        loading,
        refetchTeams,
        isGM,
        isOfficer,
        discordRoles,
        updateTeamSoftRes,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
