# VideoConf Platform Database Design

This document describes the database schema for the VideoConf Platform, designed to work with Supabase PostgreSQL.

## Overview

The database uses PostgreSQL with Prisma ORM and is designed to be compatible with Supabase. All tables have Row Level Security (RLS) policies that should be implemented in Supabase for production security.

## Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ MEETING : hosts
    USER ||--o{ PARTICIPANT : joins
    USER ||--o{ INVITATION : sends
    USER ||--o{ INVITATION : receives
    USER ||--o{ ANALYTICS : has
    USER ||--o{ MESSAGE : sends
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDITLOG : creates
    
    MEETING ||--o{ PARTICIPANT : has
    MEETING ||--o{ INVITATION : receives
    MEETING ||--o{ ANALYTICS : has
    MEETING ||--o{ MESSAGE : has
    MEETING ||--o{ NOTIFICATION : receives
    
    PARTICIPANT }|..|| USER : belongs to
    PARTICIPANT }|..|| MEETING : attends
    
    INVITATION }|..|| USER : sent by
    INVITATION }|..|| USER : received by
    INVITATION }|..|| MEETING : for meeting
    
    ANALYTICS }|..|| USER : belongs to
    ANALYTICS }|..|| MEETING : for meeting
    
    MESSAGE }|..|| USER : sent by
    MESSAGE }|..|| MEETING : in meeting
    
    NOTIFICATION }|..|| USER : belongs to
    NOTIFICATION }|..|| MEETING : related to
    
    AUDITLOG }|..|| USER : performed by
