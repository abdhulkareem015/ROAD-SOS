import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, LocalTile } from 'react-native-maps';
import tileCacheService from '../../services/TileCacheService';
import networkService from '../../services/NetworkService';

// Distance utility (Haversine formula)
export function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Bearing utility
export function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Get cardinal direction representation
export function getCardinalDirection(bearing) {
  const directions = [
    'North ⬆️',
    'North-East ↗️',
    'East ➡️',
    'South-East ↘️',
    'South ⬇️',
    'South-West ↙️',
    'West ⬅️',
    'North-West ↖️',
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

export default function OfflineMapScreen({
  userLocation,
  mapRegion,
  setMapRegion,
  nearbyPlaces,
  selectedPlace,
  setSelectedPlace,
  colors,
}) {
  const [netState, setNetState] = useState(networkService.getState());
  const mapRef = useRef(null);

  // Animation values for the offline HUD panel
  const hudAnim = useRef(new Animated.Value(0)).current;
  const arrowRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = networkService.subscribe((state) => {
      setNetState(state);
    });
    return () => unsubscribe();
  }, []);

  // Animate navigation HUD panel based on place selection and connection state
  useEffect(() => {
    const shouldShowHud = selectedPlace && userLocation && netState.isOffline;
    
    Animated.timing(hudAnim, {
      toValue: shouldShowHud ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();

    if (shouldShowHud) {
      // Calculate bearing and animate arrow rotation
      const currentLat = userLocation.coords.latitude;
      const currentLon = userLocation.coords.longitude;
      const targetLat = selectedPlace.latitude;
      const targetLon = selectedPlace.longitude;

      const bearing = getBearing(currentLat, currentLon, targetLat, targetLon);

      Animated.timing(arrowRotation, {
        toValue: bearing,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedPlace, userLocation, netState.isOffline]);

  // Fallback map view if Platform is web (LocalTile file directories can fail on pure web environments)
  const isWeb = Platform.OS === 'web';
  const pathTemplate = tileCacheService.getTilePathTemplate();

  // Navigation HUD calculations
  let distance = 0;
  let bearing = 0;
  let directionText = '';

  if (selectedPlace && userLocation) {
    const currentLat = userLocation.coords.latitude;
    const currentLon = userLocation.coords.longitude;
    const targetLat = selectedPlace.latitude;
    const targetLon = selectedPlace.longitude;

    distance = getHaversineDistance(currentLat, currentLon, targetLat, targetLon);
    bearing = getBearing(currentLat, currentLon, targetLat, targetLon);
    directionText = getCardinalDirection(bearing);
  }

  const hudTranslateY = hudAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [250, 0],
  });

  const arrowRotateStyle = arrowRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Map View Frame */}
      {mapRegion && (
        <MapView
          ref={mapRef}
          style={styles.mapView}
          initialRegion={mapRegion}
          region={mapRegion}
          showsUserLocation={false}
          // Enable online base tiles only when connected to internet
          mapType={netState.isOffline ? 'none' : 'standard'}
        >
          {/* Offline Tile Overlay - openstreetmap fallback */}
          {netState.isOffline && !isWeb && (
            <LocalTile
              pathTemplate={pathTemplate}
              tileSize={256}
            />
          )}

          {/* User Location Marker */}
          {userLocation && (
            <Marker coordinate={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude
            }}>
              <View style={styles.userMarkerOutline}>
                <View style={styles.userMarkerDot} />
              </View>
            </Marker>
          )}

          {/* Safe Bounds overlay */}
          {userLocation && (
            <Circle
              center={{
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude
              }}
              radius={1500}
              fillColor="rgba(255, 59, 48, 0.05)"
              strokeColor="rgba(255, 59, 48, 0.25)"
              strokeWidth={1.5}
            />
          )}

          {/* Scanned Facilities Markers */}
          {nearbyPlaces.map((place) => (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              onPress={() => setSelectedPlace(place)}
            >
              <View style={[
                styles.markerBubble,
                {
                  backgroundColor:
                    place.category === 'Hospital' ? colors.success :
                    place.category === 'Police' ? colors.warning :
                    place.category === 'Ambulance' ? colors.info : '#5856D6',
                  borderColor: selectedPlace?.id === place.id ? '#FFFFFF' : 'transparent',
                  borderWidth: selectedPlace?.id === place.id ? 2 : 0,
                }
              ]}>
                <Text style={{ fontSize: 12 }}>
                  {place.category === 'Hospital' ? '🏥' :
                   place.category === 'Police' ? '🚨' :
                   place.category === 'Ambulance' ? '🚑' : '⚙️'}
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Offline Alert Box for Web fallback */}
      {netState.isOffline && isWeb && (
        <View style={[styles.webOfflinePanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.offlinePanelTitle, { color: colors.text }]}>🌐 Offline Mode Active</Text>
          <Text style={[styles.offlinePanelSub, { color: colors.textSecondary }]}>
            Browser Local File Tile rendering is disabled. Caching markers locally.
          </Text>
        </View>
      )}

      {/* EMERGENCY NAVIGATION ASSISTANCE HUD PANEL */}
      {selectedPlace && (
        <Animated.View
          style={[
            styles.hudPanel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              transform: [{ translateY: hudTranslateY }]
            }
          ]}
        >
          <View style={styles.hudHeader}>
            <Text style={[styles.hudTitle, { color: colors.text }]} numberOfLines={1}>
              Compass Target: {selectedPlace.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedPlace(null)} style={styles.hudClose}>
              <Text style={{ fontSize: 18, color: colors.textTertiary }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hudBody}>
            {/* Rotating Arrow Indicator */}
            <View style={[styles.compassWrapper, { borderColor: colors.border }]}>
              <Animated.View style={[styles.arrowContainer, { transform: [{ rotate: arrowRotateStyle }] }]}>
                <Text style={{ fontSize: 32, color: colors.primary }}>▲</Text>
              </Animated.View>
            </View>

            {/* Metrics */}
            <View style={styles.metricsContainer}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>STRAIGHT-LINE DISTANCE</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>{distance.toFixed(2)} km</Text>
              
              <Text style={[styles.metricLabel, { color: colors.textSecondary, marginTop: 8 }]}>BEARING HEADING</Text>
              <Text style={[styles.metricHeadingValue, { color: colors.text }]}>
                {bearing.toFixed(0)}° • {directionText}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.hudFooterNote, { color: colors.textTertiary }]}>
            Compass tracking calculates bearing relative to North. Keep your device level.
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
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
    elevation: 2,
  },
  webOfflinePanel: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  offlinePanelTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  offlinePanelSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  
  // HUD NAVIGATION PANEL
  hudPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 999,
  },
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderColor: '#3A3A3C',
  },
  hudTitle: {
    fontSize: 14,
    fontWeight: '800',
    maxWidth: '85%',
  },
  hudClose: {
    padding: 2,
  },
  hudBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  compassWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  metricsContainer: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  metricHeadingValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  hudFooterNote: {
    fontSize: 9.5,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  }
});
