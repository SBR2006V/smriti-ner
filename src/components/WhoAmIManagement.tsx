import { Colors, DementiaUX, Spacing } from '@/constants/theme';
import { soundManager } from '@/services/audio';
import {
  getWhoAmIPeople,
  resolvePersonPhoto,
  setWhoAmIPeople,
  WhoAmIPerson,
} from '@/services/storage';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

interface PersonFormModalProps {
  visible: boolean;
  editingPerson: WhoAmIPerson | null;
  onClose: () => void;
  onSaved: (updatedPeople: WhoAmIPerson[], isEdit: boolean) => void;
}

/**
 * Modal form for Adding or Editing a WhoAmIPerson.
 * Handles photo selection, name, relationship, and real microphone voice recording.
 */
function PersonFormModal({
  visible,
  editingPerson,
  onClose,
  onSaved,
}: PersonFormModalProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [name, setName] = useState<string>(() => editingPerson?.name ?? '');
  const [relationship, setRelationship] = useState<string>(() => editingPerson?.relationship ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(() => editingPerson?.photoUri ?? null);
  const [audioUri, setAudioUri] = useState<string | null>(() => editingPerson?.audioUri ?? null);

  const [nameError, setNameError] = useState<string | null>(null);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [isRecordingLocal, setIsRecordingLocal] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Setup expo-audio recorder with persistent document storage
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: 'document',
  });

  // Track if native recording is actively in progress
  const isActivelyRecordingRef = useRef<boolean>(false);

  const cleanupAudio = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      soundManager.stopPersonVoice();
    } catch {
      // Ignore safe reset errors
    }
    setIsPreviewPlaying(false);

    // Stop recording ONLY if actively recording and not yet stopped
    if (isActivelyRecordingRef.current) {
      isActivelyRecordingRef.current = false;
      setIsRecordingLocal(false);
      try {
        audioRecorder.stop().catch(() => { });
      } catch (err) {
        console.warn('[WhoAmI] AudioRecorder stop on cleanup skipped:', err);
      }
    }

    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    }).catch(() => { });
  }, [audioRecorder]);

  // Clean up audio and timer on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Helper to persist a chosen image into app's document storage
  const persistImageUri = async (originalUri: string): Promise<string> => {
    if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
      try {
        const ext = originalUri.toLowerCase().endsWith('.png') ? '.png' : '.jpg';
        const filename = `whoami-photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
        const destination = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.copyAsync({
          from: originalUri,
          to: destination,
        });
        return destination;
      } catch (err) {
        console.warn('[WhoAmI] Failed to copy photo to document directory, fallback to original:', err);
        return originalUri;
      }
    }
    return originalUri;
  };

  // Photo Selection: Gallery
  const handlePickFromGallery = async () => {
    try {
      setPhotoError(null);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setPhotoError('গ্যালারি অ্যাক্সেস করার অনুমতি দেওয়া হয়নি (Permission denied)');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        const persistentUri = await persistImageUri(pickedUri);
        setPhotoUri(persistentUri);
        setPhotoError(null);
      }
    } catch (err) {
      console.warn('[WhoAmI] Image picker error:', err);
      setPhotoError('ছবি নির্বাচন করতে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন');
    }
  };

  // Photo Selection: Camera
  const handleTakePhoto = async () => {
    try {
      setPhotoError(null);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setPhotoError('ক্যামেরা ব্যবহারের অনুমতি দেওয়া হয়নি (Permission denied)');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        const persistentUri = await persistImageUri(pickedUri);
        setPhotoUri(persistentUri);
        setPhotoError(null);
      }
    } catch (err) {
      console.warn('[WhoAmI] Camera error:', err);
      setPhotoError('ছবি তুলতে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন');
    }
  };

  // Real Voice Recording: Start
  const handleStartRecording = async () => {
    try {
      setAudioError(null);
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setAudioError('মাইক্রোফোন ব্যবহারের অনুমতি প্রয়োজন (Microphone permission required)');
        return;
      }

      soundManager.stop();
      setIsPreviewPlaying(false);

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync({
        ...RecordingPresets.HIGH_QUALITY,
        directory: 'document',
      });
      audioRecorder.record();

      isActivelyRecordingRef.current = true;
      setIsRecordingLocal(true);
      setRecordingSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('[WhoAmI] Start recording error:', err);
      setAudioError('রেকর্ডিং শুরু করা যায়নি, পুনরায় চেষ্টা করুন');
      setIsRecordingLocal(false);
    }
  };

  // Real Voice Recording: Stop
  const handleStopRecording = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await audioRecorder.stop();
      isActivelyRecordingRef.current = false;
      setIsRecordingLocal(false);

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      const rawUri = audioRecorder.uri;
      if (!rawUri) {
        setAudioError('কণ্ঠস্বর ফাইল পাওয়া যায়নি, পুনরায় রেকর্ড করুন');
        return;
      }

      // Ensure persistent document storage if not already there
      let persistentUri = rawUri;
      if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
        if (!rawUri.startsWith(FileSystem.documentDirectory)) {
          const filename = `whoami-voice-${Date.now()}.m4a`;
          const dest = `${FileSystem.documentDirectory}${filename}`;
          await FileSystem.copyAsync({ from: rawUri, to: dest });
          persistentUri = dest;
        }
      }

      setAudioUri(persistentUri);
      setAudioError(null);
    } catch (err) {
      console.warn('[WhoAmI] Stop recording error:', err);
      setAudioError('রেকর্ডিং সংরক্ষণ করতে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন');
      setIsRecordingLocal(false);
    }
  };

  // Preview Recorded Voice Playback
  const handleTogglePreview = async () => {
    if (!audioUri) return;

    if (isPreviewPlaying) {
      soundManager.stopPersonVoice();
      setIsPreviewPlaying(false);
    } else {
      setIsPreviewPlaying(true);
      await soundManager.playPersonVoice('caregiver-preview', audioUri, () => {
        setIsPreviewPlaying(false);
      });
    }
  };

  // Re-record Voice
  const handleRerecord = () => {
    try {
      soundManager.stopPersonVoice();
    } catch {
      // Ignore safe reset errors
    }
    setIsPreviewPlaying(false);
    setAudioUri(null);
    setAudioError(null);
    isActivelyRecordingRef.current = false;
    setIsRecordingLocal(false);
    handleStartRecording();
  };

  // Save Person (Add or Edit)
  const handleSave = async () => {
    let hasError = false;

    if (!photoUri) {
      setPhotoError('অনুগ্রহ করে একটি ছবি নির্বাচন করুন (Photo is required)');
      hasError = true;
    }
    if (!name.trim()) {
      setNameError('অনুগ্রহ করে ব্যক্তির নাম লিখুন (Name is required)');
      hasError = true;
    }
    if (!relationship.trim()) {
      setRelationshipError('অনুগ্রহ করে সম্পর্ক লিখুন (Relationship is required)');
      hasError = true;
    }
    if (!audioUri) {
      setAudioError('অনুগ্রহ করে কণ্ঠ রেকর্ড করুন (Voice recording is required)');
      hasError = true;
    }

    if (hasError) return;

    setIsSaving(true);
    try {
      const currentPeople = await getWhoAmIPeople();
      let updatedPeople: WhoAmIPerson[];

      if (editingPerson) {
        // Edit existing person: preserve ID
        updatedPeople = currentPeople.map((p) =>
          p.id === editingPerson.id
            ? {
              ...p,
              name: name.trim(),
              relationship: relationship.trim(),
              photoUri: photoUri!,
              audioUri: audioUri,
            }
            : p
        );
      } else {
        // Add new person: generate unique ID
        const newPerson: WhoAmIPerson = {
          id: `person-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          relationship: relationship.trim(),
          photoUri: photoUri!,
          audioUri: audioUri,
        };
        updatedPeople = [...currentPeople, newPerson];
      }

      await setWhoAmIPeople(updatedPeople);
      try {
        soundManager.stopPersonVoice();
      } catch {
        // Ignore safe reset errors
      }
      setIsPreviewPlaying(false);
      onSaved(updatedPeople, !!editingPerson);
    } catch (err) {
      console.warn('[WhoAmI] Save error:', err);
      setAudioError('তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    cleanupAudio();
    onClose();
  };

  const isRecordingActive = isRecordingLocal;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboardAvoid}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalBadge, { backgroundColor: colors.brandLight }]}>
                <Text style={[styles.modalBadgeText, { color: colors.brand }]}>
                  {editingPerson ? '✏️ সম্পাদনা • Edit Person' : '➕ নতুন ব্যক্তি • Add Person'}
                </Text>
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingPerson ? 'ব্যক্তির তথ্য সম্পাদনা করুন' : 'নতুন মানুষ যোগ করুন'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {editingPerson
                  ? 'ছবি, নাম, সম্পর্ক বা কণ্ঠ পরিবর্তন করুন'
                  : 'কে আমি? তালিকায় পরিচিত মানুষের তথ্য যুক্ত করুন'}
              </Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.formScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {/* Photo Section */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  ছবি (Photo) <Text style={{ color: colors.brand }}>*</Text>
                </Text>

                <View style={styles.photoPickerRow}>
                  {/* Photo Thumbnail Preview */}
                  <View
                    style={[
                      styles.photoPreviewBox,
                      {
                        backgroundColor: colors.backgroundElement,
                        borderColor: photoError ? colors.danger : colors.borderHighlight,
                      },
                    ]}>
                    <Image
                      source={resolvePersonPhoto(photoUri)}
                      style={styles.photoPreviewImage}
                      resizeMode="cover"
                    />
                  </View>

                  {/* Photo Action Buttons */}
                  <View style={styles.photoButtonCol}>
                    <Pressable
                      onPress={handlePickFromGallery}
                      style={({ pressed }) => [
                        styles.photoActionBtn,
                        {
                          backgroundColor: colors.brandLight,
                          borderColor: colors.brand,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}>
                      <Text style={[styles.photoActionBtnText, { color: colors.brand }]}>
                        🖼️ গ্যালারি থেকে বাছুন
                      </Text>
                      <Text style={[styles.photoActionBtnSub, { color: colors.brand }]}>
                        Choose from Gallery
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleTakePhoto}
                      style={({ pressed }) => [
                        styles.photoActionBtn,
                        {
                          backgroundColor: colors.backgroundElement,
                          borderColor: colors.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}>
                      <Text style={[styles.photoActionBtnText, { color: colors.text }]}>
                        📷 ক্যামেরা দিয়ে তুলুন
                      </Text>
                      <Text style={[styles.photoActionBtnSub, { color: colors.textSecondary }]}>
                        Take Photo
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {photoError ? (
                  <Text style={[styles.fieldError, { color: colors.danger }]}>
                    {photoError}
                  </Text>
                ) : null}
              </View>

              {/* Name Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  নাম (Name) <Text style={{ color: colors.brand }}>*</Text>
                </Text>
                <TextInput
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="যেমন: মিতা / Mita"
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.textInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.backgroundElement,
                      borderColor: nameError ? colors.danger : colors.border,
                    },
                  ]}
                  autoCapitalize="words"
                />
                {nameError ? (
                  <Text style={[styles.fieldError, { color: colors.danger }]}>
                    {nameError}
                  </Text>
                ) : null}
              </View>

              {/* Relationship Field (Free-text) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  সম্পর্ক (Relationship) <Text style={{ color: colors.brand }}>*</Text>
                </Text>
                <TextInput
                  value={relationship}
                  onChangeText={(val) => {
                    setRelationship(val);
                    if (relationshipError) setRelationshipError(null);
                  }}
                  placeholder="যেমন: মেয়ে, ছেলে, স্বামী, স্ত্রী, বন্ধু..."
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.textInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.backgroundElement,
                      borderColor: relationshipError ? colors.danger : colors.border,
                    },
                  ]}
                  autoCapitalize="words"
                />
                {relationshipError ? (
                  <Text style={[styles.fieldError, { color: colors.danger }]}>
                    {relationshipError}
                  </Text>
                ) : null}
              </View>

              {/* Voice Recording Section */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  🎙️ কণ্ঠ রেকর্ড করুন (Record Voice) <Text style={{ color: colors.brand }}>*</Text>
                </Text>
                <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                  পরিবারের সদস্যের নিজ কণ্ঠের কথা রোগীর স্মৃতি জাগাতে ও উদ্বেগ দূর করতে অপরিহার্য।
                </Text>

                {/* State A: Recording is Active */}
                {isRecordingActive ? (
                  <View style={[styles.recordingActiveCard, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
                    <View style={styles.pulseRow}>
                      <View style={[styles.pulseDot, { backgroundColor: colors.danger }]} />
                      <Text style={[styles.recordingActiveTitle, { color: colors.danger }]}>
                        রেকর্ডিং হচ্ছে... {formatSeconds(recordingSeconds)}
                      </Text>
                    </View>
                    <Text style={[styles.recordingActiveHint, { color: colors.danger }]}>
                      কথা বলা শেষ হলে নিচের বোতামে চাপুন
                    </Text>

                    <Pressable
                      onPress={handleStopRecording}
                      style={({ pressed }) => [
                        styles.stopRecordingBtn,
                        {
                          backgroundColor: colors.danger,
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}>
                      <Text style={styles.stopRecordingBtnText}>
                        ⏹️ রেকর্ড বন্ধ করুন • Stop Recording
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  /* State B: Not Recording */
                  <View>
                    {audioUri ? (
                      <View style={[styles.voiceReadyCard, { backgroundColor: colors.oliveLight, borderColor: colors.olive }]}>
                        <View style={styles.voiceReadyHeader}>
                          <Text style={[styles.voiceReadyTitle, { color: colors.olive }]}>
                            ✓ কণ্ঠস্বর রেকর্ড সম্পন্ন হয়েছে
                          </Text>
                          <Text style={[styles.voiceReadySubtitle, { color: colors.olive }]}>
                            Voice recording ready
                          </Text>
                        </View>

                        <View style={styles.voiceReadyActions}>
                          <Pressable
                            onPress={handleTogglePreview}
                            style={({ pressed }) => [
                              styles.previewBtn,
                              {
                                backgroundColor: isPreviewPlaying ? colors.amber : colors.olive,
                                opacity: pressed ? 0.9 : 1,
                              },
                            ]}>
                            <Text style={styles.previewBtnText}>
                              {isPreviewPlaying ? '⏸️ থামান • Stop' : '▶️ শুনুন • Preview'}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={handleRerecord}
                            style={({ pressed }) => [
                              styles.rerecordBtn,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.olive,
                                opacity: pressed ? 0.85 : 1,
                              },
                            ]}>
                            <Text style={[styles.rerecordBtnText, { color: colors.olive }]}>
                              🎙️ আবার রেকর্ড করুন
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        onPress={handleStartRecording}
                        style={({ pressed }) => [
                          styles.startRecordBtn,
                          {
                            backgroundColor: colors.brandLight,
                            borderColor: colors.brand,
                            opacity: pressed ? 0.88 : 1,
                          },
                        ]}>
                        <Text style={[styles.startRecordBtnText, { color: colors.brand }]}>
                          🎙️ কণ্ঠ রেকর্ড শুরু করুন • Start Recording
                        </Text>
                        <Text style={[styles.startRecordBtnSubtext, { color: colors.brand }]}>
                          মাইক্রোফোনে স্পষ্ট স্বরে রোগীর নাম বা পরিচিত সম্ভাষণ বলুন
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {audioError ? (
                  <Text style={[styles.fieldError, { color: colors.danger }]}>
                    {audioError}
                  </Text>
                ) : null}
              </View>
            </ScrollView>

            {/* Modal Actions Footer */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Pressable
                onPress={handleCancel}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    backgroundColor: colors.backgroundElement,
                    opacity: isSaving ? 0.5 : pressed ? 0.75 : 1,
                  },
                ]}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                  বাতিল করুন • Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                disabled={isSaving || isRecordingActive}
                style={({ pressed }) => [
                  styles.saveBtn,
                  {
                    backgroundColor: colors.brand,
                    opacity: isSaving || isRecordingActive ? 0.5 : pressed ? 0.9 : 1,
                  },
                ]}>
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    সংরক্ষণ করুন • Save
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/**
 * Delete confirmation dialog.
 */
interface DeleteConfirmModalProps {
  person: WhoAmIPerson | null;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteConfirmModal({
  person,
  onCancel,
  onConfirm,
  isDeleting,
}: DeleteConfirmModalProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  if (!person) return null;

  return (
    <Modal
      visible={!!person}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.deleteDialogCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.modalBadge, { backgroundColor: colors.dangerLight, alignSelf: 'center' }]}>
            <Text style={[styles.modalBadgeText, { color: colors.danger }]}>
              ⚠️ সতর্কতা • Confirmation
            </Text>
          </View>

          <Text style={[styles.deleteTitle, { color: colors.text }]}>
            আপনি কি এই ব্যক্তিকে মুছে ফেলতে চান?
          </Text>
          <Text style={[styles.deleteSubtitle, { color: colors.textSecondary }]}>
            Are you sure you want to delete this person?
          </Text>

          <View style={[styles.deletePersonPreview, { backgroundColor: colors.backgroundElement }]}>
            <Image
              source={resolvePersonPhoto(person.photoUri)}
              style={styles.deletePersonAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.deletePersonName, { color: colors.text }]}>
                {person.name}
              </Text>
              <Text style={[styles.deletePersonRel, { color: colors.textSecondary }]}>
                সম্পর্ক: {person.relationship}
              </Text>
            </View>
          </View>

          <Text style={[styles.deleteNotice, { color: colors.textSecondary }]}>
            {'মুছে ফেললে রোগীর "কে আমি?" তালিকা থেকেও এই ব্যক্তি অপসারিত হবেন।'}
          </Text>

          <View style={styles.deleteActions}>
            <Pressable
              onPress={onCancel}
              disabled={isDeleting}
              style={({ pressed }) => [
                styles.deleteCancelBtn,
                {
                  backgroundColor: colors.backgroundElement,
                  opacity: isDeleting ? 0.5 : pressed ? 0.75 : 1,
                },
              ]}>
              <Text style={[styles.deleteCancelBtnText, { color: colors.text }]}>
                বাতিল করুন / Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={isDeleting}
              style={({ pressed }) => [
                styles.deleteConfirmBtn,
                {
                  backgroundColor: colors.danger,
                  opacity: isDeleting ? 0.5 : pressed ? 0.88 : 1,
                },
              ]}>
              {isDeleting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteConfirmBtnText}>
                  মুছে ফেলুন / Delete
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Main WhoAmIManagement Component for the Caregiver Admin Screen.
 */
export function WhoAmIManagement() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [people, setPeople] = useState<WhoAmIPerson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingPerson, setEditingPerson] = useState<WhoAmIPerson | null>(null);
  const [personToDelete, setPersonToDelete] = useState<WhoAmIPerson | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load saved people on mount
  useEffect(() => {
    let isMounted = true;
    getWhoAmIPeople().then((data) => {
      if (isMounted) {
        setPeople(data);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleOpenAddForm = () => {
    setEditingPerson(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (person: WhoAmIPerson) => {
    setEditingPerson(person);
    setIsFormOpen(true);
  };

  const handleFormSaved = (updatedPeople: WhoAmIPerson[], isEdit: boolean) => {
    setPeople(updatedPeople);
    setIsFormOpen(false);
    setEditingPerson(null);
    showToast(
      isEdit
        ? '✓ ব্যক্তির তথ্য সফলভাবে আপডেট হয়েছে! (Updated successfully)'
        : '✓ নতুন মানুষ সফলভাবে যোগ করা হয়েছে! (Added successfully)'
    );
  };

  const handleConfirmDelete = async () => {
    if (!personToDelete) return;
    setIsDeleting(true);
    try {
      const current = await getWhoAmIPeople();
      const updated = current.filter((p) => p.id !== personToDelete.id);
      await setWhoAmIPeople(updated);
      setPeople(updated);
      setPersonToDelete(null);
      showToast('✓ ব্যক্তিকে তালিকা থেকে মুছে ফেলা হয়েছে (Deleted)');
    } catch (err) {
      console.warn('[WhoAmI] Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionEmoji}>🌸</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              কে আমি? পরিচালনা করুন
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Manage Who Am I? • Familiar Identity Profiles
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
          রোগীর স্মৃতি ধরে রাখতে পরিচিত মানুষদের ছবি ও পরিবারের সদস্যদের আসল কণ্ঠের বার্তা যোগ ও পরিচালনা করুন।
        </Text>
      </View>

      {/* Add New Person Prominent Button */}
      <Pressable
        onPress={handleOpenAddForm}
        accessibilityRole="button"
        accessibilityLabel="নতুন মানুষ যোগ করুন"
        style={({ pressed }) => [
          styles.addNewBtn,
          {
            backgroundColor: colors.brand,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}>
        <Text style={styles.addNewBtnIcon}>➕</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.addNewBtnText}>
            নতুন মানুষ যোগ করুন
          </Text>
          <Text style={styles.addNewBtnSubtext}>
            Add New Person • Photo, Name & Real Voice
          </Text>
        </View>
      </Pressable>

      {/* Feedback Toast */}
      {toastMessage ? (
        <View style={[styles.toastBanner, { backgroundColor: colors.oliveLight, borderColor: colors.olive }]}>
          <Text style={[styles.toastText, { color: colors.olive }]}>
            {toastMessage}
          </Text>
        </View>
      ) : null}

      {/* People List */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.brand} style={{ marginVertical: Spacing.three }} />
        ) : people.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Text style={[styles.emptyEmoji]}>👵🏼</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              বর্তমানে কোনো ব্যক্তি তালিকাভুক্ত নেই
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              No people added yet. Tap the button above to add a familiar person.
            </Text>
          </View>
        ) : (
          people.map((person) => {
            const hasVoice = !!person.audioUri;
            return (
              <View
                key={person.id}
                style={[
                  styles.personCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.border,
                  },
                ]}>
                <View style={styles.personCardTop}>
                  {/* Photo Thumbnail */}
                  <View style={[styles.personThumbnailBox, { borderColor: colors.borderHighlight }]}>
                    <Image
                      source={resolvePersonPhoto(person.photoUri)}
                      style={styles.personThumbnail}
                      resizeMode="cover"
                    />
                  </View>

                  {/* Info Details */}
                  <View style={styles.personInfoCol}>
                    <Text style={[styles.personName, { color: colors.text }]}>
                      {person.name}
                    </Text>

                    <View style={styles.badgeRow}>
                      <View style={[styles.relationshipBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.relationshipBadgeText, { color: colors.textSecondary }]}>
                          সম্পর্ক: <Text style={{ color: colors.text, fontWeight: '700' }}>{person.relationship}</Text>
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.voiceBadge,
                          {
                            backgroundColor: hasVoice ? colors.oliveLight : colors.dangerLight,
                            borderColor: hasVoice ? colors.olive : colors.danger,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.voiceBadgeText,
                            { color: hasVoice ? colors.olive : colors.danger },
                          ]}>
                          {hasVoice ? '🎙️ কণ্ঠ সংরক্ষিত' : '⚠️ কণ্ঠ নেই'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Card Action Buttons */}
                <View style={[styles.personCardActions, { borderTopColor: colors.border }]}>
                  <Pressable
                    onPress={() => handleOpenEditForm(person)}
                    accessibilityRole="button"
                    accessibilityLabel={`${person.name} এর তথ্য সম্পাদনা করুন`}
                    style={({ pressed }) => [
                      styles.actionEditBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}>
                    <Text style={[styles.actionEditBtnText, { color: colors.text }]}>
                      ✏️ সম্পাদনা করুন • Edit
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setPersonToDelete(person)}
                    accessibilityRole="button"
                    accessibilityLabel={`${person.name} কে মুছে ফেলুন`}
                    style={({ pressed }) => [
                      styles.actionDeleteBtn,
                      {
                        backgroundColor: colors.dangerLight,
                        borderColor: colors.danger,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}>
                    <Text style={[styles.actionDeleteBtnText, { color: colors.danger }]}>
                      🗑️ মুছে ফেলুন • Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <PersonFormModal
          visible={isFormOpen}
          editingPerson={editingPerson}
          onClose={() => {
            setIsFormOpen(false);
            setEditingPerson(null);
          }}
          onSaved={handleFormSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        person={personToDelete}
        onCancel={() => setPersonToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.five,
    borderRadius: DementiaUX.borderRadiusLarge,
    borderWidth: 1.5,
    gap: Spacing.four,
  },
  sectionHeader: {
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  sectionEmoji: {
    fontSize: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.one,
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderRadius: DementiaUX.borderRadiusMedium,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
    ...Platform.select({
      ios: {
        shadowColor: '#B33927',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 12px rgba(179, 57, 39, 0.2)',
      },
    }),
  },
  addNewBtnIcon: {
    fontSize: 22,
  },
  addNewBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  addNewBtnSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  toastBanner: {
    padding: Spacing.three,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  listContainer: {
    gap: Spacing.three,
  },
  emptyBox: {
    padding: Spacing.five,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  personCard: {
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  personCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  personThumbnailBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    overflow: 'hidden',
  },
  personThumbnail: {
    width: '100%',
    height: '100%',
  },
  personInfoCol: {
    flex: 1,
    gap: Spacing.one,
  },
  personName: {
    fontSize: 20,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  relationshipBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  relationshipBadgeText: {
    fontSize: 13,
  },
  voiceBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  voiceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  personCardActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionEditBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionEditBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionDeleteBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionDeleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 24, 20, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalKeyboardAvoid: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '92%',
  },
  modalCard: {
    borderRadius: DementiaUX.borderRadiusLarge,
    borderWidth: 1.5,
    overflow: 'hidden',
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.22)',
      },
    }),
  },
  modalHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 999,
  },
  modalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
  },
  formScroll: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  inputGroup: {
    gap: Spacing.one,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  fieldError: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  textInput: {
    height: 50,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    fontWeight: '500',
  },
  photoPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  photoPreviewBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoButtonCol: {
    flex: 1,
    gap: Spacing.two,
  },
  photoActionBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  photoActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  photoActionBtnSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  // Voice Recording Styles
  recordingActiveCard: {
    padding: Spacing.three,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    gap: Spacing.two,
    alignItems: 'center',
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pulseDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  recordingActiveTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  recordingActiveHint: {
    fontSize: 13,
    fontWeight: '500',
  },
  stopRecordingBtn: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  stopRecordingBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  voiceReadyCard: {
    padding: Spacing.three,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    gap: Spacing.two,
  },
  voiceReadyHeader: {
    gap: 2,
  },
  voiceReadyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  voiceReadySubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  voiceReadyActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  previewBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  rerecordBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rerecordBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  startRecordBtn: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 3,
  },
  startRecordBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  startRecordBtnSubtext: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  // Delete Dialog Styles
  deleteDialogCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: DementiaUX.borderRadiusLarge,
    borderWidth: 1.5,
    padding: Spacing.four,
    gap: Spacing.three,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  deleteSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  deletePersonPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    gap: Spacing.three,
  },
  deletePersonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  deletePersonName: {
    fontSize: 17,
    fontWeight: '800',
  },
  deletePersonRel: {
    fontSize: 13,
    marginTop: 2,
  },
  deleteNotice: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  deleteCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
