import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import type {
  ApiResponse,
  AuthResponse,
  PaginatedResponse,
  User,
  UserStats,
  GradePyramidItem,
  CalendarDay,
  Gym,
  Wall,
  Route,
  Climb,
  ClimbResult,
  Comment,
  Notification,
  Achievement,
  Challenge,
  LeaderboardEntry,
} from '../types/api';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const ACCESS_TOKEN_KEY = 'csocial_access_token';
const REFRESH_TOKEN_KEY = 'csocial_refresh_token';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshQueue.push((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }
          originalRequest._retry = true;
          this.isRefreshing = true;
          try {
            const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
            if (!refreshToken) throw new Error('No refresh token');
            const { data } = await this.client.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken });
            const newToken = data.data!.accessToken;
            await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newToken);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.data!.refreshToken);
            this.refreshQueue.forEach((cb) => cb(newToken));
            this.refreshQueue = [];
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch {
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            return Promise.reject(error);
          } finally {
            this.isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async saveTokens(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }

  async clearTokens() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }

  // AUTH
  auth = {
    register: (data: { username: string; email: string; password: string; displayName: string }) =>
      this.client.post<ApiResponse<AuthResponse>>('/auth/register', data).then((r) => r.data),

    login: (email: string, password: string) =>
      this.client.post<ApiResponse<AuthResponse>>('/auth/login', { email, password }).then((r) => r.data),

    refresh: (refreshToken: string) =>
      this.client.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken }).then((r) => r.data),

    logout: (refreshToken?: string) =>
      this.client.post('/auth/logout', { refreshToken }).then((r) => r.data),

    forgotPassword: (email: string) =>
      this.client.post('/auth/forgot-password', { email }).then((r) => r.data),

    resetPassword: (token: string, password: string) =>
      this.client.post('/auth/reset-password', { token, password }).then((r) => r.data),
  };

  // USERS
  users = {
    getMe: () =>
      this.client.get<ApiResponse<User>>('/users/me').then((r) => r.data.data!),

    updateMe: (data: Partial<User>) =>
      this.client.put<ApiResponse<User>>('/users/me', data).then((r) => r.data.data!),

    changePassword: (currentPassword: string, newPassword: string) =>
      this.client.put('/users/me/password', { currentPassword, newPassword }).then((r) => r.data),

    deleteAccount: (password: string) =>
      this.client.delete('/users/me', { data: { password } }).then((r) => r.data),

    getProfile: (userId: string) =>
      this.client.get<ApiResponse<User>>(`/users/${userId}`).then((r) => r.data.data!),

    getStats: (userId: string) =>
      this.client.get<ApiResponse<UserStats>>(`/users/${userId}/stats`).then((r) => r.data.data!),

    getClimbs: (userId: string, params?: { page?: number; limit?: number; grade?: string; result?: string }) =>
      this.client.get<PaginatedResponse<Climb>>(`/users/${userId}/climbs`, { params }).then((r) => r.data),

    getGradePyramid: (userId: string) =>
      this.client.get<ApiResponse<GradePyramidItem[]>>(`/users/${userId}/grade-pyramid`).then((r) => r.data.data!),

    getCalendar: (userId: string) =>
      this.client.get<ApiResponse<CalendarDay[]>>(`/users/${userId}/calendar`).then((r) => r.data.data!),

    getAchievements: (userId: string) =>
      this.client.get<ApiResponse<{ earned: Achievement[]; locked: Achievement[] }>>(`/users/${userId}/achievements`).then((r) => r.data.data!),

    getFollowers: (userId: string, params?: { page?: number }) =>
      this.client.get<PaginatedResponse<User>>(`/users/${userId}/followers`, { params }).then((r) => r.data),

    getFollowing: (userId: string, params?: { page?: number }) =>
      this.client.get<PaginatedResponse<User>>(`/users/${userId}/following`, { params }).then((r) => r.data),

    follow: (userId: string) =>
      this.client.post(`/users/${userId}/follow`).then((r) => r.data),

    unfollow: (userId: string) =>
      this.client.delete(`/users/${userId}/follow`).then((r) => r.data),

    search: (q: string) =>
      this.client.get<ApiResponse<User[]>>('/users/search', { params: { q } }).then((r) => r.data.data ?? []),
  };

  // GYMS
  gyms = {
    list: (params?: { city?: string; country?: string; q?: string; page?: number; limit?: number }) =>
      this.client.get<PaginatedResponse<Gym>>('/gyms', { params }).then((r) => r.data),

    nearby: (lat: number, lng: number, radius?: number) =>
      this.client.get<ApiResponse<Gym[]>>('/gyms/nearby', { params: { lat, lng, radius } }).then((r) => r.data.data ?? []),

    get: (gymId: string) =>
      this.client.get<ApiResponse<Gym>>(`/gyms/${gymId}`).then((r) => r.data.data!),

    getRoutes: (gymId: string, params?: { grade?: string; wallId?: string; active?: boolean; page?: number }) =>
      this.client.get<PaginatedResponse<Route>>(`/gyms/${gymId}/routes`, { params }).then((r) => r.data),

    getWalls: (gymId: string) =>
      this.client.get<ApiResponse<Wall[]>>(`/gyms/${gymId}/walls`).then((r) => r.data.data ?? []),

    getLeaderboard: (gymId: string, metric?: string, period?: string) =>
      this.client.get<ApiResponse<LeaderboardEntry[]>>(`/gyms/${gymId}/leaderboard`, { params: { metric, period } }).then((r) => r.data.data ?? []),

    getStats: (gymId: string) =>
      this.client.get(`/gyms/${gymId}/stats`).then((r) => r.data),

    checkIn: (gymId: string) =>
      this.client.post(`/gyms/${gymId}/check-in`).then((r) => r.data),

    create: (data: Partial<Gym>) =>
      this.client.post<ApiResponse<Gym>>('/gyms', data).then((r) => r.data.data!),
  };

  // ROUTES
  routes = {
    list: (params?: { gymId?: string; grade?: string; wallAngle?: string; page?: number }) =>
      this.client.get<PaginatedResponse<Route>>('/routes', { params }).then((r) => r.data),

    get: (routeId: string) =>
      this.client.get<ApiResponse<Route>>(`/routes/${routeId}`).then((r) => r.data.data!),

    create: (data: Partial<Route>) =>
      this.client.post<ApiResponse<Route>>('/routes', data).then((r) => r.data.data!),

    update: (routeId: string, data: Partial<Route>) =>
      this.client.put<ApiResponse<Route>>(`/routes/${routeId}`, data).then((r) => r.data.data!),

    rate: (routeId: string, rating: Record<string, number>) =>
      this.client.post(`/routes/${routeId}/rate`, rating).then((r) => r.data),

    getBeta: (routeId: string) =>
      this.client.get(`/routes/${routeId}/beta`).then((r) => r.data),

    getFeed: (routeId: string, params?: { page?: number }) =>
      this.client.get<PaginatedResponse<Climb>>(`/routes/${routeId}/feed`, { params }).then((r) => r.data),

    getLeaderboard: (routeId: string) =>
      this.client.get<ApiResponse<unknown[]>>(`/routes/${routeId}/leaderboard`).then((r) => r.data.data ?? []),
  };

  // CLIMBS
  climbs = {
    create: (data: {
      routeId: string; gymId: string; result: ClimbResult; attempts?: number;
      date?: string; notes?: string; difficultyRating?: number; enjoymentRating?: number;
      isPublic?: boolean; sessionId?: string;
    }) =>
      this.client.post<ApiResponse<{ climb: Climb; xpEarned: number; newLevel: number }>>('/climbs', data).then((r) => r.data.data!),

    get: (climbId: string) =>
      this.client.get<ApiResponse<Climb>>(`/climbs/${climbId}`).then((r) => r.data.data!),

    update: (climbId: string, data: Partial<Climb>) =>
      this.client.put<ApiResponse<Climb>>(`/climbs/${climbId}`, data).then((r) => r.data.data!),

    delete: (climbId: string) =>
      this.client.delete(`/climbs/${climbId}`).then((r) => r.data),

    like: (climbId: string) =>
      this.client.post(`/climbs/${climbId}/like`).then((r) => r.data),

    unlike: (climbId: string) =>
      this.client.delete(`/climbs/${climbId}/like`).then((r) => r.data),

    getLikes: (climbId: string) =>
      this.client.get<PaginatedResponse<User>>(`/climbs/${climbId}/likes`).then((r) => r.data),

    getComments: (climbId: string, params?: { page?: number }) =>
      this.client.get<PaginatedResponse<Comment>>(`/climbs/${climbId}/comments`, { params }).then((r) => r.data),

    addComment: (climbId: string, content: string) =>
      this.client.post<ApiResponse<Comment>>(`/climbs/${climbId}/comments`, { content }).then((r) => r.data.data!),

    deleteComment: (climbId: string, commentId: string) =>
      this.client.delete(`/climbs/${climbId}/comments/${commentId}`).then((r) => r.data),

    congratulate: (climbId: string, message?: string) =>
      this.client.post(`/climbs/${climbId}/congratulate`, { message }).then((r) => r.data),
  };

  // FEED
  feed = {
    getFeed: (params?: { page?: number; limit?: number }) =>
      this.client.get<PaginatedResponse<Climb>>('/feed', { params }).then((r) => r.data),

    getDiscover: (params?: { page?: number; limit?: number }) =>
      this.client.get<PaginatedResponse<Climb>>('/feed/discover', { params }).then((r) => r.data),
  };

  // LEADERBOARDS
  leaderboards = {
    getGlobal: (metric?: string, period?: string) =>
      this.client.get<ApiResponse<LeaderboardEntry[]>>('/leaderboards/global', { params: { metric, period } }).then((r) => r.data.data ?? []),

    getFriends: (metric?: string, period?: string) =>
      this.client.get<ApiResponse<LeaderboardEntry[]>>('/leaderboards/friends', { params: { metric, period } }).then((r) => r.data.data ?? []),

    getGym: (gymId: string, metric?: string, period?: string) =>
      this.client.get<ApiResponse<LeaderboardEntry[]>>(`/leaderboards/gym/${gymId}`, { params: { metric, period } }).then((r) => r.data.data ?? []),
  };

  // ACHIEVEMENTS
  achievements = {
    getAll: () =>
      this.client.get<ApiResponse<Achievement[]>>('/achievements').then((r) => r.data.data ?? []),

    getUserAchievements: (userId: string) =>
      this.client.get<ApiResponse<{ earned: Achievement[]; locked: Achievement[]; total: number; earnedCount: number }>>(`/achievements/user/${userId}`).then((r) => r.data.data!),
  };

  // CHALLENGES
  challenges = {
    getActive: () =>
      this.client.get<ApiResponse<Challenge[]>>('/challenges').then((r) => r.data.data ?? []),

    get: (challengeId: string) =>
      this.client.get<ApiResponse<Challenge>>(`/challenges/${challengeId}`).then((r) => r.data.data!),

    join: (challengeId: string) =>
      this.client.post(`/challenges/${challengeId}/join`).then((r) => r.data),

    getUserActive: () =>
      this.client.get<ApiResponse<unknown[]>>('/challenges/user/active').then((r) => r.data.data ?? []),
  };

  // NOTIFICATIONS
  notifications = {
    getAll: (params?: { page?: number }) =>
      this.client.get<PaginatedResponse<Notification> & { unreadCount: number }>('/notifications', { params }).then((r) => r.data),

    markRead: (notificationId: string) =>
      this.client.put(`/notifications/${notificationId}/read`).then((r) => r.data),

    markAllRead: () =>
      this.client.put('/notifications/read-all').then((r) => r.data),

    delete: (notificationId: string) =>
      this.client.delete(`/notifications/${notificationId}`).then((r) => r.data),
  };

  // SEARCH
  search = {
    search: (q: string, type?: string) =>
      this.client.get<ApiResponse<Record<string, unknown[]>>>('/search', { params: { q, type } }).then((r) => r.data.data!),
  };

  // MEDIA
  media = {
    upload: (formData: FormData) =>
      this.client.post<ApiResponse<{ id: string; url: string; type: string }>>('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data.data!),

    delete: (mediaId: string) =>
      this.client.delete(`/media/${mediaId}`).then((r) => r.data),
  };
}

export const api = new ApiClient();
