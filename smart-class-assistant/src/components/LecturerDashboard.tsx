import React, { useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HelpCircle,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import {
  ACADEMIC_LEVELS,
  AcademicLevel,
  Announcement,
  AnnouncementCategory,
  Assignment,
  AssignmentSubmission,
  Course,
  Department,
  Discussion,
  Lecture,
  Material,
  Quiz,
  QuizQuestion,
  QuizSubmission,
  ResourceType,
  UserPublic,
} from '../types/academic';
import { uploadFileWithProgress } from '../utils/offlineStorage';

export type LecturerSection =
  | 'overview'
  | 'upload-material'
  | 'upload-lecture'
  | 'assignments'
  | 'quizzes'
  | 'announcements'
  | 'manage';

interface LecturerDashboardProps {
  section: LecturerSection;
  onNavigate: (s: LecturerSection) => void;
  currentUser: UserPublic;
  departments: Department[];
  courses: Course[];
  materials: Material[];
  lectures: Lecture[];
  assignments: Assignment[];
  assignmentSubmissions: AssignmentSubmission[];
  quizzes: Quiz[];
  quizSubmissions: QuizSubmission[];
  announcements: Announcement[];
  discussions: Discussion[];
  onCreateCourse: (data: {
    code: string;
    title: string;
    departmentId: string;
    departmentName: string;
    level: AcademicLevel;
    description: string;
    creditUnits: number;
  }) => Promise<void>;
  onCreateMaterial: (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'moderationStatus'>) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  onCreateLecture: (data: Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'moderationStatus'>) => Promise<void>;
  onDeleteLecture: (id: string) => Promise<void>;
  onCreateAssignment: (data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onGradeAssignment: (sub: AssignmentSubmission, score: number, feedback: string) => Promise<void>;
  onCreateQuiz: (
    quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'questionCount'>,
    questions: Array<Omit<QuizQuestion, 'id' | 'quizId' | 'createdAt'>>
  ) => Promise<void>;
  onGradeQuiz: (sub: QuizSubmission, finalScore: number, feedback: string) => Promise<void>;
  onCreateAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onReplyDiscussion: (d: Discussion, replyText: string) => Promise<void>;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
  section,
  onNavigate,
  currentUser,
  departments,
  courses,
  materials,
  lectures,
  assignments,
  assignmentSubmissions,
  quizzes,
  quizSubmissions,
  announcements,
  discussions,
  onCreateCourse,
  onCreateMaterial,
  onDeleteMaterial,
  onCreateLecture,
  onDeleteLecture,
  onCreateAssignment,
  onGradeAssignment,
  onCreateQuiz,
  onGradeQuiz,
  onCreateAnnouncement,
  onDeleteAnnouncement,
  onReplyDiscussion,
}) => {
  const [feedbackBanner, setFeedbackBanner] = useState('');

  // Material upload form state
  const [matCourseId, setMatCourseId] = useState(courses[0]?.id || '');
  const [matTopic, setMatTopic] = useState('');
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState<ResourceType>('pdf');
  const [matDate, setMatDate] = useState(new Date().toISOString().slice(0, 10));
  const [matDesc, setMatDesc] = useState('');
  const [matNotes, setMatNotes] = useState('');
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matProgress, setMatProgress] = useState<number | null>(null);
  const [matBusy, setMatBusy] = useState(false);

  // Lecture upload form state
  const [lecCourseId, setLecCourseId] = useState(courses[0]?.id || '');
  const [lecTopic, setLecTopic] = useState('');
  const [lecTitle, setLecTitle] = useState('');
  const [lecDate, setLecDate] = useState(new Date().toISOString().slice(0, 10));
  const [lecDuration, setLecDuration] = useState(35);
  const [lecVideoUrl, setLecVideoUrl] = useState('');
  const [lecVideoFile, setLecVideoFile] = useState<File | null>(null);
  const [lecDesc, setLecDesc] = useState('');
  const [lecTranscript, setLecTranscript] = useState('');
  const [lecProgress, setLecProgress] = useState<number | null>(null);
  const [lecBusy, setLecBusy] = useState(false);

  // Assignment form & grading
  const [asgCourseId, setAsgCourseId] = useState(courses[0]?.id || '');
  const [asgTopic, setAsgTopic] = useState('');
  const [asgTitle, setAsgTitle] = useState('');
  const [asgInstructions, setAsgInstructions] = useState('');
  const [asgDueDate, setAsgDueDate] = useState('2026-11-30');
  const [asgMaxPoints, setAsgMaxPoints] = useState(100);
  const [gradingMap, setGradingMap] = useState<Record<string, { score: string; feedback: string }>>({});

  // Quiz builder
  const [qCourseId, setQCourseId] = useState(courses[0]?.id || '');
  const [qTitle, setQTitle] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qDuration, setQDuration] = useState(20);
  const [qDueDate, setQDueDate] = useState('2026-11-30');
  const [draftQuestions, setDraftQuestions] = useState<
    Array<{
      type: 'objective' | 'essay';
      prompt: string;
      options: string[];
      correctOptionIndex: number;
      points: number;
    }>
  >([
    {
      type: 'objective',
      prompt: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      points: 10,
    },
  ]);
  const [quizGradingMap, setQuizGradingMap] = useState<Record<string, { score: string; feedback: string }>>({});

  // Announcement form
  const [annCourseId, setAnnCourseId] = useState(courses[0]?.id || '');
  const [annCategory, setAnnCategory] = useState<AnnouncementCategory>('lecture_summary');
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annDate, setAnnDate] = useState(new Date().toISOString().slice(0, 10));

  // New Course form
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDeptId, setNewCourseDeptId] = useState(departments[0]?.id || 'dept_csc');
  const [newCourseLevel, setNewCourseLevel] = useState<AcademicLevel>('300');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseUnits, setNewCourseUnits] = useState(3);

  // Q&A replies
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const selectedMatCourse = useMemo(
    () => courses.find((c) => c.id === matCourseId) || courses[0],
    [courses, matCourseId]
  );
  const selectedLecCourse = useMemo(
    () => courses.find((c) => c.id === lecCourseId) || courses[0],
    [courses, lecCourseId]
  );
  const selectedAsgCourse = useMemo(
    () => courses.find((c) => c.id === asgCourseId) || courses[0],
    [courses, asgCourseId]
  );
  const selectedQCourse = useMemo(
    () => courses.find((c) => c.id === qCourseId) || courses[0],
    [courses, qCourseId]
  );
  const selectedAnnCourse = useMemo(
    () => courses.find((c) => c.id === annCourseId) || courses[0],
    [courses, annCourseId]
  );

  const pendingAsgSubs = assignmentSubmissions.filter((s) => s.status === 'submitted');
  const openQuestions = discussions.filter((d) => d.status === 'open');

  const notifySaved = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(''), 4500);
  };

  if (section === 'overview') {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-[#0A1628] via-[#0F2347] to-[#163366] p-6 text-white sm:p-8">
          <p className="text-xs font-semibold tracking-wider text-blue-300">
            Lecturer &amp; Staff Studio · {currentUser.title || 'Faculty'}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">
            Manage Teaching &amp; Academic Continuity
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100/80">
            Publish lecture notes, recorded classes, assignments, quizzes, and announcements so students never miss essential coursework.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('upload-material')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload Learning Material
            </button>
            <button
              type="button"
              onClick={() => onNavigate('upload-lecture')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
            >
              <Video className="h-4 w-4" aria-hidden="true" />
              Upload Recorded Lecture
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Published Materials</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{materials.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Recorded Lectures</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{lectures.length}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('assignments')}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-blue-300 cursor-pointer"
          >
            <p className="text-xs text-slate-500">Submissions Pending Grade</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{pendingAsgSubs.length}</p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('manage')}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-blue-300 cursor-pointer"
          >
            <p className="text-xs text-slate-500">Unanswered Student Q&amp;A</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{openQuestions.length}</p>
          </button>
        </div>
      </div>
    );
  }

  if (section === 'upload-material') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload Learning Material</h1>
          <p className="mt-1 text-sm text-slate-600">
            Attach PDFs, PowerPoint decks, Word handouts, images, or structured lecture notes for missed-class catch-up.
          </p>
        </div>

        {feedbackBanner && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {feedbackBanner}
          </div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selectedMatCourse) return;
            setMatBusy(true);
            try {
              let uploadedMeta:
                | { fileUrl: string; fileName: string; fileSizeBytes: number; mimeType: string }
                | undefined;
              if (matFile) {
                setMatProgress(5);
                uploadedMeta = await uploadFileWithProgress(matFile, (p) => setMatProgress(p));
              }
              await onCreateMaterial({
                courseId: selectedMatCourse.id,
                courseCode: selectedMatCourse.code,
                courseTitle: selectedMatCourse.title,
                departmentId: selectedMatCourse.departmentId,
                departmentName: selectedMatCourse.departmentName,
                level: selectedMatCourse.level,
                lecturerId: currentUser.uid,
                lecturerName: currentUser.displayName,
                topic: matTopic.trim(),
                title: matTitle.trim(),
                description: matDesc.trim() || undefined,
                resourceType: matType,
                fileUrl: uploadedMeta?.fileUrl,
                fileName: uploadedMeta?.fileName,
                fileSizeBytes: uploadedMeta?.fileSizeBytes,
                mimeType: uploadedMeta?.mimeType,
                lectureDate: matDate,
                notesContent: matNotes.trim() || undefined,
              });
              setMatTopic('');
              setMatTitle('');
              setMatDesc('');
              setMatNotes('');
              setMatFile(null);
              setMatProgress(null);
              notifySaved('Learning material published and students notified.');
            } finally {
              setMatBusy(false);
            }
          }}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Course</label>
              <select
                required
                value={selectedMatCourse?.id || ''}
                onChange={(e) => setMatCourseId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Resource Format</label>
              <select
                value={matType}
                onChange={(e) => setMatType(e.target.value as ResourceType)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="pdf">PDF Document</option>
                <option value="notes">Lecture Notes</option>
                <option value="slides">PowerPoint Presentation</option>
                <option value="docx">Word Document</option>
                <option value="image">Diagram / Image</option>
                <option value="reading">Additional Reading</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Lecture Topic</label>
              <input
                type="text"
                required
                value={matTopic}
                onChange={(e) => setMatTopic(e.target.value)}
                placeholder="e.g., Dynamic Programming & Memoization"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Lecture Date</label>
              <input
                type="date"
                required
                value={matDate}
                onChange={(e) => setMatDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Material Title</label>
            <input
              type="text"
              required
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              placeholder="e.g., Lecture 05 Handout & Annotated Examples"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Short Description</label>
            <textarea
              rows={2}
              value={matDesc}
              onChange={(e) => setMatDesc(e.target.value)}
              placeholder="Briefly summarize what this material covers..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Upload Document File (PDF, PPTX, DOCX, Image — Optional if providing inline notes)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setMatFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
            {matProgress !== null && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-600 tabular-nums">
                  <span>Uploading file...</span>
                  <span>{matProgress}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-blue-600 transition-all" style={{ width: `${matProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Inline Structured Lecture Notes (Readable directly on web &amp; offline)
            </label>
            <textarea
              rows={5}
              value={matNotes}
              onChange={(e) => setMatNotes(e.target.value)}
              placeholder="Paste key definitions, equations, and lecture takeaways..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={matBusy || !selectedMatCourse}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {matBusy ? 'Publishing...' : 'Publish Learning Material'}
          </button>
        </form>
      </div>
    );
  }

  if (section === 'upload-lecture') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload Recorded Lecture</h1>
          <p className="mt-1 text-sm text-slate-600">
            Upload an MP4/WebM lecture video or link a supported video URL for students to watch and resume anytime.
          </p>
        </div>

        {feedbackBanner && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {feedbackBanner}
          </div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selectedLecCourse) return;
            setLecBusy(true);
            try {
              let finalVideoUrl = lecVideoUrl.trim();
              if (lecVideoFile) {
                setLecProgress(5);
                const uploaded = await uploadFileWithProgress(lecVideoFile, (p) => setLecProgress(p));
                finalVideoUrl = uploaded.fileUrl;
              }
              if (!finalVideoUrl) {
                notifySaved('Please upload a video file or provide a video URL.');
                setLecBusy(false);
                return;
              }
              await onCreateLecture({
                courseId: selectedLecCourse.id,
                courseCode: selectedLecCourse.code,
                courseTitle: selectedLecCourse.title,
                departmentId: selectedLecCourse.departmentId,
                departmentName: selectedLecCourse.departmentName,
                level: selectedLecCourse.level,
                lecturerId: currentUser.uid,
                lecturerName: currentUser.displayName,
                topic: lecTopic.trim(),
                title: lecTitle.trim(),
                description: lecDesc.trim() || undefined,
                videoUrl: finalVideoUrl,
                durationMinutes: Number(lecDuration) || 30,
                lectureDate: lecDate,
                transcriptSummary: lecTranscript.trim() || undefined,
              });
              setLecTopic('');
              setLecTitle('');
              setLecVideoUrl('');
              setLecVideoFile(null);
              setLecDesc('');
              setLecTranscript('');
              setLecProgress(null);
              notifySaved('Recorded lecture published and students notified.');
            } finally {
              setLecBusy(false);
            }
          }}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Course</label>
              <select
                required
                value={selectedLecCourse?.id || ''}
                onChange={(e) => setLecCourseId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Lecture Date</label>
              <input
                type="date"
                required
                value={lecDate}
                onChange={(e) => setLecDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Topic</label>
              <input
                type="text"
                required
                value={lecTopic}
                onChange={(e) => setLecTopic(e.target.value)}
                placeholder="e.g., Memory Paging & TLB"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Duration (Minutes)</label>
              <input
                type="number"
                min={1}
                max={300}
                value={lecDuration}
                onChange={(e) => setLecDuration(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Lecture Video Title</label>
            <input
              type="text"
              required
              value={lecTitle}
              onChange={(e) => setLecTitle(e.target.value)}
              placeholder="e.g., Recorded Session 06: Virtual Memory Allocation"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Upload Video File (MP4 / WebM)</label>
              <input
                type="file"
                accept=".mp4,.webm,.mov"
                onChange={(e) => setLecVideoFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 py-2 file:text-xs file:font-semibold file:text-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Or Supported Video URL</label>
              <input
                type="url"
                value={lecVideoUrl}
                onChange={(e) => setLecVideoUrl(e.target.value)}
                placeholder="https://... or YouTube / Vimeo link"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {lecProgress !== null && (
            <div>
              <div className="flex justify-between text-xs text-slate-600 tabular-nums">
                <span>Uploading video...</span>
                <span>{lecProgress}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${lecProgress}%` }} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">Description</label>
            <textarea
              rows={2}
              value={lecDesc}
              onChange={(e) => setLecDesc(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Lecture Outline / Key Timestamps</label>
            <textarea
              rows={4}
              value={lecTranscript}
              onChange={(e) => setLecTranscript(e.target.value)}
              placeholder="00:00 — Introduction&#10;12:30 — Core Walkthrough..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={lecBusy || !selectedLecCourse}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
          >
            <Video className="h-4 w-4" aria-hidden="true" />
            {lecBusy ? 'Publishing Video...' : 'Publish Recorded Lecture'}
          </button>
        </form>
      </div>
    );
  }

  if (section === 'assignments') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assignments &amp; Student Grading</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create coursework deadlines and grade student submissions with written feedback.
          </p>
        </div>

        {feedbackBanner && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {feedbackBanner}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Create Assignment */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedAsgCourse) return;
              await onCreateAssignment({
                courseId: selectedAsgCourse.id,
                courseCode: selectedAsgCourse.code,
                courseTitle: selectedAsgCourse.title,
                departmentId: selectedAsgCourse.departmentId,
                level: selectedAsgCourse.level,
                lecturerId: currentUser.uid,
                lecturerName: currentUser.displayName,
                topic: asgTopic.trim() || undefined,
                title: asgTitle.trim(),
                instructions: asgInstructions.trim(),
                dueDate: asgDueDate,
                maxPoints: Number(asgMaxPoints) || 100,
                status: 'published',
              });
              setAsgTitle('');
              setAsgTopic('');
              setAsgInstructions('');
              notifySaved('Assignment published to students.');
            }}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5"
          >
            <h2 className="text-base font-semibold text-slate-900">Publish New Assignment</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Course</label>
              <select
                value={selectedAsgCourse?.id || ''}
                onChange={(e) => setAsgCourseId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Title</label>
              <input
                type="text"
                required
                value={asgTitle}
                onChange={(e) => setAsgTitle(e.target.value)}
                placeholder="e.g., Problem Set 03: Graph Algorithms"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Due Date</label>
                <input
                  type="date"
                  required
                  value={asgDueDate}
                  onChange={(e) => setAsgDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Max Score</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={asgMaxPoints}
                  onChange={(e) => setAsgMaxPoints(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Topic Link (Optional)</label>
              <input
                type="text"
                value={asgTopic}
                onChange={(e) => setAsgTopic(e.target.value)}
                placeholder="Matching lecture topic for catch-up"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Instructions</label>
              <textarea
                rows={4}
                required
                minLength={5}
                value={asgInstructions}
                onChange={(e) => setAsgInstructions(e.target.value)}
                placeholder="Provide clear deliverables and grading criteria..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              Publish Assignment
            </button>
          </form>

          {/* Submissions Review */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
            <h2 className="text-base font-semibold text-slate-900">
              Student Submissions ({assignmentSubmissions.length})
            </h2>
            {assignmentSubmissions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                No student submissions received yet.
              </p>
            ) : (
              <div className="space-y-4">
                {assignmentSubmissions.map((sub) => {
                  const asg = assignments.find((a) => a.id === sub.assignmentId);
                  const draft = gradingMap[sub.id] || {
                    score: sub.score !== undefined ? String(sub.score) : '',
                    feedback: sub.feedback || '',
                  };
                  return (
                    <div key={sub.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-900">
                          {sub.studentName} · {sub.courseCode}
                        </span>
                        <span className={sub.status === 'graded' ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                          {sub.status === 'graded' ? `Graded: ${sub.score}/${sub.maxPoints}` : 'Needs Grading'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-blue-700">{asg?.title}</p>
                      {sub.submissionText && (
                        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-700">
                          {sub.submissionText}
                        </p>
                      )}
                      {sub.attachmentUrl && (
                        <a
                          href={sub.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Attachment: {sub.attachmentName || 'Download File'}
                        </a>
                      )}

                      <div className="mt-3 grid gap-2 sm:grid-cols-4">
                        <input
                          type="number"
                          min={0}
                          max={sub.maxPoints}
                          placeholder={`Score / ${sub.maxPoints}`}
                          value={draft.score}
                          onChange={(e) =>
                            setGradingMap((prev) => ({
                              ...prev,
                              [sub.id]: { ...draft, score: e.target.value },
                            }))
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs tabular-nums"
                        />
                        <input
                          type="text"
                          placeholder="Feedback for student..."
                          value={draft.feedback}
                          onChange={(e) =>
                            setGradingMap((prev) => ({
                              ...prev,
                              [sub.id]: { ...draft, feedback: e.target.value },
                            }))
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:col-span-2"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const numScore = Number(draft.score || 0);
                            await onGradeAssignment(sub, numScore, draft.feedback || 'Reviewed.');
                            notifySaved(`Released grade for ${sub.studentName}.`);
                          }}
                          className="rounded-lg bg-[#0A1628] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#14294A] cursor-pointer"
                        >
                          Release Grade
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (section === 'quizzes') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quizzes &amp; Objective/Essay Builder</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create timed assessments mixing auto-graded objective questions and essay prompts.
          </p>
        </div>

        {feedbackBanner && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {feedbackBanner}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedQCourse) return;
              const validQs = draftQuestions.filter((q) => q.prompt.trim().length > 1);
              if (validQs.length === 0) return;
              const totalPoints = validQs.reduce((sum, q) => sum + Number(q.points || 1), 0);
              await onCreateQuiz(
                {
                  courseId: selectedQCourse.id,
                  courseCode: selectedQCourse.code,
                  courseTitle: selectedQCourse.title,
                  departmentId: selectedQCourse.departmentId,
                  level: selectedQCourse.level,
                  lecturerId: currentUser.uid,
                  lecturerName: currentUser.displayName,
                  topic: qTopic.trim() || undefined,
                  title: qTitle.trim(),
                  description: qDesc.trim() || undefined,
                  durationMinutes: Number(qDuration) || 20,
                  totalPoints,
                  dueDate: qDueDate,
                  status: 'published',
                },
                validQs.map((q, i) => ({
                  orderIndex: i,
                  type: q.type,
                  prompt: q.prompt.trim(),
                  options: q.type === 'objective' ? q.options.map((o) => o.trim() || 'Option') : undefined,
                  correctOptionIndex: q.type === 'objective' ? q.correctOptionIndex : -1,
                  points: Number(q.points) || 10,
                }))
              );
              setQTitle('');
              setQTopic('');
              setQDesc('');
              setDraftQuestions([
                { type: 'objective', prompt: '', options: ['', '', '', ''], correctOptionIndex: 0, points: 10 },
              ]);
              notifySaved('Quiz published with questions.');
            }}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6"
          >
            <h2 className="text-base font-semibold text-slate-900">Create New Quiz</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Course</label>
                <select
                  value={selectedQCourse?.id || ''}
                  onChange={(e) => setQCourseId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Duration (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={qDuration}
                  onChange={(e) => setQDuration(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Quiz Title</label>
              <input
                type="text"
                required
                value={qTitle}
                onChange={(e) => setQTitle(e.target.value)}
                placeholder="e.g., Week 05 Check-In Assessment"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Topic</label>
                <input
                  type="text"
                  value={qTopic}
                  onChange={(e) => setQTopic(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Due Date</label>
                <input
                  type="date"
                  value={qDueDate}
                  onChange={(e) => setQDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wider text-slate-600">
                  Questions ({draftQuestions.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setDraftQuestions((prev) => [
                      ...prev,
                      { type: 'objective', prompt: '', options: ['', '', '', ''], correctOptionIndex: 0, points: 10 },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Question
                </button>
              </div>

              {draftQuestions.map((dq, idx) => (
                <div key={idx} className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">Question {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={dq.type}
                        onChange={(e) => {
                          const next = [...draftQuestions];
                          next[idx].type = e.target.value as 'objective' | 'essay';
                          setDraftQuestions(next);
                        }}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="objective">Objective</option>
                        <option value="essay">Essay</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={dq.points}
                        onChange={(e) => {
                          const next = [...draftQuestions];
                          next[idx].points = Number(e.target.value);
                          setDraftQuestions(next);
                        }}
                        className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-xs tabular-nums"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    value={dq.prompt}
                    onChange={(e) => {
                      const next = [...draftQuestions];
                      next[idx].prompt = e.target.value;
                      setDraftQuestions(next);
                    }}
                    placeholder="Enter question prompt..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />

                  {dq.type === 'objective' && (
                    <div className="grid grid-cols-2 gap-2">
                      {dq.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`correct_${idx}`}
                            checked={dq.correctOptionIndex === oIdx}
                            onChange={() => {
                              const next = [...draftQuestions];
                              next[idx].correctOptionIndex = oIdx;
                              setDraftQuestions(next);
                            }}
                            title="Mark as correct option"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...draftQuestions];
                              next[idx].options[oIdx] = e.target.value;
                              setDraftQuestions(next);
                            }}
                            placeholder={`Option ${oIdx + 1}`}
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              Publish Quiz
            </button>
          </form>

          {/* Quiz Attempts */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
            <h2 className="text-base font-semibold text-slate-900">
              Quiz Attempts &amp; Essay Grading ({quizSubmissions.length})
            </h2>
            {quizSubmissions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                No student quiz attempts recorded yet.
              </p>
            ) : (
              <div className="space-y-4">
                {quizSubmissions.map((qs) => {
                  const quiz = quizzes.find((q) => q.id === qs.quizId);
                  const draft = quizGradingMap[qs.id] || {
                    score: String(qs.finalScore ?? qs.autoScore),
                    feedback: qs.feedback || '',
                  };
                  return (
                    <div key={qs.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">
                          {qs.studentName} · {qs.courseCode}
                        </span>
                        <span className="font-mono font-semibold text-blue-700 tabular-nums">
                          Auto: {qs.autoScore} / {qs.maxPoints}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{quiz?.title}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-4">
                        <input
                          type="number"
                          min={0}
                          max={qs.maxPoints}
                          value={draft.score}
                          onChange={(e) =>
                            setQuizGradingMap((prev) => ({
                              ...prev,
                              [qs.id]: { ...draft, score: e.target.value },
                            }))
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs tabular-nums"
                        />
                        <input
                          type="text"
                          placeholder="Remarks / essay feedback..."
                          value={draft.feedback}
                          onChange={(e) =>
                            setQuizGradingMap((prev) => ({
                              ...prev,
                              [qs.id]: { ...draft, feedback: e.target.value },
                            }))
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:col-span-2"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            await onGradeQuiz(qs, Number(draft.score || 0), draft.feedback || 'Graded.');
                            notifySaved(`Final score released for ${qs.studentName}.`);
                          }}
                          className="rounded-lg bg-[#0A1628] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#14294A] cursor-pointer"
                        >
                          Save Grade
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (section === 'announcements') {
    return (
      <div className="grid gap-8 lg:grid-cols-12">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selectedAnnCourse) return;
            await onCreateAnnouncement({
              courseId: selectedAnnCourse.id,
              courseCode: selectedAnnCourse.code,
              courseTitle: selectedAnnCourse.title,
              departmentId: selectedAnnCourse.departmentId,
              level: selectedAnnCourse.level,
              lecturerId: currentUser.uid,
              lecturerName: currentUser.displayName,
              category: annCategory,
              title: annTitle.trim(),
              body: annBody.trim(),
              lectureDate: annDate,
            });
            setAnnTitle('');
            setAnnBody('');
            notifySaved('Announcement published and pushed to student notifications.');
          }}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5"
        >
          <h1 className="text-lg font-bold text-slate-900">Publish Class Announcement</h1>
          {feedbackBanner && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              {feedbackBanner}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700">Course</label>
            <select
              value={selectedAnnCourse?.id || ''}
              onChange={(e) => setAnnCourseId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Category</label>
              <select
                value={annCategory}
                onChange={(e) => setAnnCategory(e.target.value as AnnouncementCategory)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="lecture_summary">Topics Covered</option>
                <option value="upcoming_lecture">Upcoming Lecture</option>
                <option value="schedule_change">Schedule Change</option>
                <option value="assignment_notice">Assignment Notice</option>
                <option value="academic_notice">Academic Notice</option>
                <option value="reading">Additional Reading</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Related Lecture Date</label>
              <input
                type="date"
                value={annDate}
                onChange={(e) => setAnnDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Headline</label>
            <input
              type="text"
              required
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Announcement Body</label>
            <textarea
              rows={4}
              required
              minLength={5}
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            Publish Announcement
          </button>
        </form>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h2 className="text-base font-semibold text-slate-900">Published Notices ({announcements.length})</h2>
          {announcements.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-semibold text-blue-700">
                  {a.courseCode} · {a.category.replace('_', ' ')}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">{a.title}</p>
                <p className="mt-1 text-xs text-slate-600">{a.body}</p>
              </div>
              <button
                type="button"
                onClick={() => onDeleteAnnouncement(a.id)}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                title="Delete announcement"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Manage Courses, Uploaded Resources & Student Q&A
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Courses, Uploaded Resources &amp; Q&amp;A</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create new courses, manage uploaded materials and lecture recordings, and reply to student questions.
        </p>
      </div>

      {feedbackBanner && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {feedbackBanner}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Create Course */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const dept = departments.find((d) => d.id === newCourseDeptId);
            await onCreateCourse({
              code: newCourseCode,
              title: newCourseTitle,
              departmentId: newCourseDeptId,
              departmentName: dept?.name || 'Department',
              level: newCourseLevel,
              description: newCourseDesc,
              creditUnits: newCourseUnits,
            });
            setNewCourseCode('');
            setNewCourseTitle('');
            setNewCourseDesc('');
            notifySaved('Course created.');
          }}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5"
        >
          <h2 className="text-base font-semibold text-slate-900">Create New Course</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Course Code</label>
              <input
                type="text"
                required
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                placeholder="e.g., CSC 402"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Level</label>
              <select
                value={newCourseLevel}
                onChange={(e) => setNewCourseLevel(e.target.value as AcademicLevel)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {ACADEMIC_LEVELS.map((l) => (
                  <option key={l} value={l}>{l} Level</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Course Title</label>
            <input
              type="text"
              required
              value={newCourseTitle}
              onChange={(e) => setNewCourseTitle(e.target.value)}
              placeholder="e.g., Compiler Construction"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Department</label>
              <select
                value={newCourseDeptId}
                onChange={(e) => setNewCourseDeptId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Credit Units</label>
              <input
                type="number"
                min={1}
                max={12}
                value={newCourseUnits}
                onChange={(e) => setNewCourseUnits(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Synopsis</label>
            <textarea
              rows={2}
              value={newCourseDesc}
              onChange={(e) => setNewCourseDesc(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[#0A1628] py-2.5 text-xs font-semibold text-white hover:bg-[#14294A] cursor-pointer"
          >
            Add Course
          </button>
        </form>

        {/* Student Questions Q&A */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h2 className="text-base font-semibold text-slate-900">
            Student Material Questions ({discussions.length})
          </h2>
          {discussions.length === 0 ? (
            <p className="text-sm text-slate-500">No student questions submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {discussions.map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-blue-700">
                      {d.courseCode} · {d.authorName}
                    </span>
                    <span className={d.status === 'answered' ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                      {d.status === 'answered' ? 'Answered' : 'Open'}
                    </span>
                  </div>
                  {d.materialTitle && (
                    <p className="mt-0.5 text-xs text-slate-500">On: {d.materialTitle}</p>
                  )}
                  <p className="mt-2 text-sm font-medium text-slate-900">{d.question}</p>
                  {d.replyText && (
                    <div className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-950">
                      <strong>Your Reply:</strong> {d.replyText}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={replyDrafts[d.id] || ''}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      placeholder={d.replyText ? 'Update reply...' : 'Write your explanation...'}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const txt = (replyDrafts[d.id] || '').trim();
                        if (!txt) return;
                        await onReplyDiscussion(d, txt);
                        setReplyDrafts((prev) => ({ ...prev, [d.id]: '' }));
                        notifySaved('Reply posted to student.');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                    >
                      <Send className="h-3 w-3" aria-hidden="true" />
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manage Uploaded Materials & Lectures */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Uploaded Materials ({materials.length})</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {materials.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-blue-700">{m.courseCode} · {m.lectureDate}</p>
                  <p className="truncate text-sm font-semibold text-slate-900">{m.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteMaterial(m.id)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  title="Delete material"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Recorded Lectures ({lectures.length})</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {lectures.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-blue-700">{l.courseCode} · {l.lectureDate}</p>
                  <p className="truncate text-sm font-semibold text-slate-900">{l.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteLecture(l.id)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  title="Delete recorded lecture"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
