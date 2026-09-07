import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  PATIENT_PROFILE: '@smriti_patient_profile',
} as const;

export interface PatientProfile {
  name: string;
  age?: string;
  otherDetails?: string;
}

// In-memory fallback for environments where AsyncStorage might fail or during fast refresh
const memoryStorage: Record<string, string> = {};

export async function getPatientProfile(): Promise<PatientProfile | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      raw = window.localStorage.getItem(STORAGE_KEYS.PATIENT_PROFILE);
    }
    if (!raw) {
      raw = await AsyncStorage.getItem(STORAGE_KEYS.PATIENT_PROFILE);
    }
    if (!raw) {
      raw = memoryStorage[STORAGE_KEYS.PATIENT_PROFILE] || null;
    }
    if (raw) {
      return JSON.parse(raw) as PatientProfile;
    }
    return null;
  } catch (error) {
    console.warn('[Storage] Failed to read patient profile:', error);
    if (memoryStorage[STORAGE_KEYS.PATIENT_PROFILE]) {
      try {
        return JSON.parse(memoryStorage[STORAGE_KEYS.PATIENT_PROFILE]) as PatientProfile;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function setPatientProfile(profile: PatientProfile): Promise<void> {
  try {
    const jsonStr = JSON.stringify(profile);
    memoryStorage[STORAGE_KEYS.PATIENT_PROFILE] = jsonStr;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, jsonStr);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, jsonStr);
  } catch (error) {
    console.warn('[Storage] Failed to save patient profile:', error);
  }
}
