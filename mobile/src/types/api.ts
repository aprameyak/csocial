export type ClimbResult =
  | 'ATTEMPTED'
  | 'WORKING'
  | 'ALMOST'
  | 'COMPLETED'
  | 'FLASH'
  | 'ONSIGHT'
  | 'REPEAT'
  | 'PROJECT'
  | 'COMPETITION_SEND'
  | 'PERSONAL_BEST';

export type WallAngle = 'SLAB' | 'VERTICAL' | 'SLIGHT_OVERHANG' | 'OVERHANG' | 'STEEP' | 'ROOF';
export type PrivacyLevel = 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
export type MediaType = 'PHOTO' | 'VIDEO';

export interface User {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  homeGymId?: string | null;
  location?: string | null;
  yearsClimbing?: number | null;
  height?: number | null;
  apeIndex?: number | null;
  preferredStyle?: string | null;
  currentProjectGrade?: string | null;
  hardestSend?: string | null;
  hardestFlash?: string | null;
  gymGrade?: string | null;
  outdoorGrade?: string | null;
  favoriteWallAngle?: string | null;
  favoriteHoldType?: string | null;
  privacy: PrivacyLevel;
  climberRating: number;
  xpPoints: number;
  level: number;
  consistencyStreak: number;
  longestStreak: number;
  totalSends: number;
  totalAttempts: number;
  totalFlashes: number;
  totalSessions: number;
  createdAt: string;
  homeGym?: { id: string; name: string; city: string } | null;
  _count?: { followers: number; following: number; achievements: number };
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

export interface Gym {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  state?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  phone?: string | null;
  instagram?: string | null;
  imageUrl?: string | null;
  isVerified: boolean;
  isActive: boolean;
  totalRoutes: number;
  totalSends: number;
  walls?: Wall[];
  _count?: { routes: number; checkIns: number; homeUsers: number };
  distance?: number;
}

export interface Wall {
  id: string;
  gymId: string;
  name: string;
  angle: WallAngle;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  _count?: { routes: number };
}

export interface Route {
  id: string;
  gymId: string;
  wallId?: string | null;
  name?: string | null;
  grade: string;
  color: string;
  setterName?: string | null;
  dateSet: string;
  expectedRemoval?: string | null;
  isActive: boolean;
  wallAngle?: WallAngle | null;
  holdStyle?: string | null;
  isCompetition: boolean;
  description?: string | null;
  totalAttempts: number;
  totalSends: number;
  flashCount: number;
  avgDifficulty?: number | null;
  avgFun?: number | null;
  avgRating?: number | null;
  gym?: { id: string; name: string; city: string };
  wall?: { id: string; name: string; angle: WallAngle } | null;
  media?: Media[];
  flashRate?: number;
  userBest?: Climb | null;
  userRating?: Rating | null;
}

export interface Climb {
  id: string;
  userId: string;
  routeId: string;
  gymId: string;
  sessionId?: string | null;
  result: ClimbResult;
  attempts: number;
  notes?: string | null;
  difficultyRating?: number | null;
  enjoymentRating?: number | null;
  isVerified: boolean;
  isCompetitionSend: boolean;
  agreeWithGrade?: boolean | null;
  perceivedGrade?: string | null;
  isPublic: boolean;
  likeCount: number;
  commentCount: number;
  date: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'profileImageUrl'>;
  route?: Route;
  media?: Media[];
  isLiked?: boolean;
}

export interface Session {
  id: string;
  userId: string;
  gymId: string;
  startTime: string;
  endTime?: string | null;
  duration?: number | null;
  notes?: string | null;
  climbCount: number;
  sendCount: number;
  gym?: { id: string; name: string };
}

export interface Media {
  id: string;
  userId: string;
  climbId?: string | null;
  routeId?: string | null;
  type: MediaType;
  url: string;
  thumbnailUrl?: string | null;
  size?: number | null;
  duration?: number | null;
  isBeta: boolean;
  caption?: string | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'profileImageUrl'>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  rarity: string;
  unlockedAt?: string;
}

export interface Comment {
  id: string;
  userId: string;
  climbId?: string | null;
  routeId?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, 'id' | 'username' | 'displayName' | 'profileImageUrl'>;
}

export interface Rating {
  id: string;
  userId: string;
  routeId: string;
  difficulty?: number | null;
  fun?: number | null;
  creativity?: number | null;
  skinFriendly?: number | null;
  quality?: number | null;
  holdQuality?: number | null;
  movementQuality?: number | null;
  overall?: number | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  xpReward: number;
  isActive: boolean;
  isRecurring: boolean;
  imageUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  participantCount?: number;
  userProgress?: UserChallenge | null;
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  progress: Record<string, unknown>;
  isCompleted: boolean;
  completedAt?: string | null;
  joinedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: Pick<User, 'id' | 'username' | 'displayName' | 'profileImageUrl'>;
  value: number | string;
  metric: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface UserStats {
  totalSends: number;
  totalAttempts: number;
  totalFlashes: number;
  totalSessions: number;
  flashRate: number;
  avgAttemptsPerSend: number;
  hardestSend: string | null;
  hardestFlash: string | null;
  consistencyStreak: number;
  longestStreak: number;
  climberRating: number;
  xpPoints: number;
  level: number;
  sendsThisWeek: number;
  sendsThisMonth: number;
  favoriteGym: { id: string; name: string } | null;
  uniqueGyms: number;
}

export interface GradePyramidItem {
  grade: string;
  sends: number;
  flashes: number;
  attempts: number;
  completionRate: number;
}

export interface CalendarDay {
  date: string;
  count: number;
  hasSend: boolean;
}
