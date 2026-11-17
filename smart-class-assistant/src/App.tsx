import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  Award,
  Bell,
  Bookmark,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Search,
  Settings,
  Shield,
  TrendingUp,
  Upload,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import { auth, db, signOut, sendEmailVerification, BOOTSTRAPPED_ADMIN_EMAIL } from './firebase';
import {
  Announcement,
  AppNotification,
  Assignment,
  AssignmentSubmission,
  Course,
  Department,
  Discussion,
  Enrollment,
  LearningProgress,
  Lecture,
  Material,
  Quiz,
  QuizQuestion,
  QuizSubmission,
  SavedMaterial,
  StaffInvite,
  StaffRequest,
  UserPrivate,
  UserPublic,
  UserRole,
} from './types/academic';
import {
  adminUpdateUserRoleAndStatus,
  askCourseQuestion,
  createAnnouncement,
  createAssignment,
  createCourse,
  createDepartment,
  createLecture,
  createMaterial,
  createQuizWithQuestions,
  createStaffInvite,
  deleteAnnouncementItem,
  deleteCourse,
  deleteDepartment,
  deleteLectureItem,
  deleteMaterialItem,
  enrollInCourse,
  fetchQuizQuestions,
  getUserPrivate,
  getUserPublic,
  gradeAssignmentSubmission,
  gradeQuizSubmission,
  markNotificationRead,
  registerUserProfile,
  replyToCourseQuestion,
  reviewStaffRequest,
  seedAcademicStarterData,
  submitAssignmentWork,
  submitQuizAttempt,
  submitStaffRequest,
  toggleSavedMaterial,
  toggleStaffInvite,
  unenrollFromCourse,
  updateLectureItem,
  updateMaterialItem,
  updateUserProfile,
  upsertLearningProgress,
} from './services/firestoreService';
import {
  OfflineMaterialRecord,
  cacheMaterialForOffline,
  getAllOfflineMaterials,
  removeOfflineMaterial,
} from './utils/offlineStorage';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { ConnectivityStatusBadge, OfflineBanner, PWAInstallButton } from './components/PWAControls';
import { StudentDashboard, StudentSection } from './components/StudentDashboard';
import { LecturerDashboard, LecturerSection } from './components/LecturerDashboard';
import { AdminDashboard, AdminSection } from './components/AdminDashboard';
import { MaterialViewerModal } from './components/MaterialViewerModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { QuizRunnerModal } from './components/QuizRunnerModal';

