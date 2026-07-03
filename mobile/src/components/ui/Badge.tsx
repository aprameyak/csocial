import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { GradeColors, ResultColors, ResultLabels, Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../constants/theme';
import type { ClimbResult } from '../../types/api';

interface GradeBadgeProps {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function GradeBadge({ grade, size = 'md', style }: GradeBadgeProps) {
  const color = GradeColors[grade] ?? '#636366';
  const sizes = { sm: { padding: 4, fontSize: FontSize.xs }, md: { padding: 6, fontSize: FontSize.sm }, lg: { padding: 8, fontSize: FontSize.md } };
  const s = sizes[size];

  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55', paddingHorizontal: s.padding * 2, paddingVertical: s.padding }, style]}>
      <Text style={[styles.text, { color, fontSize: s.fontSize }]}>{grade}</Text>
    </View>
  );
}

interface ResultBadgeProps {
  result: ClimbResult;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function ResultBadge({ result, size = 'md', style }: ResultBadgeProps) {
  const color = ResultColors[result] ?? Colors.textSecondary;
  const label = ResultLabels[result] ?? result;
  const fontSize = size === 'sm' ? FontSize.xs : FontSize.sm;

  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55', paddingHorizontal: size === 'sm' ? 6 : 8, paddingVertical: size === 'sm' ? 2 : 4 }, style]}>
      <Text style={[styles.text, { color, fontSize }]}>{label}</Text>
    </View>
  );
}

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}

export function Chip({ label, active = false, color }: ChipProps) {
  const activeColor = color ?? Colors.primary;
  return (
    <View style={[styles.chip, active && { backgroundColor: activeColor + '22', borderColor: activeColor }]}>
      <Text style={[styles.chipText, active && { color: activeColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: FontWeight.bold,
  },
  chip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.xs,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
