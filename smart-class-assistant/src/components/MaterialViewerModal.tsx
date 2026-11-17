import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  HardDriveDownload,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import { Discussion, Material, UserPublic } from '../types/academic';
import { formatBytes } from '../utils/offlineStorage';

interface MaterialViewerModalProps {
  material: Material | null;
  offlineBlobUrl?: string;
  isOfflineCached: boolean;
  isBookmarked: boolean;
  isCompleted: boolean;
  discussions: Discussion[];
  currentUser: UserPublic;
  onClose: () => void;
  onToggleBookmark: (m: Material) => Promise<void>;
  onSaveOffline: (m: Material, onProgress: (pct: number) => void) => Promise<void>;
  onMarkComplete: (m: Material) => Promise<void>;
  onAskQuestion: (m: Material, question: string) => Promise<void>;
}

export const MaterialViewerModal: React.FC<MaterialViewerModalProps> = ({
  material,
  offlineBlobUrl,
  isOfflineCached,
  isBookmarked,
  isCompleted,
  discussions,
  onClose,
  onToggleBookmark,
  onSaveOffline,
  onMarkComplete,
  onAskQuestion,
}) => {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [submittingQ, setSubmittingQ] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    setStatusNote('');
    setDownloadProgress(null);
  }, [material?.id]);

  if (!material) return null;

  const activeFileUrl = offlineBlobUrl || material.fileUrl;
  const isPdf =
    material.resourceType === 'pdf' ||
    material.mimeType?.includes('pdf') ||
    material.fileName?.toLowerCase().endsWith('.pdf');
  const isImage =
    material.resourceType === 'image' ||
    material.mimeType?.startsWith('image/');

  const materialQuestions = discussions.filter(
    (d) => d.materialId === material.id || (!d.materialId && d.courseId === material.courseId)
  );

  const handleCacheOffline = async () => {
    try {
      setDownloadProgress(5);
      await onSaveOffline(material, (pct) => setDownloadProgress(pct));
      setStatusNote('Saved to your device for offline reading.');
      setTimeout(() => setDownloadProgress(null), 900);
    } catch (err) {
      setStatusNote(err instanceof Error ? err.message : 'Failed to save offline.');
      setDownloadProgress(null);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    setSubmittingQ(true);
    try {
      await onAskQuestion(material, questionText.trim());
      setQuestionText('');
      setStatusNote('Your question has been posted for the lecturer.');
    } finally {
      setSubmittingQ(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060E1E]/80 p-3 sm:p-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-[#0A1628] px-6 py-4 text-white">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-blue-300">
              <span className="font-semibold">{material.courseCode}</span>
              <span aria-hidden="true">·</span>
              <span>{material.topic}</span>
              <span aria-hidden="true">·</span>
              <span>Lecture {material.lectureDate}</span>
            </div>
            <h2 className="mt-1 truncate text-lg font-bold text-white">{material.title}</h2>
            <p className="mt-0.5 text-xs text-blue-100/75">
              Uploaded by {material.lecturerName} · {material.resourceType.toUpperCase()}
              {material.fileSizeBytes ? ` · ${formatBytes(material.fileSizeBytes)}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleBookmark(material)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                isBookmarked
                  ? 'border-blue-400 bg-blue-600 text-white'
                  : 'border-white/20 bg-white/10 text-blue-100 hover:bg-white/15'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              {isBookmarked ? 'Saved' : 'Save Later'}
            </button>

            <button
              type="button"
              onClick={handleCacheOffline}
              disabled={downloadProgress !== null}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                isOfflineCached
                  ? 'border-emerald-400/50 bg-emerald-600/20 text-emerald-200'
                  : 'border-white/20 bg-white/10 text-blue-100 hover:bg-white/15'
              }`}
            >
              <HardDriveDownload className="h-3.5 w-3.5" aria-hidden="true" />
              {downloadProgress !== null
                ? `Caching ${downloadProgress}%`
                : isOfflineCached
                  ? 'Available Offline'
                  : 'Cache Offline'}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close document viewer"
              className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {statusNote && (
          <div className="border-b border-blue-100 bg-blue-50 px-6 py-2 text-xs font-medium text-blue-900">
            {statusNote}
          </div>
        )}

        {/* Body */}
        <div className="grid flex-1 overflow-y-auto lg:grid-cols-12">
          <div className="border-b border-slate-200 p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
            {material.description && (
              <p className="text-sm leading-relaxed text-slate-600">{material.description}</p>
            )}

            {activeFileUrl && isPdf && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <iframe
                  title={material.title}
                  src={activeFileUrl}
                  className="h-[420px] w-full"
                />
              </div>
            )}

            {activeFileUrl && isImage && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                <img
                  src={activeFileUrl}
                  alt={material.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[420px] w-full rounded-lg object-contain"
                />
              </div>
            )}

            {activeFileUrl && !isPdf && !isImage && (
              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {material.fileName || material.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {material.resourceType.toUpperCase()} document ready for download
                    </p>
                  </div>
                </div>
                <a
                  href={activeFileUrl}
                  download={material.fileName || `${material.courseCode}_material`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download
                </a>
              </div>
            )}

            {material.notesContent && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-[#F8FAFC] p-5">
                <h3 className="text-xs font-semibold tracking-wider text-slate-500">
                  Structured Lecture Notes
                </h3>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {material.notesContent}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-3">
                {activeFileUrl && (
                  <a
                    href={
                      material.fileUrl?.startsWith('/api/files/')
                        ? `${material.fileUrl}?download=1`
                        : activeFileUrl
                    }
                    download={material.fileName || 'lecture-material'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download File
                  </a>
                )}
                {material.fileUrl && (
                  <a
                    href={material.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Open in New Tab
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => onMarkComplete(material)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {isCompleted ? 'Completed' : 'Mark as Read'}
              </button>
            </div>
          </div>

          {/* Course Q&A Column */}
          <div className="flex flex-col bg-slate-50/70 p-6 lg:col-span-5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-900">
                Course Questions &amp; Lecturer Replies
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Ask a question about this lecture material so your lecturer can clarify.
            </p>

            <form onSubmit={handleAsk} className="mt-4 space-y-2">
              <textarea
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Type your question about this topic..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submittingQ || !questionText.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A1628] px-4 py-2 text-xs font-semibold text-white hover:bg-[#14294A] disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                {submittingQ ? 'Posting...' : 'Post Question'}
              </button>
            </form>

            <div className="mt-5 space-y-3 overflow-y-auto">
              {materialQuestions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                  No questions asked for this resource yet.
                </p>
              ) : (
                materialQuestions.map((q) => (
                  <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{q.authorName}</span>
                      <span>{q.status === 'answered' ? 'Answered' : 'Awaiting reply'}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-800">{q.question}</p>
                    {q.replyText && (
                      <div className="mt-3 rounded-lg bg-blue-50/80 p-3 text-xs text-slate-800">
                        <p className="font-semibold text-blue-900">
                          {q.repliedByName || 'Lecturer'}
                        </p>
                        <p className="mt-1 leading-relaxed">{q.replyText}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
