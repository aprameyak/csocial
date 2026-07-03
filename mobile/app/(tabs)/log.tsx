import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, GRADES, ResultLabels, ResultColors } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { GradeBadge } from '../../src/components/ui/Badge';
import { api } from '../../src/services/api';
import type { ClimbResult, Gym, Route } from '../../src/types/api';

const RESULTS: ClimbResult[] = ['ATTEMPTED', 'WORKING', 'ALMOST', 'PROJECT', 'COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND'];

export default function LogScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [gymSearch, setGymSearch] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [result, setResult] = useState<ClimbResult>('COMPLETED');
  const [attempts, setAttempts] = useState(1);
  const [notes, setNotes] = useState('');
  const [difficulty, setDifficulty] = useState(0);
  const [enjoyment, setEnjoyment] = useState(0);

  // New route creation
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [newGrade, setNewGrade] = useState('V4');
  const [newColor, setNewColor] = useState('');

  const { data: gymsData, isLoading: gymsLoading } = useQuery({
    queryKey: ['gyms', gymSearch],
    queryFn: () => api.gyms.list({ q: gymSearch || undefined, limit: 20 }),
    enabled: step === 1,
  });

  const { data: routesData, isLoading: routesLoading } = useQuery({
    queryKey: ['gym-routes', selectedGym?.id],
    queryFn: () => api.gyms.getRoutes(selectedGym!.id, { active: true, limit: 50 }),
    enabled: !!selectedGym && step === 2,
  });

  const createRouteMutation = useMutation({
    mutationFn: (data: Partial<Route>) => api.routes.create(data),
    onSuccess: (route) => {
      setSelectedRoute(route);
      setIsCreatingRoute(false);
      setStep(3);
    },
    onError: () => Alert.alert('Error', 'Failed to create route'),
  });

  const logClimbMutation = useMutation({
    mutationFn: () => api.climbs.create({
      routeId: selectedRoute!.id,
      gymId: selectedGym!.id,
      result,
      attempts,
      notes: notes || undefined,
      difficultyRating: difficulty || undefined,
      enjoymentRating: enjoyment || undefined,
    }),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      Alert.alert(
        '🎉 Logged!',
        `+${data.xpEarned} XP earned${data.newLevel > 1 ? `\nLevel ${data.newLevel} reached!` : ''}`,
        [{ text: 'Nice!', onPress: () => { router.back(); } }]
      );
    },
    onError: () => Alert.alert('Error', 'Failed to log climb. Please try again.'),
  });

  const handleCreateRoute = () => {
    if (!newColor.trim()) { Alert.alert('Missing Info', 'Please enter a route color'); return; }
    createRouteMutation.mutate({
      gymId: selectedGym!.id,
      grade: newGrade,
      color: newColor.trim(),
      dateSet: new Date().toISOString(),
    });
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1,2,3,4,5].map((s) => (
          <TouchableOpacity key={s} onPress={() => onChange(s)}>
            <Ionicons name={s <= value ? 'star' : 'star-outline'} size={24} color={s <= value ? Colors.warning : Colors.border} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : router.back())}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Log a Climb</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Step indicator */}
      <View style={styles.steps}>
        {['Gym', 'Route', 'Result', 'Details'].map((s, i) => (
          <View key={i} style={[styles.stepDot, step > i + 1 && styles.stepDone, step === i + 1 && styles.stepActive]}>
            {step > i + 1 ? <Ionicons name="checkmark" size={12} color={Colors.text} /> : <Text style={styles.stepNum}>{i + 1}</Text>}
          </View>
        ))}
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

        {/* STEP 1: Select Gym */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Which gym?</Text>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search gyms..."
                placeholderTextColor={Colors.textTertiary}
                value={gymSearch}
                onChangeText={setGymSearch}
              />
            </View>
            {gymsLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : null}
            {gymsData?.data.map((gym) => (
              <TouchableOpacity
                key={gym.id}
                style={[styles.listItem, selectedGym?.id === gym.id && styles.listItemSelected]}
                onPress={() => { setSelectedGym(gym); setStep(2); }}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{gym.name}</Text>
                  <Text style={styles.listItemSub}>{gym.city}{gym.state ? `, ${gym.state}` : ''}</Text>
                </View>
                {gym.isVerified && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP 2: Select Route */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Which route?</Text>
            <Text style={styles.stepSub}>{selectedGym?.name}</Text>

            <TouchableOpacity style={styles.createRouteBtn} onPress={() => setIsCreatingRoute(!isCreatingRoute)}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.createRouteBtnText}>Create new route</Text>
            </TouchableOpacity>

            {isCreatingRoute && (
              <View style={styles.createRouteForm}>
                <Text style={styles.gradePickerLabel}>Grade</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gradePicker}>
                  {GRADES.slice(1).map((g) => (
                    <TouchableOpacity key={g} onPress={() => setNewGrade(g)} style={{ marginRight: 8 }}>
                      <GradeBadge grade={g} size={newGrade === g ? 'lg' : 'md'} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  style={styles.colorInput}
                  placeholder="Color (e.g. Blue, Red)"
                  placeholderTextColor={Colors.textTertiary}
                  value={newColor}
                  onChangeText={setNewColor}
                />
                <Button
                  title="Create Route"
                  onPress={handleCreateRoute}
                  loading={createRouteMutation.isPending}
                  style={{ marginTop: Spacing.sm }}
                />
              </View>
            )}

            {routesLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : null}
            {routesData?.data.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={[styles.listItem, selectedRoute?.id === route.id && styles.listItemSelected]}
                onPress={() => { setSelectedRoute(route); setStep(3); }}
              >
                <View style={[styles.colorDot, { backgroundColor: route.color.toLowerCase() }]} />
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{route.name ?? `${route.grade} ${route.color}`}</Text>
                  <Text style={styles.listItemSub}>{route.totalSends} sends · {route.flashCount} flashes</Text>
                </View>
                <GradeBadge grade={route.grade} size="sm" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP 3: Result */}
        {step === 3 && selectedRoute && (
          <View>
            <Text style={styles.stepTitle}>How did it go?</Text>
            <View style={styles.selectedRoute}>
              <View style={[styles.colorDot, { backgroundColor: selectedRoute.color.toLowerCase() }]} />
              <Text style={styles.selectedRouteName}>{selectedRoute.name ?? `${selectedRoute.grade} ${selectedRoute.color}`}</Text>
              <GradeBadge grade={selectedRoute.grade} size="sm" />
            </View>

            <View style={styles.results}>
              {RESULTS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.resultBtn, result === r && { backgroundColor: (ResultColors[r] ?? Colors.primary) + '22', borderColor: ResultColors[r] ?? Colors.primary }]}
                  onPress={() => setResult(r)}
                >
                  <Text style={[styles.resultBtnText, result === r && { color: ResultColors[r] ?? Colors.primary }]}>
                    {ResultLabels[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.attemptsRow}>
              <Text style={styles.attemptsLabel}>Attempts</Text>
              <View style={styles.attemptsControl}>
                <TouchableOpacity onPress={() => setAttempts(Math.max(1, attempts - 1))} style={styles.attemptsBtn}>
                  <Ionicons name="remove" size={20} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.attemptsValue}>{attempts}</Text>
                <TouchableOpacity onPress={() => setAttempts(attempts + 1)} style={styles.attemptsBtn}>
                  <Ionicons name="add" size={20} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <Button title="Next" onPress={() => setStep(4)} size="lg" style={{ marginTop: Spacing.xl, width: '100%' }} />
          </View>
        )}

        {/* STEP 4: Details */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>Add details</Text>
            <Text style={styles.stepSub}>Optional — helps track your progress</Text>

            <TextInput
              style={styles.notesInput}
              placeholder="Notes about the climb, beta, conditions..."
              placeholderTextColor={Colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />

            <StarRating value={difficulty} onChange={setDifficulty} label="How hard did it feel?" />
            <StarRating value={enjoyment} onChange={setEnjoyment} label="How fun was it?" />

            <Button
              title="Log Climb"
              onPress={() => logClimbMutation.mutate()}
              loading={logClimbMutation.isPending}
              size="lg"
              style={{ marginTop: Spacing.xl, width: '100%' }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '22' },
  stepDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  stepNum: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  content: { flex: 1, padding: Spacing.md },
  stepTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.xs },
  stepSub: { color: Colors.textSecondary, fontSize: FontSize.md, marginBottom: Spacing.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  listItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '11' },
  listItemContent: { flex: 1 },
  listItemTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  listItemSub: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  createRouteBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary + '44', marginBottom: Spacing.md },
  createRouteBtnText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  createRouteForm: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  gradePickerLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  gradePicker: { marginBottom: Spacing.md },
  colorInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.sm, padding: Spacing.sm, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  selectedRoute: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  selectedRouteName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, flex: 1 },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  resultBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  resultBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  attemptsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  attemptsLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  attemptsControl: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  attemptsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  attemptsValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, minWidth: 32, textAlign: 'center' },
  notesInput: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border, minHeight: 100, textAlignVertical: 'top', marginBottom: Spacing.xl },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  ratingLabel: { color: Colors.text, fontSize: FontSize.md },
  stars: { flexDirection: 'row', gap: 4 },
});
