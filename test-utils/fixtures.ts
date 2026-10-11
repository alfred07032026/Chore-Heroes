import type { Db } from '../src/db/types';
import { createChild } from '../src/services/children';
import { createTask } from '../src/services/tasks';
import { createReward } from '../src/services/rewards';
import type { TaskInput } from '../src/domain/types';

/** Local-time Date helper: at(2026, 10, 11, 9) = 11 Oct 2026 09:00 local. */
export const at = (y: number, m: number, d: number, h = 9, min = 0) =>
  new Date(y, m - 1, d, h, min);

export async function addChild(db: Db, name = 'Maya', now = at(2026, 10, 1)) {
  return createChild(db, { name, avatar: 'cat', age: 7, color: '#5B3CC4' }, now);
}

export async function addTask(
  db: Db,
  childIds: string[],
  over: Partial<TaskInput> = {},
  now = at(2026, 10, 1),
) {
  return createTask(
    db,
    {
      title: 'Feed the dog',
      icon: 'paw',
      stars: 3,
      scheduleType: 'daily',
      weekdays: [],
      startDate: '2026-10-01',
      needsApproval: false,
      childIds,
      ...over,
    },
    now,
  );
}

export async function addReward(db: Db, over: Partial<Parameters<typeof createReward>[1]> = {}) {
  return createReward(db, {
    title: 'Pick the movie',
    icon: 'movie-open',
    cost: 10,
    weeklyLimit: null,
    needsApproval: true,
    ...over,
  });
}
