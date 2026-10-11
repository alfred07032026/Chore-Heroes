export interface BadgeStats {
  tasksDone: number;
  lifetimeStars: number;
  currentStreak: number;
  bestStreak: number;
  rewardsRedeemed: number;
  perfectDays: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  /** Spoken explanation for pre-readers. */
  howTo: string;
  icon: string;
  color: string;
  earned: (s: BadgeStats) => boolean;
}

export const BADGES: readonly BadgeDef[] = [
  {
    id: 'first_task',
    name: 'First Job',
    howTo: 'Finish your very first job.',
    icon: 'shoe-print',
    color: '#3BA7F0',
    earned: (s) => s.tasksDone >= 1,
  },
  {
    id: 'tasks_10',
    name: 'Helper Hero',
    howTo: 'Finish 10 jobs.',
    icon: 'hand-heart',
    color: '#2E9E5B',
    earned: (s) => s.tasksDone >= 10,
  },
  {
    id: 'tasks_50',
    name: 'Super Helper',
    howTo: 'Finish 50 jobs.',
    icon: 'arm-flex',
    color: '#E0533F',
    earned: (s) => s.tasksDone >= 50,
  },
  {
    id: 'streak_3',
    name: 'Warm Flame',
    howTo: 'Do a job 3 days in a row.',
    icon: 'fire',
    color: '#FF8A00',
    earned: (s) => s.bestStreak >= 3,
  },
  {
    id: 'streak_7',
    name: 'Bright Flame',
    howTo: 'Do a job 7 days in a row.',
    icon: 'fire-circle',
    color: '#E85D04',
    earned: (s) => s.bestStreak >= 7,
  },
  {
    id: 'streak_14',
    name: 'Blazing Hero',
    howTo: 'Do a job 14 days in a row.',
    icon: 'weather-sunny',
    color: '#D9A400',
    earned: (s) => s.bestStreak >= 14,
  },
  {
    id: 'stars_50',
    name: 'Star Catcher',
    howTo: 'Earn 50 stars.',
    icon: 'star-shooting',
    color: '#C99400',
    earned: (s) => s.lifetimeStars >= 50,
  },
  {
    id: 'stars_100',
    name: 'Star Champion',
    howTo: 'Earn 100 stars.',
    icon: 'trophy',
    color: '#8A5CF6',
    earned: (s) => s.lifetimeStars >= 100,
  },
  {
    id: 'first_reward',
    name: 'Treat Time',
    howTo: 'Get your first reward.',
    icon: 'gift',
    color: '#D6336C',
    earned: (s) => s.rewardsRedeemed >= 1,
  },
  {
    id: 'perfect_day',
    name: 'Perfect Day',
    howTo: 'Finish every job on your list in one day.',
    icon: 'check-decagram',
    color: '#5B3CC4',
    earned: (s) => s.perfectDays >= 1,
  },
];

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}

/** Badges that are earned by `stats` but not yet in `already`. */
export function newlyEarnedBadges(stats: BadgeStats, already: Iterable<string>): string[] {
  const have = new Set(already);
  return BADGES.filter((b) => !have.has(b.id) && b.earned(stats)).map((b) => b.id);
}
