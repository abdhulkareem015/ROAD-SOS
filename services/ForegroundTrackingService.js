import * as Location from 'expo-location';

class ForegroundTrackingService {
  constructor() {
    this.subscription = null;
    this.listeners = new Set();
  }

  /**
   * Starts watching coordinates in foreground
   * @param {Object} options - Accuracy/frequency options from BatteryOptimizationService
   */
  async startWatching(options, onLocationUpdate) {
    if (this.subscription) {
      this.stopWatching();
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Foreground GPS permission denied.');
      }

      this.subscription = await Location.watchPositionAsync(
        options,
        (location) => {
          onLocationUpdate(location);
          this._notifyListeners(location);
        }
      );
      console.log('[ForegroundTrackingService] Active.');
    } catch (e) {
      console.error('[ForegroundTrackingService Start Error]', e.message);
      throw e;
    }
  }

  /**
   * Halts active foreground GPS watch listener
   */
  stopWatching() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
      console.log('[ForegroundTrackingService] Inactive.');
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners(location) {
    this.listeners.forEach((listener) => listener(location));
  }
}

const foregroundTrackingServiceInstance = new ForegroundTrackingService();
export default foregroundTrackingServiceInstance;
