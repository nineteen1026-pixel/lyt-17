<script setup lang="ts">
import { ref } from 'vue';
import { ChevronDown, ChevronUp, Trash2, Pill, Activity, Cloud, MapPin } from 'lucide-vue-next';
import type { FullRecord } from '@/types';
import { formatDisplayDateTime } from '@/utils/date';

const props = defineProps<{
  record: FullRecord;
}>();

const emit = defineEmits<{
  (e: 'delete', id: number): void;
}>();

const expanded = ref(false);

const getPainColor = (level: number) => {
  if (level <= 3) return 'text-emerald-400';
  if (level <= 6) return 'text-yellow-400';
  return 'text-red-400';
};

const getPainBgColor = (level: number) => {
  if (level <= 3) return 'from-emerald-500/20 to-emerald-500/5';
  if (level <= 6) return 'from-yellow-500/20 to-yellow-500/5';
  return 'from-red-500/20 to-red-500/5';
};

const confirmDelete = () => {
  if (confirm('确定要删除这条记录吗？此操作无法撤销。')) {
    emit('delete', props.record.id!);
  }
};
</script>

<template>
  <div class="glass-card-hover overflow-hidden">
    <div
      class="p-4 cursor-pointer"
      @click="expanded = !expanded"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-br"
              :class="[getPainColor(record.painLevel), getPainBgColor(record.painLevel)]"
            >
              {{ record.painLevel }}
            </div>
            <div>
              <p class="text-sm text-white/60">{{ formatDisplayDateTime(record.timestamp) }}</p>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="part in record.bodyParts.slice(0, 3)"
                  :key="part"
                  class="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/70"
                >
                  {{ part }}
                </span>
                <span
                  v-if="record.bodyParts.length > 3"
                  class="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/50"
                >
                  +{{ record.bodyParts.length - 3 }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-if="record.triggers.length > 0" class="flex flex-wrap gap-1 mt-2">
            <span
              v-for="trigger in record.triggers.slice(0, 4)"
              :key="trigger"
              class="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full"
            >
              {{ trigger }}
            </span>
          </div>
          
          <div class="flex items-center gap-4 mt-3 text-xs text-white/50">
            <span v-if="record.medications.length > 0" class="flex items-center gap-1">
              <Pill :size="12" />
              {{ record.medications.length }}种药
            </span>
            <span v-if="record.exercises.length > 0" class="flex items-center gap-1">
              <Activity :size="12" />
              {{ record.exercises.length }}项运动
            </span>
            <span v-if="record.weather" class="flex items-center gap-1">
              <Cloud :size="12" />
              {{ record.weather.temperature }}℃
            </span>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            @click.stop="confirmDelete"
            class="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
          >
            <Trash2 :size="18" />
          </button>
          <component
            :is="expanded ? ChevronUp : ChevronDown"
            :size="20"
            class="text-white/40"
          />
        </div>
      </div>
    </div>
    
    <div
      v-show="expanded"
      class="px-4 pb-4 border-t border-white/10 pt-4 animate-fade-in"
    >
      <div v-if="record.bodyParts.length > 0" class="mb-4">
        <p class="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
          <MapPin :size="14" />
          疼痛部位
        </p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="part in record.bodyParts"
            :key="part"
            class="tag text-xs tag-active"
          >
            {{ part }}
          </span>
        </div>
      </div>
      
      <div v-if="record.triggers.length > 0" class="mb-4">
        <p class="text-sm font-medium text-white/80 mb-2">可能诱因</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="trigger in record.triggers"
            :key="trigger"
            class="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full"
          >
            {{ trigger }}
          </span>
        </div>
      </div>
      
      <div v-if="record.notes" class="mb-4">
        <p class="text-sm font-medium text-white/80 mb-2">备注</p>
        <p class="text-sm text-white/70 bg-white/5 p-3 rounded-lg">{{ record.notes }}</p>
      </div>
      
      <div v-if="record.medications.length > 0" class="mb-4">
        <p class="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
          <Pill :size="14" />
          用药记录
        </p>
        <div class="space-y-2">
          <div
            v-for="(med, idx) in record.medications"
            :key="idx"
            class="bg-white/5 p-3 rounded-lg"
          >
            <div class="flex justify-between items-center">
              <span class="font-medium text-white/90">{{ med.name }}</span>
              <span class="text-sm text-white/50">{{ med.time }}</span>
            </div>
            <p class="text-sm text-white/60 mt-1">剂量：{{ med.dosage }}</p>
            <p v-if="med.notes" class="text-sm text-white/50 mt-1">{{ med.notes }}</p>
          </div>
        </div>
      </div>
      
      <div v-if="record.exercises.length > 0" class="mb-4">
        <p class="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
          <Activity :size="14" />
          运动记录
        </p>
        <div class="space-y-2">
          <div
            v-for="(ex, idx) in record.exercises"
            :key="idx"
            class="bg-white/5 p-3 rounded-lg"
          >
            <div class="flex justify-between items-center">
              <span class="font-medium text-white/90">{{ ex.type }}</span>
              <span class="text-sm text-white/50">
                {{ ex.duration }}分钟 · 
                <span :class="{
                  'text-emerald-400': ex.intensity === 'low',
                  'text-yellow-400': ex.intensity === 'medium',
                  'text-red-400': ex.intensity === 'high'
                }">
                  {{ ex.intensity === 'low' ? '低强度' : ex.intensity === 'medium' ? '中等强度' : '高强度' }}
                </span>
              </span>
            </div>
            <p v-if="ex.notes" class="text-sm text-white/50 mt-1">{{ ex.notes }}</p>
          </div>
        </div>
      </div>
      
      <div v-if="record.weather">
        <p class="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
          <Cloud :size="14" />
          天气情况
        </p>
        <div class="bg-white/5 p-3 rounded-lg flex flex-wrap gap-4 text-sm">
          <span class="text-white/70">城市：{{ record.weather.city }}</span>
          <span class="text-white/70">温度：{{ record.weather.temperature }}℃</span>
          <span class="text-white/70">湿度：{{ record.weather.humidity }}%</span>
          <span class="text-white/70">气压：{{ record.weather.pressure }}hPa</span>
          <span class="text-white/70">天气：{{ record.weather.condition }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
