import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const BATTERY_MODE_KEY = '@roadsos_battery_mode';

class BatteryOptimizationService {
  constructor() {
    this.currentMode = 'normal'; // 'emergency' | 'normal' | 'saver'
    this.listeners = new Set();
    this.loadCachedMode();
  }

  async loadCachedMode() {
    try {
      const mode = await AsyncStorage.getItem(BATTERY_MODE_KEY);
      if (mode) {
        this.currentMode = mode;
        this._notifyListeners();
      }
    } catch (e) {
      console.warn('[BatteryService Load Error]', e.message);
    }
  }

  /**
   * Sets battery optimization profile mode
   * @param {string} mode - 'emergency' | 'normal' | 'saver'
   */
  async setMode(mode) {
    if (mode !== 'emergency' && mode !== 'normal' && mode !== 'saver') return;
    this.currentMode = mode;
    try {
      await AsyncStorage.setItem(BATTERY_MODE_KEY, mode);
    } catch (e) {
      console.warn('[BatteryService Save Error]', e.message);
    }
    this._notifyListeners();
  }

  getMode() {
    return this.currentMode;
  }

  /**
   * Generates location watch configurations based on active battery mode
   */
  getLocationOptions() {
    switch (this.currentMode) {
      case 'emergency':
        return {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 2000, // 2s
          distanceInterval: 1, // 1m
          // Android specific foreground service options
          foregroundService: {
            notificationTitle: 'RoadSOS Active Emergency Monitor',
            notificationBody: 'High-frequency GPS tracking is active to keep you safe.',
            notificationColor: '#FF3B30',
          }
        };
      case 'saver':
        return {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000, // 60s
          distanceInterval: 50, // 50m
          foregroundService: {
            notificationTitle: 'RoadSOS Background Tracking (Saver)',
            notificationBody: 'Location coordinates updates are optimized for battery saving.',
            notificationColor: '#8E8E93',
          }
        };
      case 'normal':
      default:
        return {
          accuracy: Location.Accuracy.High,
          timeInterval: 15000, // 15s
          distanceInterval: 10, // 10m
          foregroundService: {
            notificationTitle: 'RoadSOS Background Tracking Active',
            notificationBody: 'Coordinates updates are syncing in the background.',
            notificationColor: '#007AFF',
          }
        };
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.currentMode);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners() {
    this.listeners.forEach((listener) => listener(this.currentMode));
  }
}

const batteryOptimizationServiceInstance = new BatteryOptimizationService();
export default batteryOptimizationServiceInstance;
