import { isDateKey } from './dates';
import { normalizeWeekdays } from './recurrence';
import type { ChildInput, RewardInput, TaskInput } from './types';
import { AVATARS } from './catalog';

export type Errors<T> = Partial<Record<keyof T, string>>;

export const MAX_CHILDREN = 6;
export const MIN_AGE = 6;
export const MAX_AGE = 9;

export function validateChild(input: ChildInput): Errors<ChildInput> {
  const e: Errors<ChildInput> = {};
  const name = input.name.trim();
  if (name.length < 1) e.name = 'Please enter a name.';
  else if (name.length > 20) e.name = 'Keep the name to 20 letters or fewer.';
  if (!AVATARS.some((a) => a.id === input.avatar)) e.avatar = 'Pick an avatar.';
  if (!Number.isInteger(input.age) || input.age < MIN_AGE || input.age > MAX_AGE)
    e.age = `Age must be between ${MIN_AGE} and ${MAX_AGE}.`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(input.color)) e.color = 'Pick a color.';
  return e;
}

export function validateTask(input: TaskInput): Errors<TaskInput> {
  const e: Errors<TaskInput> = {};
  const title = input.title.trim();
  if (title.length < 2) e.title = 'Give the task a short name.';
  else if (title.length > 40) e.title = 'Keep the name to 40 characters or fewer.';
  if (!input.icon) e.icon = 'Pick an icon.';
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5)
    e.stars = 'Stars must be 1 to 5.';
  if (!['once', 'daily', 'weekdays', 'weekly'].includes(input.scheduleType))
    e.scheduleType = 'Pick a schedule.';
  if (input.scheduleType === 'weekdays' && normalizeWeekdays(input.weekdays).length === 0)
    e.weekdays = 'Pick at least one day.';
  if (!isDateKey(input.startDate)) e.startDate = 'Invalid start date.';
  if (input.childIds.length === 0) e.childIds = 'Assign at least one child.';
  return e;
}

export function validateReward(input: RewardInput): Errors<RewardInput> {
  const e: Errors<RewardInput> = {};
  const title = input.title.trim();
  if (title.length < 2) e.title = 'Give the reward a short name.';
  else if (title.length > 40) e.title = 'Keep the name to 40 characters or fewer.';
  if (!input.icon) e.icon = 'Pick an icon.';
  if (!Number.isInteger(input.cost) || input.cost < 1 || input.cost > 500)
    e.cost = 'Cost must be 1 to 500 stars.';
  if (
    input.weeklyLimit !== null &&
    (!Number.isInteger(input.weeklyLimit) || input.weeklyLimit < 1 || input.weeklyLimit > 21)
  )
    e.weeklyLimit = 'Limit must be 1 to 21 per week, or no limit.';
  return e;
}

export function hasErrors(e: object): boolean {
  return Object.values(e).some(Boolean);
}
