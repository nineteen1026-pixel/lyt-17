<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ArrowLeft, Save, Pill, Activity, Cloud, Plus, X, Check } from 'lucide-vue-next';
import { usePainRecord } from '@/composables/usePainRecord';
import BodyMap from '@/components/BodyMap.vue';
import PainSlider from '@/components/PainSlider.vue';
import TagSelector from '@/components/TagSelector.vue';
import { TRIGGERS, EXERCISE_TYPES } from '@/types';
import { formatTime } from '@/utils/date';

const router = useRouter();
const route = useRoute();
const {
  currentRecord,
  currentMedications,
  currentExercises,
  currentWeather,
  isSaving,
  isLoading,
  isEditing,
  initNewRecord,
  loadRecordForEdit,
  loadWeather,
  saveRecord: doSaveRecord,
  updateRecord: doUpdateRecord,
  toggleBodyPart,
  toggleTrigger,
  addMedication: doAddMedication,
  removeMedication: doRemoveMedication,
  addExercise: doAddExercise,
  removeExercise: doRemoveExercise
} = usePainRecord();

const activeSection = ref<'body' | 'level' | 'triggers' | 'medication' | 'exercise' | 'notes'>('body');
const saveSuccess = ref(false);
const errorMessage = ref('');
const loadError = ref(false);

const pageTitle = computed(() => isEditing.value ? '编辑疼痛记录' : '记录疼痛');
const saveButtonText = computed(() => {
  if (isSaving.value) return isEditing.value ? '保存中...' : '保存中...';
  return isEditing.value ? '保存修改' : '保存记录';
});

const newMedication = ref({
  name: '',
  dosage: '',
  time: formatTime(new Date()),
  notes: ''
});

const newExercise = ref({
  type: '',
  duration: 30,
  intensity: 'medium' as 'low' | 'medium' | 'high',
  notes: ''
});

const customTriggers = ref<string[]>([]);
const allTriggers = ref([...TRIGGERS]);

const customExerciseTypes = ref<string[]>([]);
const allExerciseTypes = ref([...EXERCISE_TYPES]);
const showCustomExerciseTypeInput = ref(false);
const customExerciseTypeInput = ref('');

const addCustomExerciseType = () => {
  const t = customExerciseTypeInput.value.trim();
  if (!t) return;
  if (!EXERCISE_TYPES.includes(t) && !customExerciseTypes.value.includes(t)) {
    customExerciseTypes.value.push(t);
    allExerciseTypes.value.push(t);
  }
  newExercise.value.type = t;
  customExerciseTypeInput.value = '';
  showCustomExerciseTypeInput.value = false;
};

onMounted(async () => {
  const recordId = route.params.recordId;
  if (recordId) {
    const success = await loadRecordForEdit(Number(recordId));
    if (!success) {
      loadError.value = true;
      return;
    }
    const extraTriggers = (currentRecord.value.triggers || []).filter(t => !TRIGGERS.includes(t));
    for (const t of extraTriggers) {
      if (!customTriggers.value.includes(t)) {
        customTriggers.value.push(t);
        allTriggers.value.push(t);
      }
    }
    const extraExTypes = currentExercises.value.map(e => e.type).filter(t => t && !EXERCISE_TYPES.includes(t));
    for (const t of extraExTypes) {
      if (!customExerciseTypes.value.includes(t)) {
        customExerciseTypes.value.push(t);
        allExerciseTypes.value.push(t);
      }
    }
  } else {
    initNewRecord();
    loadWeather();
  }
});

const goBack = () => {
  router.back();
};

const handleTogglePart = (part: string) => {
  toggleBodyPart(part);
};

const handleToggleTrigger = (trigger: string) => {
  toggleTrigger(trigger);
};

const handleAddCustomTrigger = (trigger: string) => {
  if (!customTriggers.value.includes(trigger)) {
    customTriggers.value.push(trigger);
    allTriggers.value.push(trigger);
  }
};

const addMedication = () => {
  if (newMedication.value.name.trim()) {
    doAddMedication({ ...newMedication.value });
    newMedication.value = {
      name: '',
      dosage: '',
      time: formatTime(new Date()),
      notes: ''
    };
  }
};

const removeMedication = (index: number) => {
  doRemoveMedication(index);
};

const addExercise = () => {
  if (newExercise.value.type.trim() && newExercise.value.duration > 0) {
    const t = newExercise.value.type.trim();
    if (t && !EXERCISE_TYPES.includes(t) && !customExerciseTypes.value.includes(t)) {
      customExerciseTypes.value.push(t);
      allExerciseTypes.value.push(t);
    }
    doAddExercise({ ...newExercise.value });
    newExercise.value = {
      type: '',
      duration: 30,
      intensity: 'medium',
      notes: ''
    };
  }
};

const removeExercise = (index: number) => {
  doRemoveExercise(index);
};

