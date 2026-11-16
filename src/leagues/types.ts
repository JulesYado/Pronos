export interface Team {
  id: string;
  abbr: string;
  city: string;
  name: string;
  /** [couleur principale, couleur secondaire] */
  colors: [string, string];
  conference: string;
  division: string;
}

export interface RankingGroup {
  id: string;
  label: string;
  short: string;
  teamIds: string[];
}

export interface Division {
  id: string;
  label: string;
  conference: string;
}

export interface League {
  id: string;
  name: string;
  sport: string;
  emoji: string;
  season: string;
  teams: Team[];
  /** Les classements à pronostiquer (ex. une conférence chacun). */
  groups: RankingGroup[];
  divisions: Division[];
  /** Zones du classement : places qualificatives directes et limite du play-in. */
  zones?: { playoff: number; playin: number };
  /** Mode playoffs disponible (tableau à 8 têtes de série par groupe, play-in possible). */
  playoffs?: { finalsLabel: string };
}
