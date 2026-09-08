import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { WhoAmIPerson } from '@/types/whoAmI';

export { WhoAmIPerson };

const STORAGE_KEYS = {
  PATIENT_PROFILE: '@smriti_patient_profile',
  WHO_AM_I_PEOPLE: 'smriti_ner_who_am_i_people',
} as const;

export interface PatientProfile {
  name: string;
  age?: string;
  otherDetails?: string;
}

/**
 * Seeded initial demo person for Who Am I ("কে আমি?")
 * Name: মিতা, Relationship: মেয়ে, Photo: local placeholder identifier, Audio: null
 */
export const SEEDED_DEMO_PERSON: WhoAmIPerson = {
  id: 'demo-1',
  name: 'মিতা',
  relationship: 'মেয়ে',
  photoUri: 'placeholder-daughter',
  audioUri: null,
};

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

const DEFAULT_AVATAR_ASSET = require('@/assets/images/icon.png');

/**
 * Resolves a person's photoUri into a valid React Native Image source.
 * Handles local device file URIs, content URIs, remote URLs, data URIs, blob URIs, and local bundled placeholder assets.
 */
export function resolvePersonPhoto(photoUri?: string | null): any {
  if (!photoUri || photoUri === 'placeholder-daughter' || photoUri === 'default-avatar') {
    return DEFAULT_AVATAR_ASSET;
  }
  if (
    photoUri.startsWith('file:') ||
    photoUri.startsWith('content:') ||
    photoUri.startsWith('http://') ||
    photoUri.startsWith('https://') ||
    photoUri.startsWith('data:') ||
    photoUri.startsWith('blob:') ||
    photoUri.startsWith('/')
  ) {
    return { uri: photoUri };
  }
  return DEFAULT_AVATAR_ASSET;
}

/**
 * Loads the array of people for Who Am I ("কে আমি?").
 * If no data exists yet (first app launch), seeds and persists the single demo person.
 * If the user has edited or deleted the demo person, their saved data (including empty list) is preserved.
 */
export async function getWhoAmIPeople(): Promise<WhoAmIPerson[]> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      raw = window.localStorage.getItem(STORAGE_KEYS.WHO_AM_I_PEOPLE);
    }
    if (!raw) {
      raw = await AsyncStorage.getItem(STORAGE_KEYS.WHO_AM_I_PEOPLE);
    }
    if (!raw) {
      raw = memoryStorage[STORAGE_KEYS.WHO_AM_I_PEOPLE] || null;
    }

    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed as WhoAmIPerson[];
        }
      } catch (e) {
        console.warn('[Storage] Failed to parse Who Am I people, falling back to seed:', e);
      }
    }

    // No existing data in storage (first launch): seed the single demo person
    const initialPeople = [SEEDED_DEMO_PERSON];
    await setWhoAmIPeople(initialPeople);
    return initialPeople;
  } catch (error) {
    console.warn('[Storage] Failed to read Who Am I people:', error);
    return [SEEDED_DEMO_PERSON];
  }
}

/**
 * Persists the array of people for Who Am I ("কে আমি?") to AsyncStorage.
 */
export async function setWhoAmIPeople(people: WhoAmIPerson[]): Promise<void> {
  try {
    const jsonStr = JSON.stringify(people);
    memoryStorage[STORAGE_KEYS.WHO_AM_I_PEOPLE] = jsonStr;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEYS.WHO_AM_I_PEOPLE, jsonStr);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.WHO_AM_I_PEOPLE, jsonStr);
  } catch (error) {
    console.warn('[Storage] Failed to save Who Am I people:', error);
  }
}

