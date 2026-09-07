import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';

interface PatientHeaderProps {
  onAdminTrigger: () => void;
}

export function PatientHeader({ onAdminTrigger }: PatientHeaderProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const [isPressing, setIsPressing] = useState<boolean>(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    setIsPressing(true);
    progressAnim.setValue(0);
    // Animate smoothly over 3 seconds
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressing(false);
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
  };

  const handleLongPress = () => {
    setIsPressing(false);
    progressAnim.setValue(0);
    onAdminTrigger();
  };

  // Border glow or width interpolation
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, Spacing.three),
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}>
      <View style={styles.content}>
        {/* Left: App Logo with 3-second long-press hidden trigger */}
        <Pressable
          delayLongPress={3000}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={handleLongPress}
          accessibilityLabel="স্মৃতি-NER লোগো"
          accessibilityHint="লোগোটি ৩ সেকেন্ড চেপে ধরে রাখলে অ্যাডমিন মেনু খুলবে"
          style={({ pressed }) => [
            styles.logoContainer,
            {
              backgroundColor: colors.brandLight,
              borderColor: isPressing ? colors.brand : colors.border,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}>
          {/* Subtle 3-second charge progress bar along the bottom of the logo */}
          {isPressing && (
            <Animated.View
              style={[
                styles.chargeBar,
                {
                  backgroundColor: colors.brand,
                  width: progressWidth,
                },
              ]}
            />
          )}

          {/* Bengali Alpana / Memory Motif Icon */}
          <Text style={[styles.logoIcon, { color: colors.brand }]}>
            🌸
          </Text>
        </Pressable>

        {/* Center/Title: Bengali Branding */}
        <View style={styles.titleArea}>
          <Text style={[styles.brandTitle, { color: colors.brand }]}>
            স্মৃতি-NER
          </Text>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
            স্মৃতি ও অনুভূতির সঙ্গী • Smriti-NER
          </Text>
        </View>

        {/* Right: Cultural peace indicator (calm lotus/diya accent) */}
        <View
          style={[
            styles.rightAccent,
            { backgroundColor: colors.amberLight, borderColor: colors.border },
          ]}>
          <Text style={styles.accentEmoji}>🪔</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.three,
    paddingHorizontal: Spacing.four,
    ...Platform.select({
      ios: {
        shadowColor: '#2D241E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(45, 36, 30, 0.04)',
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  chargeBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 4,
  },
  logoIcon: {
    fontSize: 28,
  },
  titleArea: {
    flex: 1,
    marginLeft: Spacing.three,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  rightAccent: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentEmoji: {
    fontSize: 22,
  },
});
