<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Pill, Plus, X, Edit2, Trash2, Check, Clock, Calendar, Bell, BellOff, AlertCircle, ChevronDown } from 'lucide-vue-next';
import { useMedicationReminder } from '@/composables/useMedicationReminder';
import { formatDate, getWeekdayName } from '@/utils/date';
import type { MedicationPlan, AdherenceStats } from '@/types';

const {
  plans,
  isLoading,
  notificationPermission,
  loadPlans,
  loadTodayMedications,
  addPlan,
  updatePlan,
  deletePlan,
  togglePlanEnabled,
  enableNotifications,
  calculateAdherence
} = useMedicationReminder();

const showForm = ref(false);
const editingPlanId = ref<number | null>(null);
const saveSuccess = ref(false);
const errorMessage = ref('');
const weekStats = ref<AdherenceStats | null>(null);
const confirmDeleteId = ref<number | null>(null);

const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' }
];

const form = ref({
  name: '',
  dosage: '',
  times: ['08:00'] as string[],
  daysOfWeek: [1, 2, 3, 4, 5, 6, 0] as number[],
  startDate: formatDate(new Date()),
  endDate: '',
  notes: ''
});

const newTime = ref('12:00');

const isEditing = computed(() => editingPlanId.value !== null);
const formTitle = computed(() => isEditing.value ? '编辑用药计划' : '添加用药计划');

const resetForm = () => {
  form.value = {
    name: '',
    dosage: '',
    times: ['08:00'],
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    startDate: formatDate(new Date()),
    endDate: '',
    notes: ''
  };
  newTime.value = '12:00';
  editingPlanId.value = null;
  errorMessage.value = '';
};

const openAddForm = () => {
  resetForm();
  showForm.value = true;
};

const openEditForm = async (plan: MedicationPlan) => {
  editingPlanId.value = plan.id ?? null;
  form.value = {
    name: plan.name,
    dosage: plan.dosage,
    times: [...plan.times],
    daysOfWeek: [...plan.daysOfWeek],
    startDate: plan.startDate,
    endDate: plan.endDate || '',
    notes: plan.notes || ''
  };
  errorMessage.value = '';
  showForm.value = true;
};

const closeForm = () => {
  showForm.value = false;
  resetForm();
};

const addTime = () => {
  if (newTime.value && !form.value.times.includes(newTime.value)) {
    form.value.times.push(newTime.value);
    form.value.times.sort();
  }
};

const removeTime = (time: string) => {
  const idx = form.value.times.indexOf(time);
  if (idx > -1) {
    form.value.times.splice(idx, 1);
  }
};

const toggleDay = (day: number) => {
  const idx = form.value.daysOfWeek.indexOf(day);
  if (idx > -1) {
    if (form.value.daysOfWeek.length > 1) {
      form.value.daysOfWeek.splice(idx, 1);
    }
  } else {
    form.value.daysOfWeek.push(day);
  }
};

const isDaySelected = (day: number) => form.value.daysOfWeek.includes(day);

const handleSave = async () => {
  errorMessage.value = '';
  try {
    if (isEditing.value && editingPlanId.value) {
      await updatePlan(editingPlanId.value, { ...form.value });
    } else {
      await addPlan({ ...form.value });
    }
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
      closeForm();
    }, 1000);
  } catch (e: any) {
    errorMessage.value = e.message || '保存失败，请重试';
  }
};

const handleDelete = async (planId: number) => {
  confirmDeleteId.value = planId;
};

const confirmDelete = async () => {
  if (confirmDeleteId.value !== null) {
    await deletePlan(confirmDeleteId.value);
    confirmDeleteId.value = null;
    await loadWeekStats();
  }
};

const cancelDelete = () => {
  confirmDeleteId.value = null;
};

const handleToggleEnabled = async (plan: MedicationPlan) => {
  await togglePlanEnabled(plan.id!);
};

const handleEnableNotifications = async () => {
  await enableNotifications();
};

const loadWeekStats = async () => {
  weekStats.value = await calculateAdherence('week');
};

