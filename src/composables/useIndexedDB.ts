import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { PainRecord, Medication, Exercise, Weather, MedicationPlan, MedicationLog } from '@/types';

export interface ExportData {
  painRecords: PainRecord[];
  medications: Medication[];
  exercises: Exercise[];
  weather: Weather[];
  medicationPlans: MedicationPlan[];
  medicationLogs: MedicationLog[];
  exportDate: string;
}

export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  details: {
    painRecords: { total: number; imported: number; skipped: number };
    medications: { total: number; imported: number; skipped: number };
    exercises: { total: number; imported: number; skipped: number };
    weather: { total: number; imported: number; skipped: number };
    medicationPlans: { total: number; imported: number; skipped: number };
    medicationLogs: { total: number; imported: number; skipped: number };
  };
}

const DB_NAME = 'pain-diary-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function initDB(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('painRecords')) {
        const painStore = db.createObjectStore('painRecords', {
          keyPath: 'id',
          autoIncrement: true
        });
        painStore.createIndex('date', 'date');
        painStore.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('medications')) {
        const medStore = db.createObjectStore('medications', {
          keyPath: 'id',
          autoIncrement: true
        });
        medStore.createIndex('recordId', 'recordId');
      }
      
      if (!db.objectStoreNames.contains('exercises')) {
        const exerciseStore = db.createObjectStore('exercises', {
          keyPath: 'id',
          autoIncrement: true
        });
        exerciseStore.createIndex('recordId', 'recordId');
      }
      
      if (!db.objectStoreNames.contains('weather')) {
        const weatherStore = db.createObjectStore('weather', {
          keyPath: 'id',
          autoIncrement: true
        });
        weatherStore.createIndex('recordId', 'recordId');
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('medicationPlans')) {
          const planStore = db.createObjectStore('medicationPlans', {
            keyPath: 'id',
            autoIncrement: true
          });
          planStore.createIndex('enabled', 'enabled');
          planStore.createIndex('startDate', 'startDate');
        }

        if (!db.objectStoreNames.contains('medicationLogs')) {
          const logStore = db.createObjectStore('medicationLogs', {
            keyPath: 'id',
            autoIncrement: true
          });
          logStore.createIndex('planId', 'planId');
          logStore.createIndex('scheduledDate', 'scheduledDate');
          logStore.createIndex('scheduledDate_scheduledTime', ['scheduledDate', 'scheduledTime']);
          logStore.createIndex('taken', 'taken');
        }
      }
    }
  });
  
  return dbPromise;
}

