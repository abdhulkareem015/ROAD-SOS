import NetInfo from '@react-native-community/netinfo';

/**
 * Network Service
 * Monitors connectivity states: Online, Slow Network, or Offline
 */
class NetworkService {
  constructor() {
    this.listeners = new Set();
    this.state = {
      isConnected: true,
      isInternetReachable: true,
      isOffline: false,
      isSlowConnection: false,
      connectionType: 'unknown',
      details: null
    };

    // Initialize listener
    this.unsubscribe = NetInfo.addEventListener((state) => {
      this._updateState(state);
    });

    // Check initial connection
    NetInfo.fetch().then((state) => {
      this._updateState(state);
    });
  }

  /**
   * Internal state updater
   */
  _updateState(state) {
    const isConnected = state.isConnected ?? true;
    const isInternetReachable = state.isInternetReachable ?? true;
    
    // Offline if not connected, or connected but internet is explicitly unreachable
    const isOffline = !isConnected || !isInternetReachable;

    // Detect slow networks (e.g. 2G or 3G cellular)
    let isSlowConnection = false;
    if (state.type === 'cellular' && state.details) {
      const gen = state.details.cellularGeneration;
      if (gen === '2g' || gen === '3g') {
        isSlowConnection = true;
      }
    }

    this.state = {
      isConnected,
      isInternetReachable,
      isOffline,
      isSlowConnection,
      connectionType: state.type,
      details: state.details
    };

    // Notify listeners
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Subscribes a callback to receive network state changes
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Fire immediately with current state
    callback(this.state);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Returns current network state synchronously
   */
  getState() {
    return this.state;
  }

  /**
   * Cleans up listeners
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.listeners.clear();
  }
}

const networkServiceInstance = new NetworkService();
export default networkServiceInstance;
