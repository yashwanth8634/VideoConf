// Shared TypeScript types for VideoConf Platform
// These types are used across both frontend and backend

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  emailVerified?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  scheduledStart?: Date | null;
  actualStart?: Date | null;
  actualEnd?: Date | null;
  hostId: string;
  isPublic: boolean;
  meetingToken: string;
  waitingRoomEnabled: boolean;
  maxParticipants: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  id: string;
  userId: string;
  meetingId: string;
  joinedAt: Date;
  leftAt?: Date | null;
  isHost: boolean;
  isWaiting: boolean;
  deviceInfo?: Record<string, any> | null;
}

export interface Invitation {
  id: string;
  meetingId: string;
  inviterId: string;
  inviteeId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: Date;
  updatedAt: Date;
}

export interface Analytics {
  id: string;
  meetingId: string;
  userId: string;
  focusScore?: number | null; // 0-100
  attentionScore?: number | null; // 0-100
  speakingTime?: number | null; // seconds
  joinDuration?: number | null; // seconds
  participationScore?: number | null; // 0-100
  createdAt: Date;
}

export interface Message {
  id: string;
  meetingId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'FILE' | 'SYSTEM';
  fileUrl?: string | null;
  fileName?: string | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  meetingId?: string | null;
  type: 'MEETING_INVITE' | 'MEETING_STARTING' | 'MEETING_ENDED' | 'NEW_MESSAGE' | 'RECORDING_READY' | 'MODERATION_ACTION' | 'SYSTEM_ALERT';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

// Enums
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type MessageType = 'TEXT' | 'FILE' | 'SYSTEM';
export type NotificationType = 
  | 'MEETING_INVITE'
  | 'MEETING_STARTING'
  | 'MEETING_ENDED'
  | 'NEW_MESSAGE'
  | 'RECORDING_READY'
  | 'MODERATION_ACTION'
  | 'SYSTEM_ALERT';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}