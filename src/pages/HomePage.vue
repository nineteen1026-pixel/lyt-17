<script setup lang="ts">
import { ref, onMounted, onActivated, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, TrendingUp, Calendar, Droplets, Activity, Target, Pill, Check, Clock, AlertCircle, FileText, Stethoscope } from 'lucide-vue-next';
import { usePainRecord } from '@/composables/usePainRecord';
import { useTrends } from '@/composables/useTrends';
import { useMedicationReminder } from '@/composables/useMedicationReminder';
import { formatDisplayDate } from '@/utils/date';
import type { AdherenceStats } from '@/types';

const router = useRouter();
const recordService = usePainRecord();
const trendsService = useTrends();
const medicationService = useMedicationReminder();

const todayStats = ref({ count: 0, avgPain: 0, maxPain: 0 });
const weekStats = ref({ avgPain: 0, totalRecords: 0 });
const todayAdherence = ref<AdherenceStats | null>(null);
const weekAdherence = ref<AdherenceStats | null>(null);
const isLoading = ref(true);
const today = formatDisplayDate(new Date().toISOString().split('T')[0]);
const markingId = ref<number | null>(null);

const {
  todayMedications,
  todayPendingCount,
  todayTakenCount,
  todayOverdueCount,
  activePlansCount,
  loadPlans,
  loadTodayMedications,
  markTaken,
  unmarkTaken,
  calculateAdherence,
  calculateTodayAdherence
} = medicationService;

const displayMedications = computed(() => todayMedications.value.slice(0, 6));
const hasMoreMedications = computed(() => todayMedications.value.length > 6);

const loadStats = async () => {
  isLoading.value = true;
  try {
    await Promise.all([
      recordService.getTodayStats().then(s => todayStats.value = s),
      trendsService.loadTrendData().then(() => {
        weekStats.value = {
          avgPain: trendsService.getAveragePain.value,
          totalRecords: trendsService.getTotalRecords.value
        };
      }),
      loadPlans(),
      loadTodayMedications(),
      calculateTodayAdherence().then(s => todayAdherence.value = s),
      calculateAdherence('week').then(s => weekAdherence.value = s)
    ]);
  } finally {
    isLoading.value = false;
  }
};

const refreshAdherence = async () => {
  todayAdherence.value = await calculateTodayAdherence();
  weekAdherence.value = await calculateAdherence('week');
};

const handleMarkTaken = async (logId: number) => {
  if (markingId.value !== null) return;
  markingId.value = logId;
  try {
    await markTaken(logId);
    await refreshAdherence();
  } finally {
    markingId.value = null;
  }
};

const handleUnmarkTaken = async (logId: number) => {
  if (markingId.value !== null) return;
  markingId.value = logId;
  try {
    await unmarkTaken(logId);
    await refreshAdherence();
  } finally {
    markingId.value = null;
  }
};

const goToRecord = () => {
  router.push('/record');
};

const goToTrends = () => {
  router.push('/trends');
};

const goToBody = () => {
  router.push('/body');
};

const goToHistory = () => {
  router.push('/history');
};

const goToMedication = () => {
  router.push('/medication');
};

onMounted(() => {
  loadStats();
});

onActivated(() => {
  loadStats();
});
</script>

