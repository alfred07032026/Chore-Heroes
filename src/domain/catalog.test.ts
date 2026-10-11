import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';

import { BADGES, newlyEarnedBadges } from './badges';
import { AVATARS, REWARD_ICONS, REWARD_TEMPLATES, TASK_ICONS, TASK_TEMPLATES } from './catalog';
import { validateReward, validateTask } from './validation';

const has = (name: string) => Object.prototype.hasOwnProperty.call(glyphs, name);

describe('catalog', () => {
  it('ships 20+ task and 12+ reward templates', () => {
    expect(TASK_TEMPLATES.length).toBeGreaterThanOrEqual(20);
    expect(REWARD_TEMPLATES.length).toBeGreaterThanOrEqual(12);
  });

  it('every template is valid', () => {
    for (const t of TASK_TEMPLATES) {
      const e = validateTask({
        ...t,
        startDate: '2026-10-11',
        needsApproval: false,
        childIds: ['c'],
      });
      expect(e).toEqual({});
    }
    for (const r of REWARD_TEMPLATES) {
      expect(validateReward({ ...r, needsApproval: true })).toEqual({});
    }
  });

  it('every icon exists in the icon font', () => {
    const icons = [
      ...TASK_ICONS,
      ...REWARD_ICONS,
      ...AVATARS.map((a) => a.icon),
      ...BADGES.map((b) => b.icon),
    ];
    expect(icons.filter((i) => !has(i))).toEqual([]);
  });

  it('has 8-10 badges with unique ids', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(8);
    expect(BADGES.length).toBeLessThanOrEqual(10);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });

  it('awards badges by stats', () => {
    const stats = {
      tasksDone: 1,
      lifetimeStars: 2,
      currentStreak: 1,
      bestStreak: 3,
      rewardsRedeemed: 0,
      perfectDays: 0,
    };
    expect(newlyEarnedBadges(stats, [])).toEqual(['first_task', 'streak_3']);
    expect(newlyEarnedBadges(stats, ['first_task'])).toEqual(['streak_3']);
  });
});
