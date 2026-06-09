# VideoConf Platform API Reference

This document describes the REST API endpoints for the VideoConf Platform backend.

## Base URL

```
http://localhost:4000/api
```

In production, replace `localhost:4000` with your actual domain.

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

Some endpoints (like auth registration/login) are public and do not require authentication.

## Error Responses

All endpoints return JSON responses with the following structure:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description"
}
```

HTTP status codes:
- 200: OK
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Pagination

Endpoints that return lists support pagination with these query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

Pagination response format:
```json
{
  "success": true,
  "data": {
    "items": [ /* array of items */ ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

## Authentication Endpoints

### Register a New User
```
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### Login User
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### Logout User
```
POST /api/auth/logout
```
**Requires Authentication: Yes**

**Response:**
```json
{
  "success": true,
  "data": null
}
```

### Refresh Access Token
```
POST /api/auth/refresh-token
```

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-token",
    "refreshToken": "new-refresh-token"
  }
}
```

### Resend Verification Email
```
POST /api/auth/resend-verification
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Verification email sent"
  }
}
```

### Request Password Reset
```
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset email sent"
  }
}
```

## Meeting Endpoints

### Create Meeting
```
POST /api/meetings
```
**Requires Authentication: Yes**

**Request Body:**
```json
{
  "title": "Team Meeting",
  "description": "Weekly team sync",
  "scheduledStart": "2024-01-15T10:00:00Z",
  "isPublic": false,
  "waitingRoomEnabled": true,
  "maxParticipants": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Team Meeting",
    "description": "Weekly team sync",
    "scheduledStart": "2024-01-15T10:00:00Z",
    "hostId": "user-uuid",
    "isPublic": false,
    "meetingToken": "uuid",
    "waitingRoomEnabled": true,
    "maxParticipants": 50,
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-10T08:00:00Z"
  }
}
```

### Get Meeting Details
```
GET /api/meetings/:id
```
**Requires Authentication: Yes**

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Team Meeting",
    "description": "Weekly team sync",
    "scheduledStart": "2024-01-15T10:00:00Z",
    "actualStart": "2024-01-15T10:05:00Z",
    "actualEnd": null,
    "hostId": "user-uuid",
    "isPublic": false,
    "meetingToken": "uuid",
    "waitingRoomEnabled": true,
    "maxParticipants": 50,
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-10T08:00:00Z",
    "host": {
      "id": "user-uuid",
      "email": "host@example.com",
      "name": "Host User"
    },
    "participants": [
      {
        "id": "participant-uuid",
        "userId": "user-uuid",
        "meetingId": "meeting-uuid",
        "joinedAt": "2024-01-15T10:05:00Z",
        "leftAt": null,
        "isHost": true,
        "isWaiting": false,
        "user": {
          "id": "user-uuid",
          "email": "host@example.com",
          "name": "Host User"
        }
      }
    ]
  }
}
```

### Update Meeting
```
PATCH /api/meetings/:id
```
**Requires Authentication: Yes** (Only host can update)

**Request Body:** (same as create meeting, all fields optional)
```json
{
  "title": "Updated Meeting Title",
  "description": "Updated description"
}
```

**Response:** (same as get meeting)

### End Meeting (Host Only)
```
DELETE /api/meetings/:id
```
**Requires Authentication: Yes** (Only host can end)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Team Meeting",
    "description": "Weekly team sync",
    "scheduledStart": "2024-01-15T10:00:00Z",
    "actualStart": "2024-01-15T10:05:00Z",
    "actualEnd": "2024-01-15T11:00:00Z",
    "hostId": "user-uuid",
    "isPublic": false,
    "meetingToken": "uuid",
    "waitingRoomEnabled": true,
    "maxParticipants": 50,
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-10T08:00:00Z"
  }
}
```

### Join Meeting
```
POST /api/meetings/:id/join
```
**Requires Authentication: Yes**

**Request Body:**
```json
{
  "password": "optional-password" // For future password-protected meetings
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meeting": {
      /* meeting object */
    },
    "participant": {
      "id": "participant-uuid",
      "userId": "user-uuid",
      "meetingId": "meeting-uuid",
      "joinedAt": "2024-01-15T10:05:00Z",
      "leftAt": null,
      "isHost": false,
      "isWaiting": false
    },
    "livekitToken": "livekit-jwt-token-for-joining-room"
  }
}
```

### Leave Meeting
```
POST /api/meetings/:id/leave
```
**Requires Authentication: Yes**

**Response:**
```json
{
  "success": true,
  "data": null
}
```

### List Meetings
```
GET /api/meetings
```
**Requires Authentication: Yes**

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "meetings": [
      /* array of meeting objects */
    ],
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

## Chat Endpoints

### Send Message
```
POST /api/chat/:meetingId/messages
```
**Requires Authentication: Yes** (Only participants can send)

**Request Body:**
```json
{
  "content": "Hello team!",
  "type": "TEXT",
  "fileUrl": null,
  "fileName": null
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "meetingId": "meeting-uuid",
    "senderId": "user-uuid",
    "content": "Hello team!",
    "type": "TEXT",
    "fileUrl": null,
    "fileName": null,
    "createdAt": "2024-01-15T10:06:00Z"
  }
}
```

### Get Messages
```
GET /api/chat/:meetingId/messages
```
**Requires Authentication: Yes**

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message-uuid",
        "meetingId": "meeting-uuid",
        "senderId": "user-uuid",
        "content": "Hello team!",
        "type": "TEXT",
        "fileUrl": null,
        "fileName": null,
        "createdAt": "2024-01-15T10:06:00Z",
        "sender": {
          "id": "user-uuid",
          "name": "John Doe",
          "avatarUrl": null
        }
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```

### Delete Message
```
DELETE /api/chat/:messageId
```
**Requires Authentication: Yes** (Only sender or host can delete)

**Response:**
```json
{
  "success": true,
  "data": null
}
```

## Recording Endpoints

### Start Recording
```
POST /api/recordings/:meetingId/start
```
**Requires Authentication: Yes** (Only host can start)

**Response:**
```json
{
  "success": true,
  "data": {
    "recordingId": "rec-meeting-uuid-123456789",
    "roomName": "meeting-uuid",
    "startedAt": "2024-01-15T10:05:00Z",
    "status": "active"
  }
}
```

### Stop Recording
```
POST /api/recordings/:meetingId/stop
```
**Requires Authentication: Yes** (Only host can stop)

**Response:**
```json
{
  "success": true,
  "data": {
    "recordingId": "rec-meeting-uuid-123456789",
    "roomName": "meeting-uuid",
    "stoppedAt": "2024-01-15T11:00:00Z",
    "status": "stopped",
    "downloadURL": "https://example.com/recording/meeting-uuid.mp4"
  }
}
```

### Get Recording Info
```
GET /api/recordings/:meetingId
```
**Requires Authentication: Yes** (Host or participant)

**Response:**
```json
{
  "success": true,
  "data": {
    "recordingId": "rec-meeting-uuid-123456789",
    "roomName": "meeting-uuid",
    "startedAt": "2024-01-15T10:05:00Z",
    "status": "stopped",
    "downloadURL": "https://example.com/recording/meeting-uuid.mp4"
  }
}
```

## Analytics Endpoints

### Submit Focus Score
```
POST /api/analytics/focus-score
```
**Requires Authentication: Yes** (Only participants can submit)

**Request Body:**
```json
{
  "meetingId": "meeting-uuid",
  "focusScore": 85,
  "eyeContactScore": 90,
  "facePresenceScore": 80,
  "headPositionScore": 85
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "analytics-uuid",
    "meetingId": "meeting-uuid",
    "userId": "user-uuid",
    "focusScore": 85,
    "attentionScore": null,
    "speakingTime": null,
    "joinDuration": null,
    "participationScore": null,
    "createdAt": "2024-01-15T10:06:00Z"
  }
}
```

### Get Meeting Analytics (Host Only)
```
GET /api/analytics/meeting/:meetingId
```
**Requires Authentication: Yes** (Only host)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "analytics-uuid",
      "meetingId": "meeting-uuid",
      "userId": "user-uuid",
      "focusScore": 85,
      "attentionScore": 78,
      "speakingTime": 120,
      "joinDuration": 300,
      "participationScore": 82,
      "createdAt": "2024-01-15T10:06:00Z",
      "user": {
        "id": "user-uuid",
        "name": "John Doe",
        "avatarUrl": null
      }
    }
  ]
}
```

