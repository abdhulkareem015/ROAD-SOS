import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKGROUND_HEARTBEAT_TASK = 'roadsos-background-heartbeat';

TaskManager.defineTask(BACKGROUND_HEARTBEAT_TASK, async () => {
  try {
    const lastLocStr = await AsyncStorage.getItem('@roadsos_last_location');
    const backendUrl = (await AsyncStorage.getItem('@roadsos_backend_url')) || 'http://localhost:3000';
    const trackingState = await AsyncStorage.getItem('@roadsos_background_tracking_active');

    if (lastLocStr && trackingState === 'true') {
      const location = JSON.parse(lastLocStr);
      
      const payload = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
        batteryLevel: 100, // Simulated default
        networkStatus: 'online',
        trackingState: 'background-heartbeat'
      };

      console.log('[Heartbeat Task] Dispatching periodic telemetry update...', payload);

      // Post to a test or telemetry log endpoint (e.g. SOS simulation logs)
      await fetch(`${backendUrl}/api/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          address: 'Periodic Heartbeat Telemetry (Task terminative mode)',
          contacts: [],
          source: 'Background Heartbeat Fetch Daemon'
        })
      });

      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[Heartbeat Task Error]', error.message);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
