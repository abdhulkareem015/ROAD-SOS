import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';

export default function EmergencyTrackingIndicator({ colors, isActive }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let anim;
    if (isActive) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (anim) anim.stop();
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.outerPulse, 
          { 
            backgroundColor: 'rgba(255, 59, 48, 0.15)',
            borderColor: colors.primary,
            transform: [{ scale: pulseAnim }] 
          }
        ]} 
      />
      <View style={[styles.innerIndicator, { backgroundColor: colors.primary }]}>
        <Text style={styles.indicatorText}>SECURE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 65,
    height: 25,
    marginRight: 6
  },
  outerPulse: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  innerIndicator: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  },
  indicatorText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5
  }
});
