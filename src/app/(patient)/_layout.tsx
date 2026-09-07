import React, { useState } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { PatientHeader } from '@/components/PatientHeader';
import { PatientTabBar, PatientTab } from '@/components/PatientTabBar';
import { PinModal } from '@/components/PinModal';
import { Colors } from '@/constants/theme';

export default function PatientLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const pathname = usePathname();

  const [pinModalVisible, setPinModalVisible] = useState<boolean>(false);

  // Determine active tab based on route
  const activeTab: PatientTab =
    pathname.includes('listen') || pathname.includes('who-am-i') ? 'listen' : 'games';

  const handleSelectTab = (tab: PatientTab) => {
    if (tab === 'games') {
      router.navigate('/(patient)');
    } else {
      router.navigate('/(patient)/listen');
    }
  };

  const handleAdminSuccess = () => {
    setPinModalVisible(false);
    router.push('/admin');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Patient Header with Hidden 3-Second Long-Press Logo Trigger */}
      <PatientHeader onAdminTrigger={() => setPinModalVisible(true)} />

      {/* Screen Content */}
      <View style={styles.slotArea}>
        <Slot />
      </View>

      {/* Dementia-Friendly Two-Tab Bottom Navigation */}
      <PatientTabBar activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Hidden Caregiver Admin PIN Modal */}
      <PinModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onSuccess={handleAdminSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slotArea: {
    flex: 1,
  },
});
