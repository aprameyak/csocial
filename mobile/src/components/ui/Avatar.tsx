import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors, FontSize, FontWeight } from '../../constants/theme';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ uri, name, size = 40, style }: AvatarProps) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const fontSize = size * 0.38;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  initials: {
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
});