const getWeekdayLabels = (days: number[]) => {
  if (days.length === 7) return '每天';
  if (days.length === 0) return '未设置';
  const sorted = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  return sorted.map(d => WEEKDAY_OPTIONS.find(o => o.value === d)?.label || '').join('、');
};

const getPlanStatusLabel = (plan: MedicationPlan) => {
  const today = formatDate(new Date());
  if (plan.endDate && today > plan.endDate) return '已结束';
  if (plan.startDate && today < plan.startDate) return '未开始';
  if (!plan.enabled) return '已暂停';
  return '进行中';
};

const getPlanStatusClass = (plan: MedicationPlan) => {
  const today = formatDate(new Date());
  if (plan.endDate && today > plan.endDate) return 'text-gray-400 bg-gray-500/20';
  if (plan.startDate && today < plan.startDate) return 'text-yellow-400 bg-yellow-500/20';
  if (!plan.enabled) return 'text-gray-400 bg-gray-500/20';
  return 'text-emerald-400 bg-emerald-500/20';
};

onMounted(async () => {
  await loadPlans();
  await loadTodayMedications();
  await loadWeekStats();
});

watch(() => plans.value.length, async () => {
  await loadWeekStats();
});
</script>

<template>
  <div class="page-container animate-fade-in">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2 flex items-center gap-3">
        <Pill :size="32" class="text-purple-400" />
        用药管理
      </h1>
      <p class="text-white/60">管理用药计划，设置服药提醒</p>
    </div>

    <div v-if="notificationPermission !== 'granted'" class="glass-card p-5 mb-6 animate-slide-up border-yellow-500/30">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
          <Bell :size="20" class="text-yellow-400" />
        </div>
        <div class="flex-1">
          <h3 class="font-bold mb-1">开启通知提醒</h3>
          <p class="text-sm text-white/60 mb-3">开启浏览器通知后，将在服药时间准时推送用药提醒</p>
          <button
            v-if="notificationPermission !== 'denied'"
            @click="handleEnableNotifications"
            class="btn-primary flex items-center gap-2 text-sm py-2"
          >
            <Bell :size="16" />
            开启通知权限
          </button>
          <p v-else class="text-sm text-red-400 flex items-center gap-2">
            <AlertCircle :size="16" />
            通知权限已被拒绝，请在浏览器设置中手动开启
          </p>
        </div>
      </div>
    </div>

    <div v-if="weekStats && weekStats.totalScheduled > 0" class="glass-card p-5 mb-6 animate-slide-up">
      <h3 class="font-bold mb-4 flex items-center gap-2">
        <Calendar :size="18" class="text-blue-400" />
        本周服药依从率
      </h3>
      <div class="flex items-center justify-between mb-3">
        <div>
          <p class="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            {{ weekStats.adherenceRate }}%
          </p>
          <p class="text-sm text-white/60 mt-1">坚持服药，保持健康！</p>
        </div>
        <div class="text-right space-y-1">
          <p class="text-sm">
            <span class="text-emerald-400 font-medium">{{ weekStats.totalTaken }}</span>
            <span class="text-white/40"> / {{ weekStats.totalScheduled }} 已服用</span>
          </p>
          <p v-if="weekStats.totalMissed > 0" class="text-sm">
            <span class="text-red-400 font-medium">{{ weekStats.totalMissed }}</span>
            <span class="text-white/40"> 次漏服</span>
          </p>
        </div>
      </div>
      <div class="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-1000"
          :class="{
            'bg-gradient-to-r from-emerald-500 to-green-500': weekStats.adherenceRate >= 80,
            'bg-gradient-to-r from-yellow-500 to-orange-500': weekStats.adherenceRate >= 50 && weekStats.adherenceRate < 80,
            'bg-gradient-to-r from-red-500 to-rose-500': weekStats.adherenceRate < 50
          }"
          :style="{ width: `${weekStats.adherenceRate}%` }"
        ></div>
      </div>
    </div>

    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">用药计划</h2>
      <button
        @click="openAddForm"
        class="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm"
      >
        <Plus :size="18" />
        添加计划
      </button>
    </div>

    <div v-if="isLoading && plans.length === 0" class="glass-card p-12 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-white/60">加载中...</p>
      </div>
    </div>

    <div v-else-if="plans.length === 0" class="glass-card p-12 text-center animate-slide-up">
      <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
        <Pill :size="36" class="text-purple-400" />
      </div>
      <h3 class="text-xl font-bold mb-2">还没有用药计划</h3>
      <p class="text-white/60 mb-6">添加您的第一个用药计划，开始准时服药提醒</p>
      <button @click="openAddForm" class="btn-primary flex items-center gap-2 mx-auto">
        <Plus :size="18" />
        添加用药计划
      </button>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="glass-card-hover p-5 animate-slide-up"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                <Pill :size="20" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-lg truncate">{{ plan.name }}</h3>
                  <span :class="['text-xs px-2 py-0.5 rounded-full', getPlanStatusClass(plan)]">
                    {{ getPlanStatusLabel(plan) }}
                  </span>
                </div>
                <p v-if="plan.dosage" class="text-sm text-white/60">{{ plan.dosage }}</p>
              </div>
            </div>

            <div class="space-y-2 mt-4 pl-13">
              <div class="flex items-center gap-2 text-sm">
                <Clock :size="14" class="text-white/40 shrink-0" />
                <span class="text-white/40">服药时间：</span>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="time in plan.times"
                    :key="time"
                    class="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/80 font-mono"
                  >
                    {{ time }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <Calendar :size="14" class="text-white/40 shrink-0" />
                <span class="text-white/40">重复周期：</span>
                <span class="text-white/80">{{ getWeekdayLabels(plan.daysOfWeek) }}</span>
              </div>
              <div v-if="plan.endDate || plan.startDate !== formatDate(new Date())" class="flex items-center gap-2 text-sm">
                <Calendar :size="14" class="text-white/40 shrink-0" />
                <span class="text-white/40">有效期：</span>
                <span class="text-white/80">
                  {{ plan.startDate }}
                  <template v-if="plan.endDate"> ~ {{ plan.endDate }}</template>
                  <template v-else> 起长期有效</template>
                </span>
              </div>
              <div v-if="plan.notes" class="flex items-start gap-2 text-sm">
                <AlertCircle :size="14" class="text-white/40 shrink-0 mt-0.5" />
                <span class="text-white/60">{{ plan.notes }}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col items-end gap-2 shrink-0">
            <button
              @click="handleToggleEnabled(plan)"
              class="p-2 rounded-xl transition-all"
              :class="plan.enabled
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-white/10 text-white/40 hover:bg-white/20'"
              :title="plan.enabled ? '暂停提醒' : '启用提醒'"
            >
              <Bell v-if="plan.enabled" :size="18" />
              <BellOff v-else :size="18" />
            </button>
            <button
              @click="openEditForm(plan)"
              class="p-2 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
              title="编辑"
            >
              <Edit2 :size="18" />
            </button>
            <button
              @click="handleDelete(plan.id!)"
              class="p-2 rounded-xl bg-white/10 text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-all"
              title="删除"
            >
              <Trash2 :size="18" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showForm"
        class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
        @click.self="closeForm"
      >
        <div class="w-full max-w-lg glass-card rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold flex items-center gap-2">
              <Pill :size="22" class="text-purple-400" />
              {{ formTitle }}
            </h2>
            <button
              @click="closeForm"
              class="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all"
            >
              <X :size="22" />
            </button>
          </div>

          <div v-if="saveSuccess" class="mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center">
              <Check :size="18" />
            </div>
            <span>{{ isEditing ? '修改成功！' : '添加成功！' }}</span>
          </div>

          <div v-else class="space-y-5">
            <div>
              <label class="text-sm font-medium mb-2 block">药物名称 <span class="text-red-400">*</span></label>
              <input
                v-model="form.name"
                type="text"
                placeholder="例如：布洛芬缓释胶囊"
                class="input-field"
                maxlength="50"
              />
            </div>

            <div>
              <label class="text-sm font-medium mb-2 block">剂量</label>
              <input
                v-model="form.dosage"
                type="text"
                placeholder="例如：1片 / 5mg"
                class="input-field"
                maxlength="50"
              />
            </div>

            <div>
              <label class="text-sm font-medium mb-2 block">
                服药时间 <span class="text-red-400">*</span>
                <span class="text-white/40 font-normal">（至少 1 个）</span>
              </label>
              <div class="flex flex-wrap gap-2 mb-3">
                <div
                  v-for="time in form.times"
                  :key="time"
                  class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                >
                  <Clock :size="14" class="text-white/60" />
                  <span class="font-mono">{{ time }}</span>
                  <button
                    v-if="form.times.length > 1"
                    @click="removeTime(time)"
                    class="ml-1 p-0.5 rounded hover:bg-white/20 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <X :size="14" />
                  </button>
                </div>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="newTime"
                  type="time"
                  class="input-field flex-1"
                />
                <button
                  @click="addTime"
                  class="btn-secondary px-4"
                  :disabled="form.times.includes(newTime)"
                >
                  <Plus :size="18" />
                </button>
              </div>
            </div>

            <div>
              <label class="text-sm font-medium mb-2 block">
                重复日期 <span class="text-red-400">*</span>
              </label>
              <div class="grid grid-cols-7 gap-2">
                <button
                  v-for="opt in WEEKDAY_OPTIONS"
                  :key="opt.value"
                  @click="toggleDay(opt.value)"
                  class="py-2 rounded-xl text-sm font-medium transition-all"
                  :class="isDaySelected(opt.value)
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'"
                >
                  {{ opt.label.slice(1) }}
                </button>
              </div>
              <button
                @click="form.daysOfWeek = [1, 2, 3, 4, 5, 6, 0]"
                class="mt-2 text-xs text-purple-300 hover:text-purple-200"
              >
                选择每天
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm font-medium mb-2 block">
                  开始日期 <span class="text-red-400">*</span>
                </label>
                <input
                  v-model="form.startDate"
                  type="date"
                  class="input-field"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-2 block">结束日期</label>
                <div class="relative">
                  <input
                    v-model="form.endDate"
                    type="date"
                    class="input-field pr-10"
                  />
                  <button
                    v-if="form.endDate"
                    @click="form.endDate = ''"
                    class="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/20 text-white/40"
                  >
                    <X :size="14" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label class="text-sm font-medium mb-2 block">备注</label>
              <textarea
                v-model="form.notes"
                placeholder="例如：饭后服用 / 与温水同服"
                rows="2"
                class="input-field resize-none"
                maxlength="200"
              ></textarea>
            </div>

            <div v-if="errorMessage" class="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              {{ errorMessage }}
            </div>

            <div class="flex gap-3 pt-2">
              <button @click="closeForm" class="btn-secondary flex-1">
                取消
              </button>
              <button
                @click="handleSave"
                class="btn-primary flex-1 flex items-center justify-center gap-2"
                :disabled="!form.name.trim() || form.times.length === 0 || !form.startDate"
              >
                <Check :size="18" />
                {{ isEditing ? '保存修改' : '确认添加' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="confirmDeleteId !== null"
        class="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        @click.self="cancelDelete"
      >
        <div class="w-full max-w-sm glass-card rounded-3xl p-6 animate-slide-up">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 :size="28" class="text-red-400" />
          </div>
          <h3 class="text-xl font-bold text-center mb-2">确认删除？</h3>
          <p class="text-white/60 text-center mb-6">删除后将同时清除该药物的所有服药记录，此操作不可撤销。</p>
          <div class="flex gap-3">
            <button @click="cancelDelete" class="btn-secondary flex-1">
              取消
            </button>
            <button @click="confirmDelete" class="btn-danger flex-1">
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
