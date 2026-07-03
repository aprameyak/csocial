import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/services/api';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function SettingRow({ icon, label, onPress, destructive }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={destructive ? Colors.error : Colors.textSecondary} />
      <Text style={[styles.rowLabel, destructive && { color: Colors.error }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.auth.logout();
          } catch {}
          await logout();
          router.replace('/(auth)');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.section}>
          <SettingRow icon="person-outline" label="Edit Profile" onPress={() => router.push('/settings/edit-profile')} />
          <SettingRow icon="lock-closed-outline" label="Change Password" onPress={() => router.push('/settings/edit-profile')} />
          <SettingRow icon="eye-outline" label="Privacy Settings" onPress={() => {}} />
        </View>

        {/* App */}
        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.section}>
          <SettingRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
          <SettingRow icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
          <SettingRow icon="information-circle-outline" label="About cSocial" onPress={() => {}} />
        </View>

        {/* Danger */}
        <Text style={styles.sectionLabel}>Account Actions</Text>
        <View style={styles.section}>
          <SettingRow icon="log-out-outline" label="Log Out" onPress={handleLogout} destructive />
        </View>

        <Text style={styles.version}>cSocial v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  sectionLabel: { color: Colors.textTertiary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { backgroundColor: Colors.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  version: { color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: 'center', padding: Spacing.xl },
});
