<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Search, Filter, Trash2, Calendar } from 'lucide-vue-next';
import { usePainRecord } from '@/composables/usePainRecord';
import RecordCard from '@/components/RecordCard.vue';
import type { FullRecord } from '@/types';
import { formatDate } from '@/utils/date';

const recordService = usePainRecord();

const records = ref<FullRecord[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const filterDate = ref('');
const showDeleteConfirm = ref(false);
const deleteAllLoading = ref(false);

const loadRecords = async () => {
  isLoading.value = true;
  try {
    records.value = await recordService.getAllFullRecords();
  } finally {
    isLoading.value = false;
  }
};

const filteredRecords = () => {
  return records.value.filter(record => {
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      const matchesSearch = 
        record.bodyParts.some(p => p.includes(query)) ||
        record.triggers.some(t => t.includes(query)) ||
        record.notes?.toLowerCase().includes(query) ||
        record.medications.some(m => m.name.toLowerCase().includes(query)) ||
        record.exercises.some(e => e.type.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }
    
    if (filterDate.value) {
      if (record.date !== filterDate.value) return false;
    }
    
    return true;
  });
};

const deleteRecord = async (id: number) => {
  await recordService.deleteRecord(id);
  records.value = records.value.filter(r => r.id !== id);
};

const clearAllRecords = async () => {
  if (!confirm('确定要删除所有记录吗？此操作无法撤销！')) {
    return;
  }
  deleteAllLoading.value = true;
  try {
    await recordService.clearAllData();
    records.value = [];
    showDeleteConfirm.value = false;
  } finally {
    deleteAllLoading.value = false;
  }
};

const clearFilters = () => {
  searchQuery.value = '';
  filterDate.value = '';
};

const today = formatDate(new Date());
const weekAgo = formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

onMounted(() => {
  loadRecords();
});
</script>

<template>
  <div class="page-container animate-fade-in">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">历史记录</h1>
      <button
        v-if="records.length > 0"
        @click="showDeleteConfirm = true"
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
      >
        <Trash2 :size="16" />
        清除全部
      </button>
    </div>

    <div class="glass-card p-4 mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" :size="18" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索部位、诱因、药物..."
            class="input-field pl-10"
          />
        </div>
        <div class="flex gap-2">
          <div class="relative flex-1 md:w-40">
            <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" :size="18" />
            <input
              v-model="filterDate"
              type="date"
              class="input-field pl-10"
            />
          </div>
          <button
            @click="clearFilters"
            class="btn-secondary px-4"
            :disabled="!searchQuery && !filterDate"
          >
            清除
          </button>
        </div>
      </div>
      
      <div class="flex gap-2 mt-4">
        <span class="text-sm text-white/60 flex items-center gap-1">
          <Filter :size="14" />
          快捷筛选：
        </span>
        <button
          @click="filterDate = today"
          class="text-xs px-3 py-1 rounded-full transition-all"
          :class="filterDate === today
            ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white'
            : 'bg-white/10 text-white/60 hover:bg-white/20'"
        >
          今天
        </button>
        <button
          @click="filterDate = weekAgo"
          class="text-xs px-3 py-1 rounded-full transition-all"
          :class="filterDate === weekAgo
            ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white'
            : 'bg-white/10 text-white/60 hover:bg-white/20'"
        >
          一周前
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="glass-card p-12 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-white/60">加载记录中...</p>
      </div>
    </div>

    <div v-else-if="records.length === 0" class="glass-card p-12 text-center">
      <div class="text-6xl mb-4">📋</div>
      <h3 class="text-xl font-bold mb-2">暂无记录</h3>
      <p class="text-white/60 mb-6">还没有疼痛记录，开始记录您的第一条数据吧</p>
    </div>

    <div v-else>
      <div v-if="filteredRecords().length === 0" class="glass-card p-8 text-center mb-6">
        <p class="text-white/60">没有符合筛选条件的记录</p>
        <button @click="clearFilters" class="btn-secondary mt-4">清除筛选条件</button>
      </div>

      <div v-else class="space-y-4">
        <RecordCard
          v-for="record in filteredRecords()"
          :key="record.id"
          :record="record"
          @delete="deleteRecord"
        />
      </div>

      <p class="text-center text-sm text-white/40 mt-6">
        共 {{ records.length }} 条记录
        <span v-if="searchQuery || filterDate">，筛选后 {{ filteredRecords().length }} 条</span>
      </p>
    </div>

    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="showDeleteConfirm = false"
    >
      <div class="glass-card p-6 max-w-md w-full animate-bounce-subtle">
        <h3 class="text-xl font-bold mb-4 text-red-400">⚠️ 确认删除</h3>
        <p class="text-white/70 mb-6">
          此操作将永久删除所有记录数据，包括疼痛记录、用药、运动和天气关联数据。此操作无法撤销。
        </p>
        <div class="flex gap-3">
          <button
            @click="showDeleteConfirm = false"
            class="btn-secondary flex-1"
            :disabled="deleteAllLoading"
          >
            取消
          </button>
          <button
            @click="clearAllRecords"
            class="btn-danger flex-1"
            :disabled="deleteAllLoading"
          >
            {{ deleteAllLoading ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
