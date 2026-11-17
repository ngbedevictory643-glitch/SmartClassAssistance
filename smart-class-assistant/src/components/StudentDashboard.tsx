import React, { useMemo, useState } from 'react';
import {
  Award,
  Bell,
  Bookmark,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Filter,
  HardDriveDownload,
  HelpCircle,
  Layers,
  PlayCircle,
  Search,
  Send,
  Trash2,
  Upload,
  User,
  Video,
  WifiOff,
} from 'lucide-react';
import {
  ACADEMIC_LEVELS,
  Announcement,
  Assignment,
  AssignmentSubmission,
  Course,
  Department,
  Enrollment,
  LearningProgress,
  Lecture,
  Material,
  Quiz,
  QuizSubmission,
  SavedMaterial,
  UserPrivate,
  UserPublic,
  formatFirestoreDate,
} from '../types/academic';
import { OfflineMaterialRecord, formatBytes, uploadFileWithProgress } from '../utils/offlineStorage';
import { sendPasswordResetEmail, auth } from '../firebase';
import { PWAInstallButton } from './PWAControls';

export type StudentSection =
  | 'overview'
  | 'courses'
  | 'missed'
  | 'materials'
  | 'lectures'
  | 'assignments'
  | 'quizzes'
  | 'announcements'
  | 'progress'
  | 'saved'
  | 'profile';

