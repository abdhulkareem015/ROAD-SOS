import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_HISTORY_KEY = '@roadsos_location_history';
const MAX_LOG_SIZE = 100; // Limit history to prevent excessive storage usage

class LocationSyncService {
  /**
   * Logs a single coordinates update into device history
   */
  async logLocation(location) {
    try {
      const historyStr = await AsyncStorage.getItem(LOCATION_HISTORY_KEY);
      const history = historyStr ? JSON.parse(historyStr) : [];

      const formattedLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: new Date(location.timestamp).toISOString(),
        speed: location.coords.speed !== null ? location.coords.speed * 3.6 : 0, // Convert m/s to km/h
        heading: location.coords.heading || 0
      };

      // Push to front (newest first)
      history.unshift(formattedLocation);

      // Prune history size
      if (history.length > MAX_LOG_SIZE) {
        history.splice(MAX_LOG_SIZE);
      }

      await AsyncStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(history));
      return formattedLocation;
    } catch (e) {
      console.warn('[LocationSyncService Log Error]', e.message);
      return null;
    }
  }

  /**
   * Retrieves all logged location coordinates
   */
  async getLocationHistory() {
    try {
      const historyStr = await AsyncStorage.getItem(LOCATION_HISTORY_KEY);
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Cleans location logs from the device storage
   */
  async clearHistory() {
    try {
      await AsyncStorage.removeItem(LOCATION_HISTORY_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Logs an emergency action payload to device history
   */
  async logEmergencyEvent(event) {
    try {
      const eventLogKey = '@roadsos_emergency_events';
      const eventsStr = await AsyncStorage.getItem(eventLogKey);
      const events = eventsStr ? JSON.parse(eventsStr) : [];

      events.unshift({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...event
      });

      // Keep last 50 events
      if (events.length > 50) {
        events.splice(50);
      }

      await AsyncStorage.setItem(eventLogKey, JSON.stringify(events));
    } catch (e) {
      console.warn('[LocationSyncService Event Error]', e.message);
    }
  }
}

const locationSyncServiceInstance = new LocationSyncService();
export default locationSyncServiceInstance;
