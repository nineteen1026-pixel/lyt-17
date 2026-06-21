<script setup lang="ts">
import { ref } from 'vue';
import { Plus, X } from 'lucide-vue-next';

const props = defineProps<{
  tags: string[];
  selectedTags: string[];
  allowCustom?: boolean;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'toggle', tag: string): void;
  (e: 'add', tag: string): void;
}>();

const customInput = ref('');
const showCustomInput = ref(false);

const isSelected = (tag: string) => props.selectedTags.includes(tag);

const toggleTag = (tag: string) => {
  emit('toggle', tag);
};

const addCustomTag = () => {
  const tag = customInput.value.trim();
  if (tag && !props.tags.includes(tag) && !props.selectedTags.includes(tag)) {
    emit('add', tag);
    emit('toggle', tag);
  }
  customInput.value = '';
  showCustomInput.value = false;
};
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="tag in tags"
        :key="tag"
        @click="toggleTag(tag)"
        class="tag"
        :class="{ 'tag-active': isSelected(tag) }"
      >
        {{ tag }}
        <span v-if="isSelected(tag)" class="ml-1">✓</span>
      </button>
      
      <button
        v-if="allowCustom && !showCustomInput"
        @click="showCustomInput = true"
        class="tag flex items-center gap-1"
      >
        <Plus :size="14" />
        自定义
      </button>
      
      <div v-if="showCustomInput" class="flex items-center gap-2">
        <input
          v-model="customInput"
          type="text"
          :placeholder="placeholder || '输入自定义标签'"
          class="input-field py-1.5 px-3 text-sm w-32"
          @keyup.enter="addCustomTag"
          @blur="showCustomInput = false"
          autofocus
        />
        <button
          @click.stop="showCustomInput = false"
          class="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X :size="16" />
        </button>
      </div>
    </div>
    
    <p v-if="selectedTags.length === 0" class="text-sm text-white/40 mt-3">
      点击选择相关标签（可多选）
    </p>
  </div>
</template>