### Get User Analytics
```
GET /api/analytics/user/:userId
```
**Requires Authentication: Yes** (Users can only view their own analytics)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "analytics-uuid",
      "meetingId": "meeting-uuid",
      "userId": "user-uuid",
      "focusScore": 85,
      "attentionScore": 78,
      "speakingTime": 120,
      "joinDuration": 300,
      "participationScore": 82,
      "createdAt": "2024-01-15T10:06:00Z",
      "meeting": {
        "id": "meeting-uuid",
        "title": "Team Meeting",
        "actualStart": "2024-01-15T10:05:00Z",
        "actualEnd": "2024-01-15T11:00:00Z"
      }
    }
  ]
}
```

### Complete Meeting Analytics (Host Only)
```
POST /api/analytics/meeting/:meetingId/complete
```
**Requires Authentication: Yes** (Only host)

**Request Body:**
```json
{
  "attentionScore": 78,
  "speakingTime": 120,
  "joinDuration": 300,
  "participationScore": 82
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    /* Array of updated analytics objects for all participants */
  ]
}
```

## Moderation Endpoints

### Check Toxicity
```
POST /api/moderation/check-toxicity
```
**Requires Authentication: Yes**

**Request Body:**
```json
{
  "content": "This is a test message"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isToxic": false,
    "confidence": 0.05,
    "details": {
      "toxicWordCount": 0,
      "checkedWords": ["hate", "racist", "sexist", "violence", "kill", "die"]
    }
  }
}
```

### Check Spam
```
POST /api/moderation/check-spam
```
**Requires Authentication: Yes**

**Request Body:**
```json
{
  "content": "Hello world",
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isSpam": false,
    "confidence": 0.1,
    "details": {
      "isVeryShort": false,
      "hasExcessiveCaps": false,
      "hasExcessivePunctuation": false,
      "contentLength": 11
    }
  }
}
```

### Check Profanity
```
POST /api/moderation/check-profanity
```
**Requires Authentication: Yes**

**Request Body:**
```json
{
  "content": "This is a clean message"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "containsProfanity": false,
    "profanityCount": 0,
    "details": {
      "foundWords": [],
      "checkedWords": ["badword1", "badword2", "badword3"]
    }
  }
}
```

### Warn Participant
```
POST /api/moderation/warn
```
**Requires Authentication: Yes** (Only host can warn)

**Request Body:**
```json
{
  "meetingId": "meeting-uuid",
  "participantId": "participant-uuid",
  "message": "Please stay on topic"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Warning issued successfully"
  }
}
```

### Mute Participant
```
POST /api/moderation/mute
```
**Requires Authentication: Yes** (Only host can mute)

**Request Body:**
```json
{
  "meetingId": "meeting-uuid",
  "participantId": "participant-uuid",
  "duration": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Participant muted successfully"
  }
}
```

### Kick Participant
```
POST /api/moderation/kick
```
**Requires Authentication: Yes** (Only host can kick)

**Request Body:**
```json
{
  "meetingId": "meeting-uuid",
  "participantId": "participant-uuid",
  "message": "Disruptive behavior"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Participant kicked successfully"
  }
}
```

## Health Check Endpoint

### Get Health Status
```
GET /health
```
**Requires Authentication: No**

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:00:00Z"
}
```