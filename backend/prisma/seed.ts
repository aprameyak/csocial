import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed achievements
  const achievements = [
    // Milestone sends
    { name: 'First Send', description: 'Log your very first climb', icon: '🧗', category: 'milestone', criteria: { type: 'total_sends', threshold: 1 }, xpReward: 50, rarity: 'common' },
    { name: '10 Sends', description: 'Log 10 climbs total', icon: '🔟', category: 'milestone', criteria: { type: 'total_sends', threshold: 10 }, xpReward: 100, rarity: 'common' },
    { name: '50 Sends', description: 'Log 50 climbs total', icon: '5️⃣0️⃣', category: 'milestone', criteria: { type: 'total_sends', threshold: 50 }, xpReward: 200, rarity: 'uncommon' },
    { name: '100 Sends', description: 'Log 100 climbs total', icon: '💯', category: 'milestone', criteria: { type: 'total_sends', threshold: 100 }, xpReward: 500, rarity: 'uncommon' },
    { name: '500 Sends', description: 'Log 500 climbs total', icon: '🏆', category: 'milestone', criteria: { type: 'total_sends', threshold: 500 }, xpReward: 1000, rarity: 'rare' },
    { name: '1000 Sends', description: 'Log 1000 climbs total', icon: '👑', category: 'milestone', criteria: { type: 'total_sends', threshold: 1000 }, xpReward: 2500, rarity: 'legendary' },

    // Grade achievements
    { name: 'First V3', description: 'Send your first V3', icon: '🟦', category: 'grade', criteria: { type: 'grade_send', grade: 'V3' }, xpReward: 150, rarity: 'common' },
    { name: 'First V5', description: 'Send your first V5', icon: '🟡', category: 'grade', criteria: { type: 'grade_send', grade: 'V5' }, xpReward: 300, rarity: 'uncommon' },
    { name: 'First V7', description: 'Send your first V7', icon: '🟠', category: 'grade', criteria: { type: 'grade_send', grade: 'V7' }, xpReward: 500, rarity: 'uncommon' },
    { name: 'First V8', description: 'Send your first V8', icon: '🔶', category: 'grade', criteria: { type: 'grade_send', grade: 'V8' }, xpReward: 750, rarity: 'rare' },
    { name: 'First V10', description: 'Send your first V10', icon: '🔴', category: 'grade', criteria: { type: 'grade_send', grade: 'V10' }, xpReward: 1500, rarity: 'rare' },
    { name: 'First V12', description: 'Send your first V12', icon: '🟣', category: 'grade', criteria: { type: 'grade_send', grade: 'V12' }, xpReward: 3000, rarity: 'epic' },

    // Flash achievements
    { name: 'First Flash', description: 'Flash a route on your first attempt', icon: '⚡', category: 'flash', criteria: { type: 'total_flashes', threshold: 1 }, xpReward: 200, rarity: 'common' },
    { name: 'Flash Machine', description: 'Flash 50 routes', icon: '⚡⚡', category: 'flash', criteria: { type: 'total_flashes', threshold: 50 }, xpReward: 750, rarity: 'rare' },
    { name: 'Lightning Climber', description: 'Flash 100 routes', icon: '🌩️', category: 'flash', criteria: { type: 'total_flashes', threshold: 100 }, xpReward: 1500, rarity: 'epic' },
    { name: 'Flash V7', description: 'Flash a V7 or harder on first attempt', icon: '⚡🟠', category: 'flash', criteria: { type: 'grade_flash', grade: 'V7' }, xpReward: 1000, rarity: 'rare' },

    // Streak achievements
    { name: '7 Day Streak', description: 'Climb 7 days in a row', icon: '🔥', category: 'streak', criteria: { type: 'streak', threshold: 7 }, xpReward: 300, rarity: 'uncommon' },
    { name: '30 Day Streak', description: 'Climb 30 days in a row', icon: '🔥🔥', category: 'streak', criteria: { type: 'streak', threshold: 30 }, xpReward: 1000, rarity: 'rare' },
    { name: 'Obsessed', description: 'Climb 100 days in a row', icon: '🔥🔥🔥', category: 'streak', criteria: { type: 'streak', threshold: 100 }, xpReward: 5000, rarity: 'legendary' },

    // Session achievements
    { name: '10 Sessions', description: 'Complete 10 climbing sessions', icon: '🏟️', category: 'session', criteria: { type: 'total_sessions', threshold: 10 }, xpReward: 200, rarity: 'common' },
    { name: '100 Sessions', description: 'Complete 100 climbing sessions', icon: '💪', category: 'session', criteria: { type: 'total_sessions', threshold: 100 }, xpReward: 1000, rarity: 'rare' },

    // Style achievements
    { name: 'Roof Master', description: 'Send 10 roof routes', icon: '🏠', category: 'style', criteria: { type: 'wall_angle_sends', angle: 'ROOF', threshold: 10 }, xpReward: 400, rarity: 'uncommon' },
    { name: 'Slab Specialist', description: 'Send 10 slab routes', icon: '📐', category: 'style', criteria: { type: 'wall_angle_sends', angle: 'SLAB', threshold: 10 }, xpReward: 300, rarity: 'uncommon' },

    // Project achievements
    { name: 'Project Crusher', description: 'Send a route after 10+ attempts', icon: '💥', category: 'project', criteria: { type: 'long_project', min_attempts: 10 }, xpReward: 500, rarity: 'uncommon' },
    { name: 'Consistent', description: 'Log climbs for 4 weeks straight', icon: '📅', category: 'consistency', criteria: { type: 'weekly_streak', threshold: 4 }, xpReward: 400, rarity: 'uncommon' },
    { name: 'Traveler', description: 'Climb at 5 different gyms', icon: '✈️', category: 'social', criteria: { type: 'unique_gyms', threshold: 5 }, xpReward: 500, rarity: 'uncommon' },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { name: ach.name },
      update: {},
      create: ach,
    });
  }
  console.log(`Seeded ${achievements.length} achievements`);

  // Seed gyms
  const gyms = [
    {
      name: 'Sender City Climbing',
      description: 'Premier bouldering gym with 10,000 sq ft of climbing terrain',
      address: '123 Chalk Street',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      latitude: 37.7749,
      longitude: -122.4194,
      website: 'https://sendercity.example.com',
      phone: '+1-415-555-0100',
      imageUrl: 'https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=800',
      isVerified: true,
    },
    {
      name: 'The Overhang',
      description: 'Steep walls and powerful climbing. Home of the hardest problems in the city.',
      address: '456 Crimp Ave',
      city: 'Boulder',
      state: 'CO',
      country: 'USA',
      latitude: 40.0150,
      longitude: -105.2705,
      website: 'https://theoverhang.example.com',
      phone: '+1-303-555-0200',
      imageUrl: 'https://images.unsplash.com/photo-1516592673884-4a382d1124c2?w=800',
      isVerified: true,
    },
    {
      name: 'Vertical Playground',
      description: 'Family-friendly gym with routes for all levels',
      address: '789 Route Rd',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      latitude: 30.2672,
      longitude: -97.7431,
      website: 'https://verticalplayground.example.com',
      phone: '+1-512-555-0300',
      imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800',
      isVerified: false,
    },
    {
      name: 'Peak Performance Bouldering',
      description: 'Competition-style setting with fresh problems every 2 weeks',
      address: '321 Dyno Drive',
      city: 'Seattle',
      state: 'WA',
      country: 'USA',
      latitude: 47.6062,
      longitude: -122.3321,
      imageUrl: 'https://images.unsplash.com/photo-1590059905958-ea44fe9c8e37?w=800',
      isVerified: true,
    },
    {
      name: 'The Bloc',
      description: 'New York\'s premier bouldering destination',
      address: '555 Manhattan Blvd',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      latitude: 40.7128,
      longitude: -74.0060,
      website: 'https://thebloc.example.com',
      phone: '+1-212-555-0500',
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      isVerified: true,
    },
  ];

  for (const gym of gyms) {
    await prisma.gym.upsert({
      where: { id: gym.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: gym,
    });
  }
  console.log(`Seeded ${gyms.length} gyms`);

  // Seed challenges
  const challenges = [
    {
      name: 'Flash 5 V4s',
      description: 'Flash 5 routes rated V4 or higher this week',
      type: 'weekly',
      criteria: { type: 'flash_grade', grade: 'V4', count: 5, period: 'week' },
      xpReward: 300,
      isActive: true,
      isRecurring: true,
    },
    {
      name: 'Slab Week',
      description: 'Complete 3 slab routes in 7 days',
      type: 'weekly',
      criteria: { type: 'wall_angle_sends', angle: 'SLAB', count: 3, period: 'week' },
      xpReward: 200,
      isActive: true,
      isRecurring: true,
    },
    {
      name: 'Roof Climber',
      description: 'Attempt a roof route this week',
      type: 'weekly',
      criteria: { type: 'wall_angle_attempts', angle: 'ROOF', count: 1, period: 'week' },
      xpReward: 150,
      isActive: true,
      isRecurring: true,
    },
    {
      name: 'Consistency Champion',
      description: 'Climb 3 different days this week',
      type: 'weekly',
      criteria: { type: 'unique_days', count: 3, period: 'week' },
      xpReward: 250,
      isActive: true,
      isRecurring: true,
    },
    {
      name: 'Send Your Project',
      description: 'Complete a route you have been working on (3+ attempts)',
      type: 'ongoing',
      criteria: { type: 'project_send', min_prior_attempts: 3 },
      xpReward: 400,
      isActive: true,
      isRecurring: false,
    },
    {
      name: 'Try Something New',
      description: 'Climb a route at a gym you have never visited',
      type: 'ongoing',
      criteria: { type: 'new_gym_visit' },
      xpReward: 300,
      isActive: true,
      isRecurring: false,
    },
    {
      name: 'Volume Month',
      description: 'Log 50 climbs in a single month',
      type: 'monthly',
      criteria: { type: 'total_sends', count: 50, period: 'month' },
      xpReward: 500,
      isActive: true,
      isRecurring: true,
    },
    {
      name: 'Hardest Problem',
      description: 'Attempt a route at least 2 grades above your current level',
      type: 'ongoing',
      criteria: { type: 'attempt_hard_grade', grades_above: 2 },
      xpReward: 200,
      isActive: true,
      isRecurring: false,
    },
    {
      name: 'Social Climber',
      description: 'Comment helpful beta on 3 different routes',
      type: 'weekly',
      criteria: { type: 'route_comments', count: 3, period: 'week' },
      xpReward: 150,
      isActive: true,
      isRecurring: true,
    },
    {
      name: 'Morning Crusher',
      description: 'Log a climb before 9am',
      type: 'ongoing',
      criteria: { type: 'morning_climb', before_hour: 9 },
      xpReward: 100,
      isActive: true,
      isRecurring: false,
    },
  ];

  for (const challenge of challenges) {
    await prisma.challenge.create({ data: challenge });
  }
  console.log(`Seeded ${challenges.length} challenges`);

  // Create demo user
  const passwordHash = await bcrypt.hash('Demo1234!', 10);
  await prisma.user.upsert({
    where: { email: 'demo@csocial.app' },
    update: {},
    create: {
      username: 'demo_climber',
      email: 'demo@csocial.app',
      passwordHash,
      displayName: 'Demo Climber',
      bio: 'Just here to send hard problems and eat chalk',
      yearsClimbing: 3,
      gymGrade: 'V6',
      hardestSend: 'V7',
      preferredStyle: 'Overhang',
    },
  });
  console.log('Seeded demo user (demo@csocial.app / Demo1234!)');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
