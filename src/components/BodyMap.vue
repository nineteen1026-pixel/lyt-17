<script setup lang="ts">
import { computed } from 'vue';
import { BODY_PARTS } from '@/types';

const props = defineProps<{
  selectedParts: string[];
  showLabels?: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle', part: string): void;
}>();

const bodyRegions = computed(() => [
  { id: '头部', x: 50, y: 8, r: 12 },
  { id: '颈部', x: 50, y: 22, r: 6 },
  { id: '肩膀', x: 35, y: 30, r: 8 },
  { id: '肩膀', x: 65, y: 30, r: 8 },
  { id: '手臂', x: 22, y: 42, r: 7 },
  { id: '手臂', x: 78, y: 42, r: 7 },
  { id: '肘部', x: 18, y: 55, r: 6 },
  { id: '肘部', x: 82, y: 55, r: 6 },
  { id: '手腕', x: 15, y: 68, r: 6 },
  { id: '手腕', x: 85, y: 68, r: 6 },
  { id: '胸部', x: 50, y: 38, r: 10 },
  { id: '背部', x: 50, y: 48, r: 10 },
  { id: '腹部', x: 50, y: 58, r: 9 },
  { id: '腰部', x: 40, y: 68, r: 7 },
  { id: '腰部', x: 60, y: 68, r: 7 },
  { id: '髋部', x: 38, y: 76, r: 8 },
  { id: '髋部', x: 62, y: 76, r: 8 },
  { id: '大腿', x: 38, y: 85, r: 8 },
  { id: '大腿', x: 62, y: 85, r: 8 },
  { id: '膝盖', x: 38, y: 93, r: 6 },
  { id: '膝盖', x: 62, y: 93, r: 6 },
  { id: '小腿', x: 38, y: 102, r: 6 },
  { id: '小腿', x: 62, y: 102, r: 6 },
  { id: '脚踝', x: 38, y: 112, r: 5 },
  { id: '脚踝', x: 62, y: 112, r: 5 },
  { id: '脚部', x: 38, y: 120, r: 6 },
  { id: '脚部', x: 62, y: 120, r: 6 }
]);

const isSelected = (part: string) => props.selectedParts.includes(part);

const getPartColor = (part: string) => {
  const count = props.selectedParts.filter(p => p === part).length;
  if (count === 0) return 'rgba(255,255,255,0.3)';
  if (count === 1) return 'rgba(59, 130, 246, 0.6)';
  return 'rgba(239, 68, 68, 0.7)';
};

const handleClick = (part: string) => {
  emit('toggle', part);
};

const uniqueParts = [...new Set(BODY_PARTS)];
</script>

<template>
  <div class="w-full max-w-md mx-auto">
    <div class="glass-card p-6">
      <div class="relative">
        <svg viewBox="0 0 120 140" class="w-full h-auto">
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:rgba(255,255,255,0.15)" />
              <stop offset="100%" style="stop-color:rgba(255,255,255,0.05)" />
            </linearGradient>
          </defs>
          
          <path
            d="M50,5 Q60,5 62,12 Q65,20 60,25 L60,30
               L75,30 Q85,32 87,40 L82,60 L78,72 L75,80
               L72,95 L68,110 L65,120 L62,128
               Q60,132 55,130 Q50,128 45,130
               Q40,132 38,128 L35,120 L32,110
               L28,95 L25,80 L22,72 L18,60
               L13,40 Q15,32 25,30 L40,30
               L40,25 Q35,20 38,12 Q40,5 50,5 Z"
            fill="url(#bodyGradient)"
            stroke="rgba(255,255,255,0.3)"
            stroke-width="0.5"
          />
          
          <g
            v-for="(region, index) in bodyRegions"
            :key="`${region.id}-${index}`"
            @click="handleClick(region.id)"
            class="cursor-pointer transition-all duration-300"
          >
            <circle
              :cx="region.x"
              :cy="region.y"
              :r="region.r"
              :fill="getPartColor(region.id)"
              :stroke="isSelected(region.id) ? '#10b981' : 'rgba(255,255,255,0.4)'"
              :stroke-width="isSelected(region.id) ? 1.5 : 0.5"
              class="transition-all duration-300 hover:opacity-80"
            />
            <text
              v-if="showLabels"
              :x="region.x"
              :y="region.y + 0.5"
              text-anchor="middle"
              dominant-baseline="middle"
              fill="white"
              font-size="3"
              class="pointer-events-none"
            >
              {{ isSelected(region.id) ? '✓' : '' }}
            </text>
          </g>
        </svg>
      </div>
      
      <div class="mt-6">
        <p class="text-sm text-white/60 mb-3">已选择部位：</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="part in uniqueParts"
            :key="part"
            @click="handleClick(part)"
            class="tag text-xs"
            :class="{ 'tag-active': isSelected(part) }"
          >
            {{ part }}
            <span v-if="isSelected(part)" class="ml-1 text-xs">
              ({{ selectedParts.filter(p => p === part).length }})
            </span>
          </span>
        </div>
        <p v-if="selectedParts.length === 0" class="text-sm text-white/40 mt-2">
          点击上图或下方标签选择疼痛部位
        </p>
      </div>
    </div>
  </div>
</template>
