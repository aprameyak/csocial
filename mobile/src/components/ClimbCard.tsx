import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../constants/theme';
import { Avatar } from './ui/Avatar';
import { GradeBadge, ResultBadge } from './ui/Badge';
import { formatWallAngle, timeAgo } from '../utils/format';
import type { Climb } from '../types/api';

interface ClimbCardProps {
  climb: Climb;
  onLike?: (climbId: string, isLiked: boolean) => void;
  showUser?: boolean;
}

export function ClimbCard({ climb, onLike, showUser = true }: ClimbCardProps) {
  const router = useRouter();

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike?.(climb.id, !climb.isLiked);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push(`/climb/${climb.id}`)}
      style={styles.card}
    >
      {/* Header */}
      {showUser && climb.user && (
        <TouchableOpacity
          style={styles.header}
          onPress={() => router.push(`/profile/${climb.user!.id}`)}
          activeOpacity={0.7}
        >
          <Avatar uri={climb.user.profileImageUrl} name={climb.user.displayName} size={38} />
          <View style={styles.headerText}>
            <Text style={styles.displayName}>{climb.user.displayName}</Text>
            <Text style={styles.meta}>@{climb.user.username} · {timeAgo(climb.date)}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Route info */}
      {climb.route && (
        <View style={styles.routeInfo}>
          <View style={styles.routeLeft}>
            <View style={[styles.colorDot, { backgroundColor: climb.route.color.toLowerCase() }]} />
            <View>
              <Text style={styles.routeName}>
                {climb.route.name ?? `${climb.route.grade} ${climb.route.color} Problem`}
              </Text>
              <Text style={styles.gymName}>
                {climb.route.gym?.name ?? 'Unknown Gym'}{climb.route.wall ? ` · ${climb.route.wall.name}` : ''}
                {climb.route.wallAngle ? ` · ${formatWallAngle(climb.route.wallAngle)}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.badges}>
            <GradeBadge grade={climb.route.grade} size="md" />
          </View>
        </View>
      )}

      {/* Result */}
      <View style={styles.resultRow}>
        <ResultBadge result={climb.result} />
        {climb.attempts > 1 && (
          <Text style={styles.attempts}>{climb.attempts} attempts</Text>
        )}
      </View>

      {/* Notes */}
      {climb.notes && (
        <Text style={styles.notes} numberOfLines={3}>{climb.notes}</Text>
      )}

      {/* Media */}
      {climb.media && climb.media.length > 0 && (
        <View style={styles.mediaRow}>
          {climb.media.slice(0, 3).map((m, i) => (
            <Image
              key={m.id}
              source={{ uri: m.url }}
              style={[styles.mediaThumb, i > 0 && { marginLeft: 4 }]}
              contentFit="cover"
            />
          ))}
          {climb.media.length > 3 && (
            <View style={styles.moreMedia}>
              <Text style={styles.moreMediaText}>+{climb.media.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable style={styles.action} onPress={handleLike}>
          <Ionicons
            name={climb.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={climb.isLiked ? Colors.error : Colors.textSecondary}
          />
          <Text style={[styles.actionText, climb.isLiked && { color: Colors.error }]}>
            {climb.likeCount}
          </Text>
        </Pressable>

        <Pressable style={styles.action} onPress={() => router.push(`/climb/${climb.id}`)}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.actionText}>{climb.commentCount}</Text>
        </Pressable>

        <Pressable style={styles.action} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Ionicons name="trophy-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.actionText}>Congrats</Text>
        </Pressable>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerText: { marginLeft: Spacing.sm, flex: 1 },
  displayName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  meta: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  routeLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  routeName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  gymName: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 1 },
  badges: { flexDirection: 'row', gap: 4 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  attempts: { color: Colors.textSecondary, fontSize: FontSize.sm },
  notes: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    lineHeight: 20,
  },
  mediaRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  mediaThumb: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  moreMedia: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  moreMediaText: { color: Colors.textSecondary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.lg,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
