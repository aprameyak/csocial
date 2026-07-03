import { prisma } from '../config/database';

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, title, body, data },
  });
}

export async function notifyFollowers(
  actorId: string,
  actorName: string,
  climbId: string,
  routeGrade: string
): Promise<void> {
  const followers = await prisma.follow.findMany({
    where: { followingId: actorId },
    select: { followerId: true },
  });

  if (followers.length === 0) return;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.followerId,
      type: 'FRIEND_CLIMB',
      title: `${actorName} sent a ${routeGrade}!`,
      body: `Check out their latest climb`,
      data: { climbId, actorId },
    })),
  });
}

export async function notifyLike(
  climbOwnerId: string,
  likerId: string,
  likerName: string,
  climbId: string
): Promise<void> {
  if (climbOwnerId === likerId) return;
  await createNotification(
    climbOwnerId,
    'LIKE',
    `${likerName} liked your climb`,
    'Someone gave your send a like!',
    { climbId, likerId }
  );
}

export async function notifyComment(
  climbOwnerId: string,
  commenterId: string,
  commenterName: string,
  climbId: string,
  commentPreview: string
): Promise<void> {
  if (climbOwnerId === commenterId) return;
  await createNotification(
    climbOwnerId,
    'COMMENT',
    `${commenterName} commented on your climb`,
    commentPreview.slice(0, 100),
    { climbId, commenterId }
  );
}

export async function notifyFollow(
  targetUserId: string,
  followerId: string,
  followerName: string
): Promise<void> {
  await createNotification(
    targetUserId,
    'FOLLOW',
    `${followerName} started following you`,
    'You have a new follower!',
    { followerId }
  );
}

export async function notifyAchievement(
  userId: string,
  achievementName: string,
  xpReward: number
): Promise<void> {
  await createNotification(
    userId,
    'ACHIEVEMENT',
    `Achievement unlocked: ${achievementName}`,
    `You earned ${xpReward} XP!`,
    { achievementName, xpReward }
  );
}

export async function notifyCongratulation(
  toUserId: string,
  fromUserId: string,
  fromName: string,
  climbId: string,
  message?: string
): Promise<void> {
  if (toUserId === fromUserId) return;
  await createNotification(
    toUserId,
    'CONGRATULATION',
    `${fromName} congratulated your send!`,
    message ?? 'Great work on that send!',
    { climbId, fromUserId }
  );
}
