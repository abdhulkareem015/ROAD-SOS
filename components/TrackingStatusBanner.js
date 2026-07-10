import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import backgroundTrackingService from '../services/BackgroundTrackingService';
import batteryOptimizationService from '../services/BatteryOptimizationService';

export default function TrackingStatusBanner({ colors }) {
  const [isBgActive, setIsBgActive] = useState(false);
  const [batteryMode, setBatteryMode] = useState('normal');

  useEffect(() => {
    const unsubBg = backgroundTrackingService.subscribe(setIsBgActive);
    const unsubBattery = batteryOptimizationService.subscribe(setBatteryMode);

    return () => {
      unsubBg();
      unsubBattery();
    };
  }, []);

  const modeLabels = {
    emergency: '🚨 EMERGENCY MONITORING (HIGH HERTZ)',
    normal: '📡 BALANCED GPS TRACKING',
    saver: '🔋 BATTERY OPTIMIZED (SAVER)'
  };

  const statusBg = isBgActive ? 'rgba(52, 199, 89, 0.15)' : 'rgba(142, 142, 147, 0.1)';
  const statusBorder = isBgActive ? colors.success : colors.border;
  const statusText = isBgActive ? 'LIVE BACKEND MONITORING ACTIVE' : 'GPS STANDBY / TERMINATED';

  return (
    <View style={[styles.container, { backgroundColor: statusBg, borderColor: statusBorder }]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: isBgActive ? colors.success : colors.textTertiary }]} />
        <Text style={[styles.statusText, { color: isBgActive ? colors.success : colors.textSecondary }]}>
          {statusText}
        </Text>
      </View>
      <Text style={[styles.modeText, { color: colors.textSecondary }]}>
        Profile: {modeLabels[batteryMode]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginVertical: 6,
    width: '100%'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  modeText: {
    fontSize: 10,
    fontWeight: '600'
  }
});
