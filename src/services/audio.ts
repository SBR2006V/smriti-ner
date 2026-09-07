import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/**
 * Audio Service for Smriti-NER
 * Manages playback sequence of local pre-recorded audio:
 * 1. assets/audio/success-chime.mp3
 * 2. assets/audio/khub-bhalo.mp3
 *
 * Requirements:
 * - Bundled local MP3 assets via require().
 * - Play success-chime.mp3 first.
 * - Wait until chime finishes, then play khub-bhalo.mp3.
 * - Sounds must NOT overlap.
 * - Stop/reset cleanly when requested (e.g. game restarted or back pressed).
 * - Safe error handling: never crashes game if audio fails.
 */

// Local bundled pre-recorded audio assets
const CHIME_ASSET = require('@/assets/audio/success-chime.mp3');
const KHUB_BHALO_ASSET = require('@/assets/audio/khub-bhalo.mp3');

let isAudioModeConfigured = false;

async function configureAudioMode(): Promise<void> {
  if (isAudioModeConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
    });
    isAudioModeConfigured = true;
  } catch (error) {
    console.warn('[SoundManager] Could not configure audio mode:', error);
  }
}

class SoundManager {
  private chimePlayer: AudioPlayer | null = null;
  private khubBhaloPlayer: AudioPlayer | null = null;
  private personVoicePlayer: AudioPlayer | null = null;
  private activePersonId: string | null = null;
  private personVoiceSub: { remove: () => void } | null = null;
  private currentSequenceId = 0;
  private isPlaying = false;

  public get playing(): boolean {
    return this.isPlaying;
  }

  public getActivePersonId(): string | null {
    return this.activePersonId;
  }

  private getChimePlayer(): AudioPlayer | null {
    if (!this.chimePlayer) {
      try {
        this.chimePlayer = createAudioPlayer(CHIME_ASSET);
      } catch (err) {
        console.warn('[SoundManager] Failed to create chime player:', err);
      }
    }
    return this.chimePlayer;
  }

  private getKhubBhaloPlayer(): AudioPlayer | null {
    if (!this.khubBhaloPlayer) {
      try {
        this.khubBhaloPlayer = createAudioPlayer(KHUB_BHALO_ASSET);
      } catch (err) {
        console.warn('[SoundManager] Failed to create khub-bhalo player:', err);
      }
    }
    return this.khubBhaloPlayer;
  }

  /**
   * Safely stop any currently playing audio and cancel pending playback sequences.
   */
  public stop(): void {
    this.currentSequenceId++;
    this.isPlaying = false;
    this.stopPersonVoice();

    if (this.chimePlayer) {
      try {
        this.chimePlayer.pause();
        this.chimePlayer.seekTo(0).catch(() => {});
      } catch {
        // Ignore safe reset errors
      }
    }

    if (this.khubBhaloPlayer) {
      try {
        this.khubBhaloPlayer.pause();
        this.khubBhaloPlayer.seekTo(0).catch(() => {});
      } catch {
        // Ignore safe reset errors
      }
    }
  }

  /**
   * Safely release audio resources on unmount if needed.
   */
  public release(): void {
    this.stop();
    try {
      if (this.chimePlayer) {
        this.chimePlayer.remove();
        this.chimePlayer = null;
      }
      if (this.khubBhaloPlayer) {
        this.khubBhaloPlayer.remove();
        this.khubBhaloPlayer = null;
      }
    } catch (err) {
      console.warn('[SoundManager] Error releasing audio resources:', err);
    }
  }

