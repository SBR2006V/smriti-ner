/**
 * Data Model for "Who Am I" / "কে আমি?"
 * Represents a familiar person known to the dementia patient.
 */
export interface WhoAmIPerson {
  id: string;
  name: string;
  relationship: string;
  photoUri: string;
  audioUri: string | null;
}