<template>
  <div class="page-container animate-fade-in">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">疼痛日记</h1>
      <p class="text-white/60">{{ today }}</p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div class="stat-card animate-slide-up" style="animation-delay: 0.1s">
        <div class="stat-value">{{ todayStats.count }}</div>
        <div class="stat-label">今日记录</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay: 0.15s">
        <div class="stat-value">{{ todayPendingCount }}</div>
        <div class="stat-label">待服药</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay: 0.2s">
        <div class="stat-value">{{ todayTakenCount }}</div>
        <div class="stat-label">已服药</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay: 0.25s">
        <div class="stat-value">{{ weekStats.totalRecords }}</div>
        <div class="stat-label">本周记录</div>
      </div>
    </div>

    <div
      v-if="todayOverdueCount > 0"
      class="glass-card p-4 mb-6 animate-slide-up border-red-500/30"
      style="animation-delay: 0.3s"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 animate-pulse-soft">
          <AlertCircle :size="20" class="text-red-400" />
        </div>
        <div class="flex-1">
          <p class="font-medium text-red-300">
            您有 {{ todayOverdueCount }} 个服药提醒已过期
          </p>
          <p class="text-sm text-white/50">请尽快补服或标记已服用</p>
        </div>
        <button @click="goToMedication" class="text-sm text-red-300 hover:text-red-200 font-medium">
          查看 →
        </button>
      </div>
    </div>

    <div
      class="glass-card p-6 mb-6 animate-slide-up"
      style="animation-delay: 0.35s"
    >
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <Pill :size="22" class="text-purple-400" />
          今日用药
        </h2>
        <button
          @click="goToMedication"
          class="text-sm text-purple-300 hover:text-purple-200 font-medium"
        >
          {{ activePlansCount > 0 ? '管理' : '添加计划' }} →
        </button>
      </div>

      <div v-if="todayMedications.length === 0 && activePlansCount === 0" class="py-6 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
          <Pill :size="28" class="text-purple-400/60" />
        </div>
        <h3 class="font-medium mb-1">暂无用药计划</h3>
        <p class="text-sm text-white/50 mb-4">添加用药计划，获取准时服药提醒</p>
        <button @click="goToMedication" class="btn-secondary py-2 px-4 text-sm">
          添加用药计划
        </button>
      </div>

      <div v-else-if="todayMedications.length === 0" class="py-6 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Check :size="28" class="text-emerald-400" />
        </div>
        <h3 class="font-medium mb-1">今日无需服药</h3>
        <p class="text-sm text-white/50">继续保持健康作息！</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="med in displayMedications"
          :key="med.logId"
          class="flex items-center gap-4 p-4 rounded-xl transition-all duration-300"
          :class="{
            'bg-emerald-500/10 border border-emerald-500/20': med.taken,
            'bg-white/5 hover:bg-white/10': !med.taken && !med.overdue,
            'bg-red-500/10 border border-red-500/20': !med.taken && med.overdue
          }"
        >
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            :class="{
              'bg-emerald-500/20': med.taken,
              'bg-purple-500/20': !med.taken && !med.overdue,
              'bg-red-500/20': !med.taken && med.overdue
            }"
          >
            <Check v-if="med.taken" :size="20" class="text-emerald-400" />
            <Clock v-else-if="med.overdue" :size="20" class="text-red-400 animate-pulse-soft" />
            <Pill v-else :size="20" class="text-purple-400" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <p class="font-medium truncate" :class="{ 'line-through text-white/40': med.taken }">
                {{ med.name }}
              </p>
              <span
                v-if="med.overdue && !med.taken"
                class="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 shrink-0"
              >
                已过期
              </span>
            </div>
            <p class="text-sm text-white/50 flex items-center gap-2">
              <span class="font-mono">{{ med.scheduledTime }}</span>
              <span v-if="med.dosage" class="text-white/30">·</span>
              <span v-if="med.dosage">{{ med.dosage }}</span>
            </p>
          </div>

          <button
            v-if="med.taken"
            @click="handleUnmarkTaken(med.logId!)"
            :disabled="markingId === med.logId"
            class="p-2.5 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 transition-all shrink-0"
            title="撤销"
          >
            <div v-if="markingId === med.logId" class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <Check v-else :size="18" />
          </button>
          <button
            v-else
            @click="handleMarkTaken(med.logId!)"
            :disabled="markingId === med.logId"
            class="p-2.5 rounded-xl transition-all shrink-0"
            :class="med.overdue
              ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'"
            title="标记已服用"
          >
            <div v-if="markingId === med.logId" class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <Check v-else :size="18" />
          </button>
        </div>

        <div
          v-if="hasMoreMedications"
          @click="goToMedication"
          class="text-center py-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer text-sm text-white/50 hover:text-white/70 transition-all"
        >
          查看全部 {{ todayMedications.length }} 条用药 →
        </div>
      </div>
    </div>

    <div
      v-if="(todayAdherence && todayAdherence.totalScheduled > 0) || (weekAdherence && weekAdherence.totalScheduled > 0)"
      class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
    >
      <div
        v-if="todayAdherence && todayAdherence.totalScheduled > 0"
        class="glass-card p-5 animate-slide-up"
        style="animation-delay: 0.4s"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold flex items-center gap-2">
            <Pill :size="18" class="text-purple-400" />
            今日依从率
          </h3>
          <button @click="goToMedication" class="text-xs text-white/50 hover:text-white/70">
            详情 →
          </button>
        </div>
        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent"
              :class="{
                'from-emerald-400 to-green-400': todayAdherence.adherenceRate >= 80,
                'from-yellow-400 to-orange-400': todayAdherence.adherenceRate >= 50 && todayAdherence.adherenceRate < 80,
                'from-red-400 to-rose-400': todayAdherence.adherenceRate < 50
              }"
            >
              {{ todayAdherence.adherenceRate }}%
            </p>
            <p class="text-sm text-white/60 mt-0.5">今日服药表现</p>
          </div>
          <div class="text-right space-y-1">
            <p class="text-sm">
              <span class="text-emerald-400 font-medium">{{ todayAdherence.totalTaken }}</span>
              <span class="text-white/40"> / {{ todayAdherence.totalScheduled }} 已服</span>
            </p>
            <p v-if="todayAdherence.totalMissed > 0" class="text-sm">
              <span class="text-red-400 font-medium">{{ todayAdherence.totalMissed }}</span>
              <span class="text-white/40"> 漏服</span>
            </p>
          </div>
        </div>
        <div class="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-1000"
            :class="{
              'bg-gradient-to-r from-emerald-500 to-green-500': todayAdherence.adherenceRate >= 80,
              'bg-gradient-to-r from-yellow-500 to-orange-500': todayAdherence.adherenceRate >= 50 && todayAdherence.adherenceRate < 80,
              'bg-gradient-to-r from-red-500 to-rose-500': todayAdherence.adherenceRate < 50
            }"
            :style="{ width: `${todayAdherence.adherenceRate}%` }"
          ></div>
        </div>
      </div>

      <div
        v-if="weekAdherence && weekAdherence.totalScheduled > 0"
        class="glass-card p-5 animate-slide-up"
        style="animation-delay: 0.42s"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold flex items-center gap-2">
            <Activity :size="18" class="text-emerald-400" />
            本周依从率
          </h3>
          <button @click="goToMedication" class="text-xs text-white/50 hover:text-white/70">
            详情 →
          </button>
        </div>
        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent"
              :class="{
                'from-emerald-400 to-green-400': weekAdherence.adherenceRate >= 80,
                'from-yellow-400 to-orange-400': weekAdherence.adherenceRate >= 50 && weekAdherence.adherenceRate < 80,
                'from-red-400 to-rose-400': weekAdherence.adherenceRate < 50
              }"
            >
              {{ weekAdherence.adherenceRate }}%
            </p>
            <p class="text-sm text-white/60 mt-0.5">坚持就是胜利 💪</p>
          </div>
          <div class="text-right space-y-1">
            <p class="text-sm">
              <span class="text-emerald-400 font-medium">{{ weekAdherence.totalTaken }}</span>
              <span class="text-white/40"> / {{ weekAdherence.totalScheduled }} 已服</span>
            </p>
            <p v-if="weekAdherence.totalMissed > 0" class="text-sm">
              <span class="text-red-400 font-medium">{{ weekAdherence.totalMissed }}</span>
              <span class="text-white/40"> 漏服</span>
            </p>
          </div>
        </div>
        <div class="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-1000"
            :class="{
              'bg-gradient-to-r from-emerald-500 to-green-500': weekAdherence.adherenceRate >= 80,
              'bg-gradient-to-r from-yellow-500 to-orange-500': weekAdherence.adherenceRate >= 50 && weekAdherence.adherenceRate < 80,
              'bg-gradient-to-r from-red-500 to-rose-500': weekAdherence.adherenceRate < 50
            }"
            :style="{ width: `${weekAdherence.adherenceRate}%` }"
          ></div>
        </div>
      </div>
    </div>

    <div
      class="glass-card p-6 mb-8 cursor-pointer animate-slide-up"
      style="animation-delay: 0.45s"
      @click="goToRecord"
    >
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold mb-2">记录今日疼痛</h2>
          <p class="text-white/60 text-sm">记录部位、程度、诱因等详细信息</p>
        </div>
        <button class="btn-primary flex items-center gap-2">
          <Plus :size="20" />
          快速记录
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
      <div
        class="glass-card-hover p-5 cursor-pointer animate-slide-up"
        style="animation-delay: 0.5s"
        @click="goToBody"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Target :size="20" />
          </div>
          <h3 class="font-bold">部位标注</h3>
        </div>
        <p class="text-sm text-white/60">交互式人体图，精准标注疼痛位置</p>
      </div>

      <div
        class="glass-card-hover p-5 cursor-pointer animate-slide-up"
        style="animation-delay: 0.55s"
        @click="goToTrends"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
            <TrendingUp :size="20" />
          </div>
          <h3 class="font-bold">趋势分析</h3>
        </div>
        <p class="text-sm text-white/60">查看周/月疼痛趋势图表</p>
      </div>

      <div
        class="glass-card-hover p-5 cursor-pointer animate-slide-up"
        style="animation-delay: 0.6s"
        @click="goToMedication"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Pill :size="20" />
          </div>
          <h3 class="font-bold">用药管理</h3>
        </div>
        <p class="text-sm text-white/60">管理用药计划与服药提醒</p>
      </div>

      <div
        class="glass-card-hover p-5 cursor-pointer animate-slide-up"
        style="animation-delay: 0.65s"
        @click="goToHistory"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Calendar :size="20" />
          </div>
          <h3 class="font-bold">历史记录</h3>
        </div>
        <p class="text-sm text-white/60">查看和管理所有历史记录</p>
      </div>

      <div
        class="glass-card-hover p-5 cursor-pointer animate-slide-up"
        style="animation-delay: 0.7s"
        @click="router.push('/report')"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
            <FileText :size="20" />
          </div>
          <h3 class="font-bold">月度报告</h3>
        </div>
        <p class="text-sm text-white/60">月度健康报告与就医摘要</p>
      </div>

      <div
        class="glass-card-hover p-5 cursor-pointer animate-slide-up"
        style="animation-delay: 0.72s"
        @click="router.push('/consultation-report')"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
            <Stethoscope :size="20" />
          </div>
          <h3 class="font-bold">就诊报告</h3>
        </div>
        <p class="text-sm text-white/60">汇总疼痛趋势、用药依从与部位分布</p>
      </div>

      <div
        class="glass-card-hover p-5 cursor-pointer animate-slide-up"
        style="animation-delay: 0.75s"
        @click="router.push('/settings')"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
            <Activity :size="20" />
          </div>
          <h3 class="font-bold">设置</h3>
        </div>
        <p class="text-sm text-white/60">数据导出、清除等管理功能</p>
      </div>
    </div>

    <div
      v-if="weekStats.totalRecords > 0"
      class="glass-card p-5 animate-slide-up"
      style="animation-delay: 0.75s"
    >
      <h3 class="font-bold mb-3 flex items-center gap-2">
        <Droplets :size="18" class="text-blue-400" />
        本周疼痛概览
      </h3>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            {{ weekStats.avgPain || 0 }}
          </p>
          <p class="text-sm text-white/60">平均疼痛程度</p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold">{{ weekStats.totalRecords }}</p>
          <p class="text-sm text-white/60">总记录次数</p>
        </div>
      </div>
      <div class="mt-4">
        <div class="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000"
            :style="{ width: `${Math.min((weekStats.avgPain / 10) * 100, 100)}%` }"
          ></div>
        </div>
      </div>
    </div>

    <div
      v-else-if="!isLoading"
      class="glass-card p-8 text-center animate-slide-up"
      style="animation-delay: 0.75s"
    >
      <div class="text-5xl mb-4">📝</div>
      <h3 class="text-lg font-bold mb-2">开始记录</h3>
      <p class="text-white/60 text-sm mb-4">记录您的第一次疼痛数据，开始追踪健康状况</p>
      <button class="btn-primary" @click="goToRecord">开始记录</button>
    </div>
  </div>
</template>
