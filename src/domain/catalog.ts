import type { ScheduleType } from './recurrence';

/** Built-in avatars: friendly animal heroes (MaterialCommunityIcons glyphs). */
export const AVATARS = [
  { id: 'cat', icon: 'cat', label: 'Cat' },
  { id: 'dog', icon: 'dog', label: 'Dog' },
  { id: 'owl', icon: 'owl', label: 'Owl' },
  { id: 'rabbit', icon: 'rabbit', label: 'Bunny' },
  { id: 'panda', icon: 'panda', label: 'Panda' },
  { id: 'unicorn', icon: 'unicorn', label: 'Unicorn' },
  { id: 'penguin', icon: 'penguin', label: 'Penguin' },
  { id: 'turtle', icon: 'turtle', label: 'Turtle' },
  { id: 'robot', icon: 'robot-happy', label: 'Robot' },
  { id: 'rocket', icon: 'rocket-launch', label: 'Rocket' },
  { id: 'elephant', icon: 'elephant', label: 'Elephant' },
  { id: 'bee', icon: 'bee', label: 'Bee' },
] as const;

export type AvatarId = (typeof AVATARS)[number]['id'];

export function avatarIcon(id: string): string {
  return AVATARS.find((a) => a.id === id)?.icon ?? 'account-child';
}

/** High-contrast hero colors for child profiles (white icons pass 4.5:1 on each). */
export const CHILD_COLORS = [
  '#5B3CC4',
  '#C2255C',
  '#1971C2',
  '#2B8A3E',
  '#D9480F',
  '#0C8599',
  '#862E9C',
  '#5C7CFA',
] as const;

/** Spoken names for the hero colors (screen readers can't describe a swatch). */
export const CHILD_COLOR_NAMES: Record<(typeof CHILD_COLORS)[number], string> = {
  '#5B3CC4': 'Purple',
  '#C2255C': 'Raspberry',
  '#1971C2': 'Blue',
  '#2B8A3E': 'Green',
  '#D9480F': 'Orange',
  '#0C8599': 'Teal',
  '#862E9C': 'Grape',
  '#5C7CFA': 'Periwinkle',
};

export interface TaskTemplate {
  id: string;
  title: string;
  icon: string;
  stars: number;
  scheduleType: ScheduleType;
  weekdays: number[];
}

const SCHOOL_DAYS = [1, 2, 3, 4, 5];

export const TASK_TEMPLATES: readonly TaskTemplate[] = [
  {
    id: 't_bed',
    title: 'Make your bed',
    icon: 'bed',
    stars: 2,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_teeth_am',
    title: 'Brush teeth (morning)',
    icon: 'toothbrush',
    stars: 1,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_teeth_pm',
    title: 'Brush teeth (night)',
    icon: 'toothbrush-paste',
    stars: 1,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_dress',
    title: 'Get dressed',
    icon: 'tshirt-crew',
    stars: 1,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_pet',
    title: 'Feed the pet',
    icon: 'paw',
    stars: 2,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_dog_walk',
    title: 'Walk the dog',
    icon: 'dog-side',
    stars: 3,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_fish',
    title: 'Feed the fish',
    icon: 'fish',
    stars: 1,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_homework',
    title: 'Do homework',
    icon: 'pencil',
    stars: 3,
    scheduleType: 'weekdays',
    weekdays: SCHOOL_DAYS,
  },
  {
    id: 't_read',
    title: 'Read for 15 minutes',
    icon: 'book-open-variant',
    stars: 2,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_toys',
    title: 'Tidy up toys',
    icon: 'teddy-bear',
    stars: 2,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_table',
    title: 'Set the table',
    icon: 'silverware-fork-knife',
    stars: 2,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_clear',
    title: 'Clear your plate',
    icon: 'silverware-clean',
    stars: 1,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_bag',
    title: 'Pack school bag',
    icon: 'bag-personal',
    stars: 1,
    scheduleType: 'weekdays',
    weekdays: [0, 1, 2, 3, 4],
  },
  {
    id: 't_laundry',
    title: 'Clothes in the hamper',
    icon: 'basket',
    stars: 1,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_fold',
    title: 'Fold laundry',
    icon: 'hanger',
    stars: 3,
    scheduleType: 'weekly',
    weekdays: [],
  },
  {
    id: 't_plants',
    title: 'Water the plants',
    icon: 'watering-can',
    stars: 2,
    scheduleType: 'weekdays',
    weekdays: [3, 6],
  },
  {
    id: 't_trash',
    title: 'Take out the trash',
    icon: 'trash-can',
    stars: 3,
    scheduleType: 'weekly',
    weekdays: [],
  },
  {
    id: 't_shoes',
    title: 'Put shoes away',
    icon: 'shoe-sneaker',
    stars: 1,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_bath',
    title: 'Bath or shower',
    icon: 'shower',
    stars: 2,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_hands',
    title: 'Wash hands before dinner',
    icon: 'hand-wash',
    stars: 1,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_dishwasher',
    title: 'Help empty dishwasher',
    icon: 'dishwasher',
    stars: 3,
    scheduleType: 'weekly',
    weekdays: [],
  },
  {
    id: 't_room',
    title: 'Clean your room',
    icon: 'broom',
    stars: 4,
    scheduleType: 'weekly',
    weekdays: [],
  },
  {
    id: 't_music',
    title: 'Practice music',
    icon: 'music-note',
    stars: 2,
    scheduleType: 'weekdays',
    weekdays: SCHOOL_DAYS,
  },
  {
    id: 't_water',
    title: 'Drink water',
    icon: 'cup-water',
    stars: 1,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_fruit',
    title: 'Eat a fruit or veggie',
    icon: 'food-apple',
    stars: 1,
    scheduleType: 'daily',
    weekdays: [],
  },
  {
    id: 't_sleep',
    title: 'Bedtime on time',
    icon: 'sleep',
    stars: 2,
    scheduleType: 'daily',
    weekdays: [],
  },
];

