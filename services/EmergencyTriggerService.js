import { Share, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import locationSyncService from './LocationSyncService';

class EmergencyTriggerService {
  /**
   * Dispatches absolute SOS payload to backend and opens native share sheet
   */
  async triggerSos(coords, address = '') {
    try {
      const backendUrl = (await AsyncStorage.getItem('@roadsos_backend_url')) || 'http://localhost:3000';
      const contactsStr = await AsyncStorage.getItem('@roadsos_contacts');
      const contacts = contactsStr ? JSON.parse(contactsStr) : [];

      const { latitude, longitude, accuracy } = coords;
      const resolvedAddress = address || `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`;

      // 1. Log event in local history database
      await locationSyncService.logEmergencyEvent({
        type: 'SOS_TRIGGERED',
        latitude,
        longitude,
        address: resolvedAddress
      });

      // 2. Open SMS/Native Share
      const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      const message = `🚨 RoadSOS EMERGENCY BROADCAST 🚨\nLocation locked:\nLat: ${latitude.toFixed(6)}\nLon: ${longitude.toFixed(6)}\nAccuracy: ±${accuracy?.toFixed(0) || 10}m\nAddress: ${resolvedAddress}\nTrack: ${mapsUrl}`;

      try {
        await Share.share({ message });
      } catch (e) {
        console.warn('SMS share cancelled or failed');
      }

      // 3. Dispatch to central server API
      const response = await fetch(`${backendUrl}/api/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude,
          longitude,
          contacts,
          timestamp: new Date().toISOString(),
          source: 'EmergencyTriggerService Absolute Call'
        })
      });

      if (!response.ok) {
        throw new Error('Server rejected dispatch');
      }

      return true;
    } catch (error) {
      console.warn('[SOS Dispatch Error]', error.message);
      // Fallback
      Alert.alert(
        'Offline SOS Active',
        'Local SOS initiated! Shared coordinates via device native channels. Server sync pending.'
      );
      return false;
    }
  }
}

const emergencyTriggerServiceInstance = new EmergencyTriggerService();
export default emergencyTriggerServiceInstance;
