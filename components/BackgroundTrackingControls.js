import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import backgroundTrackingService from '../services/BackgroundTrackingService';
import batteryOptimizationService from '../services/BatteryOptimizationService';
import inactivityMonitorService from '../services/InactivityMonitorService';
import locationSyncService from '../services/LocationSyncService';

export default function BackgroundTrackingControls({ colors }) {
  const [isBgActive, setIsBgActive] = useState(false);
  const [batteryMode, setBatteryMode] = useState('normal');
  const [inactivityMins, setInactivityMins] = useState(3);
  const [logCount, setLogCount] = useState(0);

  useEffect(() => {
    const unsubBg = backgroundTrackingService.subscribe(setIsBgActive);
    const unsubBattery = batteryOptimizationService.subscribe(setBatteryMode);

    loadHistoryCount();

    return () => {
      unsubBg();
      unsubBattery();
    };
  }, []);

  const loadHistoryCount = async () => {
    const history = await locationSyncService.getLocationHistory();
    setLogCount(history.length);
  };

  const handleToggleBg = async (value) => {
    try {
      if (value) {
        await backgroundTrackingService.startTracking();
        Alert.alert('Tracking Active', 'Background GPS tracking is active. App location heartbeats will persist while minimized.');
      } else {
        await backgroundTrackingService.stopTracking();
        Alert.alert('Tracking Standby', 'Background location tracking stopped.');
      }
    } catch (e) {
      Alert.alert('Permission Required', e.message);
    }
  };

  const handleModeChange = async (mode) => {
    await batteryOptimizationService.setMode(mode);
    // Restart tracking if active to apply new battery configs
    if (isBgActive) {
      await backgroundTrackingService.stopTracking();
      await backgroundTrackingService.startTracking();
    }
  };

  const handleMinsChange = async (mins) => {
    setInactivityMins(mins);
    await inactivityMonitorService.initializeSettings(mins);
  };

  const handleClearLogs = async () => {
    await locationSyncService.clearHistory();
    await loadHistoryCount();
    Alert.alert('History Cleared', 'Local background tracking logs cleared.');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>BACKGROUND EMERGENCY TRACKING</Text>

      {/* Main Switch */}
      <View style={styles.toggleRow}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={[styles.title, { color: colors.text }]}>Safe-Guard Background Watcher</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Keeps GPS active when app minimized. Wakes inactivity alarm during stops.
          </Text>
        </View>
        <Switch
          trackColor={{ false: '#767577', true: colors.success }}
          thumbColor={isBgActive ? '#ffffff' : '#f4f3f4'}
          onValueChange={handleToggleBg}
          value={isBgActive}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Battery Profiles */}
      <View style={{ marginBottom: 12 }}>
        <Text style={[styles.title, { color: colors.text, marginBottom: 8 }]}>Battery Optimization Profile</Text>
        <View style={styles.btnRow}>
          {[
            { key: 'saver', label: '🔋 Saver' },
            { key: 'normal', label: '📡 Balanced' },
            { key: 'emergency', label: '🚨 High Hertz' }
          ].map((mode) => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.modeBtn,
                {
                  backgroundColor: batteryMode === mode.key ? colors.primary : colors.surfaceHighlight,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => handleModeChange(mode.key)}
            >
              <Text style={[styles.btnText, { color: batteryMode === mode.key ? '#ffffff' : colors.text }]}>
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Safety Timer Config */}
      <View style={{ marginBottom: 12 }}>
        <Text style={[styles.title, { color: colors.text, marginBottom: 8 }]}>Inactivity Timeout Limit</Text>
        <View style={styles.btnRow}>
          {[1, 3, 5, 10].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.modeBtn,
                {
                  backgroundColor: inactivityMins === mins ? colors.primary : colors.surfaceHighlight,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => handleMinsChange(mins)}
            >
              <Text style={[styles.btnText, { color: inactivityMins === mins ? '#ffffff' : colors.text }]}>
                {mins} Min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Local Logging Stats */}
      <View style={styles.footerRow}>
        <Text style={[styles.logText, { color: colors.textSecondary }]}>
          Logs in Cache: {logCount} / 100 locations
        </Text>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearLogs}>
          <Text style={[styles.clearBtnText, { color: colors.primary }]}>Clear Logs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modeBtn: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  }
});
