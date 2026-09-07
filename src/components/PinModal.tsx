import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useColorScheme,
} from 'react-native';
import { Colors, DementiaUX, Spacing } from '@/constants/theme';

interface PinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CORRECT_PIN = '1234';

export function PinModal({ visible, onClose, onSuccess }: PinModalProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [pin, setPin] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setPin('');
      setHasError(false);
    }
  }, [visible]);

  const handleKeyPress = (num: string) => {
    if (hasError) setHasError(false);
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);

      if (nextPin.length === 4) {
        if (nextPin === CORRECT_PIN) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 150);
        } else {
          setHasError(true);
          setTimeout(() => {
            setPin('');
          }, 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (hasError) setHasError(false);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setHasError(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: colors.brandLight }]}>
              <Text style={[styles.badgeText, { color: colors.brand }]}>
                পরিচর্যাকারী সুরক্ষা • Caregiver Admin
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              অ্যাডমিন পিন দিন
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter 4-digit caregiver PIN (Default: 1234)
            </Text>
          </View>

          {/* PIN Indicators */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      borderColor: hasError
                        ? colors.danger
                        : isFilled
                        ? colors.brand
                        : colors.borderHighlight,
                      backgroundColor: hasError
                        ? colors.dangerLight
                        : isFilled
                        ? colors.brand
                        : 'transparent',
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Error Message */}
          {hasError && (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>
                ভুল পিন! আবার চেষ্টা করুন • Incorrect PIN
              </Text>
            </View>
          )}

          {/* Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['C', '0', '⌫'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((btn) => {
                  const isAction = btn === 'C' || btn === '⌫';
                  return (
                    <Pressable
                      key={btn}
                      onPress={() => {
                        if (btn === 'C') handleClear();
                        else if (btn === '⌫') handleBackspace();
                        else handleKeyPress(btn);
                      }}
                      style={({ pressed }) => [
                        styles.key,
                        {
                          backgroundColor: isAction
                            ? colors.backgroundElement
                            : colors.surface,
                          borderColor: colors.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.keyText,
                          {
                            color: isAction ? colors.textSecondary : colors.text,
                            fontSize: isAction ? 20 : 28,
                          },
                        ]}>
                        {btn}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Cancel Button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelButton,
              {
                backgroundColor: colors.backgroundElement,
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              ফিরে যান • Return to Patient View
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 36, 30, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: DementiaUX.borderRadiusLarge,
    padding: Spacing.five,
    borderWidth: 1.5,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  badge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    marginBottom: Spacing.two,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginVertical: Spacing.three,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
  },
  errorBox: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 8,
    marginBottom: Spacing.two,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  keypad: {
    width: '100%',
    gap: Spacing.two,
    marginVertical: Spacing.three,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  key: {
    flex: 1,
    height: 62,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontWeight: '700',
  },
  cancelButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
