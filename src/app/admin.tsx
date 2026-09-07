import { Colors, DementiaUX, Spacing } from '@/constants/theme';
import {
  getPatientProfile,
  PatientProfile,
  setPatientProfile,
} from '@/services/storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  // Patient Profile form state
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<string>('');
  const [patientDetails, setPatientDetails] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load existing profile on mount (pre-fill)
  useEffect(() => {
    getPatientProfile().then((profile) => {
      if (profile) {
        if (profile.name) setPatientName(profile.name);
        if (profile.age) setPatientAge(profile.age);
        if (profile.otherDetails) setPatientDetails(profile.otherDetails);
      }
    });
  }, []);

  const handleReturnToPatient = () => {
    router.replace('/(patient)');
  };

  const handleSaveProfile = async () => {
    if (!patientName.trim()) {
      setNameError('অনুগ্রহ করে রোগীর নাম লিখুন (Patient name is required)');
      return;
    }

    setIsSaving(true);
    setNameError('');
    try {
      const profile: PatientProfile = {
        name: patientName.trim(),
        age: patientAge.trim() || undefined,
        otherDetails: patientDetails.trim() || undefined,
      };
      await setPatientProfile(profile);
      setSaveSuccessMsg('✓ রোগীর প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে! (Profile saved)');
      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 4000);
    } catch (err) {
      setNameError('প্রোফাইল সংরক্ষণ করতে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {/* Admin Header */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.badge, { backgroundColor: colors.brandLight }]}>
              <Text style={[styles.badgeText, { color: colors.brand }]}>
                🔐 পরিচর্যাকারী ড্যাশবোর্ড • Caregiver Admin Dashboard
              </Text>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              অ্যাডমিন নিয়ন্ত্রণ প্যানেল
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              স্মৃতি-NER অ্যাপ পরিচালন, রোগীর প্রোফাইল ও সেটিংস এলাকা
            </Text>
          </View>

          {/* Patient Profile Section */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>🪷</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>
                  রোগীর পরিচিতি • Patient Profile
                </Text>
                <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
                  রোগীর নাম ও বিস্তারিত তথ্য সংরক্ষণ করুন। রোগীর নাম দিয়ে অ্যাপের সম্ভাষণ ব্যক্তিগত করা হবে।
                </Text>
              </View>
            </View>

            {/* Field 1: Name (Required) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                রোগীর নাম (Name) <Text style={{ color: colors.brand }}>*</Text>
              </Text>
              <TextInput
                value={patientName}
                onChangeText={(text) => {
                  setPatientName(text);
                  if (nameError) setNameError('');
                  if (saveSuccessMsg) setSaveSuccessMsg(null);
                }}
                placeholder="যেমন: অনিতা দেবী / Anita Devi"
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
                returnKeyType="next"
              />
              {nameError ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {nameError}
                </Text>
              ) : null}
            </View>

            {/* Field 2: Age (Optional, Numeric) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                বয়স (Age){' '}
                <Text style={[styles.optionalTag, { color: colors.textSecondary }]}>
                  (ঐচ্ছিক • Optional, Numeric)
                </Text>
              </Text>
              <TextInput
                value={patientAge}
                onChangeText={(text) => {
                  setPatientAge(text);
                  if (saveSuccessMsg) setSaveSuccessMsg(null);
                }}
                placeholder="যেমন: ৭৪ / 74"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                style={[
                  styles.textInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.border,
                  },
                ]}
                returnKeyType="next"
              />
            </View>

            {/* Field 3: Other Details (Optional, Free Text) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                অন্যান্য বিবরণ (Other Details / Notes){' '}
                <Text style={[styles.optionalTag, { color: colors.textSecondary }]}>
                  (ঐচ্ছিক • Optional)
                </Text>
              </Text>
              <TextInput
                value={patientDetails}
                onChangeText={(text) => {
                  setPatientDetails(text);
                  if (saveSuccessMsg) setSaveSuccessMsg(null);
                }}
                placeholder="যেমন: পছন্দের ডাকনাম 'মিনু', রবীন্দ্রসঙ্গীত ও পুরনো স্মৃতি শুনতে ভালোবাসেন..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                style={[
                  styles.textAreaInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.border,
                  },
                ]}
                textAlignVertical="top"
              />
            </View>

            {/* Success Feedback Banner */}
            {saveSuccessMsg ? (
              <View style={[styles.successBanner, { backgroundColor: colors.oliveLight, borderColor: colors.olive }]}>
                <Text style={[styles.successText, { color: colors.olive }]}>
                  {saveSuccessMsg}
                </Text>
              </View>
            ) : null}

            {/* Save Profile Button */}
            <Pressable
              onPress={handleSaveProfile}
              disabled={isSaving}
              accessibilityLabel="রোগীর প্রোফাইল সংরক্ষণ করুন"
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: colors.brand,
                  opacity: isSaving ? 0.6 : pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                },
              ]}>
              <Text style={styles.saveButtonText}>
                {isSaving
                  ? 'সংরক্ষণ করা হচ্ছে...'
                  : 'প্রোফাইল সংরক্ষণ করুন\n   Save Patient Profile'}
              </Text>
            </Pressable>
          </View>

          {/* Primary Action: Return to Patient View */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              রোগী মোডে ফিরে যাওয়া
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              রোগীর ব্যবহার উপযোগী সহজ ইন্টারফেসে ফিরে যেতে নিচের বোতামে চাপুন।
            </Text>

            <Pressable
              onPress={handleReturnToPatient}
              accessibilityLabel="রোগী মোডে ফিরে যান"
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: colors.brand,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                },
              ]}>
              <Text style={styles.primaryButtonText}>
                Caregiver Admin — Return to Patient View
              </Text>
              <Text style={styles.primaryButtonSubtext}>
                রোগী ইন্টারফেসে ফিরে যান
              </Text>
            </Pressable>
          </View>

          {/* Status & Developer Tools (Without Reset Setup) */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              সিস্টেম অবস্থা ও তথ্য
            </Text>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>ডিফল্ট পিন (Default PIN):</Text>
              <Text style={[styles.infoValue, { color: colors.brand }]}>1234</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>অ্যাডমিন ট্রিগার:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>হেডার লোগোতে ৩ সেকেন্ড প্রেস</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  card: {
    padding: Spacing.five,
    borderRadius: DementiaUX.borderRadiusLarge,
    borderWidth: 1.5,
    gap: Spacing.three,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  sectionEmoji: {
    fontSize: 28,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  inputGroup: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionalTag: {
    fontSize: 12,
    fontWeight: '500',
  },
  textInput: {
    height: 54,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: '500',
  },
  textAreaInput: {
    minHeight: 88,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  successBanner: {
    padding: Spacing.three,
    borderRadius: DementiaUX.borderRadiusMedium,
    borderWidth: 1,
    marginTop: Spacing.one,
  },
  successText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveButton: {
    height: 56,
    borderRadius: DementiaUX.borderRadiusMedium,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 70,
    borderRadius: DementiaUX.borderRadiusMedium,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
    ...Platform.select({
      ios: {
        shadowColor: '#B33927',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 14px rgba(179, 57, 39, 0.25)',
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8DFD5',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
});

