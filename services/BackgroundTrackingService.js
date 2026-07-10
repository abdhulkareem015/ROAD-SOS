import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import batteryOptimizationService from './BatteryOptimizationService';
import { BACKGROUND_LOCATION_TASK } from '../tasks/locationBackgroundTask';

class BackgroundTrackingService {
  constructor() {
    this.isActive = false;
    this.listeners = new Set();
    this.checkTaskStatus();
  }

  async checkTaskStatus() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      this.isActive = isRegistered;
      await AsyncStorage.setItem('@roadsos_background_tracking_active', isRegistered ? 'true' : 'false');
      this._notifyListeners();
    } catch (e) {
      console.warn('[BackgroundTrackingService checkTaskStatus]', e.message);
    }
  }

  /**
   * Request location permissions sequentially (Foreground then Background)
   */
  async requestPermissions() {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      throw new Error('Foreground GPS permission denied. Cannot configure tracking.');
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      throw new Error('Background location permission denied. Go to system settings to toggle "Always Allow".');
    }

    return true;
  }

  /**
   * Starts background GPS tracking
   */
  async startTracking() {
    try {
      const isPermitted = await this.requestPermissions();
      if (!isPermitted) return false;

      const options = batteryOptimizationService.getLocationOptions();

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        ...options,
        // iOS specific background optimization options
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.AutomotiveNavigation,
      });

      this.isActive = true;
      await AsyncStorage.setItem('@roadsos_background_tracking_active', 'true');
      this._notifyListeners();
      console.log('[BackgroundTrackingService] Started successfully.');
      return true;
    } catch (e) {
      console.error('[BackgroundTrackingService Start Error]', e.message);
      throw e;
    }
  }

  /**
   * Stops background GPS tracking
   */
  async stopTracking() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
      this.isActive = false;
      await AsyncStorage.setItem('@roadsos_background_tracking_active', 'false');
      this._notifyListeners();
      console.log('[BackgroundTrackingService] Stopped successfully.');
      return true;
    } catch (e) {
      console.error('[BackgroundTrackingService Stop Error]', e.message);
      return false;
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.isActive);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners() {
    this.listeners.forEach((listener) => listener(this.isActive));
  }
}

const backgroundTrackingServiceInstance = new BackgroundTrackingService();
export default backgroundTrackingServiceInstance;
