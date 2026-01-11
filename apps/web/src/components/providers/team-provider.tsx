'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Team = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  role: string;
  playerCount: number;
  memberCount: number;
};

type TeamContextType = {
  teams: Team[];
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team | null) => void;
  loading: boolean;
  refetchTeams: () => Promise<void>;
};

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const SELECTED_TEAM_KEY = 'selectedTeamId';

export function TeamProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeamState] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);

        // Restore previously selected team from localStorage
        const savedTeamId = localStorage.getItem(SELECTED_TEAM_KEY);
        if (savedTeamId) {
          const savedTeam = data.find((t: Team) => t.id === savedTeamId);
          if (savedTeam) {
            setSelectedTeamState(savedTeam);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const setSelectedTeam = (team: Team | null) => {
    setSelectedTeamState(team);
    if (team) {
      localStorage.setItem(SELECTED_TEAM_KEY, team.id);
    } else {
      localStorage.removeItem(SELECTED_TEAM_KEY);
    }
  };

  return (
    <TeamContext.Provider
      value={{
        teams,
        selectedTeam,
        setSelectedTeam,
        loading,
        refetchTeams: fetchTeams,
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
