import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  Menu,
  PlayCircle,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import { PWAInstallButton } from './PWAControls';

interface LandingPageProps {
  onGetStarted: (preferredRole?: 'student' | 'lecturer') => void;
}

const FAQS = [
  {
    q: 'How is Smart Class Assistant different from a traditional school portal?',
    a: 'Traditional portals focus on tuition billing, transcripts, and administrative records. Smart Class Assistant is built exclusively for digital learning continuity—organizing missed lecture notes, recorded classes, slides, assignments, and announcements by course and lecture date.',
  },
  {
    q: 'How does "Catch Up on Missed Classes" work when I miss a physical lecture?',
    a: 'Select your department, academic level, course, and the specific lecture date or topic you missed. The platform automatically groups the lecturer’s notes, presentation slides, recorded video, related assignments, and class announcements into one structured study pack.',
  },
  {
    q: 'Can I read downloaded materials when I am offline?',
    a: 'Yes. Smart Class Assistant is an installable Progressive Web App (PWA). Any document or lecture note you save for offline study is cached locally on your device so you can open it without internet access. Submitting assignments, taking quizzes, and streaming new videos require an active connection.',
  },
  {
    q: 'How do lecturers and staff get verified access?',
    a: 'Lecturers sign in with their institutional Google account or email and verify using an administrator-issued faculty invite code (or submit a verification request in-app for administrator approval). Students cannot access lecturer upload or grading controls.',
  },
  {
    q: 'Does the video player remember where I stopped watching?',
    a: 'Yes. Whenever you pause or close a recorded lecture, your exact playback timestamp is saved to your profile so you can resume seamlessly from the same second across sessions.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#081226] text-white">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#081226]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <GraduationCap className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span>Smart Class Assistant</span>
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-blue-100/80"
          >
            <a href="#how-it-works" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#features" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#lecturers" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              For Lecturers
            </a>
            <a href="#faq" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onGetStarted()}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="inline-flex md:hidden items-center justify-center rounded-lg border border-white/15 p-2 text-blue-100 hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#0A1628] px-6 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-medium text-blue-100">
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-1.5 hover:text-white">
                How It Works
              </a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-1.5 hover:text-white">
                Features
              </a>
              <a href="#lecturers" onClick={() => setMobileMenuOpen(false)} className="py-1.5 hover:text-white">
                For Lecturers
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-1.5 hover:text-white">
                FAQ
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGetStarted();
                }}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="top" className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#081226] via-[#0B1B38] to-[#0A1628] py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-stretch gap-12 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="text-xs font-semibold tracking-wider text-blue-300">
                Digital Learning Continuity System
              </p>
              <h1
                className="mt-4 font-bold tracking-tight text-white text-balance"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)', lineHeight: 1.08 }}
              >
                Never Miss Out on Learning Again.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-blue-100/85 sm:text-lg">
                Whether illness, timetable conflicts, or transit delays keep you out of the lecture hall, Smart Class Assistant keeps every note, slide deck, recorded lesson, assignment, and announcement organized by course and lecture date.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onGetStarted('student')}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onGetStarted('lecturer')}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-blue-100 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Lecturer &amp; Staff Portal
                </button>
                <PWAInstallButton variant="dark" />
              </div>

              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">100%</p>
                  <p className="mt-1 text-xs text-blue-200/75">Course-aligned lecture packs</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">Offline</p>
                  <p className="mt-1 text-xs text-blue-200/75">Cached study handouts &amp; notes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">Resume</p>
                  <p className="mt-1 text-xs text-blue-200/75">Exact video playback memory</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[320px] overflow-hidden rounded-2xl border border-white/15 bg-[#0F2347]">
                <img
                  src="/src/assets/images/hero_smart_class_1794847244015.jpg"
                  alt="University student reviewing lecture slides and recorded video on a laptop in a quiet study hall"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#081226]/90 via-[#081226]/20 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/15 bg-[#081226]/85 p-4 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-blue-300">
                        CSC 301 · Lecture 04 · Nov 12
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        Balanced Search Trees &amp; AVL Rotations
                      </p>
                    </div>
                    <span className="text-xs font-medium text-blue-200 whitespace-nowrap">
                      Notes · Video · Quiz
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-20 text-slate-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-blue-700">
              Academic Continuity Workflow
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 text-balance">
              How Smart Class Assistant keeps every student in step with the lecture hall
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="border-t border-slate-200 pt-6">
              <p className="font-mono text-sm font-semibold text-blue-700">01. Publish Once</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">
                Lecturers upload structured class resources
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Faculty share lecture notes, PDFs, slides, recorded videos, and announcements tagged by department, level, course code, and lecture date.
              </p>
            </div>
            <div className="border-t border-slate-200 pt-6">
              <p className="font-mono text-sm font-semibold text-blue-700">02. Catch Up Fast</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">
                Students select the missed class date or topic
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Inside Catch Up on Missed Classes, students pick their course and date to retrieve every linked slide deck, video recording, reading, and deadline together.
              </p>
            </div>
            <div className="border-t border-slate-200 pt-6">
              <p className="font-mono text-sm font-semibold text-blue-700">03. Learn &amp; Verify</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">
                Watch, download offline, and submit work
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Students resume videos where they stopped, cache materials for offline revision, ask course questions, and complete assignments and timed quizzes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features & Benefits Asymmetric Grid */}
      <section id="features" className="border-y border-slate-200 bg-[#F8FAFC] py-20 text-slate-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-blue-700">
                Core Platform Capabilities
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 text-balance">
                Purpose-built tools for independent academic catch-up
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onGetStarted('student')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A1628] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#13284A] transition-colors cursor-pointer whitespace-nowrap"
            >
              Open Learning Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white p-7 lg:col-span-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Layers className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                Catch Up on Missed Classes
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                No more hunting across group chats for missing slides or asking classmates what happened in Tuesday’s lecture. Filter by department, academic level, course, and missed date to see notes, videos, assignments, and announcements in one chronological recovery view.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                <span>Lecture Notes</span>
                <span aria-hidden="true">·</span>
                <span>Slide Decks</span>
                <span aria-hidden="true">·</span>
                <span>Recorded Video</span>
                <span aria-hidden="true">·</span>
                <span>Related Assignments</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-7 lg:col-span-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Download className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                Offline-Ready Study Library
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Install Smart Class Assistant as a Progressive Web App and cache PDFs, handouts, and lecture notes locally so you can study on buses, in hostels, or during campus Wi-Fi outages.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-7 lg:col-span-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Video className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Recorded Lectures with Resume
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Pause a 45-minute lecture capture on your laptop and continue from the exact timestamp later alongside the lecturer’s transcript outline.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-7 lg:col-span-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Assignments &amp; Timed Quizzes
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Submit coursework online, complete objective and essay quizzes with live timers, and review released grades and written feedback.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-7 lg:col-span-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Course Q&amp;A &amp; Notifications
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Ask clarifying questions directly beneath uploaded lecture notes and receive instant in-app alerts when lecturers reply or release grades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lecturers & Students Dual Workflow Section */}
      <section id="lecturers" className="bg-[#0A1628] py-20 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-stretch gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="h-full min-h-[300px] overflow-hidden rounded-2xl border border-white/15 bg-[#0F2347]">
                <img
                  src="/src/assets/images/feature_catchup_workspace_1794847244306.jpg"
                  alt="University lecture hall equipped with digital recording studio and structured presentation display"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="text-xs font-semibold tracking-wider text-blue-300">
                Built for Faculty &amp; Students
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white text-balance">
                How lecturers share materials and students stay aligned
              </h2>

              <div className="mt-8 space-y-6">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-2.5 text-sm font-semibold text-blue-200">
                    <ShieldCheck className="h-4.5 w-4.5 text-blue-400" aria-hidden="true" />
                    <span>For Lecturers &amp; Academic Staff</span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-blue-100/80">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                      <span>Upload PDFs, PowerPoints, Word handouts, images, and recorded lecture videos in seconds.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                      <span>Create assignments and objective/essay quizzes, inspect submissions, and release graded feedback.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                      <span>Publish timetable updates and lecture recaps that notify enrolled students immediately.</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-2.5 text-sm font-semibold text-blue-200">
                    <PlayCircle className="h-4.5 w-4.5 text-blue-400" aria-hidden="true" />
                    <span>For Students</span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-blue-100/80">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                      <span>Search across course codes, lecture topics, documents, videos, and deadlines.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                      <span>Bookmark important notes, track reading completion, and access downloads offline.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-20 text-slate-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-blue-700">
              Campus Adoption Stories
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Trusted by students and lecturers across departments
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] p-6">
              <p className="text-sm leading-relaxed text-slate-700">
                “When I missed two weeks of Algorithms after surgery, I used Catch Up on Missed Classes to step through every dated handout, recorded lecture, and problem set without falling behind my cohort.”
              </p>
              <div className="mt-6 flex items-center gap-3.5 border-t border-slate-200 pt-4">
                <img
                  src="/src/assets/images/avatar_student_one_1794847245100.jpg"
                  alt="Portrait of Nadia Mensah, 300-Level Computer Science student"
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Nadia Mensah</p>
                  <p className="text-xs text-slate-500">300-Level Computer Science Student</p>
                </div>
              </div>
            </article>

            <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] p-6">
              <p className="text-sm leading-relaxed text-slate-700">
                “Uploading slides and a 35-minute lecture recording after each session cut repetitive office-hour catch-up emails by more than half, and students ask sharper questions in the Q&amp;A thread.”
              </p>
              <div className="mt-6 flex items-center gap-3.5 border-t border-slate-200 pt-4">
                <img
                  src="/src/assets/images/avatar_lecturer_one_1794847244748.jpg"
                  alt="Portrait of Dr. Samuel Adeyemi, Senior Lecturer in Computing"
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Dr. Samuel Adeyemi</p>
                  <p className="text-xs text-slate-500">Senior Lecturer · Faculty of Computing</p>
                </div>
              </div>
            </article>

            <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] p-6">
              <p className="text-sm leading-relaxed text-slate-700">
                “In Engineering labs, students often review derivations on commutes with poor signal. Offline caching ensures they always open the exact diagram and assignment prompt they need.”
              </p>
              <div className="mt-6 flex items-center gap-3.5 border-t border-slate-200 pt-4">
                <img
                  src="/src/assets/images/avatar_lecturer_two_1794847245346.jpg"
                  alt="Portrait of Prof. Claire Okonkwo, Department Chair"
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Prof. Claire Okonkwo</p>
                  <p className="text-xs text-slate-500">Faculty Lead · Systems &amp; Engineering</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="border-t border-slate-200 bg-[#F8FAFC] py-20 text-slate-900">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-wider text-blue-700">
              Frequently Asked Questions
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Everything you need to know
            </h2>
          </div>

          <div className="mt-10 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-slate-900 sm:text-base">{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm leading-relaxed text-slate-600">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-[#0F2347] py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to keep your coursework on track?
            </h2>
            <p className="mt-2 text-sm text-blue-100/80 sm:text-base">
              Sign in as a student to catch up on classes, or access the lecturer studio to publish materials.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGetStarted()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Get Started Now
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#081226] py-12 text-blue-100/75">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5 text-base font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Smart Class Assistant</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed">
              A Digital Learning Continuity System designed for higher education institutions so students never lose academic momentum when lectures are missed.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs font-semibold tracking-wider text-white">Platform</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
              <li><a href="#features" className="hover:text-white">Missed Lecture Catch-Up</a></li>
              <li><a href="#lecturers" className="hover:text-white">Lecturer Studio</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="text-xs font-semibold tracking-wider text-white">Academic Support Desk</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-400" aria-hidden="true" />
                <span>academic-continuity@smartclass.edu</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" aria-hidden="true" />
                <span>Mon–Fri · 08:00 – 18:00 Campus Hours</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-400" aria-hidden="true" />
                <span>Center for Digital Learning, Senate Wing</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 pt-6 text-xs text-blue-200/60">
          <p>© {new Date().getFullYear()} Smart Class Assistant. Digital Learning Continuity System.</p>
          <p>Installable Offline-Ready PWA</p>
        </div>
      </footer>
    </div>
  );
};
