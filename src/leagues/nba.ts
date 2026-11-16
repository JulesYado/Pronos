import type { League, Team } from './types';

type Raw = [abbr: string, city: string, name: string, c1: string, c2: string, division: string];

const raw: Raw[] = [
  // Est — Atlantique
  ['BOS', 'Boston', 'Celtics', '#007A33', '#BA9653', 'atl'],
  ['BKN', 'Brooklyn', 'Nets', '#111111', '#FFFFFF', 'atl'],
  ['NYK', 'New York', 'Knicks', '#006BB6', '#F58426', 'atl'],
  ['PHI', 'Philadelphia', '76ers', '#006BB6', '#ED174C', 'atl'],
  ['TOR', 'Toronto', 'Raptors', '#CE1141', '#111111', 'atl'],
  // Est — Central
  ['CHI', 'Chicago', 'Bulls', '#CE1141', '#111111', 'cen'],
  ['CLE', 'Cleveland', 'Cavaliers', '#860038', '#FDBB30', 'cen'],
  ['DET', 'Detroit', 'Pistons', '#C8102E', '#1D42BA', 'cen'],
  ['IND', 'Indiana', 'Pacers', '#002D62', '#FDBB30', 'cen'],
  ['MIL', 'Milwaukee', 'Bucks', '#00471B', '#EEE1C6', 'cen'],
  // Est — Sud-Est
  ['ATL', 'Atlanta', 'Hawks', '#E03A3E', '#C1D32F', 'se'],
  ['CHA', 'Charlotte', 'Hornets', '#1D1160', '#00788C', 'se'],
  ['MIA', 'Miami', 'Heat', '#98002E', '#F9A01B', 'se'],
  ['ORL', 'Orlando', 'Magic', '#0077C0', '#C4CED4', 'se'],
  ['WAS', 'Washington', 'Wizards', '#002B5C', '#E31837', 'se'],
  // Ouest — Nord-Ouest
  ['DEN', 'Denver', 'Nuggets', '#0E2240', '#FEC524', 'nw'],
  ['MIN', 'Minnesota', 'Timberwolves', '#0C2340', '#78BE20', 'nw'],
  ['OKC', 'Oklahoma City', 'Thunder', '#007AC1', '#EF3B24', 'nw'],
  ['POR', 'Portland', 'Trail Blazers', '#E03A3E', '#111111', 'nw'],
  ['UTA', 'Utah', 'Jazz', '#3E2680', '#F9A01B', 'nw'],
  // Ouest — Pacifique
  ['GSW', 'Golden State', 'Warriors', '#1D428A', '#FFC72C', 'pac'],
  ['LAC', 'Los Angeles', 'Clippers', '#C8102E', '#1D428A', 'pac'],
  ['LAL', 'Los Angeles', 'Lakers', '#552583', '#FDB927', 'pac'],
  ['PHX', 'Phoenix', 'Suns', '#1D1160', '#E56020', 'pac'],
  ['SAC', 'Sacramento', 'Kings', '#5A2D81', '#63727A', 'pac'],
  // Ouest — Sud-Ouest
  ['DAL', 'Dallas', 'Mavericks', '#00538C', '#B8C4CA', 'sw'],
  ['HOU', 'Houston', 'Rockets', '#CE1141', '#C4CED4', 'sw'],
  ['MEM', 'Memphis', 'Grizzlies', '#5D76A9', '#12173F', 'sw'],
  ['NOP', 'New Orleans', 'Pelicans', '#0C2340', '#C8102E', 'sw'],
  ['SAS', 'San Antonio', 'Spurs', '#C4CED4', '#111111', 'sw'],
];

const divisions = [
  { id: 'atl', label: 'Atlantique', conference: 'east' },
  { id: 'cen', label: 'Central', conference: 'east' },
  { id: 'se', label: 'Sud-Est', conference: 'east' },
  { id: 'nw', label: 'Nord-Ouest', conference: 'west' },
  { id: 'pac', label: 'Pacifique', conference: 'west' },
  { id: 'sw', label: 'Sud-Ouest', conference: 'west' },
];

const teams: Team[] = raw.map(([abbr, city, name, c1, c2, division]) => ({
  id: abbr,
  abbr,
  city,
  name,
  colors: [c1, c2],
  division,
  conference: divisions.find((d) => d.id === division)!.conference,
}));

export const nba: League = {
  id: 'nba',
  name: 'NBA',
  sport: 'Basketball',
  emoji: '🏀',
  season: '2026-27',
  teams,
  divisions,
  zones: { playoff: 6, playin: 10 },
  playoffs: { finalsLabel: 'Finales NBA' },
  groups: [
    { id: 'east', label: 'Conférence Est', short: 'Est', teamIds: teams.filter((t) => t.conference === 'east').map((t) => t.id) },
    { id: 'west', label: 'Conférence Ouest', short: 'Ouest', teamIds: teams.filter((t) => t.conference === 'west').map((t) => t.id) },
  ],
};
