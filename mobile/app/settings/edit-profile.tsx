import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, FontSize, FontWeight, Spacing } from '../../src/constants/theme';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [yearsClimbing, setYearsClimbing] = useState(user?.yearsClimbing?.toString() ?? '');

  const updateMutation = useMutation({
    mutationFn: () => api.users.updateMe({
      displayName: displayName.trim(),
      bio: bio.trim() || undefined,
      location: location.trim() || undefined,
      yearsClimbing: yearsClimbing ? parseInt(yearsClimbing) : undefined,
    }),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['my-stats'] });
      Alert.alert('Saved!', 'Profile updated successfully');
      router.back();
    },
    onError: () => Alert.alert('Error', 'Failed to update profile'),
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Display Name" value={displayName} onChangeText={setDisplayName} icon="person-outline" placeholder="Your name" />
        <Input label="Bio" value={bio} onChangeText={setBio} icon="text-outline" placeholder="Tell the world about your climbing..." multiline numberOfLines={3} />
        <Input label="Location" value={location} onChangeText={setLocation} icon="location-outline" placeholder="City, Country" />
        <Input label="Years Climbing" value={yearsClimbing} onChangeText={setYearsClimbing} icon="calendar-outline" placeholder="e.g. 3" keyboardType="number-pad" />

        <Button
          title="Save Changes"
          onPress={() => updateMutation.mutate()}
          loading={updateMutation.isPending}
          size="lg"
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.md },
  saveBtn: { marginTop: Spacing.xl, width: '100%' },
});
