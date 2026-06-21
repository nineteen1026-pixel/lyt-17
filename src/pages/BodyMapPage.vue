<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Save } from 'lucide-vue-next';
import BodyMap from '@/components/BodyMap.vue';
import PainSlider from '@/components/PainSlider.vue';
import { usePainRecord } from '@/composables/usePainRecord';

const router = useRouter();
const {
  currentRecord,
  isSaving,
  initNewRecord,
  loadWeather,
  saveRecord,
  toggleBodyPart
} = usePainRecord();

const saveSuccess = ref(false);
const errorMessage = ref('');

onMounted(() => {
  initNewRecord();
  loadWeather();
});

const handleTogglePart = (part: string) => {
  toggleBodyPart(part);
};

const goBack = () => {
  router.back();
};

const quickSave = async () => {
  errorMessage.value = '';
  if (!currentRecord.value.bodyParts?.length) {
    errorMessage.value = '请至少选择一个疼痛部位';
    return;
  }
  try {
    const recordId = await saveRecord();
    if (recordId) {
      saveSuccess.value = true;
      setTimeout(() => {
        router.push('/history');
      }, 1500);
    }
  } catch (e: any) {
    errorMessage.value = e.message || '保存失败，请重试';
  }
};

const goToFullRecord = () => {
  router.push('/record');
};
</script>

<template>
  <div class="page-container animate-fade-in">
    <div class="flex items-center justify-between mb-6">
      <button @click="goBack" class="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
        <ArrowLeft :size="20" />
        返回
      </button>
      <h1 class="text-xl font-bold">部位标注</h1>
      <div class="w-16"></div>
    </div>

    <div v-if="saveSuccess" class="glass-card p-8 text-center mb-6 animate-bounce-subtle">
      <div class="text-6xl mb-4">✅</div>
      <h2 class="text-xl font-bold mb-2">保存成功！</h2>
      <p class="text-white/60">正在跳转到历史记录...</p>
    </div>

    <div v-else>
      <div class="mb-6">
        <h2 class="section-title">📍 选择疼痛部位</h2>
        <BodyMap
          :selected-parts="currentRecord.bodyParts || []"
          :show-labels="true"
          @toggle="handleTogglePart"
        />
      </div>

      <div class="mb-6">
        <h2 class="section-title">📊 疼痛程度</h2>
        <PainSlider v-model="currentRecord.painLevel!" />
      </div>

      <div v-if="errorMessage" class="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
        {{ errorMessage }}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <button
          @click="quickSave"
          class="btn-primary flex items-center justify-center gap-2"
          :disabled="isSaving"
        >
          <Save :size="18" />
          快速保存
        </button>
        <button @click="goToFullRecord" class="btn-secondary">
          完整记录
        </button>
      </div>

      <p class="text-center text-sm text-white/40 mt-4">
        快速保存仅记录部位和程度，点击"完整记录"可添加更多信息
      </p>
    </div>
  </div>
</template>
