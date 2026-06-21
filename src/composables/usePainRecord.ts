import { reactive, computed, toRefs } from 'vue';
import { useIndexedDB } from './useIndexedDB';
import { useWeather } from './useWeather';
import type { PainRecord, Medication, Exercise, Weather, FullRecord } from '@/types';
import { formatDate, formatDateTime } from '@/utils/date';

interface PainRecordState {
  currentRecord: Partial<PainRecord>;
  currentMedications: Medication[];
  currentExercises: Exercise[];
  currentWeather: Weather | null;
  isLoading: boolean;
  isSaving: boolean;
}

export function usePainRecord() {
  const db = useIndexedDB();
  const weatherApi = useWeather();

  const state = reactive<PainRecordState>({
    currentRecord: {
      painLevel: 5,
      bodyParts: [],
      triggers: [],
      notes: ''
    },
    currentMedications: [],
    currentExercises: [],
    currentWeather: null,
    isLoading: false,
    isSaving: false
  });

  const initNewRecord = () => {
    state.currentRecord = {
      painLevel: 5,
      bodyParts: [],
      triggers: [],
      notes: ''
    };
    state.currentMedications = [];
    state.currentExercises = [];
    state.currentWeather = null;
  };

  const loadWeather = async () => {
    try {
      const weather = await weatherApi.fetchWeather();
      if (weather) {
        state.currentWeather = weather;
      }
    } catch (error) {
      console.warn('加载天气失败:', error);
    }
  };

  const saveRecord = async (): Promise<number | null> => {
    if (!state.currentRecord.bodyParts || state.currentRecord.bodyParts.length === 0) {
      throw new Error('请至少选择一个疼痛部位');
    }

    state.isSaving = true;
    try {
      const now = new Date();
      const recordData: Omit<PainRecord, 'id'> = {
        date: formatDate(now),
        timestamp: formatDateTime(now),
        painLevel: state.currentRecord.painLevel ?? 5,
        bodyParts: state.currentRecord.bodyParts ?? [],
        triggers: state.currentRecord.triggers ?? [],
        notes: state.currentRecord.notes,
        createdAt: formatDateTime(now),
        updatedAt: formatDateTime(now)
      };

      const recordId = await db.addPainRecord(recordData);

      for (const med of state.currentMedications) {
        await db.addMedication({ ...med, recordId });
      }

      for (const ex of state.currentExercises) {
        await db.addExercise({ ...ex, recordId });
      }

      if (state.currentWeather) {
        await db.addWeather({ ...state.currentWeather, recordId });
      }

      return recordId;
    } finally {
      state.isSaving = false;
    }
  };

  const getFullRecord = async (recordId: number): Promise<FullRecord | null> => {
    const record = await db.getPainRecord(recordId);
    if (!record) return null;

    const medications = await db.getMedicationsByRecordId(recordId);
    const exercises = await db.getExercisesByRecordId(recordId);
    const weather = await db.getWeatherByRecordId(recordId);

    return {
      ...record,
      medications,
      exercises,
      weather
    };
  };

  const getAllFullRecords = async (): Promise<FullRecord[]> => {
    state.isLoading = true;
    try {
      const records = await db.getAllPainRecords();
      const fullRecords: FullRecord[] = [];

      for (const record of records.sort((a, b) => b.timestamp.localeCompare(a.timestamp))) {
        const medications = await db.getMedicationsByRecordId(record.id!);
        const exercises = await db.getExercisesByRecordId(record.id!);
        const weather = await db.getWeatherByRecordId(record.id!);
        
        fullRecords.push({
          ...record,
          medications,
          exercises,
          weather
        });
      }

      return fullRecords;
    } finally {
      state.isLoading = false;
    }
  };

  const getRecordsByDateRange = async (startDate: string, endDate: string): Promise<FullRecord[]> => {
    state.isLoading = true;
    try {
      const records = await db.getPainRecordsByDateRange(startDate, endDate);
      const fullRecords: FullRecord[] = [];

      for (const record of records) {
        const medications = await db.getMedicationsByRecordId(record.id!);
        const exercises = await db.getExercisesByRecordId(record.id!);
        const weather = await db.getWeatherByRecordId(record.id!);
        
        fullRecords.push({
          ...record,
          medications,
          exercises,
          weather
        });
      }

      return fullRecords;
    } finally {
      state.isLoading = false;
    }
  };

  const deleteRecord = async (recordId: number): Promise<void> => {
    await db.deletePainRecord(recordId);
  };

  const addMedication = (med: Omit<Medication, 'id' | 'recordId'>) => {
    state.currentMedications.push({
      ...med,
      id: Date.now(),
      recordId: 0
    });
  };

  const removeMedication = (index: number) => {
    state.currentMedications.splice(index, 1);
  };

  const addExercise = (ex: Omit<Exercise, 'id' | 'recordId'>) => {
    state.currentExercises.push({
      ...ex,
      id: Date.now(),
      recordId: 0
    });
  };

  const removeExercise = (index: number) => {
    state.currentExercises.splice(index, 1);
  };

  const getTodayStats = async () => {
    const today = formatDate(new Date());
    const records = await db.getPainRecordsByDateRange(today, today);
    
    if (records.length === 0) {
      return {
        count: 0,
        avgPain: 0,
        maxPain: 0
      };
    }

    const avgPain = records.reduce((sum, r) => sum + r.painLevel, 0) / records.length;
    const maxPain = Math.max(...records.map(r => r.painLevel));

    return {
      count: records.length,
      avgPain: Math.round(avgPain * 10) / 10,
      maxPain
    };
  };

  const exportData = async () => {
    return await db.exportAllData();
  };

  const clearAllData = async () => {
    await db.clearAllData();
  };

  const hasBodyPart = computed(() => 
    (part: string) => state.currentRecord.bodyParts?.includes(part) ?? false
  );

  const toggleBodyPart = (part: string) => {
    if (!state.currentRecord.bodyParts) {
      state.currentRecord.bodyParts = [];
    }
    const index = state.currentRecord.bodyParts.indexOf(part);
    if (index > -1) {
      state.currentRecord.bodyParts.splice(index, 1);
    } else {
      state.currentRecord.bodyParts.push(part);
    }
  };

  const hasTrigger = computed(() => 
    (trigger: string) => state.currentRecord.triggers?.includes(trigger) ?? false
  );

  const toggleTrigger = (trigger: string) => {
    if (!state.currentRecord.triggers) {
      state.currentRecord.triggers = [];
    }
    const index = state.currentRecord.triggers.indexOf(trigger);
    if (index > -1) {
      state.currentRecord.triggers.splice(index, 1);
    } else {
      state.currentRecord.triggers.push(trigger);
    }
  };

  return {
    ...toRefs(state),
    initNewRecord,
    loadWeather,
    saveRecord,
    getFullRecord,
    getAllFullRecords,
    getRecordsByDateRange,
    deleteRecord,
    addMedication,
    removeMedication,
    addExercise,
    removeExercise,
    getTodayStats,
    exportData,
    clearAllData,
    hasBodyPart,
    toggleBodyPart,
    hasTrigger,
    toggleTrigger
  };
}