export interface RewardTemplate {
  id: string;
  title: string;
  icon: string;
  cost: number;
  weeklyLimit: number | null;
}

export const REWARD_TEMPLATES: readonly RewardTemplate[] = [
  {
    id: 'r_screen15',
    title: 'Extra screen time (15 min)',
    icon: 'television',
    cost: 10,
    weeklyLimit: 3,
  },
  { id: 'r_movie', title: 'Pick the movie', icon: 'movie-open', cost: 15, weeklyLimit: 1 },
  { id: 'r_dessert', title: 'Dessert treat', icon: 'ice-cream', cost: 8, weeklyLimit: 2 },
  { id: 'r_park', title: 'Park trip', icon: 'pine-tree', cost: 20, weeklyLimit: 1 },
  { id: 'r_bike', title: 'Bike ride together', icon: 'bike', cost: 15, weeklyLimit: null },
  {
    id: 'r_game',
    title: 'Game time with a grown-up',
    icon: 'gamepad-variant',
    cost: 12,
    weeklyLimit: null,
  },
  { id: 'r_craft', title: 'Art & craft time', icon: 'palette', cost: 10, weeklyLimit: null },
  { id: 'r_dinner', title: 'Choose dinner', icon: 'pizza', cost: 20, weeklyLimit: 1 },
  { id: 'r_late', title: 'Stay up 15 min later', icon: 'weather-night', cost: 15, weeklyLimit: 1 },
  { id: 'r_story', title: 'Extra bedtime story', icon: 'book-heart', cost: 5, weeklyLimit: null },
  { id: 'r_fort', title: 'Build a blanket fort', icon: 'tent', cost: 12, weeklyLimit: null },
  { id: 'r_bake', title: 'Bake cookies together', icon: 'cookie', cost: 18, weeklyLimit: 1 },
  { id: 'r_toy', title: 'Small toy', icon: 'toy-brick', cost: 40, weeklyLimit: null },
  {
    id: 'r_friend',
    title: 'Playdate with a friend',
    icon: 'account-group',
    cost: 30,
    weeklyLimit: 1,
  },
];

/** Icon choices offered in the task/reward editors. */
export const TASK_ICONS = [
  ...new Set([
    ...TASK_TEMPLATES.map((t) => t.icon),
    'star',
    'heart',
    'soccer',
    'swim',
    'run',
    'flower',
    'spray-bottle',
    'vacuum',
    'cupboard',
    'car-wash',
    'puzzle',
    'lightbulb-on',
  ]),
];

export const REWARD_ICONS = [
  ...new Set([
    ...REWARD_TEMPLATES.map((r) => r.icon),
    'cake-variant',
    'ice-pop',
    'candy',
    'music',
    'basketball',
    'beach',
    'popcorn',
    'gift',
    'crown',
    'balloon',
  ]),
];
