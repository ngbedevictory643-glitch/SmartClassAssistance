import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, CheckCircle2, Clock, FileText, X } from 'lucide-react';
import { LearningProgress, Lecture, Material } from '../types/academic';

interface VideoPlayerModalProps {
  lecture: Lecture | null;
  progress?: LearningProgress;
  relatedMaterial?: Material;
  isBookmarked: boolean;
  onClose: () => void;
  onSavePlaybackProgress: (
    lecture: Lecture,
    positionSeconds: number,
    progressPercent: number,
    completed: boolean
  ) => Promise<void>;
  onToggleBookmark: (lecture: Lecture) => Promise<void>;
  onOpenMaterial?: (material: Material) => void;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  lecture,
  progress,
  relatedMaterial,
  isBookmarked,
  onClose,
  onSavePlaybackProgress,
  onToggleBookmark,
  onOpenMaterial,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [resumedNotice, setResumedNotice] = useState<string>('');
  const [currentSec, setCurrentSec] = useState(0);

  useEffect(() => {
    setResumedNotice('');
    setCurrentSec(progress?.lastPositionSeconds || 0);
  }, [lecture?.id, progress?.lastPositionSeconds]);

  if (!lecture) return null;

  const isExternalEmbed =
    lecture.videoUrl.includes('youtube.com') ||
    lecture.videoUrl.includes('youtu.be') ||
    lecture.videoUrl.includes('vimeo.com');

  const getEmbedUrl = (url: string): string => {
    if (url.includes('watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  const handleLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const savedPos = progress?.lastPositionSeconds || 0;
    if (savedPos > 1 && savedPos < (vid.duration || 99999) - 1) {
      vid.currentTime = savedPos;
      setResumedNotice(`Resumed from ${formatSeconds(savedPos)}`);
    }
  };

  const handlePersist = async (completedOverride?: boolean) => {
    const vid = videoRef.current;
    if (!vid) return;
    const pos = Math.floor(vid.currentTime || 0);
    const dur = vid.duration || (lecture.durationMinutes ? lecture.durationMinutes * 60 : 60);
    const pct = dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0;
    const done = completedOverride ?? pct >= 90;
    await onSavePlaybackProgress(lecture, pos, done ? 100 : Math.max(pct, 5), done);
  };

  const handleClose = async () => {
    if (!isExternalEmbed && videoRef.current) {
      await handlePersist();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060E1E]/85 p-3 sm:p-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0A1628] text-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-300">
              <span className="font-semibold">{lecture.courseCode}</span>
              <span aria-hidden="true">·</span>
              <span>{lecture.topic}</span>
              <span aria-hidden="true">·</span>
              <span>{lecture.lectureDate}</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-white">{lecture.title}</h2>
            <p className="mt-0.5 text-xs text-blue-100/75">
              {lecture.lecturerName}
              {lecture.durationMinutes ? ` · ${lecture.durationMinutes} mins` : ''}
              {resumedNotice ? ` · ${resumedNotice}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleBookmark(lecture)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                isBookmarked
                  ? 'border-blue-400 bg-blue-600 text-white'
                  : 'border-white/20 bg-white/10 text-blue-100 hover:bg-white/15'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              {isBookmarked ? 'Saved' : 'Bookmark'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close lecture video player"
              className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid flex-1 overflow-y-auto lg:grid-cols-12">
          <div className="p-6 lg:col-span-8">
            <div className="overflow-hidden rounded-xl border border-white/15 bg-black">
              {isExternalEmbed ? (
                <iframe
                  title={lecture.title}
                  src={getEmbedUrl(lecture.videoUrl)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={lecture.videoUrl}
                  controls
                  playsInline
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentSec(Math.floor(videoRef.current.currentTime));
                  }}
                  onPause={() => handlePersist()}
                  onEnded={() => handlePersist(true)}
                  className="aspect-video w-full bg-black"
                />
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-blue-200/80 tabular-nums">
                <Clock className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                <span>Current position: {formatSeconds(currentSec)}</span>
              </div>

              <div className="flex items-center gap-2">
                {relatedMaterial && onOpenMaterial && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenMaterial(relatedMaterial);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    Open Linked Notes
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    await onSavePlaybackProgress(lecture, currentSec, 100, true);
                    setResumedNotice('Marked lecture as completed.');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {progress?.completed ? 'Watched' : 'Mark Completed'}
                </button>
              </div>
            </div>

            {lecture.description && (
              <p className="mt-4 text-sm leading-relaxed text-blue-100/85">
                {lecture.description}
              </p>
            )}
          </div>

          <div className="border-t border-white/10 bg-[#081226] p-6 lg:col-span-4 lg:border-l lg:border-t-0">
            <h3 className="text-xs font-semibold tracking-wider text-blue-300">
              Lecture Outline &amp; Summary
            </h3>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-blue-100/85">
              {lecture.transcriptSummary || 'No written transcript summary was attached to this recording.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
