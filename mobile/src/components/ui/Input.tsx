import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export function Input({ label, error, icon, containerStyle, rightIcon, onRightIconPress, secureTextEntry, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, isFocused && styles.focused, error ? styles.errorBorder : null]}>
        {icon && <Ionicons name={icon} size={18} color={Colors.textSecondary} style={styles.icon} />}
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.rightIconBtn}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
        {!isPassword && rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconBtn}>
            <Ionicons name={rightIcon} size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  focused: { borderColor: Colors.primary },
  errorBorder: { borderColor: Colors.error },
  icon: { marginRight: Spacing.sm },
  input: { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: Spacing.sm },
  rightIconBtn: { padding: Spacing.xs },
  errorText: { color: Colors.error, fontSize: FontSize.xs, marginTop: Spacing.xs },
});
