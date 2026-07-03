import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { GradeBadge, ResultBadge } from '../../src/components/ui/Badge';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { timeAgo, formatDate } from '../../src/utils/format';

export default function ClimbDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [comment, setComment] = useState('');

  const { data: climb, isLoading } = useQuery({
    queryKey: ['climb', id],
    queryFn: () => api.climbs.get(id),
  });

  const { data: commentsData } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => api.climbs.getComments(id),
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: () => climb?.isLiked ? api.climbs.unlike(id) : api.climbs.like(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['climb', id] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => api.climbs.addComment(id, comment.trim()),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      queryClient.invalidateQueries({ queryKey: ['climb', id] });
    },
    onError: () => Alert.alert('Error', 'Failed to post comment'),
  });

  const congratMutation = useMutation({
    mutationFn: () => api.climbs.congratulate(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('🎉', 'Congratulations sent!');
    },
  });

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  if (!climb) return null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Climb</Text>
          {climb.userId === currentUser?.id && (
            <TouchableOpacity onPress={() => Alert.alert('Delete Climb?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => {
                api.climbs.delete(id).then(() => { queryClient.invalidateQueries({ queryKey: ['feed'] }); router.back(); });
              }}
            ])}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          )}
          {climb.userId !== currentUser?.id && <View style={{ width: 24 }} />}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* User info */}
          {climb.user && (
            <TouchableOpacity style={styles.userRow} onPress={() => router.push(`/profile/${climb.user!.id}`)}>
              <Avatar uri={climb.user.profileImageUrl} name={climb.user.displayName} size={44} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{climb.user.displayName}</Text>
                <Text style={styles.userMeta}>@{climb.user.username} · {timeAgo(climb.date)}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Route info */}
          {climb.route && (
            <TouchableOpacity style={styles.routeCard} onPress={() => router.push(`/route/${climb.routeId}`)}>
              <View style={styles.routeHeader}>
                <View style={[styles.colorDot, { backgroundColor: climb.route.color.toLowerCase() }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeName}>{climb.route.name ?? `${climb.route.grade} ${climb.route.color}`}</Text>
                  {climb.route.gym && <Text style={styles.gymName}>{climb.route.gym.name} · {climb.route.gym.city}</Text>}
                </View>
                <GradeBadge grade={climb.route.grade} size="lg" />
              </View>
            </TouchableOpacity>
          )}

          {/* Result */}
          <View style={styles.resultSection}>
            <ResultBadge result={climb.result} size="md" />
            {climb.attempts > 1 && <Text style={styles.attempts}>{climb.attempts} attempts</Text>}
            <Text style={styles.date}>{formatDate(climb.date)}</Text>
          </View>

          {/* Notes */}
          {climb.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notes}>{climb.notes}</Text>
            </View>
          )}

          {/* Media */}
          {climb.media && climb.media.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll} contentContainerStyle={styles.mediaContent}>
              {climb.media.map((m) => (
                <Image key={m.id} source={{ uri: m.url }} style={styles.mediaImage} contentFit="cover" />
              ))}
            </ScrollView>
          )}

          {/* Ratings */}
          {(climb.difficultyRating || climb.enjoymentRating) && (
            <View style={styles.ratingsRow}>
              {climb.difficultyRating && (
                <View style={styles.ratingItem}>
                  <Text style={styles.ratingLabel}>Difficulty</Text>
                  <Text style={styles.ratingValue}>{'⭐'.repeat(climb.difficultyRating)}</Text>
                </View>
              )}
              {climb.enjoymentRating && (
                <View style={styles.ratingItem}>
                  <Text style={styles.ratingLabel}>Enjoyment</Text>
                  <Text style={styles.ratingValue}>{'⭐'.repeat(climb.enjoymentRating)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => likeMutation.mutate()}>
              <Ionicons name={climb.isLiked ? 'heart' : 'heart-outline'} size={24} color={climb.isLiked ? Colors.error : Colors.textSecondary} />
              <Text style={[styles.actionCount, climb.isLiked && { color: Colors.error }]}>{climb.likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={22} color={Colors.textSecondary} />
              <Text style={styles.actionCount}>{climb.commentCount}</Text>
            </TouchableOpacity>
            {climb.userId !== currentUser?.id && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => congratMutation.mutate()}>
                <Ionicons name="trophy-outline" size={22} color={Colors.warning} />
                <Text style={[styles.actionCount, { color: Colors.warning }]}>Congrats!</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments ({commentsData?.pagination.total ?? 0})</Text>
            {commentsData?.data.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <Avatar uri={c.user.profileImageUrl} name={c.user.displayName} size={32} />
                <View style={styles.commentContent}>
                  <Text style={styles.commentUser}>{c.user.displayName}</Text>
                  <Text style={styles.commentText}>{c.content}</Text>
                  <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Comment input */}
        <View style={styles.commentInput}>
          <Avatar uri={currentUser?.profileImageUrl} name={currentUser?.displayName} size={32} />
          <TextInput
            style={styles.commentTextInput}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.textTertiary}
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity onPress={() => comment.trim() && commentMutation.mutate()} disabled={!comment.trim() || commentMutation.isPending}>
            <Ionicons name="send" size={20} color={comment.trim() ? Colors.primary : Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  userInfo: { flex: 1 },
  userName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  userMeta: { color: Colors.textSecondary, fontSize: FontSize.sm },
  routeCard: { marginHorizontal: Spacing.md, backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  routeName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  gymName: { color: Colors.textSecondary, fontSize: FontSize.sm },
  resultSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm },
  attempts: { color: Colors.textSecondary, fontSize: FontSize.sm },
  date: { color: Colors.textSecondary, fontSize: FontSize.sm, marginLeft: 'auto' },
  notesSection: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  notes: { color: Colors.text, fontSize: FontSize.md, lineHeight: 22 },
  mediaScroll: { marginBottom: Spacing.md },
  mediaContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  mediaImage: { width: 240, height: 320, borderRadius: BorderRadius.md },
  ratingsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.xl },
  ratingItem: {},
  ratingLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: 2 },
  ratingValue: { fontSize: FontSize.md },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, gap: Spacing.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  commentsSection: { padding: Spacing.md },
  commentsTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.md },
  commentRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  commentContent: { flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.sm },
  commentUser: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  commentText: { color: Colors.text, fontSize: FontSize.sm, marginTop: 2 },
  commentTime: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
  commentInput: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm },
  commentTextInput: { flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border, maxHeight: 100 },
});
