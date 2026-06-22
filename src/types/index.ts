export interface PainRecord {
  id?: number;
  date: string;
  timestamp: string;
  painLevel: number;
  bodyParts: string[];
  triggers: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id?: number;
  recordId: number;
  name: string;
  dosage: string;
  time: string;
  notes?: string;
}

export interface Exercise {
  id?: number;
  recordId: number;
  type: string;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface Weather {
  id?: number;
  recordId: number;
  temperature: number;
  humidity: number;
  pressure: number;
  condition: string;
  city: string;
}

export interface FullRecord extends PainRecord {
  medications: Medication[];
  exercises: Exercise[];
  weather?: Weather;
}

export type TimeRange = 'week' | 'month';

export interface TrendDataPoint {
  date: string;
  avgPain: number;
  maxPain: number;
  recordCount: number;
  triggers: Record<string, number>;
  bodyParts: Record<string, number>;
}

export const BODY_PARTS = [
  '头部', '颈部', '肩膀', '手臂', '肘部', '手腕',
  '胸部', '背部', '腰部', '腹部', '髋部',
  '大腿', '膝盖', '小腿', '脚踝', '脚部'
];

export const TRIGGERS = [
  '压力', '睡眠不足', '疲劳', '饮食', '饮酒',
  '咖啡因', '天气变化', '运动', '久坐',
  '姿势不良', '情绪波动', '生理期', '其他'
];

export const EXERCISE_TYPES = [
  '散步', '跑步', '游泳', '瑜伽', '力量训练',
  '骑行', '羽毛球', '乒乓球', '篮球', '足球',
  '拉伸', '冥想', '其他'
];

export interface MedicationPlan {
  id?: number;
  name: string;
  dosage: string;
  times: string[];
  daysOfWeek: number[];
  startDate: string;
  endDate?: string;
  notes?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationLog {
  id?: number;
  planId: number;
  scheduledDate: string;
  scheduledTime: string;
  medicationName: string;
  dosage: string;
  taken: boolean;
  takenAt?: string;
  notes?: string;
  createdAt: string;
}

export interface TodayMedication {
  logId?: number;
  planId: number;
  name: string;
  dosage: string;
  scheduledTime: string;
  taken: boolean;
  takenAt?: string;
  overdue: boolean;
}

export interface AdherenceStats {
  adherenceRate: number;
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  period: 'today' | 'week' | 'month';
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  daysRequired: number;
  color: string;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalCheckInDays: number;
  checkInDates: string[];
  currentBadge: Badge | null;
  nextBadge: Badge | null;
  earnedBadges: Badge[];
  daysUntilNextBadge: number;
}

export interface RecordReminderSettings {
  enabled: boolean;
  reminderTime: string;
  remindOnMissedDays: boolean;
}

