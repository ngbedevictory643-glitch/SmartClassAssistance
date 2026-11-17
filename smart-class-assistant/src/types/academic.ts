export type UserRole = 'student' | 'lecturer' | 'admin';
export type AcademicLevel = '100' | '200' | '300' | '400' | '500' | 'Postgraduate';
export type UserLevel = AcademicLevel | 'Staff';
export type ResourceType = 'pdf' | 'notes' | 'slides' | 'docx' | 'image' | 'reading';
export type ModerationStatus = 'approved' | 'pending' | 'removed';
export type AnnouncementCategory =
  | 'lecture_summary'
  | 'upcoming_lecture'
  | 'schedule_change'
  | 'assignment_notice'
  | 'academic_notice'
  | 'reading';

export interface UserPublic {
  uid: string;
  displayName: string;
  role: UserRole;
  departmentId: string;
  departmentName?: string;
  level: UserLevel;
  title?: string;
  bio?: string;
  avatarUrl?: string;
  status: 'active' | 'suspended';
  inviteCode?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserPrivate {
  uid: string;
  email: string;
  institutionalId?: string;
  phone?: string;
  emailNotifications?: boolean;
  offlineAutoCache?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StaffInvite {
  code: string;
  departmentId?: string;
  active: boolean;
  createdBy: string;
  createdAt?: unknown;
}

export interface StaffRequest {
  uid: string;
  displayName: string;
  departmentId: string;
  staffTitle?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  faculty: string;
  description?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  departmentId: string;
  departmentName: string;
  level: AcademicLevel;
  semester?: string;
  lecturerId: string;
  lecturerName: string;
  description?: string;
  creditUnits?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  departmentId?: string;
  level?: string;
  createdAt?: unknown;
}

export interface Material {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  departmentId: string;
  departmentName?: string;
  level: AcademicLevel;
  lecturerId: string;
  lecturerName: string;
  topic: string;
  title: string;
  description?: string;
  resourceType: ResourceType;
  fileUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  lectureDate: string;
  notesContent?: string;
  moderationStatus: ModerationStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Lecture {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  departmentId: string;
  departmentName?: string;
  level: AcademicLevel;
  lecturerId: string;
  lecturerName: string;
  topic: string;
  title: string;
  description?: string;
  videoUrl: string;
  durationMinutes?: number;
  lectureDate: string;
  relatedMaterialId?: string;
  transcriptSummary?: string;
  moderationStatus: ModerationStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  departmentId: string;
  level: AcademicLevel;
  lecturerId: string;
  lecturerName: string;
  topic?: string;
  title: string;
  instructions: string;
  attachmentUrl?: string;
  attachmentName?: string;
  dueDate: string;
  maxPoints: number;
  status: 'published' | 'closed';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  courseId: string;
  courseCode?: string;
  lecturerId: string;
  studentId: string;
  studentName: string;
  submissionText?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: 'submitted' | 'graded';
  score?: number;
  maxPoints: number;
  feedback?: string;
  gradedBy?: string;
  submittedAt?: unknown;
  gradedAt?: unknown;
  updatedAt?: unknown;
}

export interface Quiz {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  departmentId: string;
  level: AcademicLevel;
  lecturerId: string;
  lecturerName: string;
  topic?: string;
  title: string;
  description?: string;
  durationMinutes: number;
  totalPoints: number;
  dueDate?: string;
  status: 'published' | 'closed';
  questionCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  orderIndex: number;
  type: 'objective' | 'essay';
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  points: number;
  createdAt?: unknown;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  courseId: string;
  courseCode?: string;
  lecturerId: string;
  studentId: string;
  studentName: string;
  answers: Record<string, string | number>;
  autoScore: number;
  finalScore?: number;
  maxPoints: number;
  status: 'submitted' | 'graded';
  feedback?: string;
  gradedBy?: string;
  durationSpentSeconds?: number;
  submittedAt?: unknown;
  gradedAt?: unknown;
  updatedAt?: unknown;
}

export interface Announcement {
  id: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  departmentId?: string;
  level?: AcademicLevel | 'All';
  lecturerId: string;
  lecturerName: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  lectureDate?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  type: 'material' | 'lecture' | 'assignment' | 'quiz' | 'announcement' | 'grade' | 'qa';
  title: string;
  message: string;
  courseId?: string;
  courseCode?: string;
  linkSection?: string;
  isRead: boolean;
  createdBy: string;
  createdAt?: unknown;
}

export interface SavedMaterial {
  id: string;
  userId: string;
  itemId: string;
  itemType: 'material' | 'lecture';
  courseId: string;
  courseCode?: string;
  title: string;
  topic?: string;
  createdAt?: unknown;
}

export interface LearningProgress {
  id: string;
  userId: string;
  courseId: string;
  itemId: string;
  itemType: 'material' | 'lecture';
  title?: string;
  topic?: string;
  progressPercent: number;
  lastPositionSeconds?: number;
  completed: boolean;
  lastAccessedAt?: unknown;
  updatedAt?: unknown;
}

export interface Discussion {
  id: string;
  courseId: string;
  courseCode?: string;
  materialId?: string;
  materialTitle?: string;
  authorId: string;
  authorName: string;
  question: string;
  replyText?: string;
  repliedById?: string;
  repliedByName?: string;
  repliedAt?: unknown;
  status: 'open' | 'answered';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const ACADEMIC_LEVELS: AcademicLevel[] = [
  '100',
  '200',
  '300',
  '400',
  '500',
  'Postgraduate',
];

export function generateDocId(prefix: string): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'doc';
  const rand = Math.random().toString(36).slice(2, 9);
  return `${safePrefix}_${Date.now()}_${rand}`.slice(0, 128);
}

export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

export function clampString(value: string | undefined, maxLen: number): string {
  if (!value) return '';
  return value.trim().slice(0, maxLen);
}

export function formatFirestoreDate(ts: unknown): string {
  if (!ts) return 'Just now';
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? ts : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return 'Recent';
}