  /**
   * Play or toggle playback of a person's recorded voice in Who Am I.
   * - If that person's voice is already playing, stops/pauses it.
   * - If another person's voice is playing, stops it cleanly before starting.
   * - Does not overlap voices or game audio.
   */
  public async playPersonVoice(
    personId: string,
    audioUri: string,
    onEnded?: () => void
  ): Promise<void> {
    if (this.activePersonId === personId && this.personVoicePlayer) {
      this.stopPersonVoice();
      return;
    }

    this.stop();
    await configureAudioMode();

    try {
      this.personVoicePlayer = createAudioPlayer(audioUri);
      this.activePersonId = personId;

      this.personVoiceSub = this.personVoicePlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          this.stopPersonVoice();
          onEnded?.();
        }
      });

      await this.personVoicePlayer.seekTo(0).catch(() => {});
      this.personVoicePlayer.play();
    } catch (err) {
      console.warn('[SoundManager] Error playing person voice:', err);
      this.stopPersonVoice();
    }
  }

  /**
   * Safely stop any currently playing person voice.
   */
  public stopPersonVoice(): void {
    if (this.personVoiceSub) {
      try {
        this.personVoiceSub.remove();
      } catch {}
      this.personVoiceSub = null;
    }
    if (this.personVoicePlayer) {
      try {
        this.personVoicePlayer.pause();
        this.personVoicePlayer.seekTo(0).catch(() => {});
        this.personVoicePlayer.remove();
      } catch {}
      this.personVoicePlayer = null;
    }
    this.activePersonId = null;
  }

  /**
   * Play the two-step match success audio sequence:
   * 1. assets/audio/success-chime.mp3
   * 2. Wait until chime finishes
   * 3. assets/audio/khub-bhalo.mp3
   *
   * The sounds do NOT overlap.
   */
  public async playMatchSuccessSequence(): Promise<void> {
    const sequenceId = ++this.currentSequenceId;
    this.isPlaying = true;

    // Pause any currently running sounds
    if (this.chimePlayer) {
      try {
        this.chimePlayer.pause();
      } catch {
        // Safe reset
      }
    }
    if (this.khubBhaloPlayer) {
      try {
        this.khubBhaloPlayer.pause();
      } catch {
        // Safe reset
      }
    }

    await configureAudioMode();
    if (this.currentSequenceId !== sequenceId) return;

    try {
      // 1. Play success chime
      const chime = this.getChimePlayer();
      if (chime) {
        await this.playPlayerUntilEnd(chime, sequenceId, 2500);
      }

      if (this.currentSequenceId !== sequenceId) return;

      // 2. Play "khub bhalo" voice after chime finishes
      const voice = this.getKhubBhaloPlayer();
      if (voice) {
        await this.playPlayerUntilEnd(voice, sequenceId, 4500);
      }
    } catch (err) {
      console.warn('[SoundManager] Error in match success audio sequence:', err);
    } finally {
      if (this.currentSequenceId === sequenceId) {
        this.isPlaying = false;
      }
    }
  }

  private playPlayerUntilEnd(
    player: AudioPlayer,
    sequenceId: number,
    defaultTimeoutMs: number
  ): Promise<void> {
    return new Promise((resolve) => {
      let isDone = false;
      let subscription: { remove: () => void } | null = null;
      let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

      const finish = () => {
        if (isDone) return;
        isDone = true;
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        if (subscription) {
          try {
            subscription.remove();
          } catch {
            // ignore
          }
          subscription = null;
        }
        resolve();
      };

      if (this.currentSequenceId !== sequenceId) {
        finish();
        return;
      }

      try {
        subscription = player.addListener('playbackStatusUpdate', (status) => {
          if (this.currentSequenceId !== sequenceId) {
            finish();
            return;
          }
          if (status.didJustFinish) {
            finish();
          }
        });

        player
          .seekTo(0)
          .catch(() => {
            // Seek failed or unsupported, continue with play
          })
          .then(() => {
            if (this.currentSequenceId !== sequenceId) {
              try {
                player.pause();
              } catch {
                // ignore
              }
              finish();
              return;
            }

            player.play();

            const durationMs =
              player.duration && player.duration > 0
                ? Math.ceil(player.duration * 1000) + 400
                : defaultTimeoutMs;

            fallbackTimer = setTimeout(() => {
              finish();
            }, durationMs);
          });
      } catch (err) {
        console.warn('[SoundManager] playPlayerUntilEnd error:', err);
        finish();
      }
    });
  }
}

export const soundManager = new SoundManager();
