import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import locationSyncService from '../services/LocationSyncService';

export const BACKGROUND_LOCATION_TASK = 'roadsos-background-location';

/**
 * Helper to calculate distance (in meters) between two coordinates
 */
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Periodic Heartbeat writer
 */
async function writeHeartbeat(location) {
  try {
    const heartbeat = {
      lastActive: new Date(location.timestamp).toISOString(),
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || 0,
      batteryLevel: 100, // Fallback if hardware api inaccessible in raw background
      networkStatus: 'online', // Updated reactively by app state
      trackingState: 'background'
    };
    await AsyncStorage.setItem('@roadsos_heartbeat', JSON.stringify(heartbeat));
  } catch (e) {
    console.warn('[Background Heartbeat error]', e.message);
  }
}

/**
 * Background Inactivity Evaluator
 */
async function runBackgroundInactivityCheck(location) {
  try {
    const speedKmh = location.coords.speed !== null ? location.coords.speed * 3.6 : 0;
    const now = Date.now();

    // 1. Fetch user-defined threshold and active alarm configurations
    const thresholdMinutesStr = await AsyncStorage.getItem('@roadsos_inactivity_threshold');
    const thresholdMinutes = thresholdMinutesStr ? parseInt(thresholdMinutesStr) : 3;
    const thresholdMs = thresholdMinutes * 60 * 1000;

    const monitoringActiveStr = await AsyncStorage.getItem('@roadsos_inactivity_monitoring_enabled');
    const isMonitoringEnabled = monitoringActiveStr === 'true';

    if (!isMonitoringEnabled) return;

    // Load last known moving location
    const movingLocStr = await AsyncStorage.getItem('@roadsos_last_moving_location');
    const lastMoving = movingLocStr ? JSON.parse(movingLocStr) : null;

    // Load deceleration trigger tracking state
    const highSpeedStr = await AsyncStorage.getItem('@roadsos_high_speed_detected');
    const wasHighSpeed = highSpeedStr === 'true';

    // Update moving location state if speed > 5 km/h
    if (speedKmh > 5) {
      const movingPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: now,
        speed: speedKmh
      };
      await AsyncStorage.setItem('@roadsos_last_moving_location', JSON.stringify(movingPoint));
      
      // Track high speed deceleration profile (e.g. > 40 km/h)
      if (speedKmh > 40) {
        await AsyncStorage.setItem('@roadsos_high_speed_detected', 'true');
      }
    } else {
      // User is stationary/slow
      if (lastMoving) {
        const timeStationary = now - lastMoving.timestamp;
        const distanceMoved = getDistanceMeters(
          lastMoving.latitude,
          lastMoving.longitude,
          location.coords.latitude,
          location.coords.longitude
        );

        // If stationary time exceeds limit or a high speed sudden stop is detected (speed 0 for > 1 min)
        const isDecelerationEmergency = wasHighSpeed && timeStationary > 60000 && distanceMoved < 15;
        const isStandardInactivity = timeStationary > thresholdMs && distanceMoved < 15;

        if (isDecelerationEmergency || isStandardInactivity) {
          // Verify if alarm has already been triggered to avoid multiple dispatches
          const alarmState = await AsyncStorage.getItem('@roadsos_inactivity_alarm_state');
          
          if (alarmState !== 'triggered' && alarmState !== 'warning') {
            console.log(`[Background Inactivity Alert] Triggered! Standard: ${isStandardInactivity}, Decel: ${isDecelerationEmergency}`);
            
            // Mark state as warning to show safety validation modal in foreground
            await AsyncStorage.setItem('@roadsos_inactivity_alarm_state', 'warning');
            await AsyncStorage.setItem('@roadsos_inactivity_warning_timestamp', now.toString());
            
            // Auto dispatch emergency sequence directly from background thread in 15 seconds if not dismissed
            setTimeout(async () => {
              const currentAlarm = await AsyncStorage.getItem('@roadsos_inactivity_alarm_state');
              if (currentAlarm === 'warning') {
                await dispatchBackgroundEmergency(location);
              }
            }, 15000);
          }
        }
      } else {
        // Initialize moving location
        const movingPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: now,
          speed: speedKmh
        };
        await AsyncStorage.setItem('@roadsos_last_moving_location', JSON.stringify(movingPoint));
      }
    }
  } catch (e) {
    console.warn('[Background Inactivity Check Error]', e.message);
  }
}

/**
 * Helper to dispatch emergency alerts directly from the background thread
 */
async function dispatchBackgroundEmergency(location) {
  try {
    await AsyncStorage.setItem('@roadsos_inactivity_alarm_state', 'triggered');

    // Retrieve configurations
    const backendUrl = (await AsyncStorage.getItem('@roadsos_backend_url')) || 'http://localhost:3000';
    const contactsStr = await AsyncStorage.getItem('@roadsos_contacts');
    const contacts = contactsStr ? JSON.parse(contactsStr) : [];

    const payload = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      address: `Background tracking automated alert (Inactivity Detected)`,
      contacts: contacts,
      timestamp: new Date().toISOString(),
      source: 'Background Inactivity Monitor Watchdog'
    };

    console.log('[Background Dispatch] Sending emergency SOS payload to server...', payload);

    await fetch(`${backendUrl}/api/sos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn('[Background Dispatch SOS Failure]', e.message);
  }
}

// Define the Location Task with the TaskManager
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[Background Location Task Error]', error.message);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[0];
      
      // Save to last location for UI consumption
      await AsyncStorage.setItem('@roadsos_last_location', JSON.stringify(location));
      
      // 1. Log to history database
      await locationSyncService.logLocation(location);
      
      // 2. Perform inactivity verification
      await runBackgroundInactivityCheck(location);
      
      // 3. Log active heartbeat
      await writeHeartbeat(location);
    }
  }
});
