import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, DementiaUX, Spacing } from '@/constants/theme';

export type PatientTab = 'games' | 'listen';

interface PatientTabBarProps {
  activeTab: PatientTab;
  onSelectTab: (tab: PatientTab) => void;
}

export function PatientTabBar({ activeTab, onSelectTab }: PatientTabBarProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const tabs: { id: PatientTab; bengali: string; english: string; icon: string }[] = [
    {
      id: 'games',
      bengali: 'খেলা',
      english: 'Games',
      icon: '🧩',
    },
    {
      id: 'listen',
      bengali: 'শুনুন',
      english: 'Listen',
      icon: '📻',
    },
  ];

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
      ]}>
      <View style={styles.barContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.bengali} ট্যাব`}
              style={({ pressed }) => [
                styles.tabItem,
                {
                  backgroundColor: isActive
                    ? colors.brand
                    : colors.backgroundElement,
                  borderColor: isActive ? colors.brand : colors.border,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}>
              <Text
                style={[
                  styles.tabIcon,
                  {
                    filter: isActive ? 'none' : 'grayscale(20%)',
                  } as any,
                ]}>
                {tab.icon}
              </Text>
              <View style={styles.textContainer}>
                <Text
                  style={[
                    styles.bengaliLabel,
                    {
                      color: isActive ? '#FFFFFF' : colors.text,
                    },
                  ]}>
                  {tab.bengali}
                </Text>
                <Text
                  style={[
                    styles.englishLabel,
                    {
                      color: isActive ? 'rgba(255, 255, 255, 0.85)' : colors.textSecondary,
                    },
                  ]}>
                  {tab.english}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1.5,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    ...Platform.select({
      ios: {
        shadowColor: '#2D241E',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -4px 12px rgba(45, 36, 30, 0.05)',
      },
    }),
  },
  barContainer: {
    flexDirection: 'row',
    gap: Spacing.three,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: Spacing.one,
  },
  tabItem: {
    flex: 1,
    height: 74, // Massive tap target for elderly dementia patients
    borderRadius: DementiaUX.borderRadiusMedium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
  },
  tabIcon: {
    fontSize: 32,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  bengaliLabel: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  englishLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
