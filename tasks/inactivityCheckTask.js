import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKGROUND_INACTIVITY_TASK = 'roadsos-background-inactivity-check';

/**
 * Diagnostic background task that runs periodic checks on device inactivity
 */
TaskManager.defineTask(BACKGROUND_INACTIVITY_TASK, async () => {
  try {
    const alarmState = await AsyncStorage.getItem('@roadsos_inactivity_alarm_state');
    const warningTimeStr = await AsyncStorage.getItem('@roadsos_inactivity_warning_timestamp');
    
    if (alarmState === 'warning' && warningTimeStr) {
      const now = Date.now();
      const warningTime = parseInt(warningTimeStr);
      
      // If 15 seconds have passed since warning without user resetting it, escalate
      if (now - warningTime > 15000) {
        console.log('[InactivityCheckTask] Escalating warning to active SOS due to inactivity...');
        await escalateEmergency();
      }
    }
  } catch (error) {
    console.error('[Inactivity Check Task Error]', error.message);
  }
});

async function escalateEmergency() {
  try {
    await AsyncStorage.setItem('@roadsos_inactivity_alarm_state', 'triggered');
    
    const lastLocStr = await AsyncStorage.getItem('@roadsos_last_location');
    if (!lastLocStr) return;
    
    const location = JSON.parse(lastLocStr);
    const backendUrl = (await AsyncStorage.getItem('@roadsos_backend_url')) || 'http://localhost:3000';
    const contactsStr = await AsyncStorage.getItem('@roadsos_contacts');
    const contacts = contactsStr ? JSON.parse(contactsStr) : [];

    await fetch(`${backendUrl}/api/sos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: 'Escalated Inactivity Warning Alarm',
        contacts,
        timestamp: new Date().toISOString(),
        source: 'Inactivity Background Diagnostic Task'
      })
    });
  } catch (e) {
    console.warn('[Escalation dispatch error]', e.message);
  }
}