const saveRecord = async () => {
  errorMessage.value = '';
  try {
    if (isEditing.value) {
      const success = await doUpdateRecord();
      if (success) {
        saveSuccess.value = true;
        setTimeout(() => {
          router.push('/history');
        }, 1500);
      }
    } else {
      const recordId = await doSaveRecord();
      if (recordId) {
        saveSuccess.value = true;
        setTimeout(() => {
          router.push('/history');
        }, 1500);
      }
    }
  } catch (e: any) {
    errorMessage.value = e.message || '保存失败，请重试';
  }
};

const sections = [
  { id: 'body', label: '部位', icon: '📍' },
  { id: 'level', label: '程度', icon: '📊' },
  { id: 'triggers', label: '诱因', icon: '🔍' },
  { id: 'medication', label: '用药', icon: '💊' },
  { id: 'exercise', label: '运动', icon: '🏃' },
  { id: 'notes', label: '备注', icon: '📝' }
];
</script>

<template>
  <div class="page-container animate-fade-in">
    <div class="flex items-center justify-between mb-6">
      <button @click="goBack" class="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
        <ArrowLeft :size="20" />
        返回
      </button>
      <h1 class="text-xl font-bold">{{ pageTitle }}</h1>
      <div class="w-16"></div>
    </div>

    <div v-if="isLoading" class="glass-card p-12 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-white/60">加载记录中...</p>
      </div>
    </div>

    <div v-else-if="loadError" class="glass-card p-12 text-center">
      <div class="text-6xl mb-4">⚠️</div>
      <h3 class="text-xl font-bold mb-2">加载失败</h3>
      <p class="text-white/60 mb-6">无法加载该记录，可能已被删除</p>
      <button @click="router.push('/history')" class="btn-primary">返回历史记录</button>
    </div>

    <div v-else-if="saveSuccess" class="glass-card p-8 text-center mb-6 animate-bounce-subtle">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
        <Check :size="32" />
      </div>
      <h2 class="text-xl font-bold mb-2">{{ isEditing ? '修改成功！' : '保存成功！' }}</h2>
      <p class="text-white/60">正在跳转到历史记录...</p>
    </div>

    <div v-else>
      <div v-if="currentWeather" class="glass-card p-4 mb-6 animate-slide-up">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Cloud :size="24" class="text-blue-400" />
            <div>
              <p class="text-sm text-white/60">{{ isEditing ? '记录时天气' : '当前天气' }}</p>
              <p class="font-medium">
                {{ currentWeather.condition }} · 
                {{ currentWeather.temperature }}℃ · 
                湿度 {{ currentWeather.humidity }}%
              </p>
            </div>
          </div>
          <span class="text-xs text-white/40">{{ isEditing ? '存档天气' : '自动记录' }}</span>
        </div>
      </div>

      <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          v-for="section in sections"
          :key="section.id"
          @click="activeSection = section.id as any"
          class="flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all"
          :class="activeSection === section.id
            ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg'
            : 'bg-white/10 text-white/60 hover:bg-white/20'"
        >
          <span>{{ section.icon }}</span>
          <span class="text-sm font-medium">{{ section.label }}</span>
        </button>
      </div>

      <div v-show="activeSection === 'body'" class="animate-fade-in">
        <h2 class="section-title">📍 疼痛部位</h2>
        <BodyMap
          :selected-parts="currentRecord.bodyParts || []"
          :show-labels="true"
          @toggle="handleTogglePart"
        />
      </div>

      <div v-show="activeSection === 'level'" class="animate-fade-in">
        <h2 class="section-title">📊 疼痛程度</h2>
        <PainSlider v-model="currentRecord.painLevel!" />
      </div>

      <div v-show="activeSection === 'triggers'" class="animate-fade-in">
        <div class="glass-card p-6">
          <h2 class="section-title">🔍 可能诱因</h2>
          <TagSelector
            :tags="allTriggers"
            :selected-tags="currentRecord.triggers || []"
            :allow-custom="true"
            placeholder="输入自定义诱因"
            @toggle="handleToggleTrigger"
            @add="handleAddCustomTrigger"
          />
        </div>
      </div>

      <div v-show="activeSection === 'medication'" class="animate-fade-in">
        <div class="glass-card p-6">
          <h2 class="section-title flex items-center gap-2">
            <Pill :size="20" />
            用药记录
          </h2>

          <div v-if="currentMedications.length > 0" class="mb-6 space-y-3">
            <div
              v-for="(med, index) in currentMedications"
              :key="index"
              class="bg-white/5 p-4 rounded-xl"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 space-y-2">
                  <input
                    v-model="med.name"
                    type="text"
                    placeholder="药物名称"
                    class="input-field text-sm"
                  />
                  <div class="grid grid-cols-2 gap-2">
                    <input
                      v-model="med.dosage"
                      type="text"
                      placeholder="剂量"
                      class="input-field text-sm"
                    />
                    <input
                      v-model="med.time"
                      type="time"
                      class="input-field text-sm"
                    />
                  </div>
                  <input
                    v-model="med.notes"
                    type="text"
                    placeholder="备注（可选）"
                    class="input-field text-sm"
                  />
                </div>
                <button
                  @click="removeMedication(index)"
                  class="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors shrink-0"
                >
                  <X :size="18" />
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <input
              v-model="newMedication.name"
              type="text"
              placeholder="药物名称"
              class="input-field"
            />
            <div class="grid grid-cols-2 gap-3">
              <input
                v-model="newMedication.dosage"
                type="text"
                placeholder="剂量（如：1片）"
                class="input-field"
              />
              <input
                v-model="newMedication.time"
                type="time"
                class="input-field"
              />
            </div>
            <input
              v-model="newMedication.notes"
              type="text"
              placeholder="备注（可选）"
              class="input-field"
            />
            <button
              @click="addMedication"
              class="btn-secondary w-full flex items-center justify-center gap-2"
              :disabled="!newMedication.name.trim()"
            >
              <Plus :size="18" />
              添加药物
            </button>
          </div>
        </div>
      </div>

      <div v-show="activeSection === 'exercise'" class="animate-fade-in">
        <div class="glass-card p-6">
          <h2 class="section-title flex items-center gap-2">
            <Activity :size="20" />
            运动情况
          </h2>

          <div v-if="currentExercises.length > 0" class="mb-6 space-y-3">
            <div
              v-for="(ex, index) in currentExercises"
              :key="index"
              class="bg-white/5 p-4 rounded-xl"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 space-y-2">
                  <select v-model="ex.type" class="input-field text-sm">
                    <option value="" disabled>选择运动类型</option>
                    <option v-for="type in allExerciseTypes" :key="type" :value="type">{{ type }}</option>
                  </select>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-xs text-white/60 mb-1 block">时长（分钟）</label>
                      <input
                        v-model.number="ex.duration"
                        type="number"
                        min="1"
                        class="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label class="text-xs text-white/60 mb-1 block">强度</label>
                      <select v-model="ex.intensity" class="input-field text-sm">
                        <option value="low">低强度</option>
                        <option value="medium">中等强度</option>
                        <option value="high">高强度</option>
                      </select>
                    </div>
                  </div>
                  <input
                    v-model="ex.notes"
                    type="text"
                    placeholder="感受或备注（可选）"
                    class="input-field text-sm"
                  />
                </div>
                <button
                  @click="removeExercise(index)"
                  class="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors shrink-0"
                >
                  <X :size="18" />
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <select v-model="newExercise.type" class="input-field">
              <option value="" disabled>选择运动类型</option>
              <option v-for="type in allExerciseTypes" :key="type" :value="type">{{ type }}</option>
            </select>
            <div v-if="showCustomExerciseTypeInput" class="flex gap-2">
              <input
                v-model="customExerciseTypeInput"
                type="text"
                placeholder="输入自定义运动类型"
                class="input-field flex-1 text-sm"
                @keyup.enter="addCustomExerciseType()"
              />
              <button
                @click="addCustomExerciseType()"
                class="btn-secondary px-3 text-sm"
                :disabled="!customExerciseTypeInput.trim()"
              >
                添加
              </button>
              <button
                @click="showCustomExerciseTypeInput = false; customExerciseTypeInput = ''"
                class="btn-secondary px-3 text-sm"
              >
                取消
              </button>
            </div>
            <button
              v-else
              @click="showCustomExerciseTypeInput = true"
              class="text-xs text-blue-300 hover:text-blue-200 self-start"
            >
              找不到类型？点击添加自定义运动
            </button>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm text-white/60 mb-1 block">时长（分钟）</label>
                <input
                  v-model.number="newExercise.duration"
                  type="number"
                  min="1"
                  class="input-field"
                />
              </div>
              <div>
                <label class="text-sm text-white/60 mb-1 block">强度</label>
                <select v-model="newExercise.intensity" class="input-field">
                  <option value="low">低强度</option>
                  <option value="medium">中等强度</option>
                  <option value="high">高强度</option>
                </select>
              </div>
            </div>
            <input
              v-model="newExercise.notes"
              type="text"
              placeholder="感受或备注（可选）"
              class="input-field"
            />
            <button
              @click="addExercise"
              class="btn-secondary w-full flex items-center justify-center gap-2"
              :disabled="!newExercise.type.trim() || newExercise.duration <= 0"
            >
              <Plus :size="18" />
              添加运动
            </button>
          </div>
        </div>
      </div>

      <div v-show="activeSection === 'notes'" class="animate-fade-in">
        <div class="glass-card p-6">
          <h2 class="section-title">📝 备注</h2>
          <textarea
            v-model="currentRecord.notes"
            placeholder="记录其他相关信息..."
            rows="6"
            class="input-field resize-none"
          ></textarea>
        </div>
      </div>

      <div v-if="errorMessage" class="mt-4 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
        {{ errorMessage }}
      </div>

      <div class="mt-6 flex gap-3">
        <button @click="goBack" class="btn-secondary flex-1">
          取消
        </button>
        <button
          @click="saveRecord"
          class="btn-primary flex-1 flex items-center justify-center gap-2"
          :disabled="isSaving || !currentRecord.bodyParts?.length"
        >
          <Save :size="18" />
          {{ saveButtonText }}
        </button>
      </div>

      <p v-if="!currentRecord.bodyParts?.length" class="text-center text-sm text-white/40 mt-3">
        请至少选择一个疼痛部位
      </p>
    </div>
  </div>
</template>
