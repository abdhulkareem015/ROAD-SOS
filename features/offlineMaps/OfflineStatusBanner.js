import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import networkService from '../../services/NetworkService';

export default function OfflineStatusBanner() {
  const [netState, setNetState] = useState(networkService.getState());
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = networkService.subscribe((state) => {
      setNetState(state);
      
      // Trigger sliding animations if offline or on slow network
      if (state.isOffline || state.isSlowConnection) {
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 12
        }).start();
      } else {
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }).start();
      }
    });

    return () => unsubscribe();
  }, []);

  if (!netState.isOffline && !netState.isSlowConnection) {
    return null;
  }

  const isCritical = netState.isOffline;
  const bannerBg = isCritical ? 'rgba(255, 59, 48, 0.95)' : 'rgba(255, 149, 0, 0.95)';
  const bannerBorder = isCritical ? '#FF3B30' : '#FF9500';
  const labelText = isCritical 
    ? '⚠️ OFFLINE EMERGENCY MODE ACTIVE (CACHED TILES / OFFLINE DATABASE LOADED)' 
    : '⚠️ SLOW CONNECTION DETECTED (FALLBACK TO CACHED OFFLINE ASSETS)';

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0]
  });

  return (
    <Animated.View 
      style={[
        styles.bannerContainer, 
        { 
          backgroundColor: bannerBg, 
          borderColor: bannerBorder,
          transform: [{ translateY }] 
        }
      ]}
    >
      <Text style={styles.bannerText}>{labelText}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1.5,
    zIndex: 9999,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  }
});
