import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { PainRecord, Medication, Exercise, Weather } from '@/types';

const DB_NAME = 'pain-diary-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function initDB(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
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
    const tx = db.transaction(['painRecords', 'medications', 'exercises', 'weather'], 'readwrite');
    await tx.objectStore('painRecords').clear();
    await tx.objectStore('medications').clear();
    await tx.objectStore('exercises').clear();
    await tx.objectStore('weather').clear();
    await tx.done;
  };

  const exportAllData = async (): Promise<string> => {
    const db = await getDB();
    const data = {
      painRecords: await db.getAll('painRecords'),
      medications: await db.getAll('medications'),
      exercises: await db.getAll('exercises'),
      weather: await db.getAll('weather'),
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
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
    addExercise,
    updateExercise,
    deleteExercise,
    deleteExercisesByRecordId,
    getExercisesByRecordId,
    addWeather,
    getWeatherByRecordId,
    clearAllData,
    exportAllData
  };
}
