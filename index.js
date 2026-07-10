import { registerRootComponent } from 'expo';

// Register background task definitions early in execution flow
import './tasks/locationBackgroundTask';
import './tasks/inactivityCheckTask';
import './tasks/emergencyHeartbeatTask';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