export default function App() {
  const isOnline = useOnlineStatus();

  // Auth & Profile
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserPublic | null>(null);
  const [userPrivate, setUserPrivate] = useState<UserPrivate | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [preferredAuthRole, setPreferredAuthRole] = useState<'student' | 'lecturer'>('student');
  const [authError, setAuthError] = useState('');

  // Workspace Mode (Admin can switch between all 3; Lecturers can view Lecturer/Student; Students only Student)
  const [workspaceMode, setWorkspaceMode] = useState<'student' | 'lecturer' | 'admin'>('student');
  const [studentSection, setStudentSection] = useState<StudentSection>('overview');
  const [lecturerSection, setLecturerSection] = useState<LecturerSection>('overview');
  const [adminSection, setAdminSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  // Live Firestore Data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [savedMaterials, setSavedMaterials] = useState<SavedMaterial[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);

  // Admin Data
  const [allUsers, setAllUsers] = useState<UserPublic[]>([]);
  const [staffRequests, setStaffRequests] = useState<StaffRequest[]>([]);
  const [staffInvites, setStaffInvites] = useState<StaffInvite[]>([]);

  // Offline IndexedDB Cache
  const [offlineRecords, setOfflineRecords] = useState<OfflineMaterialRecord[]>([]);
  const [activeOfflineBlobUrl, setActiveOfflineBlobUrl] = useState<string | undefined>(undefined);

  // Active Modals
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [watchingLecture, setWatchingLecture] = useState<Lecture | null>(null);
  const [runningQuiz, setRunningQuiz] = useState<Quiz | null>(null);
  const [runningQuizQuestions, setRunningQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [readBroadcastIds, setReadBroadcastIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('sca_read_notifs') || '[]');
    } catch {
      return [];
    }
  });

  // Load offline cache from IndexedDB on boot
  useEffect(() => {
    getAllOfflineMaterials().then(setOfflineRecords);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthError('');
      if (!fbUser) {
        setUserProfile(null);
        setUserPrivate(null);
        setNeedsOnboarding(false);
        setNeedsEmailVerification(false);
        setAuthReady(true);
        return;
      }

      if (!fbUser.emailVerified) {
        setUserProfile(null);
        setUserPrivate(null);
        setNeedsOnboarding(false);
        setNeedsEmailVerification(true);
        setAuthModalOpen(true);
        setAuthReady(true);
        return;
      }

      setNeedsEmailVerification(false);

      try {
        const profile = await getUserPublic(fbUser.uid);
        if (!profile) {
          setUserProfile(null);
          setNeedsOnboarding(true);
          setAuthModalOpen(true);
        } else {
          setUserProfile(profile);
          const priv = await getUserPrivate(fbUser.uid);
          setUserPrivate(priv);
          setNeedsOnboarding(false);
          setAuthModalOpen(false);
          if (profile.role === 'admin') {
            setWorkspaceMode('admin');
            await seedAcademicStarterData(profile);
          } else if (profile.role === 'lecturer') {
            setWorkspaceMode('lecturer');
          } else {
            setWorkspaceMode('student');
          }
        }
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Unable to load your profile.');
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  const handleRecheckVerification = async (): Promise<boolean> => {
    const current = auth.currentUser;
    if (!current) return false;
    await current.reload();
    await current.getIdToken(true);
    if (!current.emailVerified) {
      return false;
    }

    setFirebaseUser(current);
    setNeedsEmailVerification(false);
    const profile = await getUserPublic(current.uid);
    if (!profile) {
      setUserProfile(null);
      setNeedsOnboarding(true);
      setAuthModalOpen(true);
    } else {
      setUserProfile(profile);
      const priv = await getUserPrivate(current.uid);
      setUserPrivate(priv);
      setNeedsOnboarding(false);
      setAuthModalOpen(false);
      if (profile.role === 'admin') {
        setWorkspaceMode('admin');
        await seedAcademicStarterData(profile);
      } else if (profile.role === 'lecturer') {
        setWorkspaceMode('lecturer');
      } else {
        setWorkspaceMode('student');
      }
    }
    return true;
  };

  const handleResendVerification = async (): Promise<void> => {
    const current = auth.currentUser;
    if (!current) {
      throw new Error('No active session found. Please sign in again.');
    }
    await sendEmailVerification(current);
  };

  // Firestore Realtime Listeners (attached strictly after authReady && userProfile)
  useEffect(() => {
    if (!authReady || !firebaseUser || !userProfile) return;

    const uid = firebaseUser.uid;
    const isAdmin =
      userProfile.role === 'admin' ||
      (firebaseUser.emailVerified &&
        firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase());
    const isLecturer = isAdmin || userProfile.role === 'lecturer';

    const safeErr = (label: string) => (err: Error) => {
      console.warn(`Firestore listener (${label}):`, err.message);
    };

    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        query(collection(db, 'departments'), where('name', '!=', '')),
        (snap) => setDepartments(snap.docs.map((d) => d.data() as Department)),
        safeErr('departments')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'courses'), where('code', '!=', '')),
        (snap) => setCourses(snap.docs.map((d) => d.data() as Course)),
        safeErr('courses')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'enrollments'), where('studentId', '==', uid)),
        (snap) => setEnrollments(snap.docs.map((d) => d.data() as Enrollment)),
        safeErr('enrollments')
      )
    );

    unsubs.push(
      onSnapshot(
        isAdmin
          ? collection(db, 'materials')
          : query(collection(db, 'materials'), where('moderationStatus', '==', 'approved')),
        (snap) => setMaterials(snap.docs.map((d) => d.data() as Material)),
        safeErr('materials')
      )
    );

    unsubs.push(
      onSnapshot(
        isAdmin
          ? collection(db, 'lectures')
          : query(collection(db, 'lectures'), where('moderationStatus', '==', 'approved')),
        (snap) => setLectures(snap.docs.map((d) => d.data() as Lecture)),
        safeErr('lectures')
      )
    );

    unsubs.push(
      onSnapshot(
        isAdmin
          ? collection(db, 'assignments')
          : query(collection(db, 'assignments'), where('status', '==', 'published')),
        (snap) => setAssignments(snap.docs.map((d) => d.data() as Assignment)),
        safeErr('assignments')
      )
    );

    unsubs.push(
      onSnapshot(
        isAdmin
          ? collection(db, 'assignmentSubmissions')
          : isLecturer
            ? query(collection(db, 'assignmentSubmissions'), where('lecturerId', '==', uid))
            : query(collection(db, 'assignmentSubmissions'), where('studentId', '==', uid)),
        (snap) => setAssignmentSubmissions(snap.docs.map((d) => d.data() as AssignmentSubmission)),
        safeErr('assignmentSubmissions')
      )
    );

    unsubs.push(
      onSnapshot(
        isAdmin
          ? collection(db, 'quizzes')
          : query(collection(db, 'quizzes'), where('status', '==', 'published')),
        (snap) => setQuizzes(snap.docs.map((d) => d.data() as Quiz)),
        safeErr('quizzes')
      )
    );

    unsubs.push(
      onSnapshot(
        isAdmin
          ? collection(db, 'quizSubmissions')
          : isLecturer
            ? query(collection(db, 'quizSubmissions'), where('lecturerId', '==', uid))
            : query(collection(db, 'quizSubmissions'), where('studentId', '==', uid)),
        (snap) => setQuizSubmissions(snap.docs.map((d) => d.data() as QuizSubmission)),
        safeErr('quizSubmissions')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'announcements'), where('title', '!=', '')),
        (snap) => setAnnouncements(snap.docs.map((d) => d.data() as Announcement)),
        safeErr('announcements')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'notifications'), where('recipientId', 'in', [uid, 'all'])),
        (snap) => setNotifications(snap.docs.map((d) => d.data() as AppNotification)),
        safeErr('notifications')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'savedMaterials'), where('userId', '==', uid)),
        (snap) => setSavedMaterials(snap.docs.map((d) => d.data() as SavedMaterial)),
        safeErr('savedMaterials')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'learningProgress'), where('userId', '==', uid)),
        (snap) => setLearningProgress(snap.docs.map((d) => d.data() as LearningProgress)),
        safeErr('learningProgress')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'discussions'), where('courseId', '!=', '')),
        (snap) => setDiscussions(snap.docs.map((d) => d.data() as Discussion)),
        safeErr('discussions')
      )
    );

    if (isAdmin) {
      unsubs.push(
        onSnapshot(collection(db, 'users'), (snap) => setAllUsers(snap.docs.map((d) => d.data() as UserPublic)), safeErr('users'))
      );
      unsubs.push(
        onSnapshot(collection(db, 'staffRequests'), (snap) => setStaffRequests(snap.docs.map((d) => d.data() as StaffRequest)), safeErr('staffRequests'))
      );
      unsubs.push(
        onSnapshot(collection(db, 'staffInvites'), (snap) => setStaffInvites(snap.docs.map((d) => d.data() as StaffInvite)), safeErr('staffInvites'))
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser, userProfile]);

  const unreadNotifications = useMemo(
    () =>
      notifications.filter((n) => {
        if (n.recipientId === 'all') return !readBroadcastIds.includes(n.id);
        return !n.isRead;
      }),
    [notifications, readBroadcastIds]
  );

  const handleMarkNotifRead = async (n: AppNotification) => {
    if (n.recipientId === 'all') {
      if (!readBroadcastIds.includes(n.id)) {
        const next = [...readBroadcastIds, n.id];
        setReadBroadcastIds(next);
        localStorage.setItem('sca_read_notifs', JSON.stringify(next));
      }
    } else if (!n.isRead) {
      await markNotificationRead(n.id);
    }
    if (n.linkSection && workspaceMode === 'student') {
      setStudentSection(n.linkSection as StudentSection);
    }
    setNotifOpen(false);
  };

  const handleOpenMaterial = async (m: Material) => {
    setActiveOfflineBlobUrl(undefined);
    setViewingMaterial(m);
    if (userProfile && isOnline) {
      const existing = learningProgress.find((p) => p.itemType === 'material' && p.itemId === m.id);
      if (!existing) {
        await upsertLearningProgress({
          userId: userProfile.uid,
          courseId: m.courseId,
          itemId: m.id,
          itemType: 'material',
          title: m.title,
          topic: m.topic,
          progressPercent: 50,
          completed: false,
        });
      }
    }
  };

  const handleOpenOfflineRecord = (rec: OfflineMaterialRecord) => {
    if (rec.fileBlob) {
      const url = URL.createObjectURL(rec.fileBlob);
      setActiveOfflineBlobUrl(url);
    } else {
      setActiveOfflineBlobUrl(undefined);
    }
    setViewingMaterial(rec.material);
  };

  const handleSaveOffline = async (m: Material, onProgress?: (pct: number) => void) => {
    await cacheMaterialForOffline(m, onProgress);
    const updated = await getAllOfflineMaterials();
    setOfflineRecords(updated);
  };

  const handleRemoveOffline = async (id: string) => {
    await removeOfflineMaterial(id);
    setOfflineRecords(await getAllOfflineMaterials());
  };

  // Loading state
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#081226] text-white">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-sm text-blue-200">Initializing Smart Class Assistant...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated, Unverified, or Onboarding -> Landing Page + Auth Modal
  if (!firebaseUser || needsEmailVerification || !userProfile || needsOnboarding) {
    const modalMode = needsEmailVerification
      ? 'verify-email'
      : needsOnboarding
        ? 'onboarding'
        : 'auth';

    return (
      <>
        <LandingPage
          onGetStarted={(role) => {
            setPreferredAuthRole(role || 'student');
            setAuthModalOpen(true);
          }}
        />
        <AuthModal
          isOpen={authModalOpen || needsOnboarding || needsEmailVerification}
          onClose={() => {
            if (!needsOnboarding && !needsEmailVerification) {
              setAuthModalOpen(false);
            }
          }}
          initialRole={preferredAuthRole}
          mode={modalMode}
          departments={departments}
          pendingUserEmail={firebaseUser?.email || ''}
          pendingUserName={firebaseUser?.displayName || ''}
          onRecheckVerification={handleRecheckVerification}
          onResendVerification={handleResendVerification}
          onSignOutVerification={async () => {
            await signOut(auth);
            setNeedsEmailVerification(false);
            setNeedsOnboarding(false);
            setAuthModalOpen(true);
          }}
          onCompleteOnboarding={async (data) => {
            if (!firebaseUser) return;
            const created = await registerUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: data.displayName,
              role: data.role,
              departmentId: data.departmentId,
              departmentName: data.departmentName,
              level: data.level,
              title: data.title,
              institutionalId: data.institutionalId,
              inviteCode: data.inviteCode,
              avatarUrl: firebaseUser.photoURL || undefined,
            });
            setUserProfile(created);
            setUserPrivate(await getUserPrivate(firebaseUser.uid));
            setNeedsOnboarding(false);
            setAuthModalOpen(false);
            if (created.role === 'admin') {
              setWorkspaceMode('admin');
              await seedAcademicStarterData(created);
            } else if (created.role === 'lecturer') {
              setWorkspaceMode('lecturer');
            } else {
              setWorkspaceMode('student');
            }
          }}
        />
      </>
    );
  }

  // Suspended Account Guard
  if (userProfile.status === 'suspended') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#081226] p-6 text-white">
        <div className="max-w-md rounded-2xl border border-white/15 bg-[#0F2347] p-8 text-center">
          <Shield className="mx-auto h-10 w-10 text-amber-400" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold">Account Suspended</h1>
          <p className="mt-2 text-sm text-blue-100/80">
            Your access has been paused by an administrator. Contact academic support for assistance.
          </p>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="mt-6 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = userProfile.role === 'admin';
  const isLecturerOrAdmin = userProfile.role === 'lecturer' || isAdmin;

  const studentNav: Array<{ id: StudentSection; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'missed', label: 'Missed Lectures', icon: <Layers className="h-4 w-4" /> },
    { id: 'courses', label: 'My Courses', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'materials', label: 'Learning Materials', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'lectures', label: 'Recorded Lectures', icon: <Video className="h-4 w-4" /> },
    { id: 'assignments', label: 'Assignments', icon: <ClipboardCheck className="h-4 w-4" /> },
    { id: 'quizzes', label: 'Quizzes', icon: <Award className="h-4 w-4" /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" /> },
    { id: 'progress', label: 'My Progress', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'saved', label: 'Saved & Offline', icon: <Bookmark className="h-4 w-4" /> },
    { id: 'profile', label: 'Profile & Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const lecturerNav: Array<{ id: LecturerSection; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Staff Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'upload-material', label: 'Upload Material', icon: <Upload className="h-4 w-4" /> },
    { id: 'upload-lecture', label: 'Upload Lecture Video', icon: <Video className="h-4 w-4" /> },
    { id: 'assignments', label: 'Assignments & Grading', icon: <ClipboardCheck className="h-4 w-4" /> },
    { id: 'quizzes', label: 'Quizzes & Attempts', icon: <Award className="h-4 w-4" /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" /> },
    { id: 'manage', label: 'Courses, Resources & Q&A', icon: <BookOpen className="h-4 w-4" /> },
  ];

  const adminNav: Array<{ id: AdminSection; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Platform Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'users', label: 'Users & Staff Approvals', icon: <UserCheck className="h-4 w-4" /> },
    { id: 'academics', label: 'Departments & Courses', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'moderation', label: 'Content Moderation', icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        />
      )}

      {/* Deep Navy Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#0A1628] text-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5 font-bold tracking-tight text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm whitespace-nowrap">Smart Class Assistant</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-blue-200 hover:bg-white/10 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Role Portal Switcher (strictly gated to authorized staff/admin) */}
        {isLecturerOrAdmin && (
          <div className="border-b border-white/10 px-4 py-3">
            <p className="mb-1.5 text-[11px] font-semibold text-blue-300/80">Workspace Portal</p>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setWorkspaceMode('student')}
                className={`rounded-md py-1.5 transition-colors cursor-pointer ${
                  workspaceMode === 'student' ? 'bg-blue-600 text-white' : 'text-blue-200 hover:text-white'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceMode('lecturer')}
                className={`rounded-md py-1.5 transition-colors cursor-pointer ${
                  workspaceMode === 'lecturer' ? 'bg-blue-600 text-white' : 'text-blue-200 hover:text-white'
                }`}
              >
                Lecturer
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('admin')}
                  className={`col-span-2 rounded-md py-1.5 transition-colors cursor-pointer ${
                    workspaceMode === 'admin' ? 'bg-blue-600 text-white' : 'text-blue-200 hover:text-white'
                  }`}
                >
                  Administrator Console
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav aria-label="Dashboard sections" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {workspaceMode === 'student' &&
            studentNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setStudentSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  studentSection === item.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}

          {workspaceMode === 'lecturer' &&
            isLecturerOrAdmin &&
            lecturerNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setLecturerSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  lecturerSection === item.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}

          {workspaceMode === 'admin' &&
            isAdmin &&
            adminNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setAdminSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  adminSection === item.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
        </nav>

        {/* User Profile Footer */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{userProfile.displayName}</p>
              <p className="truncate text-[11px] text-blue-300/80">
                {userProfile.role.toUpperCase()} · {userProfile.departmentName || userProfile.departmentId}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut(auth)}
              title="Sign Out"
              aria-label="Sign out"
              className="rounded-lg border border-white/15 p-2 text-blue-200 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation drawer"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="relative hidden max-w-md flex-1 sm:block">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    if (workspaceMode === 'student' && e.target.value.trim() && studentSection === 'overview') {
                      setStudentSection('materials');
                    }
                  }}
                  placeholder="Search courses, lecture topics, videos, notes..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <PWAInstallButton variant="light" />
              <ConnectivityStatusBadge />

              {/* Notification Centre */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifications"
                  className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white tabular-nums">
                      {unreadNotifications.length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-900">
                      Notifications ({unreadNotifications.length} unread)
                    </div>
                    <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-6 text-center text-xs text-slate-500">No notifications yet.</p>
                      ) : (
                        notifications.slice(0, 12).map((n) => {
                          const isUnread =
                            n.recipientId === 'all'
                              ? !readBroadcastIds.includes(n.id)
                              : !n.isRead;
                          return (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => handleMarkNotifRead(n)}
                              className={`block w-full px-4 py-3 text-left text-xs hover:bg-slate-50 cursor-pointer ${
                                isUnread ? 'bg-blue-50/50' : ''
                              }`}
                            >
                              <p className="font-semibold text-slate-900">{n.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-slate-600">{n.message}</p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <OfflineBanner
          cachedCount={offlineRecords.length}
          onOpenOfflineLibrary={() => {
            setWorkspaceMode('student');
            setStudentSection('saved');
          }}
        />

        {authError && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {authError}
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          {workspaceMode === 'student' && (
            <StudentDashboard
              section={studentSection}
              onNavigate={setStudentSection}
              globalSearch={globalSearch}
              currentUser={userProfile}
              userPrivate={userPrivate}
              departments={departments}
              courses={courses}
              enrollments={enrollments}
              materials={materials}
              lectures={lectures}
              assignments={assignments}
              assignmentSubmissions={assignmentSubmissions}
              quizzes={quizzes}
              quizSubmissions={quizSubmissions}
              announcements={announcements}
              savedMaterials={savedMaterials}
              learningProgress={learningProgress}
              offlineRecords={offlineRecords}
              isOnline={isOnline}
              onToggleEnroll={async (course, isEnrolled) => {
                if (isEnrolled) {
                  await unenrollFromCourse(userProfile.uid, course.id);
                } else {
                  await enrollInCourse(userProfile.uid, course);
                }
              }}
              onOpenMaterial={handleOpenMaterial}
              onOpenLecture={(l) => setWatchingLecture(l)}
              onToggleBookmark={async (itemId, itemType, courseId, courseCode, title, topic) => {
                const currentlySaved = savedMaterials.some(
                  (s) => s.itemType === itemType && s.itemId === itemId
                );
                await toggleSavedMaterial({
                  userId: userProfile.uid,
                  itemId,
                  itemType,
                  courseId,
                  courseCode,
                  title,
                  topic,
                  currentlySaved,
                });
              }}
              onSaveOffline={async (m) => {
                await handleSaveOffline(m);
              }}
              onRemoveOffline={handleRemoveOffline}
              onOpenOfflineRecord={handleOpenOfflineRecord}
              onSubmitAssignment={async (assignment, text, url, name) => {
                await submitAssignmentWork({
                  assignment,
                  studentId: userProfile.uid,
                  studentName: userProfile.displayName,
                  submissionText: text,
                  attachmentUrl: url,
                  attachmentName: name,
                });
              }}
              onStartQuiz={async (q) => {
                setRunningQuiz(q);
                setQuizLoading(true);
                try {
                  const qs = await fetchQuizQuestions(q.id);
                  setRunningQuizQuestions(qs);
                } finally {
                  setQuizLoading(false);
                }
              }}
              onUpdateProfile={async (updates, privUpdates) => {
                await updateUserProfile(userProfile.uid, updates, privUpdates);
                setUserProfile((prev) => (prev ? { ...prev, ...updates } : prev));
              }}
              onRequestStaffRole={async (deptId, title, reason) => {
                await submitStaffRequest({
                  uid: userProfile.uid,
                  displayName: userProfile.displayName,
                  departmentId: deptId,
                  staffTitle: title,
                  reason,
                });
              }}
            />
          )}

          {workspaceMode === 'lecturer' && isLecturerOrAdmin && (
            <LecturerDashboard
              section={lecturerSection}
              onNavigate={setLecturerSection}
              currentUser={userProfile}
              departments={departments}
              courses={courses}
              materials={materials}
              lectures={lectures}
              assignments={assignments}
              assignmentSubmissions={assignmentSubmissions}
              quizzes={quizzes}
              quizSubmissions={quizSubmissions}
              announcements={announcements}
              discussions={discussions}
              onCreateCourse={async (data) => {
                await createCourse({
                  ...data,
                  lecturerId: userProfile.uid,
                  lecturerName: userProfile.displayName,
                });
              }}
              onCreateMaterial={async (data) => {
                await createMaterial(data);
              }}
              onDeleteMaterial={deleteMaterialItem}
              onCreateLecture={async (data) => {
                await createLecture(data);
              }}
              onDeleteLecture={deleteLectureItem}
              onCreateAssignment={async (data) => {
                await createAssignment(data);
              }}
              onGradeAssignment={async (sub, score, feedback) => {
                await gradeAssignmentSubmission({
                  submission: sub,
                  score,
                  feedback,
                  lecturerId: userProfile.uid,
                });
              }}
              onCreateQuiz={async (quiz, questions) => {
                await createQuizWithQuestions({ quiz, questions });
              }}
              onGradeQuiz={async (sub, finalScore, feedback) => {
                await gradeQuizSubmission({
                  submission: sub,
                  finalScore,
                  feedback,
                  lecturerId: userProfile.uid,
                });
              }}
              onCreateAnnouncement={async (data) => {
                await createAnnouncement(data);
              }}
              onDeleteAnnouncement={deleteAnnouncementItem}
              onReplyDiscussion={async (d, replyText) => {
                await replyToCourseQuestion({
                  discussion: d,
                  replyText,
                  lecturerId: userProfile.uid,
                  lecturerName: userProfile.displayName,
                });
              }}
            />
          )}

          {workspaceMode === 'admin' && isAdmin && (
            <AdminDashboard
              section={adminSection}
              currentUser={userProfile}
              users={allUsers}
              staffRequests={staffRequests}
              staffInvites={staffInvites}
              departments={departments}
              courses={courses}
              materials={materials}
              lectures={lectures}
              totalSubmissionsCount={assignmentSubmissions.length + quizSubmissions.length}
              onUpdateUserRole={async (uid, role, status) => {
                await adminUpdateUserRoleAndStatus({
                  uid,
                  role,
                  status,
                  adminUid: userProfile.uid,
                });
              }}
              onReviewStaffRequest={async (req, decision) => {
                await reviewStaffRequest({
                  req,
                  decision,
                  adminUid: userProfile.uid,
                });
              }}
              onCreateInvite={async (code, deptId) => {
                await createStaffInvite({
                  code,
                  departmentId: deptId,
                  createdBy: userProfile.uid,
                });
              }}
              onToggleInvite={toggleStaffInvite}
              onCreateDepartment={async (code, name, faculty, description) => {
                await createDepartment({
                  code,
                  name,
                  faculty,
                  description,
                  createdBy: userProfile.uid,
                });
              }}
              onDeleteDepartment={deleteDepartment}
              onCreateCourse={async (data) => {
                await createCourse({
                  ...data,
                  lecturerId: userProfile.uid,
                  lecturerName: userProfile.displayName,
                });
              }}
              onDeleteCourse={deleteCourse}
              onModerateMaterial={async (id, moderationStatus) => {
                await updateMaterialItem(id, { moderationStatus });
              }}
              onDeleteMaterial={deleteMaterialItem}
              onModerateLecture={async (id, moderationStatus) => {
                await updateLectureItem(id, { moderationStatus });
              }}
              onDeleteLecture={deleteLectureItem}
              onSeedStarter={async () => {
                await seedAcademicStarterData(userProfile);
              }}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <MaterialViewerModal
        material={viewingMaterial}
        offlineBlobUrl={activeOfflineBlobUrl}
        isOfflineCached={viewingMaterial ? offlineRecords.some((r) => r.id === viewingMaterial.id) : false}
        isBookmarked={
          viewingMaterial
            ? savedMaterials.some((s) => s.itemType === 'material' && s.itemId === viewingMaterial.id)
            : false
        }
        isCompleted={
          viewingMaterial
            ? learningProgress.some(
                (p) => p.itemType === 'material' && p.itemId === viewingMaterial.id && p.completed
              )
            : false
        }
        discussions={discussions}
        currentUser={userProfile}
        onClose={() => {
          if (activeOfflineBlobUrl) URL.revokeObjectURL(activeOfflineBlobUrl);
          setActiveOfflineBlobUrl(undefined);
          setViewingMaterial(null);
        }}
        onToggleBookmark={async (m) => {
          const currentlySaved = savedMaterials.some(
            (s) => s.itemType === 'material' && s.itemId === m.id
          );
          await toggleSavedMaterial({
            userId: userProfile.uid,
            itemId: m.id,
            itemType: 'material',
            courseId: m.courseId,
            courseCode: m.courseCode,
            title: m.title,
            topic: m.topic,
            currentlySaved,
          });
        }}
        onSaveOffline={handleSaveOffline}
        onMarkComplete={async (m) => {
          await upsertLearningProgress({
            userId: userProfile.uid,
            courseId: m.courseId,
            itemId: m.id,
            itemType: 'material',
            title: m.title,
            topic: m.topic,
            progressPercent: 100,
            completed: true,
          });
        }}
        onAskQuestion={async (m, question) => {
          await askCourseQuestion({
            courseId: m.courseId,
            courseCode: m.courseCode,
            materialId: m.id,
            materialTitle: m.title,
            authorId: userProfile.uid,
            authorName: userProfile.displayName,
            question,
          });
        }}
      />

      <VideoPlayerModal
        lecture={watchingLecture}
        progress={
          watchingLecture
            ? learningProgress.find((p) => p.itemType === 'lecture' && p.itemId === watchingLecture.id)
            : undefined
        }
        relatedMaterial={
          watchingLecture?.relatedMaterialId
            ? materials.find((m) => m.id === watchingLecture.relatedMaterialId)
            : undefined
        }
        isBookmarked={
          watchingLecture
            ? savedMaterials.some((s) => s.itemType === 'lecture' && s.itemId === watchingLecture.id)
            : false
        }
        onClose={() => setWatchingLecture(null)}
        onSavePlaybackProgress={async (lec, posSec, pct, completed) => {
          await upsertLearningProgress({
            userId: userProfile.uid,
            courseId: lec.courseId,
            itemId: lec.id,
            itemType: 'lecture',
            title: lec.title,
            topic: lec.topic,
            progressPercent: pct,
            lastPositionSeconds: posSec,
            completed,
          });
        }}
        onToggleBookmark={async (lec) => {
          const currentlySaved = savedMaterials.some(
            (s) => s.itemType === 'lecture' && s.itemId === lec.id
          );
          await toggleSavedMaterial({
            userId: userProfile.uid,
            itemId: lec.id,
            itemType: 'lecture',
            courseId: lec.courseId,
            courseCode: lec.courseCode,
            title: lec.title,
            topic: lec.topic,
            currentlySaved,
          });
        }}
        onOpenMaterial={handleOpenMaterial}
      />

      <QuizRunnerModal
        quiz={runningQuiz}
        questions={runningQuizQuestions}
        loading={quizLoading}
        onClose={() => setRunningQuiz(null)}
        onSubmit={async (quiz, questions, answers, durationSpentSeconds) => {
          await submitQuizAttempt({
            quiz,
            questions,
            studentId: userProfile.uid,
            studentName: userProfile.displayName,
            answers,
            durationSpentSeconds,
          });
        }}
      />
    </div>
  );
}
