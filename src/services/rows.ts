import { csvToWeekdays, type Schedule, type ScheduleType } from '@/domain/recurrence';
import type {
  Child,
  InstanceStatus,
  LedgerEntry,
  LedgerSource,
  Redemption,
  RedemptionStatus,
  Reward,
  Task,
  TaskInstance,
} from '@/domain/types';

export interface ChildRow {
  id: string;
  name: string;
  avatar: string;
  age: number;
  color: string;
  sort_order: number;
  created_at: string;
  archived_at: string | null;
}

export const toChild = (r: ChildRow): Child => ({
  id: r.id,
  name: r.name,
  avatar: r.avatar,
  age: r.age,
  color: r.color,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  archivedAt: r.archived_at,
});

export interface TaskRow {
  id: string;
  title: string;
  icon: string;
  stars: number;
  schedule_type: string;
  weekdays: string;
  start_date: string;
  needs_approval: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export const toTask = (r: TaskRow, childIds: string[]): Task => ({
  id: r.id,
  title: r.title,
  icon: r.icon,
  stars: r.stars,
  scheduleType: r.schedule_type as ScheduleType,
  weekdays: csvToWeekdays(r.weekdays),
  startDate: r.start_date,
  needsApproval: r.needs_approval === 1,
  childIds,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  archivedAt: r.archived_at,
});

export const scheduleOfRow = (
  r: Pick<TaskRow, 'schedule_type' | 'weekdays' | 'start_date'>,
): Schedule => ({
  type: r.schedule_type as ScheduleType,
  weekdays: csvToWeekdays(r.weekdays),
  startDate: r.start_date,
});

export interface InstanceRow {
  id: string;
  task_id: string;
  child_id: string;
  period_key: string;
  due_date: string;
  title: string;
  icon: string;
  stars: number;
  status: string;
  completed_at: string | null;
  completed_date: string | null;
  decided_at: string | null;
  parent_note: string | null;
  returned: number;
}

export const toInstance = (r: InstanceRow): TaskInstance => ({
  id: r.id,
  taskId: r.task_id,
  childId: r.child_id,
  periodKey: r.period_key,
  dueDate: r.due_date,
  title: r.title,
  icon: r.icon,
  stars: r.stars,
  status: r.status as InstanceStatus,
  completedAt: r.completed_at,
  completedDate: r.completed_date,
  decidedAt: r.decided_at,
  parentNote: r.parent_note,
  returned: r.returned === 1,
});

export interface RewardRow {
  id: string;
  title: string;
  icon: string;
  cost: number;
  weekly_limit: number | null;
  needs_approval: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export const toReward = (r: RewardRow): Reward => ({
  id: r.id,
  title: r.title,
  icon: r.icon,
  cost: r.cost,
  weeklyLimit: r.weekly_limit,
  needsApproval: r.needs_approval === 1,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  archivedAt: r.archived_at,
});

export interface RedemptionRow {
  id: string;
  reward_id: string;
  child_id: string;
  title: string;
  icon: string;
  cost: number;
  status: string;
  week_key: string;
  requested_at: string;
  decided_at: string | null;
  parent_note: string | null;
  seen_by_child: number;
}

export const toRedemption = (r: RedemptionRow): Redemption => ({
  id: r.id,
  rewardId: r.reward_id,
  childId: r.child_id,
  title: r.title,
  icon: r.icon,
  cost: r.cost,
  status: r.status as RedemptionStatus,
  weekKey: r.week_key,
  requestedAt: r.requested_at,
  decidedAt: r.decided_at,
  parentNote: r.parent_note,
  seenByChild: r.seen_by_child === 1,
});

export interface LedgerRow {
  id: string;
  child_id: string;
  delta: number;
  reason: string;
  source_type: string;
  source_id: string | null;
  created_at: string;
  local_date: string;
}

export const toLedger = (r: LedgerRow): LedgerEntry => ({
  id: r.id,
  childId: r.child_id,
  delta: r.delta,
  reason: r.reason,
  sourceType: r.source_type as LedgerSource,
  sourceId: r.source_id,
  createdAt: r.created_at,
  localDate: r.local_date,
});
