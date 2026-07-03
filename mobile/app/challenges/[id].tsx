import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { api } from '../../src/services/api';

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: challenge, isLoading } = useQuery({
    queryKey: ['challenge', id],
    queryFn: () => api.challenges.get(id),
  });

  const joinMutation = useMutation({
    mutationFn: () => api.challenges.join(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['challenge', id] }); Alert.alert('Joined!', 'Challenge joined. Good luck!'); },
    onError: () => Alert.alert('Error', 'Failed to join challenge'),
  });

  if (isLoading) return <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>;
  if (!challenge) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenge</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{challenge.name}</Text>
        <Text style={styles.description}>{challenge.description}</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Type</Text><Text style={styles.metaValue}>{challenge.type}</Text></View>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>XP Reward</Text><Text style={[styles.metaValue, { color: Colors.primary }]}>+{challenge.xpReward}</Text></View>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Participants</Text><Text style={styles.metaValue}>{challenge.participantCount ?? 0}</Text></View>
        </View>

        {!challenge.userProgress ? (
          <Button title="Join Challenge" onPress={() => joinMutation.mutate()} loading={joinMutation.isPending} size="lg" style={{ marginTop: Spacing.xl }} />
        ) : (
          <View style={styles.joined}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.joinedText}>{challenge.userProgress.isCompleted ? '✅ Completed!' : '🏃 In Progress'}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.md },
  name: { fontSize: FontSize.xxl, fontWeight: FontWeight.heavy, color: Colors.text, marginBottom: Spacing.sm },
  description: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 24, marginBottom: Spacing.xl },
  meta: { flexDirection: 'row', gap: Spacing.xl },
  metaItem: { alignItems: 'center' },
  metaLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, marginBottom: 4 },
  metaValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  joined: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  joinedText: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
});
