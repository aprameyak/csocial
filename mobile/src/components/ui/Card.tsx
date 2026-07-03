import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadow } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: boolean;
  shadow?: boolean;
}

export function Card({ children, style, padding = true, shadow = false }: CardProps) {
  return (
    <View style={[styles.card, padding && styles.padding, shadow && Shadow.md, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  padding: {
    padding: Spacing.md,
  },
});
