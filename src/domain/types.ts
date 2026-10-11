import type { DateKey } from './dates';
import type { ScheduleType } from './recurrence';

export interface Child {
  id: string;
  name: string;
  avatar: string;
  age: number;
  color: string;
  sortOrder: number;
  createdAt: string;
  archivedAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  icon: string;
  stars: number;
  scheduleType: ScheduleType;
  weekdays: number[];
  startDate: DateKey;
  needsApproval: boolean;
  childIds: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export type InstanceStatus = 'todo' | 'waiting' | 'done';

export interface TaskInstance {
  id: string;
  taskId: string;
  childId: string;
  periodKey: string;
  dueDate: DateKey;
  title: string;
  icon: string;
  stars: number;
  status: InstanceStatus;
  completedAt: string | null;
  completedDate: DateKey | null;
  decidedAt: string | null;
  parentNote: string | null;
  /** True when a parent sent the job back ("try again"). */
  returned: boolean;
}

export interface Reward {
  id: string;
  title: string;
  icon: string;
  cost: number;
  weeklyLimit: number | null;
  needsApproval: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export type RedemptionStatus = 'requested' | 'approved' | 'rejected';

export interface Redemption {
  id: string;
  rewardId: string;
  childId: string;
  title: string;
  icon: string;
  cost: number;
  status: RedemptionStatus;
  weekKey: DateKey;
  requestedAt: string;
  decidedAt: string | null;
  parentNote: string | null;
  seenByChild: boolean;
}

export type LedgerSource =
  'task_instance' | 'task_undo' | 'redemption' | 'redemption_refund' | 'adjustment';

export interface LedgerEntry {
  id: string;
  childId: string;
  delta: number;
  reason: string;
  sourceType: LedgerSource;
  sourceId: string | null;
  createdAt: string;
  localDate: DateKey;
}

export interface ChildInput {
  name: string;
  avatar: string;
  age: number;
  color: string;
}

export interface TaskInput {
  title: string;
  icon: string;
  stars: number;
  scheduleType: ScheduleType;
  weekdays: number[];
  startDate: DateKey;
  needsApproval: boolean;
  childIds: string[];
}

export interface RewardInput {
  title: string;
  icon: string;
  cost: number;
  weeklyLimit: number | null;
  needsApproval: boolean;
}

/** Ready-made "nice job" notes a parent can attach with one tap. */
export const NICE_JOB_NOTES = [
  'Nice job!',
  'So proud of you!',
  'Super hero work!',
  'Thank you for helping!',
] as const;

export const TRY_AGAIN_NOTES = ['Almost! Try once more.', "Let's do it together."] as const;
