import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, BOOTSTRAPPED_ADMIN_EMAIL } from '../firebase';
import {
  AcademicLevel,
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
  clampString,
  generateDocId,
  sanitizeId,
} from '../types/academic';

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export async function getUserPublic(uid: string): Promise<UserPublic | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserPublic) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function getUserPrivate(uid: string): Promise<UserPrivate | null> {
  const path = `users/${uid}/private/info`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
    return snap.exists() ? (snap.data() as UserPrivate) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function registerUserProfile(params: {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  departmentId: string;
  departmentName?: string;
  level: UserPublic['level'];
  title?: string;
  institutionalId?: string;
  inviteCode?: string;
  avatarUrl?: string;
}): Promise<UserPublic> {
  const path = `users/${params.uid}`;
  try {
    const isAdminEmail = params.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
    const resolvedRole: UserRole = isAdminEmail ? 'admin' : params.role === 'lecturer' ? 'lecturer' : 'student';

    const publicPayload: Record<string, unknown> = {
      uid: params.uid,
      displayName: clampString(params.displayName, 100) || 'Academic Member',
      role: resolvedRole,
      departmentId: clampString(params.departmentId, 128) || 'dept_csc',
      departmentName: clampString(params.departmentName, 120) || 'Computer Science',
      level: resolvedRole === 'student' ? params.level : 'Staff',
      title: clampString(params.title, 60) || (resolvedRole === 'lecturer' ? 'Lecturer' : resolvedRole === 'admin' ? 'System Administrator' : 'Student'),
      bio: '',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (params.avatarUrl) {
      publicPayload.avatarUrl = clampString(params.avatarUrl, 500);
    }
    if (resolvedRole === 'lecturer' && params.inviteCode && !isAdminEmail) {
      publicPayload.inviteCode = clampString(params.inviteCode, 64);
    }

    await setDoc(doc(db, 'users', params.uid), stripUndefined(publicPayload));

    const privatePayload = stripUndefined({
      uid: params.uid,
      email: clampString(params.email, 200),
      institutionalId: clampString(params.institutionalId, 60) || undefined,
      emailNotifications: true,
      offlineAutoCache: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', params.uid, 'private', 'info'), privatePayload);

    const created = await getDoc(doc(db, 'users', params.uid));
    return created.data() as UserPublic;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserPublic, 'displayName' | 'departmentId' | 'departmentName' | 'level' | 'title' | 'bio' | 'avatarUrl'>>,
  privateUpdates?: Partial<Pick<UserPrivate, 'institutionalId' | 'phone' | 'emailNotifications' | 'offlineAutoCache'>>
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(
      doc(db, 'users', uid),
      stripUndefined({
        ...updates,
        displayName: updates.displayName ? clampString(updates.displayName, 100) : undefined,
        bio: updates.bio !== undefined ? clampString(updates.bio, 500) : undefined,
        title: updates.title !== undefined ? clampString(updates.title, 60) : undefined,
        updatedAt: serverTimestamp(),
      })
    );
    if (privateUpdates) {
      await updateDoc(
        doc(db, 'users', uid, 'private', 'info'),
        stripUndefined({
          ...privateUpdates,
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function validateStaffInviteCode(code: string): Promise<StaffInvite | null> {
  const clean = sanitizeId(code.trim());
  if (!clean) return null;
  const path = `staffInvites/${clean}`;
  try {
    const snap = await getDoc(doc(db, 'staffInvites', clean));
    if (!snap.exists()) return null;
    const data = snap.data() as StaffInvite;
    return data.active ? data : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function submitStaffRequest(params: {
  uid: string;
  displayName: string;
  departmentId: string;
  staffTitle?: string;
  reason: string;
}): Promise<void> {
  const path = `staffRequests/${params.uid}`;
  try {
    await setDoc(
      doc(db, 'staffRequests', params.uid),
      stripUndefined({
        uid: params.uid,
        displayName: clampString(params.displayName, 100),
        departmentId: params.departmentId,
        staffTitle: clampString(params.staffTitle, 60) || 'Lecturer',
        reason: clampString(params.reason, 500),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// --- Course Enrollment ---
export async function enrollInCourse(studentId: string, course: Course): Promise<void> {
  const id = sanitizeId(`${studentId}_${course.id}`);
  const path = `enrollments/${id}`;
  try {
    await setDoc(doc(db, 'enrollments', id), {
      id,
      studentId,
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      departmentId: course.departmentId,
      level: course.level,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function unenrollFromCourse(studentId: string, courseId: string): Promise<void> {
  const id = sanitizeId(`${studentId}_${courseId}`);
  const path = `enrollments/${id}`;
  try {
    await deleteDoc(doc(db, 'enrollments', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Notifications ---
export async function publishNotification(params: {
  recipientId: string;
  type: AppNotification['type'];
  title: string;
  message: string;
  courseId?: string;
  courseCode?: string;
  linkSection?: string;
  createdBy: string;
}): Promise<void> {
  const id = generateDocId('notif');
  const path = `notifications/${id}`;
  try {
    await setDoc(
      doc(db, 'notifications', id),
      stripUndefined({
        id,
        recipientId: params.recipientId,
        type: params.type,
        title: clampString(params.title, 180),
        message: clampString(params.message, 500),
        courseId: params.courseId,
        courseCode: params.courseCode,
        linkSection: params.linkSection,
        isRead: false,
        createdBy: params.createdBy,
        createdAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const path = `notifications/${id}`;
  try {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Bookmarks & Learning Progress ---
export async function toggleSavedMaterial(params: {
  userId: string;
  itemId: string;
  itemType: 'material' | 'lecture';
  courseId: string;
  courseCode: string;
  title: string;
  topic: string;
  currentlySaved: boolean;
}): Promise<void> {
  const id = sanitizeId(`${params.userId}_${params.itemType}_${params.itemId}`);
  const path = `savedMaterials/${id}`;
  try {
    if (params.currentlySaved) {
      await deleteDoc(doc(db, 'savedMaterials', id));
    } else {
      await setDoc(doc(db, 'savedMaterials', id), {
        id,
        userId: params.userId,
        itemId: params.itemId,
        itemType: params.itemType,
        courseId: params.courseId,
        courseCode: clampString(params.courseCode, 24),
        title: clampString(params.title, 180),
        topic: clampString(params.topic, 160),
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, params.currentlySaved ? OperationType.DELETE : OperationType.CREATE, path);
  }
}

export async function upsertLearningProgress(params: {
  userId: string;
  courseId: string;
  itemId: string;
  itemType: 'material' | 'lecture';
  title: string;
  topic: string;
  progressPercent: number;
  lastPositionSeconds?: number;
  completed: boolean;
}): Promise<void> {
  const id = sanitizeId(`${params.userId}_${params.itemType}_${params.itemId}`);
  const path = `learningProgress/${id}`;
  try {
    const existing = await getDoc(doc(db, 'learningProgress', id));
    const pct = Math.max(0, Math.min(100, Math.round(params.progressPercent)));
    if (existing.exists()) {
      await updateDoc(
        doc(db, 'learningProgress', id),
        stripUndefined({
          progressPercent: pct,
          lastPositionSeconds: params.lastPositionSeconds !== undefined ? Math.max(0, Math.round(params.lastPositionSeconds)) : undefined,
          completed: params.completed,
          title: clampString(params.title, 180),
          topic: clampString(params.topic, 160),
          lastAccessedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    } else {
      await setDoc(
        doc(db, 'learningProgress', id),
        stripUndefined({
          id,
          userId: params.userId,
          courseId: params.courseId,
          itemId: params.itemId,
          itemType: params.itemType,
          title: clampString(params.title, 180),
          topic: clampString(params.topic, 160),
          progressPercent: pct,
          lastPositionSeconds: params.lastPositionSeconds !== undefined ? Math.max(0, Math.round(params.lastPositionSeconds)) : 0,
          completed: params.completed,
          lastAccessedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// --- Materials, Lectures, Announcements ---
export async function createMaterial(
  data: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'moderationStatus'> & { moderationStatus?: Material['moderationStatus'] }
): Promise<string> {
  const id = generateDocId('mat');
  const path = `materials/${id}`;
  try {
    await setDoc(
      doc(db, 'materials', id),
      stripUndefined({
        ...data,
        id,
        topic: clampString(data.topic, 160),
        title: clampString(data.title, 180),
        description: clampString(data.description, 1500) || undefined,
        notesContent: clampString(data.notesContent, 25000) || undefined,
        moderationStatus: data.moderationStatus || 'approved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await publishNotification({
      recipientId: 'all',
      type: 'material',
      title: `New material in ${data.courseCode}`,
      message: `${data.title} (${data.topic}) uploaded by ${data.lecturerName}.`,
      courseId: data.courseId,
      courseCode: data.courseCode,
      linkSection: 'materials',
      createdBy: data.lecturerId,
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateMaterialItem(
  id: string,
  updates: Partial<Pick<Material, 'topic' | 'title' | 'description' | 'resourceType' | 'fileUrl' | 'fileName' | 'fileSizeBytes' | 'mimeType' | 'lectureDate' | 'notesContent' | 'moderationStatus'>>
): Promise<void> {
  const path = `materials/${id}`;
  try {
    await updateDoc(doc(db, 'materials', id), stripUndefined({ ...updates, updatedAt: serverTimestamp() }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteMaterialItem(id: string): Promise<void> {
  const path = `materials/${id}`;
  try {
    await deleteDoc(doc(db, 'materials', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createLecture(
  data: Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'moderationStatus'> & { moderationStatus?: Lecture['moderationStatus'] }
): Promise<string> {
  const id = generateDocId('lec');
  const path = `lectures/${id}`;
  try {
    await setDoc(
      doc(db, 'lectures', id),
      stripUndefined({
        ...data,
        id,
        topic: clampString(data.topic, 160),
        title: clampString(data.title, 180),
        description: clampString(data.description, 1500) || undefined,
        transcriptSummary: clampString(data.transcriptSummary, 10000) || undefined,
        moderationStatus: data.moderationStatus || 'approved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await publishNotification({
      recipientId: 'all',
      type: 'lecture',
      title: `Recorded lecture available: ${data.courseCode}`,
      message: `${data.title} is now ready to watch and resume anytime.`,
      courseId: data.courseId,
      courseCode: data.courseCode,
      linkSection: 'lectures',
      createdBy: data.lecturerId,
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateLectureItem(
  id: string,
  updates: Partial<Pick<Lecture, 'topic' | 'title' | 'description' | 'videoUrl' | 'durationMinutes' | 'lectureDate' | 'relatedMaterialId' | 'transcriptSummary' | 'moderationStatus'>>
): Promise<void> {
  const path = `lectures/${id}`;
  try {
    await updateDoc(doc(db, 'lectures', id), stripUndefined({ ...updates, updatedAt: serverTimestamp() }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteLectureItem(id: string): Promise<void> {
  const path = `lectures/${id}`;
  try {
    await deleteDoc(doc(db, 'lectures', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createAnnouncement(
  data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateDocId('ann');
  const path = `announcements/${id}`;
  try {
    await setDoc(
      doc(db, 'announcements', id),
      stripUndefined({
        ...data,
        id,
        title: clampString(data.title, 180),
        body: clampString(data.body, 4000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await publishNotification({
      recipientId: 'all',
      type: 'announcement',
      title: `${data.courseCode || 'Course'} Update: ${clampString(data.title, 90)}`,
      message: clampString(data.body, 220),
      courseId: data.courseId,
      courseCode: data.courseCode,
      linkSection: 'announcements',
      createdBy: data.lecturerId,
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteAnnouncementItem(id: string): Promise<void> {
  const path = `announcements/${id}`;
  try {
    await deleteDoc(doc(db, 'announcements', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Assignments & Grading ---
export async function createAssignment(
  data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateDocId('asg');
  const path = `assignments/${id}`;
  try {
    await setDoc(
      doc(db, 'assignments', id),
      stripUndefined({
        ...data,
        id,
        title: clampString(data.title, 180),
        instructions: clampString(data.instructions, 5000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await publishNotification({
      recipientId: 'all',
      type: 'assignment',
      title: `New Assignment: ${data.courseCode}`,
      message: `${data.title} — due ${data.dueDate}.`,
      courseId: data.courseId,
      courseCode: data.courseCode,
      linkSection: 'assignments',
      createdBy: data.lecturerId,
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function submitAssignmentWork(params: {
  assignment: Assignment;
  studentId: string;
  studentName: string;
  submissionText: string;
  attachmentUrl?: string;
  attachmentName?: string;
}): Promise<void> {
  const id = sanitizeId(`${params.assignment.id}_${params.studentId}`);
  const path = `assignmentSubmissions/${id}`;
  try {
    const existing = await getDoc(doc(db, 'assignmentSubmissions', id));
    if (existing.exists()) {
      await updateDoc(
        doc(db, 'assignmentSubmissions', id),
        stripUndefined({
          submissionText: clampString(params.submissionText, 10000),
          attachmentUrl: params.attachmentUrl || undefined,
          attachmentName: params.attachmentName || undefined,
          updatedAt: serverTimestamp(),
        })
      );
    } else {
      await setDoc(
        doc(db, 'assignmentSubmissions', id),
        stripUndefined({
          id,
          assignmentId: params.assignment.id,
          courseId: params.assignment.courseId,
          courseCode: params.assignment.courseCode,
          lecturerId: params.assignment.lecturerId,
          studentId: params.studentId,
          studentName: clampString(params.studentName, 100),
          submissionText: clampString(params.submissionText, 10000),
          attachmentUrl: params.attachmentUrl || undefined,
          attachmentName: params.attachmentName || undefined,
          status: 'submitted',
          maxPoints: params.assignment.maxPoints,
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function gradeAssignmentSubmission(params: {
  submission: AssignmentSubmission;
  score: number;
  feedback: string;
  lecturerId: string;
}): Promise<void> {
  const path = `assignmentSubmissions/${params.submission.id}`;
  try {
    const boundedScore = Math.max(0, Math.min(params.submission.maxPoints, Number(params.score)));
    await updateDoc(doc(db, 'assignmentSubmissions', params.submission.id), {
      status: 'graded',
      score: boundedScore,
      feedback: clampString(params.feedback, 2000),
      gradedBy: params.lecturerId,
      gradedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await publishNotification({
      recipientId: params.submission.studentId,
      type: 'grade',
      title: `Assignment Graded (${params.submission.courseCode || 'Course'})`,
      message: `Score: ${boundedScore}/${params.submission.maxPoints}. Feedback released by your lecturer.`,
      courseId: params.submission.courseId,
      courseCode: params.submission.courseCode,
      linkSection: 'assignments',
      createdBy: params.lecturerId,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Quizzes & Questions ---
export async function createQuizWithQuestions(params: {
  quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'questionCount'>;
  questions: Array<Omit<QuizQuestion, 'id' | 'quizId' | 'createdAt'>>;
}): Promise<string> {
  const quizId = generateDocId('quiz');
  const path = `quizzes/${quizId}`;
  try {
    const totalPts = params.questions.reduce((acc, q) => acc + Number(q.points || 0), 0) || params.quiz.totalPoints;
    await setDoc(
      doc(db, 'quizzes', quizId),
      stripUndefined({
        ...params.quiz,
        id: quizId,
        totalPoints: totalPts,
        questionCount: params.questions.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    for (let i = 0; i < params.questions.length; i++) {
      const q = params.questions[i];
      const qId = generateDocId(`qq${i}`);
      await setDoc(
        doc(db, 'quizzes', quizId, 'questions', qId),
        stripUndefined({
          id: qId,
          quizId,
          orderIndex: i,
          type: q.type,
          prompt: clampString(q.prompt, 1500),
          options: q.type === 'objective' ? (q.options || []).slice(0, 6) : undefined,
          correctOptionIndex: q.type === 'objective' ? q.correctOptionIndex ?? 0 : -1,
          points: Number(q.points || 1),
          createdAt: serverTimestamp(),
        })
      );
    }

    await publishNotification({
      recipientId: 'all',
      type: 'quiz',
      title: `New Quiz Published: ${params.quiz.courseCode}`,
      message: `${params.quiz.title} (${params.quiz.durationMinutes} mins, ${params.questions.length} questions).`,
      courseId: params.quiz.courseId,
      courseCode: params.quiz.courseCode,
      linkSection: 'quizzes',
      createdBy: params.quiz.lecturerId,
    });

    return quizId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function fetchQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
  const path = `quizzes/${quizId}/questions`;
  try {
    const snap = await getDocs(query(collection(db, 'quizzes', quizId, 'questions'), where('quizId', '==', quizId)));
    const list = snap.docs.map((d) => d.data() as QuizQuestion);
    return list.sort((a, b) => a.orderIndex - b.orderIndex);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function submitQuizAttempt(params: {
  quiz: Quiz;
  questions: QuizQuestion[];
  studentId: string;
  studentName: string;
  answers: Record<string, string | number>;
  durationSpentSeconds: number;
}): Promise<QuizSubmission> {
  const id = sanitizeId(`${params.quiz.id}_${params.studentId}`);
  const path = `quizSubmissions/${id}`;
  try {
    let autoScore = 0;
    let hasEssay = false;
    for (const q of params.questions) {
      if (q.type === 'essay') {
        hasEssay = true;
      } else if (Number(params.answers[q.id]) === Number(q.correctOptionIndex)) {
        autoScore += Number(q.points);
      }
    }

    const status = hasEssay ? 'submitted' : 'graded';
    const payload: Record<string, unknown> = {
      id,
      quizId: params.quiz.id,
      courseId: params.quiz.courseId,
      courseCode: params.quiz.courseCode,
      lecturerId: params.quiz.lecturerId,
      studentId: params.studentId,
      studentName: clampString(params.studentName, 100),
      answers: params.answers,
      autoScore,
      maxPoints: params.quiz.totalPoints,
      status,
      durationSpentSeconds: Math.max(0, Math.round(params.durationSpentSeconds)),
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!hasEssay) {
      payload.finalScore = autoScore;
      payload.feedback = 'Objective assessment automatically scored upon completion.';
      payload.gradedAt = serverTimestamp();
    }

    await setDoc(doc(db, 'quizSubmissions', id), payload);
    return payload as unknown as QuizSubmission;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function gradeQuizSubmission(params: {
  submission: QuizSubmission;
  finalScore: number;
  feedback: string;
  lecturerId: string;
}): Promise<void> {
  const path = `quizSubmissions/${params.submission.id}`;
  try {
    const bounded = Math.max(0, Math.min(params.submission.maxPoints, Number(params.finalScore)));
    await updateDoc(doc(db, 'quizSubmissions', params.submission.id), {
      finalScore: bounded,
      status: 'graded',
      feedback: clampString(params.feedback, 2000),
      gradedBy: params.lecturerId,
      gradedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await publishNotification({
      recipientId: params.submission.studentId,
      type: 'grade',
      title: `Quiz Result Released (${params.submission.courseCode || 'Course'})`,
      message: `Final Score: ${bounded}/${params.submission.maxPoints}. View lecturer remarks in Quizzes.`,
      courseId: params.submission.courseId,
      courseCode: params.submission.courseCode,
      linkSection: 'quizzes',
      createdBy: params.lecturerId,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Discussions / Q&A ---
export async function askCourseQuestion(params: {
  courseId: string;
  courseCode: string;
  materialId?: string;
  materialTitle?: string;
  authorId: string;
  authorName: string;
  question: string;
}): Promise<void> {
  const id = generateDocId('qa');
  const path = `discussions/${id}`;
  try {
    await setDoc(
      doc(db, 'discussions', id),
      stripUndefined({
        id,
        courseId: params.courseId,
        courseCode: params.courseCode,
        materialId: params.materialId || undefined,
        materialTitle: params.materialTitle ? clampString(params.materialTitle, 180) : undefined,
        authorId: params.authorId,
        authorName: clampString(params.authorName, 100),
        question: clampString(params.question, 2000),
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function replyToCourseQuestion(params: {
  discussion: Discussion;
  replyText: string;
  lecturerId: string;
  lecturerName: string;
}): Promise<void> {
  const path = `discussions/${params.discussion.id}`;
  try {
    await updateDoc(doc(db, 'discussions', params.discussion.id), {
      replyText: clampString(params.replyText, 3000),
      repliedById: params.lecturerId,
      repliedByName: clampString(params.lecturerName, 100),
      repliedAt: serverTimestamp(),
      status: 'answered',
      updatedAt: serverTimestamp(),
    });
    await publishNotification({
      recipientId: params.discussion.authorId,
      type: 'qa',
      title: `Lecturer replied in ${params.discussion.courseCode || 'Course'}`,
      message: clampString(params.replyText, 180),
      courseId: params.discussion.courseId,
      courseCode: params.discussion.courseCode,
      linkSection: 'materials',
      createdBy: params.lecturerId,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Admin Operations ---
export async function createDepartment(params: {
  code: string;
  name: string;
  faculty: string;
  description?: string;
  createdBy: string;
}): Promise<string> {
  const id = sanitizeId(`dept_${params.code.toLowerCase()}`);
  const path = `departments/${id}`;
  try {
    await setDoc(
      doc(db, 'departments', id),
      stripUndefined({
        id,
        code: clampString(params.code.toUpperCase(), 16),
        name: clampString(params.name, 120),
        faculty: clampString(params.faculty, 120),
        description: clampString(params.description, 500) || undefined,
        createdBy: params.createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteDepartment(id: string): Promise<void> {
  const path = `departments/${id}`;
  try {
    await deleteDoc(doc(db, 'departments', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createCourse(params: {
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
}): Promise<string> {
  const id = generateDocId('crs');
  const path = `courses/${id}`;
  try {
    await setDoc(
      doc(db, 'courses', id),
      stripUndefined({
        id,
        code: clampString(params.code.toUpperCase(), 24),
        title: clampString(params.title, 160),
        departmentId: params.departmentId,
        departmentName: clampString(params.departmentName, 120),
        level: params.level,
        semester: clampString(params.semester, 40) || 'First Semester',
        lecturerId: params.lecturerId,
        lecturerName: clampString(params.lecturerName, 100),
        description: clampString(params.description, 800) || undefined,
        creditUnits: params.creditUnits || 3,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteCourse(id: string): Promise<void> {
  const path = `courses/${id}`;
  try {
    await deleteDoc(doc(db, 'courses', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createStaffInvite(params: {
  code: string;
  departmentId?: string;
  createdBy: string;
}): Promise<void> {
  const cleanCode = sanitizeId(params.code.toUpperCase());
  const path = `staffInvites/${cleanCode}`;
  try {
    await setDoc(
      doc(db, 'staffInvites', cleanCode),
      stripUndefined({
        code: cleanCode,
        departmentId: params.departmentId || undefined,
        active: true,
        createdBy: params.createdBy,
        createdAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function toggleStaffInvite(code: string, active: boolean): Promise<void> {
  const path = `staffInvites/${code}`;
  try {
    await updateDoc(doc(db, 'staffInvites', code), { active });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function adminUpdateUserRoleAndStatus(params: {
  uid: string;
  role: UserRole;
  status: 'active' | 'suspended';
  adminUid: string;
}): Promise<void> {
  const path = `users/${params.uid}`;
  try {
    await updateDoc(doc(db, 'users', params.uid), {
      role: params.role,
      status: params.status,
      updatedAt: serverTimestamp(),
    });
    if (params.role === 'admin') {
      await setDoc(doc(db, 'admins', params.uid), {
        uid: params.uid,
        grantedBy: params.adminUid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function reviewStaffRequest(params: {
  req: StaffRequest;
  decision: 'approved' | 'rejected';
  adminUid: string;
}): Promise<void> {
  const path = `staffRequests/${params.req.uid}`;
  try {
    await updateDoc(doc(db, 'staffRequests', params.req.uid), {
      status: params.decision,
      reviewedBy: params.adminUid,
      updatedAt: serverTimestamp(),
    });
    if (params.decision === 'approved') {
      await updateDoc(doc(db, 'users', params.req.uid), {
        role: 'lecturer',
        level: 'Staff',
        title: params.req.staffTitle || 'Lecturer',
        updatedAt: serverTimestamp(),
      });
      await publishNotification({
        recipientId: params.req.uid,
        type: 'announcement',
        title: 'Lecturer Access Approved',
        message: 'Your staff account verification has been approved. Reload or switch to Lecturer Studio.',
        linkSection: 'overview',
        createdBy: params.adminUid,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Starter Curriculum Seeder (Admin-only on empty DB) ---
export async function seedAcademicStarterData(adminUser: UserPublic): Promise<boolean> {
  try {
    const existingDepts = await getDocs(query(collection(db, 'departments'), where('name', '!=', '')));
    if (!existingDepts.empty) return false;

    const batch = writeBatch(db);
    const now = serverTimestamp();

    // 1. Default Staff Invite Code
    batch.set(doc(db, 'staffInvites', 'SCA-FACULTY-2026'), {
      code: 'SCA-FACULTY-2026',
      departmentId: 'dept_csc',
      active: true,
      createdBy: adminUser.uid,
      createdAt: now,
    });

    // 2. Departments
    const depts: Array<Omit<Department, 'createdAt' | 'updatedAt'>> = [
      {
        id: 'dept_csc',
        code: 'CSC',
        name: 'Computer Science',
        faculty: 'Faculty of Computing & Information Technology',
        description: 'Algorithms, systems architecture, software engineering, and distributed computing.',
        createdBy: adminUser.uid,
      },
      {
        id: 'dept_eng',
        code: 'EEE',
        name: 'Electrical & Electronic Engineering',
        faculty: 'Faculty of Engineering',
        description: 'Circuit theory, digital signal processing, embedded systems, and power networks.',
        createdBy: adminUser.uid,
      },
      {
        id: 'dept_bus',
        code: 'BUS',
        name: 'Business & Management',
        faculty: 'Faculty of Management Sciences',
        description: 'Operations research, quantitative finance, and organizational strategy.',
        createdBy: adminUser.uid,
      },
    ];
    for (const d of depts) {
      batch.set(doc(db, 'departments', d.id), { ...d, createdAt: now, updatedAt: now });
    }

    // 3. Courses
    const courses: Array<Omit<Course, 'createdAt' | 'updatedAt'>> = [
      {
        id: 'crs_csc301',
        code: 'CSC 301',
        title: 'Data Structures & Algorithms',
        departmentId: 'dept_csc',
        departmentName: 'Computer Science',
        level: '300',
        semester: 'First Semester',
        lecturerId: adminUser.uid,
        lecturerName: 'Dr. Samuel Adeyemi',
        description: 'Balanced search trees, graph traversals, greedy optimization, and amortized complexity.',
        creditUnits: 3,
      },
      {
        id: 'crs_csc305',
        code: 'CSC 305',
        title: 'Operating Systems & Concurrency',
        departmentId: 'dept_csc',
        departmentName: 'Computer Science',
        level: '300',
        semester: 'First Semester',
        lecturerId: adminUser.uid,
        lecturerName: 'Prof. Claire Okonkwo',
        description: 'Process scheduling, semaphores, deadlocks, virtual memory paging, and file systems.',
        creditUnits: 3,
      },
      {
        id: 'crs_eee204',
        code: 'EEE 204',
        title: 'Circuit Analysis & Linear Signals',
        departmentId: 'dept_eng',
        departmentName: 'Electrical & Electronic Engineering',
        level: '200',
        semester: 'First Semester',
        lecturerId: adminUser.uid,
        lecturerName: 'Engr. Marcus Vance',
        description: 'Laplace transforms, Bode frequency plots, RLC resonance, and two-port network matrices.',
        creditUnits: 3,
      },
      {
        id: 'crs_bus302',
        code: 'BUS 302',
        title: 'Quantitative Operations Research',
        departmentId: 'dept_bus',
        departmentName: 'Business & Management',
        level: '300',
        semester: 'First Semester',
        lecturerId: adminUser.uid,
        lecturerName: 'Dr. Elena Rostova',
        description: 'Simplex linear programming, transportation networks, and queueing theory for decisions.',
        creditUnits: 2,
      },
    ];
    for (const c of courses) {
      batch.set(doc(db, 'courses', c.id), { ...c, createdAt: now, updatedAt: now });
    }

    // 4. Learning Materials (linked to lecture dates for "Catch Up on Missed Classes")
    batch.set(doc(db, 'materials', 'mat_csc301_avl'), {
      id: 'mat_csc301_avl',
      courseId: 'crs_csc301',
      courseCode: 'CSC 301',
      courseTitle: 'Data Structures & Algorithms',
      departmentId: 'dept_csc',
      departmentName: 'Computer Science',
      level: '300',
      lecturerId: adminUser.uid,
      lecturerName: 'Dr. Samuel Adeyemi',
      topic: 'Balanced Search Trees & AVL Rotations',
      title: 'Lecture 04 Notes: AVL Height Invariants & Rotations',
      description: 'Complete structured handout covering balance factors, LL/RR single rotations, LR/RL double rotations, and O(log n) proofs.',
      resourceType: 'pdf',
      fileUrl: '/samples/csc301_avl_notes.pdf',
      fileName: 'CSC301_Lecture04_AVL_Trees.pdf',
      fileSizeBytes: 18420,
      mimeType: 'application/pdf',
      lectureDate: '2026-11-12',
      notesContent:
        'KEY LEARNING OBJECTIVES\n1. Understand why standard Binary Search Trees degrade to O(n) on sorted insertions.\n2. Define the AVL Balance Factor: BF(node) = height(left) - height(right), strictly maintained in {-1, 0, +1}.\n\nROTATION CASES\n• Left-Left (LL): Perform a single Right Rotation at the unbalanced ancestor.\n• Right-Right (RR): Perform a single Left Rotation at the unbalanced ancestor.\n• Left-Right (LR): Left-rotate child, then Right-rotate ancestor.\n• Right-Left (RL): Right-rotate child, then Left-rotate ancestor.\n\nEXAM TAKEAWAY\nEvery insertion requires at most one single or double rotation to restore global tree height <= 1.44 log2(n).',
      moderationStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'materials', 'mat_csc301_slides'), {
      id: 'mat_csc301_slides',
      courseId: 'crs_csc301',
      courseCode: 'CSC 301',
      courseTitle: 'Data Structures & Algorithms',
      departmentId: 'dept_csc',
      departmentName: 'Computer Science',
      level: '300',
      lecturerId: adminUser.uid,
      lecturerName: 'Dr. Samuel Adeyemi',
      topic: 'Balanced Search Trees & AVL Rotations',
      title: 'Slide Deck 04: Visual Step-by-Step Tree Rebalancing',
      description: 'Annotated lecture slides presented during the November 12 class session with worked node insertion traces.',
      resourceType: 'slides',
      lectureDate: '2026-11-12',
      notesContent:
        'SLIDE 1: Worst-case skewed insertion trace (10 -> 20 -> 30 -> 40)\nSLIDE 2: Balance factor recalculation from inserted leaf back to root\nSLIDE 3: Worked Example — Insert [42, 18, 55, 11, 27, 23] and trace LR rotation at node 42\nSLIDE 4: Complexity Comparison — BST vs AVL vs Red-Black Trees.',
      moderationStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'materials', 'mat_csc305_sync'), {
      id: 'mat_csc305_sync',
      courseId: 'crs_csc305',
      courseCode: 'CSC 305',
      courseTitle: 'Operating Systems & Concurrency',
      departmentId: 'dept_csc',
      departmentName: 'Computer Science',
      level: '300',
      lecturerId: adminUser.uid,
      lecturerName: 'Prof. Claire Okonkwo',
      topic: 'Process Synchronization & Semaphores',
      title: 'Lecture 03 Study Guide: Mutual Exclusion & Semaphores',
      description: 'Detailed guide to race conditions, critical section requirements, counting semaphores, and producer-consumer bounded buffers.',
      resourceType: 'notes',
      lectureDate: '2026-11-14',
      notesContent:
        'CRITICAL SECTION REQUIREMENTS\n1. Mutual Exclusion: Only one thread executes inside the critical section at a time.\n2. Progress: Selection of the next thread cannot be postponed indefinitely.\n3. Bounded Waiting: Every requesting thread enters within a finite number of turns.\n\nSEMAPHORE OPERATIONS\n• wait(S): decrements S; blocks caller if S < 0.\n• signal(S): increments S; wakes one waiting process from queue.',
      moderationStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    });

    // 5. Recorded Lectures
    batch.set(doc(db, 'lectures', 'lec_csc301_avl'), {
      id: 'lec_csc301_avl',
      courseId: 'crs_csc301',
      courseCode: 'CSC 301',
      courseTitle: 'Data Structures & Algorithms',
      departmentId: 'dept_csc',
      departmentName: 'Computer Science',
      level: '300',
      lecturerId: adminUser.uid,
      lecturerName: 'Dr. Samuel Adeyemi',
      topic: 'Balanced Search Trees & AVL Rotations',
      title: 'Recorded Class: AVL Tree Rotations & Complexity Proof',
      description: 'Full lecture capture covering why height balance preserves logarithmic lookup time and live walkthroughs of double rotations.',
      videoUrl: '/samples/lecture_csc301_trees.mp4',
      durationMinutes: 42,
      lectureDate: '2026-11-12',
      relatedMaterialId: 'mat_csc301_avl',
      transcriptSummary:
        '00:00 — Recap of unbalanced BST worst-case chains.\n08:15 — Formal definition of AVL balance factor.\n17:40 — Walkthrough of Left-Right double rotation.\n31:10 — Fibonacci tree lower bound proof for O(log n) height.',
      moderationStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'lectures', 'lec_csc305_sync'), {
      id: 'lec_csc305_sync',
      courseId: 'crs_csc305',
      courseCode: 'CSC 305',
      courseTitle: 'Operating Systems & Concurrency',
      departmentId: 'dept_csc',
      departmentName: 'Computer Science',
      level: '300',
      lecturerId: adminUser.uid,
      lecturerName: 'Prof. Claire Okonkwo',
      topic: 'Process Synchronization & Semaphores',
      title: 'Recorded Class: Semaphores, Mutexes & Deadlock Avoidance',
      description: 'Classroom capture demonstrating race condition bugs in shared counters and how binary semaphores enforce mutual exclusion.',
      videoUrl: '/samples/lecture_csc305_concurrency.mp4',
      durationMinutes: 48,
      lectureDate: '2026-11-14',
      relatedMaterialId: 'mat_csc305_sync',
      transcriptSummary:
        '00:00 — Anatomy of a shared counter race condition.\n12:30 — Hardware test-and-set vs OS semaphores.\n26:00 — Bounded-buffer producer/consumer solution.\n39:45 — Coffman conditions for deadlock.',
      moderationStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    });

    // 6. Assignment
    batch.set(doc(db, 'assignments', 'asg_csc301_avl'), {
      id: 'asg_csc301_avl',
      courseId: 'crs_csc301',
      courseCode: 'CSC 301',
      courseTitle: 'Data Structures & Algorithms',
      departmentId: 'dept_csc',
      level: '300',
      lecturerId: adminUser.uid,
      lecturerName: 'Dr. Samuel Adeyemi',
      topic: 'Balanced Search Trees & AVL Rotations',
      title: 'Problem Set 02: AVL Insertion & Deletion Trace',
      instructions:
        '1. Insert the key sequence [50, 25, 75, 10, 30, 60, 80, 27, 28] into an initially empty AVL tree. Show the balance factor at each rotation.\n2. Explain in 3–4 sentences why deleting a node from an AVL tree may require O(log n) rotations, whereas insertion requires at most one single or double rotation.',
      dueDate: '2026-11-24',
      maxPoints: 100,
      status: 'published',
      createdAt: now,
      updatedAt: now,
    });

    // 7. Quiz + Questions
    batch.set(doc(db, 'quizzes', 'quiz_csc301_trees'), {
      id: 'quiz_csc301_trees',
      courseId: 'crs_csc301',
      courseCode: 'CSC 301',
      courseTitle: 'Data Structures & Algorithms',
      departmentId: 'dept_csc',
      level: '300',
      lecturerId: adminUser.uid,
      lecturerName: 'Dr. Samuel Adeyemi',
      topic: 'Balanced Search Trees & AVL Rotations',
      title: 'Check-In Quiz 02: Tree Balance & Rotations',
      description: 'Verify your understanding of AVL invariants and asymptotic lookup bounds before next week’s lab.',
      durationMinutes: 15,
      totalPoints: 30,
      dueDate: '2026-11-22',
      status: 'published',
      questionCount: 3,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'quizzes', 'quiz_csc301_trees', 'questions', 'q1'), {
      id: 'q1',
      quizId: 'quiz_csc301_trees',
      orderIndex: 0,
      type: 'objective',
      prompt: 'Which set of balance factors is valid for every node in an AVL tree?',
      options: ['{-2, -1, 0, 1, 2}', '{-1, 0, 1}', '{0, 1}', '{-1, 1}'],
      correctOptionIndex: 1,
      points: 10,
      createdAt: now,
    });
    batch.set(doc(db, 'quizzes', 'quiz_csc301_trees', 'questions', 'q2'), {
      id: 'q2',
      quizId: 'quiz_csc301_trees',
      orderIndex: 1,
      type: 'objective',
      prompt: 'When a node becomes unbalanced due to insertion into the right subtree of its left child, which rotation sequence restores balance?',
      options: ['Single Left Rotation', 'Single Right Rotation', 'Left-Right (LR) Double Rotation', 'Right-Left (RL) Double Rotation'],
      correctOptionIndex: 2,
      points: 10,
      createdAt: now,
    });
    batch.set(doc(db, 'quizzes', 'quiz_csc301_trees', 'questions', 'q3'), {
      id: 'q3',
      quizId: 'quiz_csc301_trees',
      orderIndex: 2,
      type: 'essay',
      prompt: 'Briefly explain how height balancing prevents worst-case O(n) search performance in sorted-key workloads.',
      correctOptionIndex: -1,
      points: 10,
      createdAt: now,
    });

    // 8. Announcements
    batch.set(doc(db, 'announcements', 'ann_csc301_recap'), {
      id: 'ann_csc301_recap',
      courseId: 'crs_csc301',
      courseCode: 'CSC 301',
      courseTitle: 'Data Structures & Algorithms',
      departmentId: 'dept_csc',
      level: '300',
      lecturerId: adminUser.uid,
      lecturerName: 'Dr. Samuel Adeyemi',
      category: 'lecture_summary',
      title: 'Lecture 04 Recap: Balanced Trees & Problem Set 02 Released',
      body: 'For students who could not attend Thursday’s physical lecture, all AVL notes, annotated slide summaries, and the full 42-minute lecture recording are now available under Missed Lectures (2026-11-12). Please review before submitting Problem Set 02.',
      lectureDate: '2026-11-12',
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'announcements', 'ann_csc305_schedule'), {
      id: 'ann_csc305_schedule',
      courseId: 'crs_csc305',
      courseCode: 'CSC 305',
      courseTitle: 'Operating Systems & Concurrency',
      departmentId: 'dept_csc',
      level: '300',
      lecturerId: adminUser.uid,
      lecturerName: 'Prof. Claire Okonkwo',
      category: 'schedule_change',
      title: 'Lab Session Rescheduled to Engineering Hall B',
      body: 'Wednesday’s concurrency lab will meet in Engineering Hall B at 10:00 AM. Review the Semaphore Study Guide prior to the session.',
      lectureDate: '2026-11-14',
      createdAt: now,
      updatedAt: now,
    });

    // 9. Sample Q&A Discussion
    batch.set(doc(db, 'discussions', 'qa_starter_1'), {
      id: 'qa_starter_1',
      courseId: 'crs_csc301',
      courseCode: 'CSC 301',
      materialId: 'mat_csc301_avl',
      materialTitle: 'Lecture 04 Notes: AVL Height Invariants & Rotations',
      authorId: adminUser.uid,
      authorName: 'Amara Nwosu (Student Rep)',
      question: 'In the LR double rotation example on slide 3, do we recalculate balance factors immediately after the first child rotation or after both rotations finish?',
      replyText: 'Great question! Always complete both steps of the double rotation first, then update the heights of the three involved nodes bottom-up.',
      repliedById: adminUser.uid,
      repliedByName: 'Dr. Samuel Adeyemi',
      repliedAt: now,
      status: 'answered',
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();
    return true;
  } catch (err) {
    console.warn('Starter seed skipped or failed:', err);
    return false;
  }
}
