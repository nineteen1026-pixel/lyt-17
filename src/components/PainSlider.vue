<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const painLevel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const painEmoji = computed(() => {
  const level = props.modelValue;
  if (level <= 2) return '😊';
  if (level <= 4) return '🙂';
  if (level <= 6) return '😐';
  if (level <= 8) return '😣';
  return '😫';
});

const painDescription = computed(() => {
  const level = props.modelValue;
  if (level === 0) return '无痛';
  if (level <= 3) return '轻度疼痛，不影响日常活动';
  if (level <= 5) return '中度疼痛，部分影响活动';
  if (level <= 7) return '较重疼痛，明显影响活动';
  if (level <= 9) return '重度疼痛，难以进行活动';
  return '剧烈疼痛，无法忍受';
});

const painColor = computed(() => {
  const level = props.modelValue;
  if (level <= 3) return 'from-emerald-400 to-green-500';
  if (level <= 6) return 'from-yellow-400 to-orange-500';
  return 'from-orange-500 to-red-600';
});
</script>

<template>
  <div class="glass-card p-6">
    <div class="text-center mb-6">
      <div class="text-6xl mb-3 transition-all duration-300" :class="{ 'animate-bounce-subtle': true }">
        {{ painEmoji }}
      </div>
      <div
        class="text-5xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent"
        :class="painColor"
      >
        {{ painLevel }}
      </div>
      <p class="text-white/70 text-sm">{{ painDescription }}</p>
    </div>
    
    <div class="px-2">
      <input
        type="range"
        v-model="painLevel"
        min="0"
        max="10"
        step="1"
        class="w-full h-2 rounded-full appearance-none cursor-pointer"
      />
      
      <div class="flex justify-between mt-3 text-xs text-white/50">
        <span>0</span>
        <span>轻微</span>
        <span>中度</span>
        <span>较重</span>
        <span>严重</span>
        <span>10</span>
      </div>
      
      <div class="flex justify-between mt-2">
        <div
          v-for="n in 11"
          :key="n - 1"
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-all duration-200"
          :class="painLevel === n - 1
            ? 'bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-lg scale-110'
            : 'bg-white/10 text-white/60 hover:bg-white/20'"
          @click="painLevel = n - 1"
        >
          {{ n - 1 }}
        </div>
      </div>
    </div>
  </div>
</template>