interface StudentDashboardProps {
  section: StudentSection;
  onNavigate: (s: StudentSection) => void;
  globalSearch: string;
  currentUser: UserPublic;
  userPrivate: UserPrivate | null;
  departments: Department[];
  courses: Course[];
  enrollments: Enrollment[];
  materials: Material[];
  lectures: Lecture[];
  assignments: Assignment[];
  assignmentSubmissions: AssignmentSubmission[];
  quizzes: Quiz[];
  quizSubmissions: QuizSubmission[];
  announcements: Announcement[];
  savedMaterials: SavedMaterial[];
  learningProgress: LearningProgress[];
  offlineRecords: OfflineMaterialRecord[];
  isOnline: boolean;
  onToggleEnroll: (course: Course, isEnrolled: boolean) => Promise<void>;
  onOpenMaterial: (m: Material) => void;
  onOpenLecture: (l: Lecture) => void;
  onToggleBookmark: (itemId: string, itemType: 'material' | 'lecture', courseId: string, courseCode: string, title: string, topic: string) => Promise<void>;
  onSaveOffline: (m: Material) => Promise<void>;
  onRemoveOffline: (id: string) => Promise<void>;
  onOpenOfflineRecord: (rec: OfflineMaterialRecord) => void;
  onSubmitAssignment: (assignment: Assignment, text: string, attachmentUrl?: string, attachmentName?: string) => Promise<void>;
  onStartQuiz: (quiz: Quiz) => void;
  onUpdateProfile: (updates: Partial<UserPublic>, privateUpdates?: Partial<UserPrivate>) => Promise<void>;
  onRequestStaffRole: (deptId: string, title: string, reason: string) => Promise<void>;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  section,
  onNavigate,
  globalSearch,
  currentUser,
  userPrivate,
  departments,
  courses,
  enrollments,
  materials,
  lectures,
  assignments,
  assignmentSubmissions,
  quizzes,
  quizSubmissions,
  announcements,
  savedMaterials,
  learningProgress,
  offlineRecords,
  isOnline,
  onToggleEnroll,
  onOpenMaterial,
  onOpenLecture,
  onToggleBookmark,
  onSaveOffline,
  onRemoveOffline,
  onOpenOfflineRecord,
  onSubmitAssignment,
  onStartQuiz,
  onUpdateProfile,
  onRequestStaffRole,
}) => {
  // Filters for Learning Materials & Recorded Lectures
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [localSearch, setLocalSearch] = useState<string>('');

  // Missed Lecture Catch-Up Wizard state
  const [missedDept, setMissedDept] = useState<string>(currentUser.departmentId || 'all');
  const [missedLevel, setMissedLevel] = useState<string>(
    currentUser.level !== 'Staff' ? currentUser.level : 'all'
  );
  const [missedCourseId, setMissedCourseId] = useState<string>('all');
  const [missedDateOrTopic, setMissedDateOrTopic] = useState<string>('all');

  // Assignment Submission modal state
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [submittingAsg, setSubmittingAsg] = useState(false);

  // Profile form state
  const [profName, setProfName] = useState(currentUser.displayName);
  const [profDept, setProfDept] = useState(currentUser.departmentId);
  const [profLevel, setProfLevel] = useState(currentUser.level);
  const [profBio, setProfBio] = useState(currentUser.bio || '');
  const [profInstId, setProfInstId] = useState(userPrivate?.institutionalId || '');
  const [profMsg, setProfMsg] = useState('');

  // Staff Request state
  const [staffTitle, setStaffTitle] = useState('Lecturer');
  const [staffReason, setStaffReason] = useState('');
  const [staffMsg, setStaffMsg] = useState('');

  const searchTerm = (localSearch || globalSearch).trim().toLowerCase();

  const enrolledCourseIds = useMemo(
    () => new Set(enrollments.map((e) => e.courseId)),
    [enrollments]
  );

  const savedSet = useMemo(
    () => new Set(savedMaterials.map((s) => `${s.itemType}_${s.itemId}`)),
    [savedMaterials]
  );

  const offlineSet = useMemo(
    () => new Set(offlineRecords.map((r) => r.id)),
    [offlineRecords]
  );

  const progressMap = useMemo(() => {
    const map = new Map<string, LearningProgress>();
    for (const p of learningProgress) {
      map.set(`${p.itemType}_${p.itemId}`, p);
    }
    return map;
  }, [learningProgress]);

  const myCourses = useMemo(() => {
    const enrolled = courses.filter((c) => enrolledCourseIds.has(c.id));
    return enrolled.length > 0 ? enrolled : courses.filter((c) => c.departmentId === currentUser.departmentId);
  }, [courses, enrolledCourseIds, currentUser.departmentId]);

  const approvedMaterials = useMemo(
    () => materials.filter((m) => m.moderationStatus === 'approved'),
    [materials]
  );
  const approvedLectures = useMemo(
    () => lectures.filter((l) => l.moderationStatus === 'approved'),
    [lectures]
  );

  const filteredMaterials = useMemo(() => {
    return approvedMaterials.filter((m) => {
      if (filterDept !== 'all' && m.departmentId !== filterDept) return false;
      if (filterLevel !== 'all' && m.level !== filterLevel) return false;
      if (filterCourse !== 'all' && m.courseId !== filterCourse) return false;
      if (filterType !== 'all' && m.resourceType !== filterType) return false;
      if (filterDate && m.lectureDate !== filterDate) return false;
      if (searchTerm) {
        const hay = `${m.title} ${m.topic} ${m.courseCode} ${m.courseTitle} ${m.description || ''} ${m.lecturerName}`.toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });
  }, [approvedMaterials, filterDept, filterLevel, filterCourse, filterType, filterDate, searchTerm]);

  const filteredLectures = useMemo(() => {
    return approvedLectures.filter((l) => {
      if (filterDept !== 'all' && l.departmentId !== filterDept) return false;
      if (filterLevel !== 'all' && l.level !== filterLevel) return false;
      if (filterCourse !== 'all' && l.courseId !== filterCourse) return false;
      if (filterDate && l.lectureDate !== filterDate) return false;
      if (searchTerm) {
        const hay = `${l.title} ${l.topic} ${l.courseCode} ${l.courseTitle} ${l.description || ''} ${l.lecturerName}`.toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });
  }, [approvedLectures, filterDept, filterLevel, filterCourse, filterDate, searchTerm]);

  // Missed Lecture Catch-Up Options & Results
  const missedCourseOptions = useMemo(() => {
    return courses.filter((c) => {
      if (missedDept !== 'all' && c.departmentId !== missedDept) return false;
      if (missedLevel !== 'all' && c.level !== missedLevel) return false;
      return true;
    });
  }, [courses, missedDept, missedLevel]);

  const missedTopicDateOptions = useMemo(() => {
    const keys = new Set<string>();
    const addKey = (date?: string, topic?: string) => {
      if (date && topic) keys.add(`${date} · ${topic}`);
    };
    approvedMaterials
      .filter((m) => (missedCourseId === 'all' ? true : m.courseId === missedCourseId))
      .forEach((m) => addKey(m.lectureDate, m.topic));
    approvedLectures
      .filter((l) => (missedCourseId === 'all' ? true : l.courseId === missedCourseId))
      .forEach((l) => addKey(l.lectureDate, l.topic));
    return Array.from(keys).sort().reverse();
  }, [approvedMaterials, approvedLectures, missedCourseId]);

  const catchUpPack = useMemo(() => {
    const matchesCourse = (cId: string, dId?: string, lvl?: string) => {
      if (missedCourseId !== 'all') return cId === missedCourseId;
      if (missedDept !== 'all' && dId && dId !== missedDept) return false;
      if (missedLevel !== 'all' && lvl && lvl !== missedLevel) return false;
      return true;
    };
    const matchesTopicDate = (date?: string, topic?: string) => {
      if (missedDateOrTopic === 'all') return true;
      const [selDate, ...selTopicParts] = missedDateOrTopic.split(' · ');
      const selTopic = selTopicParts.join(' · ');
      return date === selDate || topic === selTopic;
    };

    return {
      materials: approvedMaterials.filter(
        (m) => matchesCourse(m.courseId, m.departmentId, m.level) && matchesTopicDate(m.lectureDate, m.topic)
      ),
      lectures: approvedLectures.filter(
        (l) => matchesCourse(l.courseId, l.departmentId, l.level) && matchesTopicDate(l.lectureDate, l.topic)
      ),
      assignments: assignments.filter(
        (a) => matchesCourse(a.courseId, a.departmentId, a.level) && (missedDateOrTopic === 'all' || matchesTopicDate('', a.topic))
      ),
      announcements: announcements.filter(
        (a) => matchesCourse(a.courseId, a.departmentId, a.level === 'All' ? undefined : a.level)
      ),
    };
  }, [approvedMaterials, approvedLectures, assignments, announcements, missedCourseId, missedDept, missedLevel, missedDateOrTopic]);

  const overallCompletionPct = useMemo(() => {
    const totalItems = approvedMaterials.length + approvedLectures.length;
    if (totalItems === 0) return 0;
    const completedCount = learningProgress.filter((p) => p.completed).length;
    return Math.min(100, Math.round((completedCount / totalItems) * 100));
  }, [approvedMaterials.length, approvedLectures.length, learningProgress]);

  const pendingAssignments = useMemo(() => {
    const submittedIds = new Set(assignmentSubmissions.map((s) => s.assignmentId));
    return assignments.filter((a) => a.status === 'published' && !submittedIds.has(a.id));
  }, [assignments, assignmentSubmissions]);

  const upcomingQuizzes = useMemo(() => {
    const takenIds = new Set(quizSubmissions.map((s) => s.quizId));
    return quizzes.filter((q) => q.status === 'published' && !takenIds.has(q.id));
  }, [quizzes, quizSubmissions]);

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment) return;
    setSubmittingAsg(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;
      if (submissionFile) {
        setUploadPct(5);
        const uploaded = await uploadFileWithProgress(submissionFile, (p) => setUploadPct(p));
        attachmentUrl = uploaded.fileUrl;
        attachmentName = uploaded.fileName;
      }
      await onSubmitAssignment(activeAssignment, submissionText.trim(), attachmentUrl, attachmentName);
      setActiveAssignment(null);
      setSubmissionText('');
      setSubmissionFile(null);
      setUploadPct(null);
    } finally {
      setSubmittingAsg(false);
    }
  };

  // --- Render Section Content ---
  if (section === 'overview') {
    return (
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl border border-blue-900/15 bg-gradient-to-r from-[#0A1628] via-[#0F2347] to-[#163366] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold tracking-wider text-blue-300">
                Digital Learning Continuity · {currentUser.departmentName || 'Academic Workspace'}
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome back, {currentUser.displayName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100/80">
                Stay synchronized with your courses. Pick up missed lectures by date, resume recorded lessons, or review offline handouts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('missed')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
              Catch Up on Missed Classes
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => onNavigate('courses')}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-blue-300 transition-colors cursor-pointer"
          >
            <p className="text-xs font-medium text-slate-500">Active Courses</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{myCourses.length}</p>
            <p className="mt-1 text-xs text-blue-700">Browse &amp; manage courses</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('assignments')}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-blue-300 transition-colors cursor-pointer"
          >
            <p className="text-xs font-medium text-slate-500">Pending Assignments</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{pendingAssignments.length}</p>
            <p className="mt-1 text-xs text-slate-500">{assignmentSubmissions.length} submitted</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('quizzes')}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-blue-300 transition-colors cursor-pointer"
          >
            <p className="text-xs font-medium text-slate-500">Upcoming Quizzes</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{upcomingQuizzes.length}</p>
            <p className="mt-1 text-xs text-slate-500">{quizSubmissions.length} completed</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('progress')}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-blue-300 transition-colors cursor-pointer"
          >
            <p className="text-xs font-medium text-slate-500">Learning Progress</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{overallCompletionPct}%</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${overallCompletionPct}%` }} />
            </div>
          </button>
        </div>

        {/* Main Overview Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Recently Uploaded Materials */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Recently Uploaded Materials</h2>
              <button
                type="button"
                onClick={() => onNavigate('materials')}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            {approvedMaterials.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No learning materials have been published yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {approvedMaterials.slice(0, 4).map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-blue-700">
                        {m.courseCode} · {m.resourceType.toUpperCase()} · {m.lectureDate}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{m.title}</p>
                      <p className="truncate text-xs text-slate-500">{m.topic}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenMaterial(m)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0 cursor-pointer"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest Course Announcements */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Latest Announcements</h2>
              <button
                type="button"
                onClick={() => onNavigate('announcements')}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                All Notices
              </button>
            </div>
            {announcements.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No announcements posted yet.
              </p>
            ) : (
              <div className="space-y-3">
                {announcements.slice(0, 3).map((a) => (
                  <div key={a.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                    <p className="text-xs font-medium text-blue-700">
                      {a.courseCode || 'Academic'} · {a.category.replace('_', ' ')}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{a.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{a.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Recorded Lectures */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">New Recorded Lectures</h2>
              <button
                type="button"
                onClick={() => onNavigate('lectures')}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                All Videos
              </button>
            </div>
            {approvedLectures.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No recorded lectures uploaded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {approvedLectures.slice(0, 3).map((l) => {
                  const prog = progressMap.get(`lecture_${l.id}`);
                  return (
                    <div key={l.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-blue-700">
                          {l.courseCode} · {l.lectureDate}
                          {l.durationMinutes ? ` · ${l.durationMinutes}m` : ''}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{l.title}</p>
                        {prog && prog.lastPositionSeconds ? (
                          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                            Resume at {Math.floor(prog.lastPositionSeconds / 60)}m {prog.lastPositionSeconds % 60}s ({prog.progressPercent}%)
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenLecture(l)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A1628] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#152B4F] shrink-0 cursor-pointer"
                      >
                        <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        Watch
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recently Accessed Resources */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Recently Accessed Resources</h2>
              <button
                type="button"
                onClick={() => onNavigate('progress')}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Progress Log
              </button>
            </div>
            {learningProgress.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Open any lecture note or video to begin tracking your study continuity.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {learningProgress.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{p.title || p.itemId}</p>
                      <p className="text-xs text-slate-500">
                        {p.itemType === 'lecture' ? 'Recorded Lecture' : 'Learning Material'} · {p.completed ? 'Completed' : `${p.progressPercent}% viewed`}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-blue-700 tabular-nums">
                      {p.progressPercent}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (section === 'missed') {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold tracking-wider text-blue-700">
            Digital Recovery Assistant
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Catch Up on Missed Classes</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Select your department, level, course, and missed lecture date or topic to retrieve all linked lecture notes, recorded videos, slides, assignments, and announcements in one place.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Department</label>
              <select
                value={missedDept}
                onChange={(e) => {
                  setMissedDept(e.target.value);
                  setMissedCourseId('all');
                  setMissedDateOrTopic('all');
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Academic Level</label>
              <select
                value={missedLevel}
                onChange={(e) => {
                  setMissedLevel(e.target.value);
                  setMissedCourseId('all');
                  setMissedDateOrTopic('all');
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="all">All Levels</option>
                {ACADEMIC_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l === 'Postgraduate' ? 'Postgraduate' : `${l} Level`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Course</label>
              <select
                value={missedCourseId}
                onChange={(e) => {
                  setMissedCourseId(e.target.value);
                  setMissedDateOrTopic('all');
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="all">All Matching Courses</option>
                {missedCourseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Missed Lecture Date or Topic</label>
              <select
                value={missedDateOrTopic}
                onChange={(e) => setMissedDateOrTopic(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="all">All Lecture Sessions</option>
                {missedTopicDateOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Aggregated Recovery Pack */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {/* Lecture Notes & Slides */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Lecture Notes, Slides &amp; Readings ({catchUpPack.materials.length})
              </h2>
              {catchUpPack.materials.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No written materials match your selected lecture filter.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {catchUpPack.materials.map((m) => (
                    <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-blue-700">
                          {m.courseCode} · {m.resourceType.toUpperCase()} · {m.lectureDate}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{m.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{m.topic}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSaveOffline(m)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          {offlineSet.has(m.id) ? 'Cached Offline' : 'Save Offline'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenMaterial(m)}
                          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                        >
                          Read Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recorded Lecture Videos */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Recorded Lecture Videos ({catchUpPack.lectures.length})
              </h2>
              {catchUpPack.lectures.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No recorded lecture video was found for this selection.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {catchUpPack.lectures.map((l) => (
                    <div key={l.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
                      <div>
                        <p className="text-xs font-medium text-blue-700">
                          {l.courseCode} · {l.lectureDate}
                          {l.durationMinutes ? ` · ${l.durationMinutes} mins` : ''}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{l.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{l.topic}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenLecture(l)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A1628] px-4 py-2 text-xs font-semibold text-white hover:bg-[#14294A] cursor-pointer"
                      >
                        <PlayCircle className="h-4 w-4" aria-hidden="true" />
                        Watch Recording
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-4">
            {/* Related Assignments */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Related Assignments ({catchUpPack.assignments.length})
              </h2>
              {catchUpPack.assignments.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">No assignments tied to this selection.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {catchUpPack.assignments.map((a) => (
                    <div key={a.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-xs font-semibold text-blue-700">
                        {a.courseCode} · Due {a.dueDate}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{a.title}</p>
                      <button
                        type="button"
                        onClick={() => onNavigate('assignments')}
                        className="mt-2.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        Open Assignment
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lecturer Announcements */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Lecturer Announcements ({catchUpPack.announcements.length})
              </h2>
              {catchUpPack.announcements.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">No announcements for this course filter.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {catchUpPack.announcements.map((a) => (
                    <div key={a.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-xs font-semibold text-slate-500">
                        {a.courseCode} · {a.lectureDate || formatFirestoreDate(a.createdAt)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{a.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'courses') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Courses &amp; Department Catalog</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enroll in courses to keep your dashboard, missed lecture packs, and notifications organized.
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            No courses have been added yet. Lecturers or administrators can publish courses from their studio.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const enrolled = enrolledCourseIds.has(c.id);
              const matCount = approvedMaterials.filter((m) => m.courseId === c.id).length;
              const lecCount = approvedLectures.filter((l) => l.courseId === c.id).length;
              return (
                <div key={c.id} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-blue-700">{c.code}</span>
                      <span>{c.level === 'Postgraduate' ? 'PG' : `${c.level} Level`}</span>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-slate-900">{c.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.departmentName} · {c.lecturerName}
                    </p>
                    {c.description && (
                      <p className="mt-3 text-xs leading-relaxed text-slate-600">{c.description}</p>
                    )}
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
                      <span>{matCount} materials · {lecCount} videos</span>
                      <span>{c.creditUnits || 3} Units</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleEnroll(c, enrolled)}
                        className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
                          enrolled
                            ? 'border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {enrolled ? 'Enrolled (Leave)' : 'Enroll in Course'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterCourse(c.id);
                          onNavigate('materials');
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Resources
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (section === 'materials') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Learning Materials</h1>
            <p className="mt-1 text-sm text-slate-600">
              Search and filter PDFs, lecture notes, PowerPoint slides, Word documents, and reading guides.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search topics, course code, title..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Levels</option>
            {ACADEMIC_LEVELS.map((l) => (
              <option key={l} value={l}>{l} Level</option>
            ))}
          </select>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF</option>
              <option value="notes">Notes</option>
              <option value="slides">Slides</option>
              <option value="docx">Word</option>
              <option value="image">Image</option>
              <option value="reading">Reading</option>
            </select>
          </div>
        </div>

        {/* Date Filter + Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>Showing {filteredMaterials.length} resource{filteredMaterials.length === 1 ? '' : 's'}</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <span>Lecture Date:</span>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
              />
            </label>
            {(filterDept !== 'all' || filterLevel !== 'all' || filterCourse !== 'all' || filterType !== 'all' || filterDate || localSearch) && (
              <button
                type="button"
                onClick={() => {
                  setFilterDept('all');
                  setFilterLevel('all');
                  setFilterCourse('all');
                  setFilterType('all');
                  setFilterDate('');
                  setLocalSearch('');
                }}
                className="font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
            No learning materials match your current search or filter criteria.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredMaterials.map((m) => {
              const saved = savedSet.has(`material_${m.id}`);
              const cached = offlineSet.has(m.id);
              const prog = progressMap.get(`material_${m.id}`);
              return (
                <article key={m.id} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-blue-700">{m.courseCode}</span>
                      <span>{m.resourceType.toUpperCase()} · {m.lectureDate}</span>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-slate-900">{m.title}</h2>
                    <p className="mt-1 text-xs font-medium text-slate-600">{m.topic}</p>
                    {m.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{m.description}</p>
                    )}
                    <p className="mt-3 text-xs text-slate-500">
                      {m.lecturerName} · {m.level} Level
                      {prog?.completed ? ' · Read' : ''}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => onOpenMaterial(m)}
                      className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                    >
                      View &amp; Notes
                    </button>
                    <button
                      type="button"
                      title={saved ? 'Remove bookmark' : 'Save for later'}
                      onClick={() => onToggleBookmark(m.id, 'material', m.courseId, m.courseCode, m.title, m.topic)}
                      className={`rounded-lg border p-2 cursor-pointer ${
                        saved ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Bookmark className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title={cached ? 'Cached offline' : 'Download for offline reading'}
                      onClick={() => onSaveOffline(m)}
                      className={`rounded-lg border p-2 cursor-pointer ${
                        cached ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <HardDriveDownload className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (section === 'lectures') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recorded Lectures</h1>
          <p className="mt-1 text-sm text-slate-600">
            Stream recorded classroom sessions, pause anytime, and resume automatically where you stopped.
          </p>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search course or lecture topic..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        {filteredLectures.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
            No recorded lectures match your search filters.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredLectures.map((l) => {
              const prog = progressMap.get(`lecture_${l.id}`);
              const saved = savedSet.has(`lecture_${l.id}`);
              return (
                <article key={l.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between bg-[#0A1628] px-5 py-4 text-white">
                    <div>
                      <p className="text-xs font-medium text-blue-300">
                        {l.courseCode} · {l.lectureDate}
                      </p>
                      <h2 className="mt-1 text-base font-bold">{l.title}</h2>
                    </div>
                    <Video className="h-6 w-6 shrink-0 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-semibold text-slate-700">{l.topic}</p>
                    {l.description && (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{l.description}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 tabular-nums">
                      <span>{l.lecturerName} · {l.durationMinutes || 30} mins</span>
                      <span>
                        {prog?.completed
                          ? 'Completed'
                          : prog?.lastPositionSeconds
                            ? `Stopped at ${Math.floor(prog.lastPositionSeconds / 60)}m ${prog.lastPositionSeconds % 60}s`
                            : 'Not started'}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenLecture(l)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                      >
                        <PlayCircle className="h-4 w-4" aria-hidden="true" />
                        {prog?.lastPositionSeconds && !prog.completed ? 'Resume Lecture' : 'Watch Lecture'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleBookmark(l.id, 'lecture', l.courseId, l.courseCode, l.title, l.topic)}
                        className={`rounded-lg border p-2 cursor-pointer ${
                          saved ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title={saved ? 'Remove bookmark' : 'Bookmark lecture'}
                      >
                        <Bookmark className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (section === 'assignments') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course Assignments</h1>
          <p className="mt-1 text-sm text-slate-600">
            View assignment instructions, submit your solutions online, and review lecturer grades and feedback.
          </p>
        </div>

        {assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-slate-900">No Assignments Published Yet</h2>
            <p className="mt-1 text-sm text-slate-500">
              No coursework assignments are currently available for your courses. Check back after upcoming lectures.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((a) => {
              const sub = assignmentSubmissions.find((s) => s.assignmentId === a.id);
              return (
                <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-blue-700">
                        {a.courseCode} · {a.courseTitle} · Due {a.dueDate}
                      </p>
                      <h2 className="mt-1 text-lg font-bold text-slate-900">{a.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Lecturer: {a.lecturerName} · Maximum Score: {a.maxPoints} pts
                      </p>
                    </div>
                    <div className="text-right">
                      {sub ? (
                        sub.status === 'graded' ? (
                          <div>
                            <p className="text-xs font-semibold text-emerald-700">Graded</p>
                            <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                              {sub.score} / {sub.maxPoints}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-blue-700">Submitted · Awaiting Grade</span>
                        )
                      ) : (
                        <span className="text-xs font-semibold text-amber-700">Pending Submission</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                    {a.instructions}
                  </div>

                  {sub && (
                    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/70 p-4 text-xs text-slate-800">
                      <p className="font-semibold text-blue-900">Your Submission</p>
                      {sub.submissionText && <p className="mt-1 whitespace-pre-wrap">{sub.submissionText}</p>}
                      {sub.attachmentUrl && (
                        <a
                          href={sub.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          {sub.attachmentName || 'View Attached File'}
                        </a>
                      )}
                      {sub.feedback && (
                        <div className="mt-3 border-t border-blue-200 pt-2.5">
                          <p className="font-semibold text-emerald-900">Lecturer Feedback</p>
                          <p className="mt-1">{sub.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      {a.attachmentUrl && (
                        <a
                          href={a.attachmentUrl}
                          download={a.attachmentName || 'assignment-brief'}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          Download Brief ({a.attachmentName || 'Attachment'})
                        </a>
                      )}
                    </div>
                    {(!sub || sub.status !== 'graded') && a.status === 'published' && (
                      <button
                        type="button"
                        disabled={!isOnline}
                        onClick={() => {
                          setActiveAssignment(a);
                          setSubmissionText(sub?.submissionText || '');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        {sub ? 'Update Submission' : 'Submit Assignment'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Assignment Submission Modal */}
        {activeAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060E1E]/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-slate-900">Submit: {activeAssignment.title}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {activeAssignment.courseCode} · Due {activeAssignment.dueDate}
              </p>

              <form onSubmit={handleAssignmentSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Written Response / Notes</label>
                  <textarea
                    rows={5}
                    required={!submissionFile}
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Enter your written answers or summary..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Attach Document (PDF, DOCX, Image — Optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                    onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {uploadPct !== null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-600 tabular-nums">
                        <span>Uploading attachment...</span>
                        <span>{uploadPct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full bg-blue-600 transition-all" style={{ width: `${uploadPct}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveAssignment(null)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAsg}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                  >
                    {submittingAsg ? 'Submitting...' : 'Confirm Submission'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (section === 'quizzes') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quizzes &amp; Assessments</h1>
          <p className="mt-1 text-sm text-slate-600">
            Complete timed objective and essay quizzes and view released grades and lecturer feedback.
          </p>
        </div>

        {quizzes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Award className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-slate-900">No Quizzes Currently Available</h2>
            <p className="mt-1 text-sm text-slate-500">
              No quizzes have been published by your lecturers yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {quizzes.map((q) => {
              const attempt = quizSubmissions.find((s) => s.quizId === q.id);
              return (
                <div key={q.id} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-blue-700">{q.courseCode}</span>
                      <span className="tabular-nums">{q.durationMinutes} mins · {q.questionCount} questions</span>
                    </div>
                    <h2 className="mt-2 text-lg font-bold text-slate-900">{q.title}</h2>
                    {q.description && (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{q.description}</p>
                    )}
                    <p className="mt-3 text-xs text-slate-500 tabular-nums">
                      Total Points: {q.totalPoints} {q.dueDate ? `· Due ${q.dueDate}` : ''}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    {attempt ? (
                      <div className="rounded-lg bg-slate-50 p-3.5 text-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span>{attempt.status === 'graded' ? 'Graded Score' : 'Submitted (Pending Essay Review)'}</span>
                          <span className="font-mono text-sm text-blue-700 tabular-nums">
                            {attempt.finalScore ?? attempt.autoScore} / {attempt.maxPoints}
                          </span>
                        </div>
                        {attempt.feedback && (
                          <p className="mt-1.5 text-slate-600">{attempt.feedback}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!isOnline || q.status !== 'published'}
                        onClick={() => onStartQuiz(q)}
                        className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        Start Timed Quiz
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (section === 'announcements') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements &amp; Class Activities</h1>
          <p className="mt-1 text-sm text-slate-600">
            Topics covered in lectures, timetable adjustments, assignment notices, and supplementary reading links.
          </p>
        </div>

        {announcements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
            No announcements have been published yet.
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <article key={a.id} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-blue-700">
                    {a.courseCode || 'General'} · {a.category.replace('_', ' ')}
                  </span>
                  <span>
                    {a.lectureDate ? `Lecture Date: ${a.lectureDate}` : formatFirestoreDate(a.createdAt)}
                  </span>
                </div>
                <h2 className="mt-2 text-base font-bold text-slate-900">{a.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.body}</p>
                <p className="mt-3 text-xs text-slate-500">Posted by {a.lecturerName}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (section === 'progress') {
    const completedCount = learningProgress.filter((p) => p.completed).length;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Learning Progress</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track completed lecture notes, video watch resume history, and assessment scores.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Overall Completion</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{overallCompletionPct}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Resources Completed</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{completedCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Graded Assessments</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              {assignmentSubmissions.filter((s) => s.status === 'graded').length +
                quizSubmissions.filter((s) => s.status === 'graded').length}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Reading &amp; Video Activity Log</h2>
          {learningProgress.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No study activity recorded yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-2.5 pr-4 font-semibold">Resource</th>
                    <th className="py-2.5 pr-4 font-semibold">Type</th>
                    <th className="py-2.5 pr-4 font-semibold">Status</th>
                    <th className="py-2.5 text-right font-semibold">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {learningProgress.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-4 font-medium text-slate-900">{p.title || p.itemId}</td>
                      <td className="py-3 pr-4 text-xs text-slate-600">
                        {p.itemType === 'lecture' ? 'Recorded Video' : 'Study Material'}
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {p.completed ? (
                          <span className="font-semibold text-emerald-700">Completed</span>
                        ) : (
                          <span className="text-slate-600">In Progress</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono text-xs font-semibold text-blue-700 tabular-nums">
                        {p.progressPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (section === 'saved') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saved Materials &amp; Offline Downloads</h1>
          <p className="mt-1 text-sm text-slate-600">
            Access bookmarked items and locally cached documents without an internet connection.
          </p>
        </div>

        {/* Offline Capability Explanation */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-5 text-xs leading-relaxed text-blue-950">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
            <div>
              <p className="font-semibold">How Offline Continuity Works</p>
              <p className="mt-1">
                <strong>Available Offline:</strong> Previously cached PDFs, images, structured lecture notes, and the installed app shell open seamlessly with zero connection.
                <br />
                <strong>Requires Internet:</strong> Submitting assignments, taking live timed quizzes, posting course Q&amp;A questions, and streaming uncached video lectures.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Cached Offline Library */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Downloaded for Offline Use ({offlineRecords.length})
            </h2>
            {offlineRecords.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                No materials downloaded for offline use yet. Click &ldquo;Cache Offline&rdquo; on any learning material.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {offlineRecords.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-blue-700">
                        {rec.material.courseCode} · {formatBytes(rec.sizeBytes)}
                      </p>
                      <p className="truncate text-sm font-semibold text-slate-900">{rec.material.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenOfflineRecord(rec)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                      >
                        Open Offline
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveOffline(rec.id)}
                        title="Remove from offline cache"
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bookmarks */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Bookmarked Resources ({savedMaterials.length})
            </h2>
            {savedMaterials.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                Bookmark lecture notes or videos to pin them here for revision.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {savedMaterials.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-blue-700">
                        {s.courseCode || 'Course'} · {s.itemType === 'lecture' ? 'Video' : 'Material'}
                      </p>
                      <p className="truncate text-sm font-semibold text-slate-900">{s.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (s.itemType === 'material') {
                          const found = approvedMaterials.find((m) => m.id === s.itemId);
                          if (found) onOpenMaterial(found);
                        } else {
                          const found = approvedLectures.find((l) => l.id === s.itemId);
                          if (found) onOpenLecture(found);
                        }
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0 cursor-pointer"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Profile & Settings
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile &amp; Settings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your academic profile, password recovery, offline installation, and staff verification.
          </p>
        </div>
        <PWAInstallButton variant="light" />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setProfMsg('');
            const chosenDept = departments.find((d) => d.id === profDept);
            await onUpdateProfile(
              {
                displayName: profName,
                departmentId: profDept,
                departmentName: chosenDept?.name || currentUser.departmentName,
                level: profLevel,
                bio: profBio,
              },
              { institutionalId: profInstId }
            );
            setProfMsg('Profile updated successfully.');
          }}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7"
        >
          <h2 className="text-base font-semibold text-slate-900">Academic Account Details</h2>
          {profMsg && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{profMsg}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Institutional / Matric ID</label>
              <input
                type="text"
                value={profInstId}
                onChange={(e) => setProfInstId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Department</label>
              <select
                value={profDept}
                onChange={(e) => setProfDept(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                ))}
              </select>
            </div>
            {currentUser.role === 'student' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700">Academic Level</label>
                <select
                  value={profLevel}
                  onChange={(e) => setProfLevel(e.target.value as UserPublic['level'])}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {ACADEMIC_LEVELS.map((l) => (
                    <option key={l} value={l}>{l} Level</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Study Bio / Interests</label>
            <textarea
              rows={3}
              value={profBio}
              onChange={(e) => setProfBio(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={async () => {
                if (userPrivate?.email) {
                  try {
                    await sendPasswordResetEmail(auth, userPrivate.email);
                    setProfMsg(`Password reset email sent to ${userPrivate.email}.`);
                  } catch {
                    setProfMsg('Password changes for Google Sign-In accounts are managed through Google.');
                  }
                }
              }}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Send Password Reset Email
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>

        {/* Lecturer Verification Request */}
        {currentUser.role === 'student' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onRequestStaffRole(profDept, staffTitle, staffReason);
              setStaffReason('');
              setStaffMsg('Lecturer verification request submitted to the administrator.');
            }}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5"
          >
            <h2 className="text-base font-semibold text-slate-900">Apply for Lecturer / Staff Access</h2>
            <p className="text-xs text-slate-600">
              Are you faculty or teaching staff? Submit a verification request for administrator approval to unlock course uploads and grading.
            </p>
            {staffMsg && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{staffMsg}</p>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Academic Title</label>
              <input
                type="text"
                required
                value={staffTitle}
                onChange={(e) => setStaffTitle(e.target.value)}
                placeholder="e.g., Lecturer II, Senior Lecturer"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Verification Note / Courses Taught</label>
              <textarea
                rows={3}
                required
                minLength={5}
                value={staffReason}
                onChange={(e) => setStaffReason(e.target.value)}
                placeholder="Describe your department and courses you teach..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A1628] px-4 py-2 text-xs font-semibold text-white hover:bg-[#14294A] cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Submit Verification Request
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
