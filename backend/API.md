# cSocial API Documentation

## Base URL
`http://localhost:3000/api/v1`

## Authentication
All protected endpoints require a JWT access token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## Error Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["field.path: specific error"]
}
```

## Pagination
List endpoints support `page` and `limit` query params and return:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Rate Limits
- General: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- Upload: 20 requests per hour

---

## Auth (`/auth`)

### POST /auth/register
Create a new account.

**Body:** `username`, `email`, `password` (8+), `displayName`

**Response 201:** `{ user, accessToken, refreshToken }`

### POST /auth/login
Authenticate with email/password.

**Body:** `email`, `password`

**Response 200:** `{ user, accessToken, refreshToken }`

### POST /auth/refresh
Get new access token using refresh token.

**Body:** `refreshToken`

**Response 200:** `{ user, accessToken, refreshToken }`

### POST /auth/logout
Invalidate refresh token. Requires auth.

### POST /auth/forgot-password
Request password reset email.

**Body:** `email`

### POST /auth/reset-password
Reset password with token from email.

**Body:** `token`, `password`

---

## Users (`/users`)

All endpoints require authentication.

### GET /users/me
Get current user's full profile.

### PUT /users/me
Update current user's profile.

**Body (all optional):** `displayName`, `bio`, `location`, `yearsClimbing`, `height`, `apeIndex`, `preferredStyle`, `favoriteWallAngle`, `favoriteHoldType`, `privacy` (PUBLIC|FRIENDS_ONLY|PRIVATE)

### PUT /users/me/password
Change password.

**Body:** `currentPassword`, `newPassword`

### DELETE /users/me
Delete account permanently.

**Body:** `password`

### GET /users/search?q=
Search users by username or display name.

### GET /users/:id
Get user profile. Respects privacy settings.

**Response includes:** `isFollowing`, `isOwnProfile`, `_count.followers/following/achievements`

### GET /users/:id/stats
Comprehensive climbing statistics.

**Response:** `totalSends`, `totalFlashes`, `flashRate`, `avgAttemptsPerSend`, `hardestSend`, `hardestFlash`, `streaks`, `climberRating`, `sendsThisWeek`, `sendsThisMonth`, `favoriteGym`, `uniqueGyms`

### GET /users/:id/grade-pyramid
Grade pyramid data.

**Response:** Array of `{ grade, sends, flashes, attempts, completionRate }`

### GET /users/:id/calendar
365-day climbing calendar.

**Response:** Array of `{ date, count, hasSend }`

### GET /users/:id/climbs?grade=&result=&page=&limit=
Paginated climb history.

### GET /users/:id/achievements
Earned and locked achievements.

### GET /users/:id/followers?page=
Paginated follower list.

### GET /users/:id/following?page=
Paginated following list.

### POST /users/:id/follow
Follow a user.

### DELETE /users/:id/follow
Unfollow a user.

---

## Gyms (`/gyms`)

### GET /gyms?q=&city=&country=&page=&limit=
List gyms with optional search/filter.

### GET /gyms/nearby?lat=&lng=&radius=
Find gyms near coordinates (radius in km, default 50).

### POST /gyms
Create a new gym.

**Body:** `name`, `address`, `city`, `country`, `latitude`, `longitude`, `website`, `phone`, `imageUrl`

### GET /gyms/:id
Gym details with walls, stats, and user's send count.

### PUT /gyms/:id
Update gym.

### GET /gyms/:id/routes?grade=&wallId=&active=&page=
Routes at this gym.

### GET /gyms/:id/walls
Walls at this gym.

### GET /gyms/:id/leaderboard?metric=&period=
Gym leaderboard.

**Metric options:** `sends_week`, `sends_month`, `hardest_send`, `flash_rate`, `streak`, `climber_rating`

**Period options:** `week`, `month`, `all_time`

### GET /gyms/:id/stats
Gym statistics (route count, total sends, unique climbers).

### POST /gyms/:id/check-in
Check in to this gym.

---

## Routes (`/routes`)

### GET /routes?gymId=&grade=&wallAngle=&page=
List routes with filters.

### POST /routes
Create a new route.

**Body:** `gymId`, `grade`, `color`, `wallAngle`, `holdStyle`, `setterName`, `dateSet`, `name`, `description`

### GET /routes/:id
Route details with stats, user's best, and their rating.

### PUT /routes/:id
Update route.

### DELETE /routes/:id
Soft delete (marks as inactive).

### GET /routes/:id/leaderboard
Top senders ranked by attempts then date.

### GET /routes/:id/beta
Beta media and comments for this route.

### GET /routes/:id/feed?page=
All public climbs on this route.

### POST /routes/:id/rate
Rate a route. Upserts existing rating.

**Body (all optional):** `difficulty`, `fun`, `creativity`, `skinFriendly`, `quality`, `holdQuality`, `movementQuality`, `overall` (all 1-5)

---

## Climbs (`/climbs`)

### POST /climbs
Log a climb. Updates all stats, checks achievements, notifies followers.

**Body:** `routeId`, `gymId`, `result` (ClimbResult), `attempts`, `date`, `notes`, `difficultyRating`, `enjoymentRating`, `isPublic`, `sessionId`

**ClimbResult values:** `ATTEMPTED`, `WORKING`, `ALMOST`, `COMPLETED`, `FLASH`, `ONSIGHT`, `REPEAT`, `PROJECT`, `COMPETITION_SEND`, `PERSONAL_BEST`

**Response:** `{ climb, xpEarned, newLevel }`

### GET /climbs/:id
Climb details with user, route, media, like/comment counts, isLiked.

### PUT /climbs/:id
Update own climb (notes, ratings, privacy only).

### DELETE /climbs/:id
Delete own climb. Decrements all stats.

### POST /climbs/:id/like
Like a climb.

### DELETE /climbs/:id/like
Unlike a climb.

### GET /climbs/:id/likes?page=
Users who liked this climb.

### GET /climbs/:id/comments?page=
Comments on this climb.

### POST /climbs/:id/comments
Add a comment.

**Body:** `content`

### DELETE /climbs/:id/comments/:commentId
Delete a comment (own or own climb).

### POST /climbs/:id/congratulate
Send congratulations.

**Body:** `message` (optional)

---

## Feed (`/feed`)

### GET /feed?page=&limit=
Chronological social feed (self + following).

### GET /feed/discover?page=&limit=
Popular recent sends (excluding own, ordered by likes).

---

## Leaderboards (`/leaderboards`)

All support `?metric=&period=` query params.

**Metric:** `sends_week`, `sends_month`, `hardest_send`, `flash_rate`, `streak`, `climber_rating`

**Period:** `week`, `month`, `all_time`

### GET /leaderboards/global
Global top 50 climbers by metric.

### GET /leaderboards/friends
Friends leaderboard for current user.

### GET /leaderboards/gym/:gymId
Gym-specific leaderboard.

---

## Achievements (`/achievements`)

### GET /achievements
All available achievements.

### GET /achievements/user/:userId
User's earned and locked achievements with counts.

---

## Challenges (`/challenges`)

### GET /challenges
Active challenges with user's progress if joined.

### GET /challenges/user/active
Current user's active (not completed) challenges.

### GET /challenges/:id
Challenge details with user progress.

### POST /challenges/:id/join
Join a challenge.

---

## Notifications (`/notifications`)

### GET /notifications?page=
User's notifications with unread count.

### PUT /notifications/:id/read
Mark notification as read.

### PUT /notifications/read-all
Mark all notifications as read.

### DELETE /notifications/:id
Delete a notification.

---

## Media (`/media`)

### POST /media/upload
Upload a photo or video. Multipart form data.

**Form fields:** `file` (required), `climbId`, `routeId`, `isBeta`, `caption`

**Response:** `{ id, url, type }`

### DELETE /media/:id
Delete own media.

---

## Search (`/search`)

### GET /search?q=&type=
Unified search across users, gyms, and routes.

**Type options:** `all` (default), `users`, `gyms`, `routes`

**Response:**
```json
{
  "users": [...],
  "gyms": [...],
  "routes": [...]
}
```