```

## Tables

### Users

Stores user profile information linked to Supabase Auth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid() | Supabase Auth user ID |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User's email address |
| name | VARCHAR(255) | NULLABLE | User's display name |
| avatarUrl | TEXT | NULLURL | URL to user's avatar image |
| emailVerified | TIMESTAMP | NULLABLE | Timestamp when email was verified |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT now() | Account creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- idx_users_email (email)

**Relationships:**
- One-to-many: meetingsHosted (Meeting.hostId)
- One-to-many: meetingsJoined (Participant.userId)
- One-to-many: invitationsSent (Invitation.inviterId)
- One-to-many: invitationsReceived (Invitation.inviteeId)
- One-to-many: analytics (Analytics.userId)
- One-to-many: messagesSent (Message.senderId)
- One-to-many: notifications (Notification.userId)
- One-to-many: auditLogs (AuditLog.userId)

**Supabase RLS Policy:**
```sql
-- Users can only read/update their own record
CREATE POLICY user_rls ON public."User"
FOR SELECT USING (auth.uid() = id);
CREATE POLICY user_update_rls ON public."User"
FOR UPDATE USING (auth.uid() = id);
```

### Meetings

Represents video meeting rooms.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid() | Unique meeting identifier |
| title | VARCHAR(255) | NOT NULL | Meeting title |
| description | TEXT | NULLABLE | Meeting description |
| scheduledStart | TIMESTAMP | NULLABLE | Scheduled start time |
| actualStart | TIMESTAMP | NULLABLE | Actual start time |
| actualEnd | TIMESTAMP | NULLABLE | Actual end time |
| hostId | UUID | NOT NULL, REFERENCES User(id) | Host user ID |
| isPublic | BOOLEAN | NOT NULL, DEFAULT false | Whether meeting is public |
| meetingToken | UUID | NOT NULL, UNIQUE | LiveKit token for joining |
| waitingRoomEnabled | BOOLEAN | NOT NULL, DEFAULT true | Enable waiting room |
| maxParticipants | INTEGER | NOT NULL, DEFAULT 50 | Maximum participants |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- idx_meetings_hostId (hostId)
- idx_meetings_isPublic (isPublic)
- idx_meetings_scheduledStart (scheduledStart)

**Relationships:**
- Many-to-one: host (User.id)
- One-to-many: participants (MeetingParticipant.meetingId)
- One-to-many: invitations (MeetingInvitation.meetingId)
- One-to-one: analytics (MeetingAnalytics.meetingId)
- One-to-many: messages (MeetingMessages.meetingId)
- One-to-many: notifications (MeetingNotifications.meetingId)

**Supabase RLS Policy:**
```sql
-- Host can read/update/delete
-- Participants can read if meeting is public or they are invited
-- Public meetings can be read by anyone
CREATE POLICY meeting_rls ON public."Meeting"
FOR SELECT USING (
  hostId = auth.uid() OR 
  isPublic = true OR 
  EXISTS (
    SELECT 1 FROM public."Participant" 
    WHERE "Meeting".id = "Participant".meetingId 
    AND "Participant".userId = auth.uid()
  )
);
CREATE POLICY meeting_update_rls ON public."Meeting"
FOR UPDATE USING (hostId = auth.uid());
CREATE POLICY meeting_delete_rls ON public."Meeting"
FOR DELETE USING (hostId = auth.uid());
```

### Participants

Represents a user's participation in a meeting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid() | Unique participant identifier |
| userId | UUID | NOT NULL, REFERENCES User(id) | User ID |
| meetingId | UUID | NOT NULL, REFERENCES Meeting(id) | Meeting ID |
| joinedAt | TIMESTAMP | NOT NULL, DEFAULT now() | Join timestamp |
| leftAt | TIMESTAMP | NULLABLE | Leave timestamp |
| isHost | BOOLEAN | NOT NULL, DEFAULT false | Whether user is host |
| isWaiting | BOOLEAN | NOT NULL, DEFAULT true | In waiting room |
| deviceInfo | JSONB | NULLABLE | Browser/device information |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- idx_participants_userId (userId)
- idx_participants_meetingId (meetingId)
- idx_participants_joinedAt (joinedAt)
- idx_participants_leftAt (leftAt)

**Constraints:**
- UNIQUE(userId, meetingId) - A user can only participate once per meeting

**Relationships:**
- Many-to-one: user (User.id)
- Many-to-one: meeting (Meeting.id)

**Supabase RLS Policy:**
```sql
-- Participants can read/update their own record
-- Host can read/update/delete any participation in their meeting
CREATE POLICY participant_rls ON public."Participant"
FOR SELECT USING (
  userId = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public."Meeting" 
    WHERE "Participant".meetingId = "Meeting".id 
    AND "Meeting".hostId = auth.uid()
  )
);
CREATE POLICY participant_update_rls ON public."Participant"
FOR UPDATE USING (
  userId = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public."Meeting" 
    WHERE "Participant".meetingId = "Meeting".id 
    AND "Meeting".hostId = auth.uid()
  )
);
CREATE POLICY participant_delete_rls ON public."Participant"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public."Meeting" 
    WHERE "Participant".meetingId = "Meeting".id 
    AND "Meeting".hostId = auth.uid()
  )
);
```

### Invitations

Represents an invitation to a meeting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid() | Unique invitation identifier |
| meetingId | UUID | NOT NULL, REFERENCES Meeting(id) | Meeting ID |
| inviterId | UUID | NOT NULL, REFERENCES User(id) | User who sent invitation |
| inviteeId | UUID | NOT NULL, REFERENCES User(id) | User who is invited |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | PENDING, ACCEPTED, REJECTED, EXPIRED |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- idx_invitations_meetingId (meetingId)
- idx_invitations_inviterId (inviterId)
- idx_invitations_inviteeId (inviteeId)
- idx_invitations_status (status)

**Relationships:**
- Many-to-one: meeting (Meeting.id)
- Many-to-one: inviter (User.id)
- Many-to-one: invitee (User.id)

**Supabase RLS Policy:**
```sql
-- Inviter can read/update/delete their sent invitations
-- Invitee can read/update their received invitations
CREATE POLICY invitation_rls ON public."Invitation"
FOR SELECT USING (
  inviterId = auth.uid() OR 
  inviteeId = auth.uid()
);
CREATE POLICY invitation_update_rls ON public."Invitation"
FOR UPDATE USING (
  inviterId = auth.uid() OR 
  inviteeId = auth.uid()
);
CREATE POLICY invitation_delete_rls ON public."Invitation"
FOR DELETE USING (inviterId = auth.uid());
```

### Analytics

Stores focus detection scores and post-meeting analytics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid() | Unique analytics identifier |
| meetingId | UUID | NOT NULL, REFERENCES Meeting(id) | Meeting ID |
| userId | UUID | NOT NULL, REFERENCES User(id) | User ID |
| focusScore | INTEGER | NULLABLE | Average focus score (0-100) from AI detection |
| attentionScore | INTEGER | NULLABLE | Post-meeting attention score (0-100) |
| speakingTime | INTEGER | NULLABLE | Total speaking time in seconds |
| joinDuration | INTEGER | NULLABLE | Duration user was in meeting (seconds) |
| participationScore | INTEGER | NULLABLE | Composite participation score (0-100) |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- idx_analytics_meetingId (meetingId)
- idx_analytics_userId (userId)
- idx_analytics_createdAt (createdAt)

**Constraints:**
- UNIQUE(meetingId, userId) - One analytics record per user per meeting

**Relationships:**
- Many-to-one: meeting (Meeting.id)
- Many-to-one: user (User.id)

**Supabase RLS Policy:**
```sql
-- User can read/update/delete their own analytics
-- Host can read analytics for their meetings
CREATE POLICY analytics_rls ON public."Analytics"
FOR SELECT USING (
  userId = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public."Meeting" 
    WHERE "Analytics".meetingId = "Meeting".id 
    AND "Meeting".hostId = auth.uid()
  )
);
CREATE POLICY analytics_update_rls ON public."Analytics"
FOR UPDATE USING (userId = auth.uid());
CREATE POLICY analytics_delete_rls ON public."Analytics"
FOR DELETE USING (userId = auth.uid());
```

### Messages

Represents a chat message in a meeting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid() | Unique message identifier |
| meetingId | UUID | NOT NULL, REFERENCES Meeting(id) | Meeting ID |
| senderId | UUID | NOT NULL, REFERENCES User(id) | Sender user ID |
| content | TEXT | NOT NULL | Message content |
| type | VARCHAR(10) | NOT NULL, DEFAULT 'TEXT' | TEXT, FILE, SYSTEM |
| fileUrl | TEXT | NULLABLE | URL to uploaded file (for FILE type) |
| fileName | VARCHAR(255) | NULLABLE | Original file name (for FILE type) |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- idx_messages_meetingId (meetingId)
- idx_messages_senderId (senderId)
- idx_messages_createdAt (createdAt)

**Relationships:**
- Many-to-one: meeting (Meeting.id)
- Many-to-one: sender (User.id)

**Supabase RLS Policy:**
```sql
-- Sender can read/update/delete their own messages
-- Meeting participants can read messages in the meeting
-- Host can delete any message in their meeting
CREATE POLICY message_rls ON public."Message"
FOR SELECT USING (
  senderId = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public."Participant" 
    WHERE "Message".meetingId = "Participant".meetingId 
    AND "Participant".userId = auth.uid() 
    AND "Participant".leftAt IS NULL
  ) OR
  EXISTS (
    SELECT 1 FROM public."Meeting" 
    WHERE "Message".meetingId = "Meeting".id 
    AND "Meeting".hostId = auth.uid()
  )
);
CREATE POLICY message_update_rls ON public."Message"
FOR UPDATE USING (senderId = auth.uid());
CREATE POLICY message_delete_rls ON public."Message"
FOR DELETE USING (
  senderId = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public."Meeting" 
    WHERE "Message".meetingId = "Meeting".id 
    AND "Meeting".hostId = auth.uid()
  )
);
```

### Notifications

Represents a notification for a user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid() | Unique notification identifier |
| userId | UUID | NOT NULL, REFERENCES User(id) | User ID |
| meetingId | UUID | NULLABLE, REFERENCES Meeting(id) | Related meeting ID (if meeting-related) |
| type | VARCHAR(20) | NOT NULL | MEETING_INVITE, MEETING_STARTING, MEETING_ENDED, NEW_MESSAGE, RECORDING_READY, MODERATION_ACTION, SYSTEM_ALERT |
| title | VARCHAR(255) | NOT NULL | Notification title |
| body | TEXT | NOT NULL | Notification body |
| isRead | BOOLEAN | NOT NULL, DEFAULT false | Read status |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- idx_notifications_userId (userId)
- idx_notifications_isRead (isRead)
- idx_notifications_createdAt (createdAt)

**Relationships:**
- Many-to-one: user (User.id)
- Many-to-one: meeting (Meeting.id)

**Supabase RLS Policy:**
```sql
-- User can read/update/delete their own notifications
CREATE POLICY notification_rls ON public."Notification"
FOR SELECT USING (userId = auth.uid());
CREATE POLICY notification_update_rls ON public."Notification"
FOR UPDATE USING (userId = auth.uid());
CREATE POLICY notification_delete_rls ON public."Notification"
FOR DELETE USING (userId = auth.uid());
```

### AuditLogs

Stores audit trails for security and compliance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid() | Unique audit log identifier |
| userId | UUID | NULLABLE, REFERENCES User(id) | User who performed action (nullable for system actions) |
| action | VARCHAR(255) | NOT NULL | Description of the action |
| entityType | VARCHAR(100) | NOT NULL | Type of entity affected |
| entityId | UUID | NULLABLE | ID of the entity affected |
| details | JSONB | NULLABLE | Additional details about the action |
| ipAddress | VARCHAR(45) | NULLABLE | IP address of the actor |
| userAgent | TEXT | NULLABLE | User agent of the actor |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- idx_auditlogs_userId (userId)
- idx_auditlogs_entityType_entityId (entityType, entityId)
- idx_auditlogs_createdAt (createdAt)

**Relationships:**
- Many-to-one: user (User.id)

**Supabase RLS Policy:**
```sql
-- Only admins or system can read audit logs
-- In this simplified version, we'll allow authenticated users to read their own actions
CREATE POLICY auditlog_rls ON public."AuditLog"
FOR SELECT USING (
  userId = auth.uid() OR 
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);
CREATE POLICY auditlog_insert_rls ON public."AuditLog"
FOR INSERT WITH CHECK (true); -- Allow inserts from authenticated users or system
```

## Enumerations

### InvitationStatus
- PENDING: Invitation sent but not yet responded to
- ACCEPTED: Invitee has accepted the invitation
- REJECTED: Invitee has declined the invitation
- EXPIRED: Invitation has expired without response

### MessageType
- TEXT: Regular text message
- FILE: Message with file attachment
- SYSTEM: System-generated message (e.g., "User joined the meeting")

### NotificationType
- MEETING_INVITE: New meeting invitation received
- MEETING_STARTING: Meeting is about to start
- MEETING_ENDED: Meeting has ended
- NEW_MESSAGE: New chat message received
- RECORDING_READY: Meeting recording is available for download
- MODERATION_ACTION: Moderation action taken (warn, mute, kick)
- SYSTEM_ALERT: System-wide announcement

## Indexes Performance Considerations

1. **Foreign Key Indexes**: Automatically created by Prisma for all relations
2. **Query-Specific Indexes**: Added for common query patterns:
   - Date-based queries (scheduledStart, createdAt, joinedAt)
   - Status-based queries (isPublic, invitation status, message type)
   - User-specific lookups (userId foreign keys)
3. **Composite Indexes**: For queries filtering on multiple columns
4. **Covering Indexes**: For frequent queries that only need indexed columns

## Supabase-Specific Notes

### Row Level Security (RLS)
All tables should have RLS enabled in Supabase. The policies shown above are examples that would need to be implemented in the Supabase dashboard or via SQL migrations.

### Authentication Integration
The `User.id` field corresponds to the `auth.uid()` in Supabase. When querying user data, always compare with `auth.uid()` for RLS policies.

### Migration Compatibility
This schema is designed to work with Supabase's PostgreSQL instance. Prisma migrations should be generated and applied directly to the Supabase database.

### Extensions
Consider enabling these PostgreSQL extensions in Supabase for better performance:
- `pgcrypto` for UUID generation
- `btree_gin` for JSONB queries
- `pg_trgm` for text search

## Sample Queries

### Get upcoming meetings for a user
```sql
SELECT m.* FROM "Meeting" m
WHERE m.hostId = 'user-uuid' 
  OR EXISTS (
    SELECT 1 FROM "Participant" p 
    WHERE p.meetingId = m.id 
    AND p.userId = 'user-uuid' 
    AND p.leftAt IS NULL
  )
  OR m.isPublic = true
ORDER BY m.scheduledStart ASC
LIMIT 10;
```

### Get meeting analytics for host
```sql
SELECT a.*, u.name, u.avatarUrl 
FROM "Analytics" a
JOIN "User" u ON a.userId = u.id
WHERE a.meetingId = 'meeting-uuid'
ORDER BY a.focusScore DESC;
```

### Get unread notifications for user
```sql
SELECT * FROM "Notification"
WHERE userId = 'user-uuid' 
  AND isRead = false
ORDER BY createdAt DESC;
```

## Backup and Recovery

1. **Supabase provides automated backups** of your PostgreSQL database
2. **Point-in-time recovery** is available for paid plans
3. **Manual backups** can be taken using `pg_dump` or Supabase CLI
4. **Database branching** allows creating temporary copies for testing

## Conclusion

This database design provides a solid foundation for the VideoConf Platform, supporting all required features while maintaining data integrity, security, and performance. The schema is normalized to reduce redundancy and designed to scale with the application's growth.