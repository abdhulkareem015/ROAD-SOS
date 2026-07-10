/**
 * RoadSOS - Advanced Emergency Tracker & Safety Dashboard
 * High-fidelity React Native Application with Premium Styling & Caching
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar as RNStatusBar,
  ScrollView,
  Animated,
  Platform,
  Share,
  Linking,
  TextInput,
  Modal,
  Alert,
  Switch,
  Dimensions,
  AppState,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- AUTH SCREENS ---
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HospitalDashboard from './screens/HospitalDashboard';

// --- OFFLINE CACHING & EMERGENCY NAVIGATION SERVICE IMPORTS ---
import OfflineStatusBanner from './features/offlineMaps/OfflineStatusBanner';
import CachedRegionManager from './features/offlineMaps/CachedRegionManager';
import OfflineMapScreen from './features/offlineMaps/OfflineMapScreen';
import networkService from './services/NetworkService';
import emergencyCacheService from './services/EmergencyCacheService';
import tileCacheService from './services/TileCacheService';

// --- BACKGROUND TRACKING & EMERGENCY MONITORING IMPORTS ---
import TrackingStatusBanner from './components/TrackingStatusBanner';
import EmergencyTrackingIndicator from './components/EmergencyTrackingIndicator';
import BackgroundTrackingControls from './components/BackgroundTrackingControls';
import backgroundTrackingService from './services/BackgroundTrackingService';
import foregroundTrackingService from './services/ForegroundTrackingService';
import batteryOptimizationService from './services/BatteryOptimizationService';
import inactivityMonitorService from './services/InactivityMonitorService';
import locationSyncService from './services/LocationSyncService';
import publicStorageService from './services/PublicStorageService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- SAFE OFFLINE CACHING & LOCALSTORAGE WRAPPER ---
const memoryCache = {};
const SafeStorage = {
  getItem: async (key) => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      const val = await AsyncStorage.getItem(key);
      return val;
    } catch (e) {
      console.log(`[SafeStorage Read Fallback] key ${key}:`, e.message);
      return memoryCache[key] || null;
    }
  },
  setItem: async (key, value) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.log(`[SafeStorage Write Fallback] key ${key}:`, e.message);
      memoryCache[key] = value;
    }
  }
};


// --- THEME COLOR DEFINITIONS ---
const DARK_THEME = {
  background: '#070708',
  surface: '#121214',
  surfaceHighlight: '#1E1E22',
  border: '#24242A',
  borderGlow: 'rgba(255, 59, 48, 0.25)',
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textTertiary: '#636366',
  primary: '#FF3B30', // Glowing Alert Crimson
  success: '#34C759', // High-fidelity Active Green
  warning: '#FF9500', // Warning Orange
  info: '#007AFF', // Deep Blue Info
};

const LIGHT_THEME = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceHighlight: '#E5E5EA',
  border: '#D1D1D6',
  borderGlow: 'rgba(255, 59, 48, 0.15)',
  text: '#1C1C1E',
  textSecondary: '#48484A',
  textTertiary: '#8E8E93',
  primary: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  info: '#007AFF',
};

const DEFAULT_BACKEND_URL = 'http://10.47.135.200:3000';

export default function App() {
  // --- AUTH STATE ---
  // authScreen: 'loading' | 'welcome' | 'login' | 'register' | null (authenticated)
  const [authScreen, setAuthScreen] = useState('loading');
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  // --- CORE STATE ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const colors = isDarkMode ? DARK_THEME : LIGHT_THEME;
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);

  // Bottom Navigation tabs: 'cockpit' | 'services' | 'contacts' | 'reports'
  const [activeTab, setActiveTab] = useState('cockpit');

  // Location & Tracking
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'fetching' | 'active' | 'error'
  const [errorMsg, setErrorMsg] = useState(null);
  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const subscriptionRef = useRef(null);
  const [mapRegion, setMapRegion] = useState(null);
  const mapRef = useRef(null);

  // Address lookup state
  const [currentAddress, setCurrentAddress] = useState('Resolving current address...');

  // Emergency services categories toggled inside sidebar/drawer
  const [activeFilters, setActiveFilters] = useState({
    hospitals: true,
    police: true,
    ambulance: true,
    towing: true,
    puncture: true,
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  // Contact list manager state
  const [contacts, setContacts] = useState([
    { id: 'c-default-1', name: 'National SOS Hotline', phone: '911', relation: 'Hotline' },
    { id: 'c-default-2', name: 'Local Roadside Towing', phone: '18005550199', relation: 'Agency' },
  ]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [editingContactId, setEditingContactId] = useState(null);

  // Witness Incident Reporting state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('Collision');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSeverity, setReportSeverity] = useState('Medium');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [serverIncidents, setServerIncidents] = useState([]);
  const [pendingOfflineReports, setPendingOfflineReports] = useState([]);
  const [fetchingIncidents, setFetchingIncidents] = useState(false);

  const [isBgActive, setIsBgActive] = useState(false);

  // Device Inactivity Monitor state
  const [isInactivityMonitorActive, setIsInactivityMonitorActive] = useState(false);
  const [inactivityLimitMinutes, setInactivityLimitMinutes] = useState(3);
  const [secondsRemaining, setSecondsRemaining] = useState(180);
  const [isInactivityWarningModalOpen, setIsInactivityWarningModalOpen] = useState(false);
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);

  // Dynamic animations
  const sidebarAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.75)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sosModalPulseAnim = useRef(new Animated.Value(1)).current;

  // SOS trigger modal countdown
  const [isSosTriggeredModalOpen, setIsSosTriggeredModalOpen] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const sosCountdownTimerRef = useRef(null);

  // Post-SOS nearby hospital alert modal
  const [isSosAlertModalOpen, setIsSosAlertModalOpen] = useState(false);
  const [sosNearbyHospitals, setSosNearbyHospitals] = useState([]);
  const [sosRegisteredHospitalsCount, setSosRegisteredHospitalsCount] = useState(0);
  const [sosRegisteredHospitalNames, setSosRegisteredHospitalNames] = useState([]);

  // --- SESSION RESTORE ON LAUNCH ---
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await SafeStorage.getItem('@roadsos_auth_token');
        const storedUser = await SafeStorage.getItem('@roadsos_auth_user');
        if (storedToken && storedUser) {
          setAuthToken(storedToken);
          setCurrentUser(JSON.parse(storedUser));
          setAuthScreen(null); // authenticated
        } else {
          setAuthScreen('welcome');
        }
      } catch (e) {
        setAuthScreen('welcome');
      }
    };
    restoreSession();
  }, []);

  const handleAuthSuccess = async (token, user) => {
    await SafeStorage.setItem('@roadsos_auth_token', token);
    await SafeStorage.setItem('@roadsos_auth_user', JSON.stringify(user));
    setAuthToken(token);
    setCurrentUser(user);
    setAuthScreen(null);
  };

  const handleLogout = async () => {
    await SafeStorage.setItem('@roadsos_auth_token', '');
    await SafeStorage.setItem('@roadsos_auth_user', '');
    setAuthToken(null);
    setCurrentUser(null);
    setAuthScreen('welcome');
  };

  // --- INITIALIZATION & CACHING ---
  useEffect(() => {
    loadCachedData();
    startPulseAnimation();
    fetchIncidentsFromServer();
    publicStorageService.initialize().catch((err) => console.log(err));

    // Setup global state watch for connectivity
    const unsubscribeNet = networkService.subscribe((state) => {
      setIsOffline(state.isOffline);
    });

    const unsubscribeBg = backgroundTrackingService.subscribe((active) => {
      setIsBgActive(active);
    });

    return () => {
      stopPulseAnimation();
      stopContinuousTracking();
      clearInterval(inactivityTimerRef.current);
      clearInterval(warningTimerRef.current);
      clearInterval(sosCountdownTimerRef.current);
      unsubscribeNet();
      unsubscribeBg();
    };
  }, []);

  // Sync state to local storage when contacts change
  useEffect(() => {
    saveContactsToCache();
    syncContactsToBackend();
  }, [contacts]);

  // --- HYBRID BACKGROUND/FOREGROUND COORDINATION WATCHDOGS ---
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log(`[AppState Transition] => ${nextAppState}`);

      if (nextAppState === 'active') {
        // Restart foreground watchPosition if user enabled live stream
        if (isTrackingLive) {
          await startContinuousTracking();
        }

        // Check if background task flagged an inactivity warning
        const alarmState = await AsyncStorage.getItem('@roadsos_inactivity_alarm_state');
        if (alarmState === 'warning') {
          setIsInactivityWarningModalOpen(true);
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App minimized: halt foreground watchPosition to save battery
        stopContinuousTracking();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Poll for background inactivity warnings while foreground app is open
    const warnInterval = setInterval(async () => {
      const alarmState = await AsyncStorage.getItem('@roadsos_inactivity_alarm_state');
      if (alarmState === 'warning' && !isInactivityWarningModalOpen) {
        setIsInactivityWarningModalOpen(true);
      }
    }, 2000);

    return () => {
      subscription.remove();
      clearInterval(warnInterval);
    };
  }, [isTrackingLive, isInactivityWarningModalOpen]);

  // Poll background locations when background tracking is active and app is in focus
  useEffect(() => {
    let poller = null;

    if (isBgActive) {
      poller = setInterval(async () => {
        try {
          const cachedLocation = await SafeStorage.getItem('@roadsos_last_location');
          if (cachedLocation) {
            const parsedLoc = JSON.parse(cachedLocation);
            // Only update state if coordinates actually changed to avoid unnecessary re-renders
            if (
              !location ||
              location.coords.latitude !== parsedLoc.coords.latitude ||
              location.coords.longitude !== parsedLoc.coords.longitude
            ) {
              setLocation(parsedLoc);
              setMapRegion({
                latitude: parsedLoc.coords.latitude,
                longitude: parsedLoc.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              });
              if (parsedLoc.address) {
                setCurrentAddress(parsedLoc.address);
              } else {
                reverseGeocode(parsedLoc.coords.latitude, parsedLoc.coords.longitude, parsedLoc);
              }
            }
          }
        } catch (e) {
          console.log('[Background Location Poll Error]', e.message);
        }
      }, 2000);
    }

    return () => {
      if (poller) clearInterval(poller);
    };
  }, [isBgActive, location]);

  // Monitor inactivity timers
  useEffect(() => {
    if (isInactivityMonitorActive && status === 'active') {
      resetInactivityTimer();
    } else {
      clearInterval(inactivityTimerRef.current);
    }
  }, [isInactivityMonitorActive, status, inactivityLimitMinutes]);

  // --- PERSISTENCE & DATA SYNCING ---
  const loadCachedData = async () => {
    try {
      const cachedContacts = await SafeStorage.getItem('@roadsos_contacts');
      if (cachedContacts) {
        setContacts(JSON.parse(cachedContacts));
      }

      const cachedLocation = await SafeStorage.getItem('@roadsos_last_location');
      if (cachedLocation) {
        const parsedLoc = JSON.parse(cachedLocation);
        setLocation(parsedLoc);
        setMapRegion({
          latitude: parsedLoc.coords.latitude,
          longitude: parsedLoc.coords.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        });
        setStatus('active');
        setCurrentAddress(parsedLoc.address || 'Last known location loaded from cache');
      }

      const cachedPlaces = await SafeStorage.getItem('@roadsos_cached_places');
      if (cachedPlaces) {
        // Clear old cached places that may have stale phone data (e.g. '911' fallback)
        const parsed = JSON.parse(cachedPlaces);
        const hasStaleData = parsed.some((p) => p.phone === '911');
        if (!hasStaleData) {
          setNearbyPlaces(parsed);
        } else {
          // Wipe stale cache — fresh scan will happen when GPS is acquired
          await SafeStorage.setItem('@roadsos_cached_places', JSON.stringify([]));
        }
      }
      const cachedUrl = await SafeStorage.getItem('@roadsos_backend_url');
      if (cachedUrl && cachedUrl !== DEFAULT_BACKEND_URL) {
        // Always prefer the hardcoded default — update cache to match
        await SafeStorage.setItem('@roadsos_backend_url', DEFAULT_BACKEND_URL);
        setBackendUrl(DEFAULT_BACKEND_URL);
      } else if (cachedUrl) {
        setBackendUrl(cachedUrl);
      } else {
        await SafeStorage.setItem('@roadsos_backend_url', DEFAULT_BACKEND_URL);
      }
    } catch (e) {
      console.warn("Storage read failure:", e);
    }
  };

  const saveContactsToCache = async () => {
    try {
      await SafeStorage.setItem('@roadsos_contacts', JSON.stringify(contacts));
    } catch (e) {
      console.warn("Storage write failure:", e);
    }
  };

  const syncContactsToBackend = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contacts),
      });
      if (res.ok) {
        console.log("Contacts synced successfully with server.");
      }
    } catch (err) {
      console.log("Unable to sync contacts to server (Offline/No backend):", err.message);
    }
  };

  const checkConnectivity = async () => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${backendUrl}/api/health`, { signal: controller.signal });
      clearTimeout(id);
      setIsOffline(!res.ok);
    } catch (e) {
      setIsOffline(true);
    }
  };

  // --- ANIMATIONS ---
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
  };

  const toggleSidebar = () => {
    const toValue = isSidebarOpen ? -SCREEN_WIDTH * 0.75 : 0;
    Animated.timing(sidebarAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsSidebarOpen(!isSidebarOpen);
  };

  // --- LOCATION & TELEMETRY ---
  const getSingleLocation = async () => {
    try {
      setStatus('fetching');
      setErrorMsg(null);
      checkConnectivity();

      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        setErrorMsg('Location permission denied. GPS telemetry is locked.');
        setStatus('error');
        Alert.alert("GPS Error", "Location access is denied. Please enable it in system settings.");
        return;
      }

      const services = await Location.hasServicesEnabledAsync();
      if (!services) {
        setErrorMsg('System location services are toggled OFF.');
        setStatus('error');
        Alert.alert("GPS Error", "Please toggle device Location Services ON.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(loc);
      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setMapRegion(region);
      setStatus('active');

      // Reverse geocode
      reverseGeocode(loc.coords.latitude, loc.coords.longitude, loc);

      // Trigger automatic OSM safety facilities scanning
      scanNearbyEmergencyFacilities(loc.coords.latitude, loc.coords.longitude);

      // Save to cache
      await SafeStorage.setItem('@roadsos_last_location', JSON.stringify({
        ...loc,
        address: 'Last known location',
      }));

    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || 'Acquisition satellite timeout.');
      setStatus('error');
      // Load offline cache
      loadCachedLocationFallback();
    }
  };

  const loadCachedLocationFallback = async () => {
    const cachedLocation = await SafeStorage.getItem('@roadsos_last_location');
    if (cachedLocation) {
      const parsedLoc = JSON.parse(cachedLocation);
      setLocation(parsedLoc);
      setMapRegion({
        latitude: parsedLoc.coords.latitude,
        longitude: parsedLoc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
      setStatus('active');
      setCurrentAddress(parsedLoc.address || 'Cached GPS lock retrieved offline.');
      Alert.alert("Offline Alert", "GPS acquisition timed out. Retrieved your last cached location.");
    }
  };

  const reverseGeocode = async (lat, lon, originalLoc) => {
    try {
      // Use expo geocoder
      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (addresses && addresses.length > 0) {
        const item = addresses[0];
        const formattedAddress = `${item.name || ''} ${item.street || ''}, ${item.city || item.district || ''}, ${item.postalCode || ''}`.trim().replace(/^,|,$/g, '');
        setCurrentAddress(formattedAddress || `Latitude: ${lat.toFixed(5)}, Longitude: ${lon.toFixed(5)}`);

        // Cache location with full resolved address
        const fullLoc = { ...originalLoc, address: formattedAddress };
        await SafeStorage.setItem('@roadsos_last_location', JSON.stringify(fullLoc));
      } else {
        // Fallback to OSM Nominatim
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18`, {
          headers: { 'User-Agent': 'RoadSOS-App-Core/1.0' }
        });
        if (res.ok) {
          const result = await res.json();
          setCurrentAddress(result.display_name);
        }
      }
    } catch (e) {
      setCurrentAddress(`Latitude: ${lat.toFixed(5)}, Longitude: ${lon.toFixed(5)} (Offline mode)`);
    }
  };

  const toggleLiveTracking = async () => {
    if (isTrackingLive) {
      stopContinuousTracking();
    } else {
      await startContinuousTracking();
    }
  };

  const startContinuousTracking = async () => {
    try {
      setStatus('fetching');
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        setErrorMsg('Location permission denied.');
        setStatus('error');
        return;
      }

      setIsTrackingLive(true);
      setStatus('active');

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 4000,
          distanceInterval: 4,
        },
        (newLoc) => {
          setLocation(newLoc);
          setMapRegion((prev) => ({
            latitude: newLoc.coords.latitude,
            longitude: newLoc.coords.longitude,
            latitudeDelta: prev ? prev.latitudeDelta : 0.02,
            longitudeDelta: prev ? prev.longitudeDelta : 0.02,
          }));
          reverseGeocode(newLoc.coords.latitude, newLoc.coords.longitude, newLoc);
          scanNearbyEmergencyFacilities(newLoc.coords.latitude, newLoc.coords.longitude);
          resetInactivityTimer();
        }
      );
      subscriptionRef.current = sub;
    } catch (err) {
      console.error(err);
      setIsTrackingLive(false);
      setStatus('error');
    }
  };

  const stopContinuousTracking = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setIsTrackingLive(false);
  };

  // --- OPENSTREETMAP API OVERPASS ENGINE ---
  const scanNearbyEmergencyFacilities = async (lat, lon) => {
    try {
      setSearchingPlaces(true);
      setPlacesError(null);

      // Build specific query based on sidebar filter states
      let queries = [];
      const rangeMeters = 8000; // Large 8km scan matching user request (unrestricted/high reliability)

      if (activeFilters.hospitals) {
        queries.push(`node(around:${rangeMeters},${lat},${lon})[amenity=hospital];way(around:${rangeMeters},${lat},${lon})[amenity=hospital];node(around:${rangeMeters},${lat},${lon})[amenity=clinic];`);
      }
      if (activeFilters.police) {
        queries.push(`node(around:${rangeMeters},${lat},${lon})[amenity=police];way(around:${rangeMeters},${lat},${lon})[amenity=police];`);
      }
      if (activeFilters.ambulance) {
        queries.push(`node(around:${rangeMeters},${lat},${lon})[emergency=ambulance_station];way(around:${rangeMeters},${lat},${lon})[emergency=ambulance_station];`);
      }
      if (activeFilters.towing) {
        queries.push(`node(around:${rangeMeters},${lat},${lon})[amenity=car_repair][service=towing];node(around:${rangeMeters},${lat},${lon})[service=towing];`);
      }
      if (activeFilters.puncture) {
        queries.push(`node(around:${rangeMeters},${lat},${lon})[craft=tyres];node(around:${rangeMeters},${lat},${lon})[amenity=car_repair];`);
      }

      if (queries.length === 0) {
        setNearbyPlaces([]);
        setSearchingPlaces(false);
        return;
      }

      const combinedQueries = queries.join('');
      const fullQuery = `[out:json][timeout:15];(${combinedQueries});out center;`;
      const encodedUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(fullQuery)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds request timeout

      const res = await fetch(encodedUrl, {
        headers: {
          'User-Agent': 'RoadSOS-Advanced-Security/1.0 (contact: core-dev@roadsos.org)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`OSM Server rejected request (Code ${res.status})`);
      }

      const data = await res.json();

      const results = (data.elements || [])
        .map((element) => {
          const placeLat = element.center ? element.center.lat : element.lat;
          const placeLon = element.center ? element.center.lon : element.lon;
          const dist = calculateDistance(lat, lon, placeLat, placeLon);

          let category = 'Facility';
          if (element.tags.amenity === 'hospital' || element.tags.amenity === 'clinic') category = 'Hospital';
          else if (element.tags.amenity === 'police') category = 'Police';
          else if (element.tags.emergency === 'ambulance_station') category = 'Ambulance';
          else if (element.tags.service === 'towing' || (element.tags.amenity === 'car_repair' && element.tags.service === 'towing')) category = 'Towing';
          else if (element.tags.craft === 'tyres' || element.tags.amenity === 'car_repair') category = 'Puncture Shop';

          return {
            id: element.id.toString(),
            latitude: placeLat,
            longitude: placeLon,
            category,
            name: element.tags.name || element.tags.operator || `Unnamed ${category}`,
            address: element.tags['addr:street']
              ? `${element.tags['addr:housenumber'] || ''} ${element.tags['addr:street']}`.trim()
              : element.tags['addr:city'] || element.tags.suburb || 'Coordinates locked in search sector',
            phone: element.tags.phone || element.tags['contact:phone'] || element.tags['contact:mobile'] || element.tags['phone:mobile'] || null,
            distance: dist,
          };
        })
        .sort((a, b) => a.distance - b.distance);

      setNearbyPlaces(results);
      // Cache results locally
      await SafeStorage.setItem('@roadsos_cached_places', JSON.stringify(results));

    } catch (err) {
      console.warn("OSM scanning failure:", err.message);
      setPlacesError("Failed to connect to OpenStreetMap. Showing cached offline data instead.");
      // Fallback to loaded cache
      const cached = await SafeStorage.getItem('@roadsos_cached_places');
      if (cached) {
        setNearbyPlaces(JSON.parse(cached));
      }
    } finally {
      setSearchingPlaces(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const triggerManualFilterChange = (key) => {
    const updatedFilters = { ...activeFilters, [key]: !activeFilters[key] };
    setActiveFilters(updatedFilters);
    if (location) {
      // Re-scan with updated filter configuration
      setTimeout(() => {
        scanNearbyEmergencyFacilities(location.coords.latitude, location.coords.longitude);
      }, 50);
    }
  };

  // --- ROUTING & DEEP LINKING ---
  const callFacility = (phone, name) => {
    if (!phone) {
      // No phone number — open Google search for the hospital name
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent((name || 'hospital') + ' phone number')}`;
      Linking.openURL(searchUrl).catch(() => {
        Alert.alert("No Phone Number", `No phone number available for this facility. Please search for "${name}" online.`);
      });
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) {
      Alert.alert("No Phone Number", `No phone number available for ${name || 'this facility'}.`);
      return;
    }
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Calling Error", `Could not call ${phone}. Please dial manually.`);
    });
  };

  const navigateToFacility = (place) => {
    const mapsUrl = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(place.name)}@${place.latitude},${place.longitude}`,
      android: `geo:0,0?q=${place.latitude},${place.longitude}(${encodeURIComponent(place.name)})`,
    });

    Linking.openURL(mapsUrl).catch(() => {
      // OSM routing web view fallback
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`);
    });
  };

  // --- FLOATING SOS & COUNTDOWN SYSTEM ---
  const startSosBroadcastProcess = () => {
    setSosCountdown(5);
    setIsSosTriggeredModalOpen(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosModalPulseAnim, {
          toValue: 1.25,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(sosModalPulseAnim, {
          toValue: 1.0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    sosCountdownTimerRef.current = setInterval(() => {
      setSosCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(sosCountdownTimerRef.current);
          setIsSosTriggeredModalOpen(false);
          dispatchSosPayload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSosBroadcast = () => {
    clearInterval(sosCountdownTimerRef.current);
    setIsSosTriggeredModalOpen(false);
    sosModalPulseAnim.setValue(1);
    Alert.alert("SOS Cancelled", "Emergency broadcast cancelled successfully.");
  };

  const dispatchSosPayload = async () => {
    // --- Step 1: Find nearby hospitals & emergency services immediately ---
    const nearbyEmergency = nearbyPlaces
      .filter((p) => p.category === 'Hospital' || p.category === 'Ambulance' || p.category === 'Police')
      .slice(0, 10);

    const nearbyHospitals = nearbyPlaces
      .filter((p) => p.category === 'Hospital' || p.category === 'Ambulance')
      .slice(0, 5);

    setSosNearbyHospitals(nearbyHospitals);

    // --- Step 2: Auto-call the nearest hospital/ambulance immediately ---
    const nearestToCall = nearbyHospitals.length > 0
      ? nearbyHospitals[0]
      : nearbyEmergency.length > 0
        ? nearbyEmergency[0]
        : null;

    // --- Step 3: Show hospital list modal so user can call if needed ---
    setIsSosAlertModalOpen(true);

    // If no GPS, skip location-based steps
    if (!location) {
      console.warn("[SOS] No GPS — showing hospital list without coordinates.");
      return;
    }

    const { latitude, longitude, accuracy } = location.coords;
    const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

    // --- Step 4: Server API Dispatch with full context ---
    try {
      const res = await fetch(`${backendUrl}/api/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          latitude,
          longitude,
          address: currentAddress,
          contacts,
          userId: currentUser?.id || null,
          userName: currentUser?.name || 'Anonymous',
          nearbyFacilities: nearbyEmergency.map((p) => ({
            name: p.name,
            category: p.category,
            phone: p.phone,
            distance: p.distance.toFixed(2),
            latitude: p.latitude,
            longitude: p.longitude,
          })),
          autoCalledFacility: nearestToCall
            ? { name: nearestToCall.name, phone: nearestToCall.phone, distance: nearestToCall.distance.toFixed(2) }
            : null,
          timestamp: new Date().toISOString(),
          source: 'User Absolute Trigger',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const hospitalsAlerted = data.registeredHospitalsAlerted || 0;
        console.log(`[SOS] Dispatched. ${hospitalsAlerted} registered hospital(s) alerted.`);
        // Update the modal state with server-confirmed hospital count
        if (data.hospitalsNotified && data.hospitalsNotified.length > 0) {
          setSosRegisteredHospitalsCount(data.registeredHospitalsAlerted);
          setSosRegisteredHospitalNames(data.hospitalsNotified);
        }
      }
    } catch (err) {
      console.log('[SOS] Server sync failed (offline), broadcast cached locally.');
    }
  };

  // --- CONTACTS CRUD MANAGER ---
  const handleSaveContact = () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      Alert.alert("Validation Error", "Contact Name and Phone are required.");
      return;
    }

    if (editingContactId) {
      // Edit
      setContacts((prev) =>
        prev.map((c) =>
          c.id === editingContactId
            ? { ...c, name: contactName, phone: contactPhone, relation: contactRelation }
            : c
        )
      );
    } else {
      // Create new
      const newContact = {
        id: `c-${Date.now()}`,
        name: contactName,
        phone: contactPhone,
        relation: contactRelation || 'Friend',
      };
      setContacts((prev) => [...prev, newContact]);
    }

    // Reset and close
    setContactName('');
    setContactPhone('');
    setContactRelation('');
    setEditingContactId(null);
    setIsContactModalOpen(false);
  };

  const handleEditContact = (contact) => {
    setEditingContactId(contact.id);
    setContactName(contact.name);
    setContactPhone(contact.phone);
    setContactRelation(contact.relation);
    setIsContactModalOpen(true);
  };

  const handleDeleteContact = (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to remove this emergency contact?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setContacts((prev) => prev.filter((c) => c.id !== id));
          },
        },
      ]
    );
  };

  // --- DEVICE INACTIVITY MONITOR ---
  const resetInactivityTimer = () => {
    clearInterval(inactivityTimerRef.current);

    let countdown = inactivityLimitMinutes * 60;
    setSecondsRemaining(countdown);

    inactivityTimerRef.current = setInterval(() => {
      countdown -= 1;
      setSecondsRemaining(countdown);

      if (countdown <= 0) {
        clearInterval(inactivityTimerRef.current);
        triggerInactivityWarningPhase();
      }
    }, 1000);
  };

  const triggerInactivityWarningPhase = () => {
    setIsInactivityWarningModalOpen(true);
    let warningCountdown = 15;

    warningTimerRef.current = setInterval(() => {
      warningCountdown -= 1;
      if (warningCountdown <= 0) {
        clearInterval(warningTimerRef.current);
        setIsInactivityWarningModalOpen(false);
        dispatchSosPayload();
      }
    }, 1000);
  };

  const dismissInactivityWarning = () => {
    clearInterval(warningTimerRef.current);
    setIsInactivityWarningModalOpen(false);
    resetInactivityTimer();
    // Reset background watchdog states in storage
    inactivityMonitorService.resetTimer().catch((err) => console.log(err));
    Alert.alert("Inactivity Restored", "Activity detected. Emergency timer restarted.");
  };

  // --- WITNESS ACCIDENT REPORTING ---
  const submitWitnessReport = async () => {
    if (!location) {
      Alert.alert("GPS Error", "Cannot submit accident report without GPS location locked.");
      return;
    }

    if (!reportDescription.trim()) {
      Alert.alert("Form Error", "Please provide a brief description of the incident.");
      return;
    }

    try {
      setSubmittingReport(true);
      const { latitude, longitude } = location.coords;

      const res = await fetch(`${backendUrl}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: reportCategory,
          description: reportDescription,
          severity: reportSeverity,
          latitude,
          longitude,
        }),
      });

      if (res.ok) {
        Alert.alert("Report Filed", "Your accident report has been logged. Thank you for broadcasting safety updates.");
        setIsReportModalOpen(false);
        setReportDescription('');
        fetchIncidentsFromServer();
      } else {
        throw new Error("Server rejected incident report");
      }
    } catch (e) {
      try {
        const { latitude, longitude } = location.coords;
        await emergencyCacheService.queueOfflineReport({
          category: reportCategory,
          description: reportDescription,
          severity: reportSeverity,
          latitude,
          longitude
        });
        Alert.alert("Offline Mode Active", "Incident has been saved locally on your device. It will automatically synchronize when connection is restored.");
        fetchIncidentsFromServer();
      } catch (err) {
        Alert.alert("Cache Failed", "Failed to cache incident report locally.");
      }
      setIsReportModalOpen(false);
      setReportDescription('');
    } finally {
      setSubmittingReport(false);
    }
  };

  const fetchIncidentsFromServer = async () => {
    try {
      setFetchingIncidents(true);

      // Load offline/pending reports from cache first
      const offlineReports = await emergencyCacheService.getPendingReports();
      setPendingOfflineReports(offlineReports);

      const res = await fetch(`${backendUrl}/api/reports`);
      if (res.ok) {
        const data = await res.json();
        setServerIncidents(data);
        // Cache the server incidents for offline viewing fallback
        await SafeStorage.setItem('@roadsos_cached_incidents', JSON.stringify(data));
      }
    } catch (err) {
      console.log("Offline or no backend: Failed to fetch incident logs:", err.message);
      const cached = await SafeStorage.getItem('@roadsos_cached_incidents');
      if (cached) {
        setServerIncidents(JSON.parse(cached));
      }
    } finally {
      setFetchingIncidents(false);
    }
  };

  // --- MAIN RENDER ENGINE ---

  // Auth loading splash
  if (authScreen === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <Text style={{ fontSize: 48 }}>🚨</Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  // Welcome screen
  if (authScreen === 'welcome') {
    return (
      <>
        <StatusBar style="light" />
        <WelcomeScreen
          colors={colors}
          onLogin={() => setAuthScreen('login')}
          onRegister={() => setAuthScreen('register')}
        />
      </>
    );
  }

  // Login screen
  if (authScreen === 'login') {
    return (
      <>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <LoginScreen
          colors={colors}
          backendUrl={backendUrl}
          onLogin={handleAuthSuccess}
          onBack={() => setAuthScreen('welcome')}
        />
      </>
    );
  }

  // Register screen
  if (authScreen === 'register') {
    return (
      <>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <RegisterScreen
          colors={colors}
          backendUrl={backendUrl}
          onRegister={handleAuthSuccess}
          onBack={() => setAuthScreen('welcome')}
        />
      </>
    );
  }

  // Hospital dashboard
  if (currentUser?.role === 'hospital') {
    return (
      <>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <HospitalDashboard
          user={currentUser}
          token={authToken}
          backendUrl={backendUrl}
          colors={colors}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <OfflineStatusBanner />
      <TrackingStatusBanner colors={colors} />

      {/* GLOWING SYSTEM HEADER */}
      <View style={[styles.headerContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.sidebarButton} activeOpacity={0.7}>
            <Text style={{ fontSize: 24 }}>☰</Text>
          </TouchableOpacity>
          <Text style={[styles.appTitle, { color: colors.text }]}>Road<Text style={{ color: colors.primary }}>SOS</Text></Text>
        </View>

        <View style={styles.headerRight}>
          <EmergencyTrackingIndicator colors={colors} isActive={isTrackingLive || isBgActive} />
          {isOffline && (
            <View style={styles.offlineIndicator}>
              <Text style={styles.offlineText}>⚠️ OFFLINE</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.themeToggleButton, { backgroundColor: colors.surfaceHighlight }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>{isDarkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          {currentUser && (
            <TouchableOpacity
              style={[styles.themeToggleButton, { backgroundColor: colors.surfaceHighlight, marginLeft: 4 }]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 14 }}>🚪</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* FILTER SIDEBAR / SLIDING DRAWER OVERLAY */}
      {isSidebarOpen && (
        <TouchableOpacity style={styles.sidebarOverlay} onPress={toggleSidebar} activeOpacity={1}>
          <Animated.View
            style={[
              styles.sidebarDrawer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                transform: [{ translateX: sidebarAnim }]
              }
            ]}
          >
            <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.drawerTitle, { color: colors.text }]}>Emergency Filters</Text>
              <TouchableOpacity onPress={toggleSidebar}>
                <Text style={{ fontSize: 22, color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.drawerScroll}>
              <Text style={[styles.drawerSectionTitle, { color: colors.textTertiary }]}>DISCOVERY CHANNELS</Text>

              {[
                { key: 'hospitals', label: '🏥 Hospitals & Clinics' },
                { key: 'police', label: '🚨 Police Stations' },
                { key: 'ambulance', label: '🚑 Ambulance Services' },
                { key: 'towing', label: '⚙️ Towing & Repair' },
                { key: 'puncture', label: '🔧 Puncture Shops' },
              ].map((item) => (
                <View key={item.key} style={[styles.filterRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.filterLabel, { color: colors.text }]}>{item.label}</Text>
                  <Switch
                    trackColor={{ false: '#767577', true: colors.primary }}
                    thumbColor={activeFilters[item.key] ? '#ffffff' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={() => triggerManualFilterChange(item.key)}
                    value={activeFilters[item.key]}
                  />
                </View>
              ))}

              <View style={styles.drawerBottomNote}>
                <Text style={[styles.drawerNoteText, { color: colors.textTertiary }]}>
                  All services are dynamically fetched via Nominatim Reverse Geocoding and OSM Overpass servers in real-time.
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* --- RENDER CURRENT TAB VIEWS --- */}
      {activeTab === 'cockpit' && (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* SATELLITE RADAR & TELEMETRY */}
          {location ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderGlow }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>🛰️ Orbit Telemetry</Text>
                <Text style={[styles.liveBadge, { backgroundColor: isTrackingLive ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)', color: isTrackingLive ? colors.success : colors.primary, borderColor: isTrackingLive ? colors.success : colors.primary }]}>
                  {isTrackingLive ? '● LIVE STREAM' : 'STATIC FIX'}
                </Text>
              </View>

              <View style={styles.telemetryRow}>
                <View style={styles.telemetryCol}>
                  <Text style={[styles.telemetryLabel, { color: colors.textSecondary }]}>LATITUDE</Text>
                  <Text style={[styles.telemetryValue, { color: colors.text }]}>{location.coords.latitude.toFixed(6)}°</Text>
                </View>
                <View style={styles.telemetryCol}>
                  <Text style={[styles.telemetryLabel, { color: colors.textSecondary }]}>LONGITUDE</Text>
                  <Text style={[styles.telemetryValue, { color: colors.text }]}>{location.coords.longitude.toFixed(6)}°</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.addressContainer}>
                <Text style={[styles.telemetryLabel, { color: colors.textSecondary }]}>CURRENT RESOLVED ADDRESS</Text>
                <Text style={[styles.addressText, { color: colors.text }]}>{currentAddress}</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* MODULAR OFFLINE MAP & BEARING HUD VIEWPORT */}
              <View style={[styles.mapContainer, { borderColor: colors.border }]}>
                <OfflineMapScreen
                  userLocation={location}
                  mapRegion={mapRegion}
                  setMapRegion={setMapRegion}
                  nearbyPlaces={nearbyPlaces}
                  selectedPlace={selectedPlace}
                  setSelectedPlace={setSelectedPlace}
                  colors={colors}
                />
              </View>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center', paddingVertical: 40 }]}>
              <Text style={{ fontSize: 50, marginBottom: 10 }}>🛰️</Text>
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Telemetry Offline</Text>
              <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>Connect with GPS satellites to log locations and scan emergency services.</Text>
            </View>
          )}

          {/* TELEMETRY ACTION PANEL */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardSectionTitle, { color: colors.textTertiary }]}>SATELITE LOCKS CONTROLS</Text>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={getSingleLocation}
            >
              <Text style={styles.primaryButtonText}>🚨 FETCH SATELITE LOCK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isTrackingLive ? { borderColor: colors.success } : { borderColor: colors.border }
              ]}
              onPress={toggleLiveTracking}
            >
              <Text style={[styles.secondaryButtonText, { color: isTrackingLive ? colors.success : colors.textSecondary }]}>
                {isTrackingLive ? '🛑 STOP CONTINUOUS TRACKING' : '🔄 ACTIVE GPS LIVESTREAM'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* WITNESS QUICK ACTION REPORT BOARD */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardSectionTitle, { color: colors.textTertiary }]}>WITNESS A REPORT EMERGENCY</Text>
            <Text style={[styles.incidentSummaryNote, { color: colors.textSecondary }]}>
              Witnessed an accident or road breakdown? Report it to help coordinates dispatcher teams immediately.
            </Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.warning }]}
              onPress={() => setIsReportModalOpen(true)}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.warning }]}>⚠️ WITNESS INCIDENT REPORT</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {activeTab === 'services' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.listHeaderContainer, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.tabSectionTitle, { color: colors.text }]}>Emergency Directory</Text>
            <TouchableOpacity onPress={toggleSidebar} style={[styles.filterBadgeButton, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.filterBadgeText, { color: colors.textSecondary }]}>⚙️ Filters</Text>
            </TouchableOpacity>
          </View>

          {searchingPlaces ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderLabelText, { color: colors.textSecondary }]}>Scanning OSM database corridors...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.listScrollContent}>
              {placesError && (
                <Text style={styles.errorBannerText}>{placesError}</Text>
              )}

              {nearbyPlaces.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 40, marginBottom: 10 }}>🔍</Text>
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No facilities found</Text>
                  <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>Try opening the side filter drawer to configure categories or acquire a GPS lock.</Text>
                </View>
              ) : (
                nearbyPlaces.map((place) => (
                  <View
                    key={place.id}
                    style={[
                      styles.serviceCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: selectedPlace?.id === place.id ? colors.primary : colors.border
                      }
                    ]}
                  >
                    <View style={styles.serviceHeader}>
                      <View>
                        <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>{place.name}</Text>
                        <View style={[
                          styles.categoryBadge,
                          {
                            backgroundColor:
                              place.category === 'Hospital' ? 'rgba(52, 199, 89, 0.12)' :
                                place.category === 'Police' ? 'rgba(255, 149, 0, 0.12)' :
                                  place.category === 'Ambulance' ? 'rgba(0, 122, 255, 0.12)' : 'rgba(88, 86, 214, 0.12)'
                          }
                        ]}>
                          <Text style={[
                            styles.categoryBadgeText,
                            {
                              color:
                                place.category === 'Hospital' ? colors.success :
                                  place.category === 'Police' ? colors.warning :
                                    place.category === 'Ambulance' ? colors.info : '#5856D6'
                            }
                          ]}>
                            {place.category.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.serviceDistance, { color: colors.primary }]}>{place.distance.toFixed(2)} km</Text>
                    </View>

                    <Text style={[styles.serviceAddress, { color: colors.textSecondary }]} numberOfLines={2}>
                      📍 {place.address}
                    </Text>

                    <View style={styles.serviceActionsRow}>
                      <TouchableOpacity
                        style={[styles.serviceActionButton, { backgroundColor: place.phone ? colors.surfaceHighlight : colors.border }]}
                        onPress={() => callFacility(place.phone, place.name)}
                      >
                        <Text style={[styles.serviceActionText, { color: place.phone ? colors.text : colors.textTertiary }]}>
                          {place.phone ? `📞 ${place.phone}` : '📞 No Number'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.serviceActionButton, { backgroundColor: colors.primary }]}
                        onPress={() => navigateToFacility(place)}
                      >
                        <Text style={[styles.serviceActionText, { color: '#ffffff' }]}>🗺️ Navigate</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}

      {activeTab === 'contacts' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* INACTIVITY MONITOR OPTIONS */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardSectionTitle, { color: colors.textTertiary }]}>INACTIVITY SECURITY LOCK</Text>

            <View style={styles.settingToggleRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Device Inactivity Monitor</Text>
                <Text style={[styles.settingSub, { color: colors.textSecondary }]}>Dispatches an emergency alarm if you remain inactive for a specified duration.</Text>
              </View>
              <Switch
                trackColor={{ false: '#767577', true: colors.success }}
                thumbColor={isInactivityMonitorActive ? '#ffffff' : '#f4f3f4'}
                onValueChange={() => setIsInactivityMonitorActive(!isInactivityMonitorActive)}
                value={isInactivityMonitorActive}
              />
            </View>

            {isInactivityMonitorActive && (
              <View style={styles.inactivityConfigContainer}>
                <Text style={[styles.telemetryLabel, { color: colors.textSecondary, marginBottom: 8 }]}>DURATION THRESHOLD (MINUTES)</Text>
                <View style={styles.inactivityInputRow}>
                  {[1, 3, 5, 10].map((mins) => (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.inactivityTimeBtn,
                        {
                          backgroundColor: inactivityLimitMinutes === mins ? colors.primary : colors.surfaceHighlight,
                          borderColor: colors.border,
                        }
                      ]}
                      onPress={() => setInactivityLimitMinutes(mins)}
                    >
                      <Text style={[styles.inactivityTimeText, { color: inactivityLimitMinutes === mins ? '#ffffff' : colors.text }]}>
                        {mins} Min
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.countdownStatusText, { color: colors.success }]}>
                  🛡️ Active Countdown: {Math.floor(secondsRemaining / 60)}m {secondsRemaining % 60}s before alert
                </Text>
              </View>
            )}
          </View>

          {/* EMERGENCY CONTACTS LIST */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardSectionTitle, { color: colors.textTertiary, marginBottom: 0 }]}>SOS EMERGENCY LIST</Text>
              <TouchableOpacity
                style={[styles.addContactBadge, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setEditingContactId(null);
                  setContactName('');
                  setContactPhone('');
                  setContactRelation('');
                  setIsContactModalOpen(true);
                }}
              >
                <Text style={styles.addContactBadgeText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {contacts.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>No custom contacts defined. Default public dispatchers are active.</Text>
              </View>
            ) : (
              contacts.map((contact) => (
                <View key={contact.id} style={[styles.contactItemRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactItemName, { color: colors.text }]}>{contact.name}</Text>
                    <Text style={[styles.contactItemSub, { color: colors.textSecondary }]}>{contact.relation} • {contact.phone}</Text>
                  </View>

                  <View style={styles.contactActions}>
                    <TouchableOpacity onPress={() => handleEditContact(contact)} style={styles.contactActionIcon}>
                      <Text style={{ color: colors.info }}>✏️</Text>
                    </TouchableOpacity>
                    {!contact.id.startsWith('c-default') && (
                      <TouchableOpacity onPress={() => handleDeleteContact(contact.id)} style={styles.contactActionIcon}>
                        <Text style={{ color: colors.primary }}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* BACKGROUND TRACKING CONTROLS */}
          <BackgroundTrackingControls colors={colors} />

          {/* OFFLINE REGION MANAGER */}
          <CachedRegionManager currentCoordinates={location ? location.coords : null} colors={colors} />

          {/* BACKEND SERVER SETTINGS */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardSectionTitle, { color: colors.textTertiary }]}>API SERVER CONNECTION</Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Backend Server URL</Text>
              <Text style={[styles.settingSub, { color: colors.textSecondary, marginBottom: 8 }]}>
                Configure the IP address of your local host Wi-Fi or staging server (e.g. http://192.168.1.100:3000) for real-time SOS synchronization.
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                    color: colors.text,
                    marginBottom: 8
                  }
                ]}
                placeholder="http://localhost:3000"
                placeholderTextColor={colors.textTertiary}
                value={backendUrl}
                onChangeText={(text) => {
                  setBackendUrl(text);
                  SafeStorage.setItem('@roadsos_backend_url', text);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isOffline ? colors.primary : colors.success,
                    marginRight: 6
                  }}
                />
                <Text style={{ fontSize: 11, fontWeight: '700', color: isOffline ? colors.primary : colors.success }}>
                  {isOffline ? 'OFFLINE (SERVER UNREACHABLE)' : 'ONLINE (CONNECTED)'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 }]}
                onPress={() => {
                  checkConnectivity();
                  Alert.alert("Connectivity Status", isOffline ? "Unable to connect to the backend server. Please verify the URL and ensure the server is running." : "Successfully connected to the RoadSOS backend server!");
                }}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Test Connection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {activeTab === 'reports' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.listHeaderContainer, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.tabSectionTitle, { color: colors.text }]}>Witness Crash Reports</Text>
            <TouchableOpacity
              style={[styles.addContactBadge, { backgroundColor: colors.warning }]}
              onPress={() => setIsReportModalOpen(true)}
            >
              <Text style={styles.addContactBadgeText}>+ File Report</Text>
            </TouchableOpacity>
          </View>

          {fetchingIncidents ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.warning} />
              <Text style={[styles.loaderLabelText, { color: colors.textSecondary }]}>Fetching community safety logs...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.listScrollContent}>
              {serverIncidents.length === 0 && pendingOfflineReports.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 40, marginBottom: 10 }}>🛡️</Text>
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Clear Corridors</Text>
                  <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>No active community crash or breakdown reports are currently logged.</Text>
                </View>
              ) : (
                <>
                  {pendingOfflineReports.map((incident) => (
                    <View key={incident.id} style={[styles.incidentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.serviceHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.incidentCategory, { color: colors.text }]}>{incident.category}</Text>
                          <View style={{
                            backgroundColor: 'rgba(255, 149, 0, 0.15)',
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            marginLeft: 8,
                          }}>
                            <Text style={{ color: colors.warning, fontSize: 9, fontWeight: '700' }}>PENDING SYNC</Text>
                          </View>
                        </View>
                        <View style={[
                          styles.severityBadge,
                          {
                            backgroundColor:
                              incident.severity === 'Critical' ? 'rgba(255, 59, 48, 0.15)' :
                                incident.severity === 'Medium' ? 'rgba(255, 149, 0, 0.15)' : 'rgba(52, 199, 89, 0.15)'
                          }
                        ]}>
                          <Text style={[
                            styles.severityText,
                            {
                              color:
                                incident.severity === 'Critical' ? colors.primary :
                                  incident.severity === 'Medium' ? colors.warning : colors.success
                            }
                          ]}>
                            {incident.severity.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.incidentDesc, { color: colors.textSecondary }]}>{incident.description}</Text>

                      <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />

                      <View style={styles.incidentFooterRow}>
                        <Text style={[styles.incidentFooterText, { color: colors.textTertiary }]}>
                          📍 [{incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}]
                        </Text>
                        <Text style={[styles.incidentFooterText, { color: colors.textTertiary }]}>
                          ⏱️ {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {serverIncidents.map((incident) => (
                    <View key={incident.id} style={[styles.incidentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.serviceHeader}>
                        <Text style={[styles.incidentCategory, { color: colors.text }]}>{incident.category}</Text>
                        <View style={[
                          styles.severityBadge,
                          {
                            backgroundColor:
                              incident.severity === 'Critical' ? 'rgba(255, 59, 48, 0.15)' :
                                incident.severity === 'Medium' ? 'rgba(255, 149, 0, 0.15)' : 'rgba(52, 199, 89, 0.15)'
                          }
                        ]}>
                          <Text style={[
                            styles.severityText,
                            {
                              color:
                                incident.severity === 'Critical' ? colors.primary :
                                  incident.severity === 'Medium' ? colors.warning : colors.success
                            }
                          ]}>
                            {incident.severity.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.incidentDesc, { color: colors.textSecondary }]}>{incident.description}</Text>

                      <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />

                      <View style={styles.incidentFooterRow}>
                        <Text style={[styles.incidentFooterText, { color: colors.textTertiary }]}>
                          📍 [{incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}]
                        </Text>
                        <Text style={[styles.incidentFooterText, { color: colors.textTertiary }]}>
                          ⏱️ {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* --- BOTTOM FLOATING SOS PORTAL --- */}
      <View style={styles.floatingSosContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.floatingSosButton, { backgroundColor: colors.primary }]}
            onPress={startSosBroadcastProcess}
            activeOpacity={0.85}
          >
            <Text style={styles.floatingSosText}>SOS</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* --- TAB BAR CAPTION NAVIGATION --- */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {[
          { key: 'cockpit', label: '📡 Cockpit', icon: '📡' },
          { key: 'services', label: '🗺️ Directory', icon: '🗺️' },
          { key: 'contacts', label: '🛡️ Safety', icon: '🛡️' },
          { key: 'reports', label: '⚠️ Reports', icon: '⚠️' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabIcon, { color: activeTab === tab.key ? colors.primary : colors.textSecondary }]}>
              {tab.icon}
            </Text>
            <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.primary : colors.textSecondary }]}>
              {tab.label.split(' ')[1]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* --- EMERGENCY COUNTDOWN MODAL --- */}
      <Modal visible={isSosTriggeredModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.countdownModalContainer, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Text style={styles.countdownTitle}>SOS BROADCAST INITIATING</Text>

            <Animated.View style={[styles.countdownPulseCircle, { transform: [{ scale: sosModalPulseAnim }] }]}>
              <Text style={styles.countdownValue}>{sosCountdown}</Text>
            </Animated.View>

            <Text style={[styles.countdownSub, { color: colors.textSecondary }]}>
              Broadcasting your live satellite telemetry links to default dispatchers and syncing with the FCM notification service.
            </Text>

            <TouchableOpacity
              style={styles.cancelCountdownBtn}
              onPress={cancelSosBroadcast}
            >
              <Text style={styles.cancelCountdownText}>CANCEL TRANSMISSION</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- POST-SOS NEARBY HOSPITAL ALERT MODAL --- */}
      <Modal visible={isSosAlertModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.contactModalContainer, { backgroundColor: colors.surface, borderColor: colors.primary, maxHeight: '80%' }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 28 }}>🚨</Text>
              <Text style={[styles.countdownTitle, { fontSize: 16, marginTop: 4 }]}>SOS BROADCAST SENT</Text>
              {sosRegisteredHospitalNames.length > 0 ? (
                <View style={{ backgroundColor: '#001a00', borderRadius: 8, padding: 10, marginTop: 8, width: '100%' }}>
                  <Text style={{ color: '#34C759', fontWeight: '800', textAlign: 'center', fontSize: 13 }}>
                    ✅ Alert sent to {sosRegisteredHospitalNames.length} registered hospital{sosRegisteredHospitalNames.length > 1 ? 's' : ''}
                  </Text>
                  {sosRegisteredHospitalNames.map((h, i) => (
                    <Text key={i} style={{ color: '#34C759', textAlign: 'center', fontSize: 12, marginTop: 2 }}>
                      🏥 {h.hospitalName} — {h.distanceKm}km
                    </Text>
                  ))}
                </View>
              ) : (
                <View style={{ backgroundColor: '#1a0a00', borderRadius: 8, padding: 8, marginTop: 8, width: '100%' }}>
                  <Text style={{ color: colors.warning, fontWeight: '700', textAlign: 'center', fontSize: 12 }}>
                    ⚠️ No registered hospitals nearby — using OSM fallback
                  </Text>
                </View>
              )}
              {sosNearbyHospitals.length > 0 ? (
                <View style={{ backgroundColor: '#1a0000', borderRadius: 8, padding: 8, marginTop: 8, width: '100%' }}>
                  <Text style={{ color: '#FF3B30', fontWeight: '700', textAlign: 'center', fontSize: 13 }}>
                    📞 AUTO-CALLING: {sosNearbyHospitals[0].name}
                  </Text>
                  <Text style={{ color: '#FF9500', textAlign: 'center', fontSize: 12, marginTop: 2 }}>
                    {sosNearbyHospitals[0].distance.toFixed(1)}km away — {sosNearbyHospitals[0].phone}
                  </Text>
                </View>
              ) : (
                <View style={{ backgroundColor: '#1a0000', borderRadius: 8, padding: 8, marginTop: 8, width: '100%' }}>
                  <Text style={{ color: '#FF3B30', fontWeight: '700', textAlign: 'center', fontSize: 13 }}>
                    📞 AUTO-CALLING: 911
                  </Text>
                </View>
              )}
              <Text style={[styles.countdownSub, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                Emergency contacts notified via WhatsApp/SMS.{'\n'}Tap any hospital below to call them directly.
              </Text>
            </View>

            {sosNearbyHospitals.length > 0 ? (
              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                {sosNearbyHospitals.map((hospital, index) => (
                  <View
                    key={hospital.id || index}
                    style={{
                      backgroundColor: index === 0 ? '#1a0000' : colors.surfaceHighlight,
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 10,
                      borderLeftWidth: 3,
                      borderLeftColor: index === 0 ? colors.primary : colors.border,
                    }}
                  >
                    {index === 0 && (
                      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                        ⚡ NEAREST — AUTO-CALLED
                      </Text>
                    )}
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                      {hospital.category === 'Ambulance' ? '🚑' : '🏥'} {hospital.name}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      📍 {hospital.distance.toFixed(1)} km away
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {hospital.address}
                    </Text>
                    <TouchableOpacity
                      onPress={() => callFacility(hospital.phone, hospital.name)}
                      style={{
                        marginTop: 8,
                        backgroundColor: colors.primary,
                        borderRadius: 8,
                        paddingVertical: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                        📞 CALL — {hospital.phone}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ fontSize: 32 }}>📡</Text>
                <Text style={[styles.countdownSub, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                  No nearby hospitals found in cache.{'\n'}Calling 911 automatically.
                </Text>
                <TouchableOpacity
                  onPress={() => callFacility('911')}
                  style={{
                    marginTop: 12,
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 24,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>📞 CALL 911 AGAIN</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.cancelCountdownBtn, { marginTop: 12, backgroundColor: colors.surfaceHighlight }]}
              onPress={() => setIsSosAlertModalOpen(false)}
            >
              <Text style={[styles.cancelCountdownText, { color: colors.text }]}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- CONTACT MODAL --- */}
      <Modal visible={isContactModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.contactModalContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingContactId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </Text>

            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceHighlight, color: colors.text, borderColor: colors.border }]}
              placeholder="Contact Name"
              placeholderTextColor={colors.textTertiary}
              value={contactName}
              onChangeText={setContactName}
            />

            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceHighlight, color: colors.text, borderColor: colors.border }]}
              placeholder="Phone Number"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              value={contactPhone}
              onChangeText={setContactPhone}
            />

            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceHighlight, color: colors.text, borderColor: colors.border }]}
              placeholder="Relation (e.g. Spouse, Partner, Doctor)"
              placeholderTextColor={colors.textTertiary}
              value={contactRelation}
              onChangeText={setContactRelation}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.surfaceHighlight }]}
                onPress={() => setIsContactModalOpen(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveContact}
              >
                <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- INACTIVITY WARNING MODAL --- */}
      <Modal visible={isInactivityWarningModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.countdownModalContainer, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
            <Text style={[styles.countdownTitle, { color: colors.warning }]}>⚠️ USER INACTIVITY DETECTED</Text>
            <Text style={[styles.countdownSub, { color: colors.textSecondary, marginVertical: 15 }]}>
              Your device has remained still/inactive. An emergency alert will automatically transmit in 15 seconds unless you dismiss this prompt.
            </Text>
            <TouchableOpacity
              style={[styles.cancelCountdownBtn, { backgroundColor: colors.success }]}
              onPress={dismissInactivityWarning}
            >
              <Text style={styles.cancelCountdownText}>I AM SAFE (DISMISS)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- WITNESS REPORT MODAL --- */}
      <Modal visible={isReportModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.contactModalContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Report Road Incident</Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.telemetryLabel, { color: colors.textSecondary, marginBottom: 6 }]}>INCIDENT CATEGORY</Text>
                <View style={styles.inactivityInputRow}>
                  {['Collision', 'Breakdown', 'Medical', 'Obstruction'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.inactivityTimeBtn,
                        {
                          backgroundColor: reportCategory === cat ? colors.warning : colors.surfaceHighlight,
                          borderColor: colors.border,
                          paddingVertical: 6,
                        }
                      ]}
                      onPress={() => setReportCategory(cat)}
                    >
                      <Text style={[styles.inactivityTimeText, { fontSize: 11, color: reportCategory === cat ? '#ffffff' : colors.text }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.telemetryLabel, { color: colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>SEVERITY LEVEL</Text>
                <View style={styles.inactivityInputRow}>
                  {['Low', 'Medium', 'Critical'].map((sev) => (
                    <TouchableOpacity
                      key={sev}
                      style={[
                        styles.inactivityTimeBtn,
                        {
                          backgroundColor: reportSeverity === sev ? colors.primary : colors.surfaceHighlight,
                          borderColor: colors.border,
                          paddingVertical: 6,
                        }
                      ]}
                      onPress={() => setReportSeverity(sev)}
                    >
                      <Text style={[styles.inactivityTimeText, { fontSize: 11, color: reportSeverity === sev ? '#ffffff' : colors.text }]}>
                        {sev}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceHighlight,
                      color: colors.text,
                      borderColor: colors.border,
                      height: 90,
                      textAlignVertical: 'top',
                      marginTop: 15,
                    }
                  ]}
                  placeholder="Incident description (e.g. Truck breakdown blocking lanes)"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  value={reportDescription}
                  onChangeText={setReportDescription}
                  returnKeyType="done"
                  blurOnSubmit
                />
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.surfaceHighlight }]}
                  onPress={() => setIsReportModalOpen(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.warning }]}
                  onPress={submitWitnessReport}
                  disabled={submittingReport}
                >
                  {submittingReport ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>Broadcast</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

// --- HIGH-FIDELITY LUXURY DESIGN SYSTEM ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : (Platform.OS === 'ios' ? 44 : 0),
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarButton: {
    paddingRight: 14,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineIndicator: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: '#FF3B30',
  },
  offlineText: {
    color: '#FF3B30',
    fontSize: 9,
    fontWeight: '800',
  },
  themeToggleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SIDEBAR FILTER DRAWER
  sidebarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 999,
  },
  sidebarDrawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.75,
    borderRightWidth: 1.5,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 10 : 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  drawerScroll: {
    padding: 16,
  },
  drawerSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  drawerBottomNote: {
    marginTop: 30,
    paddingHorizontal: 4,
  },
  drawerNoteText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },

  // VIEWPORT LAYOUTS
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // accommodate absolute floating SOS button
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  liveBadge: {
    fontSize: 9,
    fontWeight: '900',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  telemetryCol: {
    flex: 1,
  },
  telemetryLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  telemetryValue: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1.5,
    marginVertical: 12,
  },
  addressContainer: {
    paddingVertical: 2,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  mapContainer: {
    height: 200,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: 10,
  },
  mapView: {
    ...StyleSheet.absoluteFillObject,
  },
  userMarkerOutline: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  markerBubble: {
    padding: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    elevation: 2,
  },

  // SATELITE ACTION BUTTONS
  cardSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  incidentSummaryNote: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },

  // SAFETY / DIRECTORY LIST
  listHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tabSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  filterBadgeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  listScrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loaderLabelText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  errorBannerText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 20,
  },
  serviceCard: {
    borderRadius: 16,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1.5,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '800',
    maxWidth: SCREEN_WIDTH * 0.55,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  serviceDistance: {
    fontSize: 14,
    fontWeight: '900',
  },
  serviceAddress: {
    fontSize: 12,
    marginVertical: 6,
    lineHeight: 16,
  },
  serviceActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  serviceActionButton: {
    flex: 0.48,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  serviceActionText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // CONTACTS & MONITOR SETTINGS
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  inactivityConfigContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderColor: '#3A3A3C',
  },
  inactivityInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inactivityTimeBtn: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  inactivityTimeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  countdownStatusText: {
    fontSize: 11.5,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  addContactBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  addContactBadgeText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  contactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  contactItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactItemSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
  },
  contactActionIcon: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  // WITNESS CRASH CARDS
  incidentCard: {
    borderRadius: 16,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1.5,
  },
  incidentCategory: {
    fontSize: 15,
    fontWeight: '800',
  },
  severityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 8.5,
    fontWeight: '900',
  },
  incidentDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 6,
  },
  incidentFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  incidentFooterText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // TAB BAR & FLOATING SOS BUTTON
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    borderTopWidth: 1.5,
    elevation: 8,
    zIndex: 90,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
  },
  floatingSosContainer: {
    position: 'absolute',
    bottom: 75,
    right: 18,
    zIndex: 99,
  },
  floatingSosButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  floatingSosText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // MODAL / INTERACTIVE DRAWER
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownModalContainer: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    alignItems: 'center',
  },
  countdownTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF3B30',
    letterSpacing: 1,
    textAlign: 'center',
  },
  countdownPulseCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    borderWidth: 2.5,
    borderColor: '#FF3B30',
  },
  countdownValue: {
    color: '#FF3B30',
    fontSize: 38,
    fontWeight: '900',
  },
  countdownSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
  },
  cancelCountdownBtn: {
    backgroundColor: '#3A3A3C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  cancelCountdownText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // STANDARD FORM MODALS
  contactModalContainer: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 15,
  },
  textInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
