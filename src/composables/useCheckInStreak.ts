import { ref, computed } from 'vue';
import { useIndexedDB } from './useIndexedDB';
import type { Badge, StreakStats } from '@/types';
import { formatDate } from '@/utils/date';

const BADGES: Badge[] = [
  {
    id: 'bronze-1',
    name: '初心者',
    description: '连续记录 1 天',
    icon: '🌱',
    daysRequired: 1,
    color: 'from-amber-600 to-yellow-700'
  },
  {
    id: 'bronze-3',
    name: '坚持新星',
    description: '连续记录 3 天',
    icon: '⭐',
    daysRequired: 3,
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'silver-7',
    name: '一周达人',
    description: '连续记录 7 天',
    icon: '🔥',
    daysRequired: 7,
    color: 'from-slate-400 to-slate-600'
  },
  {
    id: 'silver-14',
    name: '半月战士',
    description: '连续记录 14 天',
    icon: '💎',
    daysRequired: 14,
    color: 'from-blue-400 to-cyan-500'
  },
  {
    id: 'gold-30',
    name: '月度冠军',
    description: '连续记录 30 天',
    icon: '🏆',
    daysRequired: 30,
    color: 'from-yellow-400 to-amber-500'
  },
  {
    id: 'gold-60',
    name: '双月传奇',
    description: '连续记录 60 天',
    icon: '👑',
    daysRequired: 60,
    color: 'from-purple-400 to-pink-500'
  },
  {
    id: 'platinum-90',
    name: '季度守护者',
    description: '连续记录 90 天',
    icon: '🌟',
    daysRequired: 90,
    color: 'from-cyan-400 to-blue-500'
  },
  {
    id: 'legend-180',
    name: '半年传奇',
    description: '连续记录 180 天',
    icon: '🌈',
    daysRequired: 180,
    color: 'from-pink-400 via-purple-400 to-indigo-500'
  },
  {
    id: 'mythic-365',
    name: '年度神话',
    description: '连续记录 365 天',
    icon: '🎖️',
    daysRequired: 365,
    color: 'from-red-400 via-yellow-400 to-green-400'
  }
];

export function useCheckInStreak() {
  const db = useIndexedDB();
  const isLoading = ref(false);
  const checkInDates = ref<string[]>([]);

  const loadCheckInDates = async (): Promise<void> => {
    isLoading.value = true;
    try {
      const records = await db.getAllPainRecords();
      const dates = [...new Set(records.map(r => r.date))].sort();
      checkInDates.value = dates;
    } finally {
      isLoading.value = false;
    }
  };

  const calculateCurrentStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;

    const sortedDates = [...new Set(dates)].sort();
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 86400000));

    if (sortedDates[sortedDates.length - 1] !== today && sortedDates[sortedDates.length - 1] !== yesterday) {
      return 0;
    }

    let streak = 1;
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const curr = new Date(sortedDates[i + 1]);
      const prev = new Date(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const calculateLongestStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;

    const sortedDates = [...new Set(dates)].sort();
    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }
    return maxStreak;
  };

  const getCurrentBadge = (streak: number): Badge | null => {
    let current: Badge | null = null;
    for (const badge of BADGES) {
      if (streak >= badge.daysRequired) {
        current = badge;
      } else {
        break;
      }
    }
    return current;
  };

  const getNextBadge = (streak: number): Badge | null => {
    for (const badge of BADGES) {
      if (streak < badge.daysRequired) {
        return badge;
      }
    }
    return null;
  };

  const getEarnedBadges = (longestStreak: number): Badge[] => {
    return BADGES.filter(b => longestStreak >= b.daysRequired);
  };

  const getDaysUntilNextBadge = (streak: number, nextBadge: Badge | null): number => {
    if (!nextBadge) return 0;
    return Math.max(0, nextBadge.daysRequired - streak);
  };

  const streakStats = computed<StreakStats>(() => {
    const dates = checkInDates.value;
    const currentStreak = calculateCurrentStreak(dates);
    const longestStreak = calculateLongestStreak(dates);
    const totalCheckInDays = new Set(dates).size;
    const currentBadge = getCurrentBadge(currentStreak);
    const nextBadge = getNextBadge(currentStreak);
    const earnedBadges = getEarnedBadges(longestStreak);
    const daysUntilNextBadge = getDaysUntilNextBadge(currentStreak, nextBadge);

    return {
      currentStreak,
      longestStreak,
      totalCheckInDays,
      checkInDates: dates,
      currentBadge,
      nextBadge,
      earnedBadges,
      daysUntilNextBadge
    };
  });

  const hasCheckedInToday = computed(() => {
    const today = formatDate(new Date());
    return checkInDates.value.includes(today);
  });

  const getBadgeProgressPercentage = (): number => {
    const stats = streakStats.value;
    if (!stats.nextBadge) return 100;

    const currentBadgeDays = stats.currentBadge?.daysRequired || 0;
    const progress = stats.currentStreak - currentBadgeDays;
    const total = stats.nextBadge.daysRequired - currentBadgeDays;
    if (total <= 0) return 100;
    return Math.min(100, Math.round((progress / total) * 100));
  };

  const getStreakStatsForMonth = async (year: number, month: number): Promise<{
    monthStreak: number;
    monthLongestStreak: number;
    monthCheckInDays: number;
    monthEarnedBadges: Badge[];
  }> => {
    const firstDay = formatDate(new Date(year, month, 1));
    const lastDay = formatDate(new Date(year, month + 1, 0));
    const records = await db.getPainRecordsByDateRange(firstDay, lastDay);
    const dates = [...new Set(records.map(r => r.date))].sort();

    const monthStreak = calculateCurrentStreak(dates);
    const monthLongestStreak = calculateLongestStreak(dates);
    const monthCheckInDays = dates.length;
    const monthEarnedBadges = BADGES.filter(b => monthLongestStreak >= b.daysRequired);

    return {
      monthStreak,
      monthLongestStreak,
      monthCheckInDays,
      monthEarnedBadges
    };
  };

  return {
    isLoading,
    checkInDates,
    streakStats,
    hasCheckedInToday,
    loadCheckInDates,
    getBadgeProgressPercentage,
    getStreakStatsForMonth,
    BADGES
  };
}
