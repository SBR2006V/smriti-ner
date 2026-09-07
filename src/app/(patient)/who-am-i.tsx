import { Colors, DementiaUX, Spacing } from '@/constants/theme';
import { soundManager } from '@/services/audio';
import { getWhoAmIPeople, SEEDED_DEMO_PERSON, WhoAmIPerson } from '@/services/storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

const DEFAULT_AVATAR_ASSET = require('@/assets/images/icon.png');

/**
 * Resolves a person's photoUri into a valid React Native Image source.
 * Handles local device file URIs, remote URLs, and local bundled placeholder assets.
 */
function resolvePersonPhoto(photoUri?: string | null): any {
  if (!photoUri || photoUri === 'placeholder-daughter' || photoUri === 'default-avatar') {
    return DEFAULT_AVATAR_ASSET;
  }
  if (
    photoUri.startsWith('file:') ||
    photoUri.startsWith('http://') ||
    photoUri.startsWith('https://') ||
    photoUri.startsWith('data:') ||
    photoUri.startsWith('blob:')
  ) {
    return { uri: photoUri };
  }
  return DEFAULT_AVATAR_ASSET;
}

export default function WhoAmIScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  // Initialized with SEEDED_DEMO_PERSON so screen is never empty
  const [people, setPeople] = useState<WhoAmIPerson[]>([SEEDED_DEMO_PERSON]);
  const [activeAudioPersonId, setActiveAudioPersonId] = useState<string | null>(null);

  // Load people on mount from AsyncStorage
  useEffect(() => {
    let isMounted = true;
    getWhoAmIPeople().then((storedPeople) => {
      if (isMounted) {
        setPeople(storedPeople);
      }
    });

    return () => {
      isMounted = false;
      soundManager.stop();
    };
  }, []);

  const handleBack = () => {
    soundManager.stop();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(patient)/listen');
    }
  };

  const handleToggleVoice = useCallback((person: WhoAmIPerson) => {
    if (!person.audioUri) return;

    if (activeAudioPersonId === person.id) {
      soundManager.stopPersonVoice();
      setActiveAudioPersonId(null);
    } else {
      setActiveAudioPersonId(person.id);
      soundManager.playPersonVoice(person.id, person.audioUri, () => {
        setActiveAudioPersonId(null);
      });
    }
  }, [activeAudioPersonId]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {/* Dementia-Friendly Large Back Button */}
      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel="ফিরে যান, শুনুন তালিকায় ফেরত যাবেন"
        style={({ pressed }) => [
          styles.backButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}>
        <Text style={[styles.backButtonIcon, { color: colors.brand }]}>←</Text>
        <Text style={[styles.backButtonText, { color: colors.brand }]}>
          ফিরে যান • Back
        </Text>
      </Pressable>

      {/* Screen Title & Header Section */}
      <View style={styles.headerSection}>
        <Text style={[styles.title, { color: colors.text }]}>
          কে আমি?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Who Am I? • Personal Identity
        </Text>

        {/* Gentle Bengali Instruction */}
        <View
          style={[
            styles.instructionBanner,
            { backgroundColor: colors.brandLight, borderColor: colors.border },
          ]}>
          <Text style={styles.instructionIcon}>🌸</Text>
          <Text style={[styles.instructionText, { color: colors.brand }]}>
            পরিচিত মানুষদের চিনে নিন
          </Text>
        </View>
      </View>

      {/* People Card List */}
      <View style={styles.peopleList}>
        {people.map((person) => {
          const isPlaying = activeAudioPersonId === person.id;
          const hasAudio = !!person.audioUri;

          return (
            <View
              key={person.id}
              style={[
                styles.personCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              {/* Large Photo Container */}
              <View
                style={[
                  styles.photoContainer,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.borderHighlight,
                  },
                ]}>
                <Image
                  source={resolvePersonPhoto(person.photoUri)}
                  style={styles.photo}
                  resizeMode="contain"
                  accessibilityLabel={`${person.name} এর ছবি`}
                />
              </View>

              {/* Name & Relationship */}
              <View style={styles.infoGroup}>
                <Text style={[styles.personName, { color: colors.text }]}>
                  {person.name}
                </Text>

                <View
                  style={[
                    styles.relationshipBadge,
                    {
                      backgroundColor: colors.oliveLight,
                      borderColor: colors.border,
                    },
                  ]}>
                  <Text style={[styles.relationshipText, { color: colors.olive }]}>
                    {person.relationship}
                  </Text>
                </View>
              </View>

              {/* Large Audio Play/Pause Button */}
              {hasAudio ? (
                <Pressable
                  onPress={() => handleToggleVoice(person)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPlaying
                      ? `${person.name} এর কণ্ঠ থামান`
                      : `${person.name} এর কণ্ঠ শুনুন`
                  }
                  style={({ pressed }) => [
                    styles.audioButton,
                    {
                      backgroundColor: isPlaying ? colors.oliveLight : colors.brandLight,
                      borderColor: isPlaying ? colors.olive : colors.brand,
                      opacity: pressed ? 0.88 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}>
                  <Text
                    style={[
                      styles.audioButtonText,
                      { color: isPlaying ? colors.olive : colors.brand },
                    ]}>
                    {isPlaying ? '⏸️ থামান • Pause' : '🔊 শুনুন • Listen'}
                  </Text>
                </Pressable>
              ) : (
                <View
                  style={[
                    styles.audioButton,
                    styles.audioButtonDisabled,
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.audioButtonTextDisabled,
                      { color: colors.textSecondary },
                    ]}>
                    🔊 কোনো কণ্ঠ নেই
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: Spacing.seven,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  backButtonIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSection: {
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: Spacing.two,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    gap: Spacing.two,
  },
  instructionIcon: {
    fontSize: 22,
  },
  instructionText: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  peopleList: {
    gap: Spacing.four,
  },
  personCard: {
    borderRadius: DementiaUX.borderRadiusLarge,
    borderWidth: 1.5,
    padding: Spacing.four,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  photoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    padding: Spacing.two,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  infoGroup: {
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  personName: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  relationshipBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1,
  },
  relationshipText: {
    fontSize: 18,
    fontWeight: '800',
  },
  audioButton: {
    width: '100%',
    maxWidth: 280,
    minHeight: 54,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  audioButtonDisabled: {
    opacity: 0.65,
  },
  audioButtonText: {
    fontSize: 18,
    fontWeight: '800',
  },
  audioButtonTextDisabled: {
    fontSize: 16,
    fontWeight: '700',
  },
});
