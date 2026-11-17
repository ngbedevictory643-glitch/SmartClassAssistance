import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, X } from 'lucide-react';
import { Quiz, QuizQuestion } from '../types/academic';

interface QuizRunnerModalProps {
  quiz: Quiz | null;
  questions: QuizQuestion[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (
    quiz: Quiz,
    questions: QuizQuestion[],
    answers: Record<string, string | number>,
    durationSpentSeconds: number
  ) => Promise<void>;
}

export const QuizRunnerModal: React.FC<QuizRunnerModalProps> = ({
  quiz,
  questions,
  loading,
  onClose,
  onSubmit,
}) => {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!quiz) return;
    setAnswers({});
    setSecondsLeft(quiz.durationMinutes * 60);
  }, [quiz?.id, quiz?.durationMinutes]);

  useEffect(() => {
    if (!quiz || loading || submitting) return;
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz, loading, submitting, secondsLeft]);

  if (!quiz) return null;

  const totalSec = quiz.durationMinutes * 60;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(quiz, questions, answers, Math.max(1, totalSec - secondsLeft));
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060E1E]/85 p-3 sm:p-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-[#0A1628] px-6 py-4 text-white">
          <div>
            <p className="text-xs font-medium text-blue-300">
              {quiz.courseCode} · {quiz.totalPoints} Points
            </p>
            <h2 className="mt-0.5 text-lg font-bold">{quiz.title}</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/40 bg-blue-600/20 px-3 py-1.5 text-xs font-mono font-semibold text-blue-100 tabular-nums">
              <Clock className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close quiz"
              className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading quiz questions...</div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No questions have been added to this quiz yet.
            </div>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id} className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-5">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-blue-700">
                    Question {idx + 1} of {questions.length} · {q.type === 'objective' ? 'Objective' : 'Essay'}
                  </span>
                  <span className="font-mono tabular-nums">{q.points} pts</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{q.prompt}</p>

                {q.type === 'objective' && q.options ? (
                  <div className="mt-4 space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const selected = Number(answers[q.id]) === optIdx;
                      return (
                        <label
                          key={optIdx}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                            selected
                              ? 'border-blue-600 bg-blue-50 text-blue-950 font-medium'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            checked={selected}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                            className="h-4 w-4 text-blue-600"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    value={String(answers[q.id] || '')}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Write your response clearly..."
                    className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                )}
              </div>
            ))
          )}

          {questions.length > 0 && (
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {submitting ? 'Submitting Quiz...' : 'Submit Quiz'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
