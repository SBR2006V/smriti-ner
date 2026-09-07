import { Platform } from 'react-native';

/**
 * Audio Service for Smriti-NER
 * Manages playback sequence of local pre-recorded audio:
 * 1. assets/audio/success-chime.mp3
 * 2. assets/audio/khub-bhalo.mp3
 *
 * Requirements:
 * - Play success-chime.mp3 first.
 * - After chime finishes, play khub-bhalo.mp3.
 * - Do not allow the two sounds to overlap.
 * - Stop/reset cleanly when requested (e.g., game restarted).
 * - Graceful fallback if files do not exist yet without breaking game mechanics.
 */

// Local expected audio file paths
const CHIME_PATH = 'assets/audio/success-chime.mp3';
const KHUB_BHALO_PATH = 'assets/audio/khub-bhalo.mp3';

class SoundManager {
  private currentWebAudio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private cancelCurrentSequence = false;

  /**
   * Safely stop any ongoing audio playback and cancel sequences.
   */
  public stop() {
    this.cancelCurrentSequence = true;
    this.isPlaying = false;

    if (Platform.OS === 'web' && this.currentWebAudio) {
      try {
        this.currentWebAudio.pause();
        this.currentWebAudio.currentTime = 0;
      } catch {
        // Ignore abort/pause errors
      }
      this.currentWebAudio = null;
    }
  }

  /**
   * Play the two-step match success audio sequence:
   * 1. success-chime.mp3
   * 2. khub-bhalo.mp3
   */
  public async playMatchSuccessSequence(): Promise<void> {
    // Stop any existing playback first
    this.stop();
    this.cancelCurrentSequence = false;
    this.isPlaying = true;

    try {
      // 1. Play success chime
      await this.playLocalSound(CHIME_PATH);

      if (this.cancelCurrentSequence) return;

      // 2. Play "khub bhalo" voice
      await this.playLocalSound(KHUB_BHALO_PATH);
    } catch {
      // Audio playback failed or files not present yet - game continues gracefully
    } finally {
      this.isPlaying = false;
    }
  }

  private playLocalSound(soundPath: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.cancelCurrentSequence) {
        resolve();
        return;
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.Audio) {
        try {
          const audio = new window.Audio(`/${soundPath}`);
          this.currentWebAudio = audio;

          const cleanup = () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            if (this.currentWebAudio === audio) {
              this.currentWebAudio = null;
            }
          };

          const handleEnded = () => {
            cleanup();
            resolve();
          };

          const handleError = () => {
            cleanup();
            // Resolve instead of reject so sequential playback can proceed gracefully
            resolve();
          };

          audio.addEventListener('ended', handleEnded);
          audio.addEventListener('error', handleError);

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              cleanup();
              resolve();
            });
          }
        } catch {
          resolve();
        }
      } else {
        // On native platforms, when audio files and native driver are configured,
        // this is where native audio driver binds. Resolves cleanly if files are pending.
        resolve();
      }
    });
  }
}

export const soundManager = new SoundManager();
