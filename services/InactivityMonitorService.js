import AsyncStorage from '@react-native-async-storage/async-storage';

class InactivityMonitorService {
  /**
   * Initializes inactivity state defaults
   */
  async initializeSettings(limitMinutes = 3) {
    try {
      await AsyncStorage.setItem('@roadsos_inactivity_threshold', limitMinutes.toString());
      await AsyncStorage.setItem('@roadsos_inactivity_alarm_state', 'idle');
      await AsyncStorage.setItem('@roadsos_inactivity_monitoring_enabled', 'true');
      await this.resetTimer();
    } catch (e) {
      console.warn('[InactivityMonitorService Init Error]', e.message);
    }
  }

  /**
   * Resets stationary timers
   */
  async resetTimer() {
    try {
      const now = Date.now();
      const lastLocStr = await AsyncStorage.getItem('@roadsos_last_location');
      
      const point = {
        latitude: 0,
        longitude: 0,
        timestamp: now,
        speed: 0
      };

      if (lastLocStr) {
        const lastLoc = JSON.parse(lastLocStr);
        point.latitude = lastLoc.coords.latitude;
        point.longitude = lastLoc.coords.longitude;
        point.speed = lastLoc.coords.speed || 0;
      }

      await AsyncStorage.setItem('@roadsos_last_moving_location', JSON.stringify(point));
      await AsyncStorage.setItem('@roadsos_inactivity_alarm_state', 'idle');
      await AsyncStorage.removeItem('@roadsos_inactivity_warning_timestamp');
      await AsyncStorage.setItem('@roadsos_high_speed_detected', 'false');
      console.log('[InactivityMonitorService] Timer reset.');
    } catch (e) {
      console.warn('[InactivityMonitorService Reset Error]', e.message);
    }
  }

  /**
   * Toggles background inactivity monitor
   */
  async setMonitoringEnabled(enabled) {
    try {
      await AsyncStorage.setItem('@roadsos_inactivity_monitoring_enabled', enabled ? 'true' : 'false');
      if (enabled) {
        await this.resetTimer();
      } else {
        await AsyncStorage.setItem('@roadsos_inactivity_alarm_state', 'idle');
      }
    } catch (e) {
      console.warn('[InactivityService Toggle Error]', e.message);
    }
  }

  /**
   * Gets current safety warning alarm state
   * @returns {Promise<string>} 'idle' | 'warning' | 'triggered'
   */
  async getAlarmState() {
    try {
      return (await AsyncStorage.getItem('@roadsos_inactivity_alarm_state')) || 'idle';
    } catch (e) {
      return 'idle';
    }
  }
}

const inactivityMonitorServiceInstance = new InactivityMonitorService();
export default inactivityMonitorServiceInstance;