export function useIndexedDB() {
  const getDB = async () => await initDB();

  const addPainRecord = async (record: Omit<PainRecord, 'id'>): Promise<number> => {
    const db = await getDB();
    const id = await db.add('painRecords', record);
    return id as number;
  };

  const updatePainRecord = async (record: PainRecord): Promise<void> => {
    const db = await getDB();
    await db.put('painRecords', record);
  };

  const getPainRecord = async (id: number): Promise<PainRecord | undefined> => {
    const db = await getDB();
    return await db.get('painRecords', id);
  };

  const getAllPainRecords = async (): Promise<PainRecord[]> => {
    const db = await getDB();
    return await db.getAll('painRecords');
  };

  const getPainRecordsByDateRange = async (startDate: string, endDate: string): Promise<PainRecord[]> => {
    const db = await getDB();
    const records = await db.getAll('painRecords');
    return records.filter(r => r.date >= startDate && r.date <= endDate)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  };

  const deletePainRecord = async (id: number): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction(['painRecords', 'medications', 'exercises', 'weather'], 'readwrite');
    await tx.objectStore('painRecords').delete(id);
    await tx.objectStore('medications').index('recordId').openCursor(id).then(async function deleteCursor(cursor) {
      if (!cursor) return;
      await cursor.delete();
      return cursor.continue().then(deleteCursor);
    });
    await tx.objectStore('exercises').index('recordId').openCursor(id).then(async function deleteCursor(cursor) {
      if (!cursor) return;
      await cursor.delete();
      return cursor.continue().then(deleteCursor);
    });
    await tx.objectStore('weather').index('recordId').openCursor(id).then(async function deleteCursor(cursor) {
      if (!cursor) return;
      await cursor.delete();
      return cursor.continue().then(deleteCursor);
    });
    await tx.done;
  };

  const addMedication = async (medication: Omit<Medication, 'id'>): Promise<number> => {
    const db = await getDB();
    const id = await db.add('medications', medication);
    return id as number;
  };

  const updateMedication = async (medication: Medication): Promise<void> => {
    const db = await getDB();
    await db.put('medications', medication);
  };

  const deleteMedication = async (id: number): Promise<void> => {
    const db = await getDB();
    await db.delete('medications', id);
  };

  const deleteMedicationsByRecordId = async (recordId: number): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('medications', 'readwrite');
    await tx.objectStore('medications').index('recordId').openCursor(recordId).then(async function deleteCursor(cursor) {
      if (!cursor) return;
      await cursor.delete();
      return cursor.continue().then(deleteCursor);
    });
    await tx.done;
  };

  const getMedicationsByRecordId = async (recordId: number): Promise<Medication[]> => {
    const db = await getDB();
    const meds = await db.getAll('medications');
    return meds.filter(m => m.recordId === recordId);
  };

  const getAllMedications = async (): Promise<Medication[]> => {
    const db = await getDB();
    return await db.getAll('medications');
  };

  const addExercise = async (exercise: Omit<Exercise, 'id'>): Promise<number> => {
    const db = await getDB();
    const id = await db.add('exercises', exercise);
    return id as number;
  };

  const updateExercise = async (exercise: Exercise): Promise<void> => {
    const db = await getDB();
    await db.put('exercises', exercise);
  };

  const deleteExercise = async (id: number): Promise<void> => {
    const db = await getDB();
    await db.delete('exercises', id);
  };

  const deleteExercisesByRecordId = async (recordId: number): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('exercises', 'readwrite');
    await tx.objectStore('exercises').index('recordId').openCursor(recordId).then(async function deleteCursor(cursor) {
      if (!cursor) return;
      await cursor.delete();
      return cursor.continue().then(deleteCursor);
    });
    await tx.done;
  };

  const getExercisesByRecordId = async (recordId: number): Promise<Exercise[]> => {
    const db = await getDB();
    const exercises = await db.getAll('exercises');
    return exercises.filter(e => e.recordId === recordId);
  };

  const addWeather = async (weather: Omit<Weather, 'id'>): Promise<number> => {
    const db = await getDB();
    const id = await db.add('weather', weather);
    return id as number;
  };

  const getWeatherByRecordId = async (recordId: number): Promise<Weather | undefined> => {
    const db = await getDB();
    const weathers = await db.getAll('weather');
    return weathers.find(w => w.recordId === recordId);
  };

  const clearAllData = async (): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction(['painRecords', 'medications', 'exercises', 'weather', 'medicationPlans', 'medicationLogs'], 'readwrite');
    await tx.objectStore('painRecords').clear();
    await tx.objectStore('medications').clear();
    await tx.objectStore('exercises').clear();
    await tx.objectStore('weather').clear();
    await tx.objectStore('medicationPlans').clear();
    await tx.objectStore('medicationLogs').clear();
    await tx.done;
  };

  const exportAllData = async (): Promise<string> => {
    const db = await getDB();
    const data = {
      painRecords: await db.getAll('painRecords'),
      medications: await db.getAll('medications'),
      exercises: await db.getAll('exercises'),
      weather: await db.getAll('weather'),
      medicationPlans: await db.getAll('medicationPlans'),
      medicationLogs: await db.getAll('medicationLogs'),
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  };

  const addMedicationPlan = async (plan: Omit<MedicationPlan, 'id'>): Promise<number> => {
    const db = await getDB();
    const id = await db.add('medicationPlans', plan);
    return id as number;
  };

  const updateMedicationPlan = async (plan: MedicationPlan): Promise<void> => {
    const db = await getDB();
    await db.put('medicationPlans', plan);
  };

  const deleteMedicationPlan = async (id: number): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction(['medicationPlans', 'medicationLogs'], 'readwrite');
    await tx.objectStore('medicationPlans').delete(id);
    await tx.objectStore('medicationLogs').index('planId').openCursor(id).then(async function deleteCursor(cursor) {
      if (!cursor) return;
      await cursor.delete();
      return cursor.continue().then(deleteCursor);
    });
    await tx.done;
  };

  const getMedicationPlan = async (id: number): Promise<MedicationPlan | undefined> => {
    const db = await getDB();
    return await db.get('medicationPlans', id);
  };

  const getAllMedicationPlans = async (): Promise<MedicationPlan[]> => {
    const db = await getDB();
    const plans = await db.getAll('medicationPlans');
    return plans.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  };

  const getEnabledMedicationPlans = async (): Promise<MedicationPlan[]> => {
    const db = await getDB();
    const plans = await db.getAll('medicationPlans');
    return plans.filter(p => p.enabled).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  };

  const addMedicationLog = async (log: Omit<MedicationLog, 'id'>): Promise<number> => {
    const db = await getDB();
    const id = await db.add('medicationLogs', log);
    return id as number;
  };

  const updateMedicationLog = async (log: MedicationLog): Promise<void> => {
    const db = await getDB();
    await db.put('medicationLogs', log);
  };

  const deleteMedicationLog = async (id: number): Promise<void> => {
    const db = await getDB();
    await db.delete('medicationLogs', id);
  };

  const getMedicationLogsByDate = async (date: string): Promise<MedicationLog[]> => {
    const db = await getDB();
    const logs = await db.getAll('medicationLogs');
    return logs.filter(l => l.scheduledDate === date).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  };

  const getMedicationLogsByDateRange = async (startDate: string, endDate: string): Promise<MedicationLog[]> => {
    const db = await getDB();
    const logs = await db.getAll('medicationLogs');
    return logs.filter(l => l.scheduledDate >= startDate && l.scheduledDate <= endDate)
      .sort((a, b) => (a.scheduledDate + a.scheduledTime).localeCompare(b.scheduledDate + b.scheduledTime));
  };

  const getMedicationLogsByPlanId = async (planId: number): Promise<MedicationLog[]> => {
    const db = await getDB();
    const logs = await db.getAll('medicationLogs');
    return logs.filter(l => l.planId === planId)
      .sort((a, b) => (a.scheduledDate + a.scheduledTime).localeCompare(b.scheduledDate + b.scheduledTime));
  };

  const findMedicationLog = async (planId: number, scheduledDate: string, scheduledTime: string): Promise<MedicationLog | undefined> => {
    const db = await getDB();
    const logs = await db.getAll('medicationLogs');
    return logs.find(l => l.planId === planId && l.scheduledDate === scheduledDate && l.scheduledTime === scheduledTime);
  };

  const findMedicationLogByName = async (medicationName: string, scheduledDate: string, scheduledTime: string): Promise<MedicationLog | undefined> => {
    const db = await getDB();
    const logs = await db.getAll('medicationLogs');
    const nameLower = medicationName.trim().toLowerCase();
    return logs.find(l =>
      l.medicationName.trim().toLowerCase() === nameLower &&
      l.scheduledDate === scheduledDate &&
      l.scheduledTime === scheduledTime
    );
  };

  const validateExportData = (data: unknown): data is ExportData => {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const requiredKeys: Array<keyof ExportData> = [
      'painRecords', 'medications', 'exercises', 'weather',
      'medicationPlans', 'medicationLogs', 'exportDate'
    ];

    for (const key of requiredKeys) {
      if (!(key in data)) {
        return false;
      }
    }

    const obj = data as ExportData;

    if (!Array.isArray(obj.painRecords) ||
        !Array.isArray(obj.medications) ||
        !Array.isArray(obj.exercises) ||
        !Array.isArray(obj.weather) ||
        !Array.isArray(obj.medicationPlans) ||
        !Array.isArray(obj.medicationLogs)) {
      return false;
    }

    if (typeof obj.exportDate !== 'string') {
      return false;
    }

    for (const record of obj.painRecords) {
      if (!record.date || !record.timestamp ||
          typeof record.painLevel !== 'number' ||
          !Array.isArray(record.bodyParts) ||
          !Array.isArray(record.triggers)) {
        return false;
      }
    }

    for (const med of obj.medications) {
      if (typeof med.recordId !== 'number' || !med.name || !med.dosage || !med.time) {
        return false;
      }
    }

    for (const ex of obj.exercises) {
      if (typeof ex.recordId !== 'number' || !ex.type ||
          typeof ex.duration !== 'number' || !ex.intensity) {
        return false;
      }
    }

    for (const w of obj.weather) {
      if (typeof w.recordId !== 'number' ||
          typeof w.temperature !== 'number' ||
          typeof w.humidity !== 'number' ||
          typeof w.pressure !== 'number' ||
          !w.condition || !w.city) {
        return false;
      }
    }

    for (const plan of obj.medicationPlans) {
      if (!plan.name || !plan.dosage ||
          !Array.isArray(plan.times) ||
          !Array.isArray(plan.daysOfWeek) ||
          !plan.startDate ||
          typeof plan.enabled !== 'boolean') {
        return false;
      }
    }

    for (const log of obj.medicationLogs) {
      if (typeof log.planId !== 'number' ||
          !log.scheduledDate || !log.scheduledTime ||
          !log.medicationName || !log.dosage ||
          typeof log.taken !== 'boolean') {
        return false;
      }
    }

    return true;
  };

  const importData = async (jsonString: string): Promise<ImportResult> => {
    const result: ImportResult = {
      success: false,
      total: 0,
      imported: 0,
      skipped: 0,
      errors: [],
      details: {
        painRecords: { total: 0, imported: 0, skipped: 0 },
        medications: { total: 0, imported: 0, skipped: 0 },
        exercises: { total: 0, imported: 0, skipped: 0 },
        weather: { total: 0, imported: 0, skipped: 0 },
        medicationPlans: { total: 0, imported: 0, skipped: 0 },
        medicationLogs: { total: 0, imported: 0, skipped: 0 }
      }
    };

    try {
      const parsed = JSON.parse(jsonString);

      if (!validateExportData(parsed)) {
        result.errors.push('数据格式无效，请确保是正确的导出文件');
        return result;
      }

      const data = parsed as ExportData;
      const db = await getDB();
      const tx = db.transaction(
        ['painRecords', 'medications', 'exercises', 'weather', 'medicationPlans', 'medicationLogs'],
        'readwrite'
      );

      const idMapping: Record<string, number> = {};

      const existingPainTimestamps = new Set(
        (await tx.objectStore('painRecords').getAll()).map(r => r.timestamp)
      );

      result.details.painRecords.total = data.painRecords.length;
      for (const record of data.painRecords) {
        if (existingPainTimestamps.has(record.timestamp)) {
          result.details.painRecords.skipped++;
          continue;
        }
        const { id, ...recordWithoutId } = record;
        const newId = await tx.objectStore('painRecords').add(recordWithoutId) as number;
        if (id !== undefined) {
          idMapping[`pain_${id}`] = newId;
        }
        result.details.painRecords.imported++;
      }

      const existingMedKeys = new Set(
        (await tx.objectStore('medications').getAll()).map(m => `${m.recordId}_${m.name}_${m.time}`)
      );

      result.details.medications.total = data.medications.length;
      for (const med of data.medications) {
        const newRecordId = idMapping[`pain_${med.recordId}`] ?? med.recordId;
        const key = `${newRecordId}_${med.name}_${med.time}`;
        if (existingMedKeys.has(key)) {
          result.details.medications.skipped++;
          continue;
        }
        const { id, ...medWithoutId } = med;
        await tx.objectStore('medications').add({ ...medWithoutId, recordId: newRecordId });
        existingMedKeys.add(key);
        result.details.medications.imported++;
      }

      const existingExKeys = new Set(
        (await tx.objectStore('exercises').getAll()).map(e => `${e.recordId}_${e.type}_${e.duration}`)
      );

      result.details.exercises.total = data.exercises.length;
      for (const ex of data.exercises) {
        const newRecordId = idMapping[`pain_${ex.recordId}`] ?? ex.recordId;
        const key = `${newRecordId}_${ex.type}_${ex.duration}`;
        if (existingExKeys.has(key)) {
          result.details.exercises.skipped++;
          continue;
        }
        const { id, ...exWithoutId } = ex;
        await tx.objectStore('exercises').add({ ...exWithoutId, recordId: newRecordId });
        existingExKeys.add(key);
        result.details.exercises.imported++;
      }

      const existingWeatherRecordIds = new Set(
        (await tx.objectStore('weather').getAll()).map(w => w.recordId)
      );

      result.details.weather.total = data.weather.length;
      for (const w of data.weather) {
        const newRecordId = idMapping[`pain_${w.recordId}`] ?? w.recordId;
        if (existingWeatherRecordIds.has(newRecordId)) {
          result.details.weather.skipped++;
          continue;
        }
        const { id, ...wWithoutId } = w;
        await tx.objectStore('weather').add({ ...wWithoutId, recordId: newRecordId });
        existingWeatherRecordIds.add(newRecordId);
        result.details.weather.imported++;
      }

      const existingPlanKeys = new Set(
        (await tx.objectStore('medicationPlans').getAll()).map(p => `${p.name}_${p.createdAt}`)
      );

      result.details.medicationPlans.total = data.medicationPlans.length;
      for (const plan of data.medicationPlans) {
        const key = `${plan.name}_${plan.createdAt}`;
        if (existingPlanKeys.has(key)) {
          result.details.medicationPlans.skipped++;
          continue;
        }
        const { id, ...planWithoutId } = plan;
        const newId = await tx.objectStore('medicationPlans').add(planWithoutId) as number;
        if (id !== undefined) {
          idMapping[`plan_${id}`] = newId;
        }
        existingPlanKeys.add(key);
        result.details.medicationPlans.imported++;
      }

      const existingLogKeys = new Set(
        (await tx.objectStore('medicationLogs').getAll()).map(l => `${l.planId}_${l.scheduledDate}_${l.scheduledTime}`)
      );

      result.details.medicationLogs.total = data.medicationLogs.length;
      for (const log of data.medicationLogs) {
        const newPlanId = idMapping[`plan_${log.planId}`] ?? log.planId;
        const key = `${newPlanId}_${log.scheduledDate}_${log.scheduledTime}`;
        if (existingLogKeys.has(key)) {
          result.details.medicationLogs.skipped++;
          continue;
        }
        const { id, ...logWithoutId } = log;
        await tx.objectStore('medicationLogs').add({ ...logWithoutId, planId: newPlanId });
        existingLogKeys.add(key);
        result.details.medicationLogs.imported++;
      }

      await tx.done;

      for (const detail of Object.values(result.details)) {
        result.total += detail.total;
        result.imported += detail.imported;
        result.skipped += detail.skipped;
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(`导入失败: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  };

  return {
    addPainRecord,
    updatePainRecord,
    getPainRecord,
    getAllPainRecords,
    getPainRecordsByDateRange,
    deletePainRecord,
    addMedication,
    updateMedication,
    deleteMedication,
    deleteMedicationsByRecordId,
    getMedicationsByRecordId,
    getAllMedications,
    addExercise,
    updateExercise,
    deleteExercise,
    deleteExercisesByRecordId,
    getExercisesByRecordId,
    addWeather,
    getWeatherByRecordId,
    clearAllData,
    exportAllData,
    importData,
    addMedicationPlan,
    updateMedicationPlan,
    deleteMedicationPlan,
    getMedicationPlan,
    getAllMedicationPlans,
    getEnabledMedicationPlans,
    addMedicationLog,
    updateMedicationLog,
    deleteMedicationLog,
    getMedicationLogsByDate,
    getMedicationLogsByDateRange,
    getMedicationLogsByPlanId,
    findMedicationLog,
    findMedicationLogByName
  };
}
