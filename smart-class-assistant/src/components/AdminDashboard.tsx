import React, { useState } from 'react';
import {
  CheckCircle2,
  Database,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import {
  AcademicLevel,
  ACADEMIC_LEVELS,
  Course,
  Department,
  Lecture,
  Material,
  ModerationStatus,
  StaffInvite,
  StaffRequest,
  UserPublic,
  UserRole,
} from '../types/academic';

export type AdminSection = 'overview' | 'users' | 'academics' | 'moderation';

interface AdminDashboardProps {
  section: AdminSection;
  currentUser: UserPublic;
  users: UserPublic[];
  staffRequests: StaffRequest[];
  staffInvites: StaffInvite[];
  departments: Department[];
  courses: Course[];
  materials: Material[];
  lectures: Lecture[];
  totalSubmissionsCount: number;
  onUpdateUserRole: (uid: string, role: UserRole, status: 'active' | 'suspended') => Promise<void>;
  onReviewStaffRequest: (req: StaffRequest, decision: 'approved' | 'rejected') => Promise<void>;
  onCreateInvite: (code: string, departmentId: string) => Promise<void>;
  onToggleInvite: (code: string, active: boolean) => Promise<void>;
  onCreateDepartment: (code: string, name: string, faculty: string, description: string) => Promise<void>;
  onDeleteDepartment: (id: string) => Promise<void>;
  onCreateCourse: (data: {
    code: string;
    title: string;
    departmentId: string;
    departmentName: string;
    level: AcademicLevel;
    description: string;
    creditUnits: number;
  }) => Promise<void>;
  onDeleteCourse: (id: string) => Promise<void>;
  onModerateMaterial: (id: string, status: ModerationStatus) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  onModerateLecture: (id: string, status: ModerationStatus) => Promise<void>;
  onDeleteLecture: (id: string) => Promise<void>;
  onSeedStarter: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  section,
  users,
  staffRequests,
  staffInvites,
  departments,
  courses,
  materials,
  lectures,
  totalSubmissionsCount,
  onUpdateUserRole,
  onReviewStaffRequest,
  onCreateInvite,
  onToggleInvite,
  onCreateDepartment,
  onDeleteDepartment,
  onCreateCourse,
  onDeleteCourse,
  onModerateMaterial,
  onDeleteMaterial,
  onModerateLecture,
  onDeleteLecture,
  onSeedStarter,
}) => {
  const [banner, setBanner] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteDeptId, setInviteDeptId] = useState(departments[0]?.id || 'dept_csc');

  // New Department form
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptFaculty, setDeptFaculty] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // New Course form
  const [cCode, setCCode] = useState('');
  const [cTitle, setCTitle] = useState('');
  const [cDeptId, setCDeptId] = useState(departments[0]?.id || 'dept_csc');
  const [cLevel, setCLevel] = useState<AcademicLevel>('300');
  const [cUnits, setCUnits] = useState(3);

  const flash = (msg: string) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4000);
  };

  if (section === 'overview') {
    const studentCount = users.filter((u) => u.role === 'student').length;
    const staffCount = users.filter((u) => u.role === 'lecturer' || u.role === 'admin').length;
    const pendingReqs = staffRequests.filter((r) => r.status === 'pending').length;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0A1628] p-6 text-white sm:p-8">
          <div>
            <p className="text-xs font-semibold tracking-wider text-blue-300">
              System Administration Console
            </p>
            <h1 className="mt-1 text-2xl font-bold">Platform Governance &amp; Monitoring</h1>
            <p className="mt-1.5 text-sm text-blue-100/80">
              Manage staff &amp; student accounts, academic departments, invite codes, and resource moderation.
            </p>
          </div>
          {departments.length === 0 && (
            <button
              type="button"
              onClick={async () => {
                await onSeedStarter();
                flash('Starter university curriculum seeded into Firestore.');
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
            >
              <Database className="h-4 w-4" aria-hidden="true" />
              Initialize Starter Curriculum
            </button>
          )}
        </div>

        {banner && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
            {banner}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Registered Students</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{studentCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Lecturers &amp; Staff</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{staffCount}</p>
            <p className="mt-1 text-xs text-amber-700">{pendingReqs} pending verification</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Departments &amp; Courses</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              {departments.length} / {courses.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Materials, Videos &amp; Submissions</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              {materials.length + lectures.length} · {totalSubmissionsCount}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'users') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User, Staff &amp; Invite Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Approve lecturer access requests, manage institutional staff invite codes, and administer accounts.
          </p>
        </div>

        {banner && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
            {banner}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Staff Verification Requests */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
            <h2 className="text-base font-semibold text-slate-900">
              Pending Staff Verification Requests ({staffRequests.filter((r) => r.status === 'pending').length})
            </h2>
            {staffRequests.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No staff verification requests submitted.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {staffRequests.map((req) => (
                  <div key={req.uid} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900">
                        {req.displayName} ({req.staffTitle || 'Lecturer'})
                      </span>
                      <span className="font-semibold text-blue-700">{req.status.toUpperCase()}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600">{req.reason}</p>
                    {req.status === 'pending' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await onReviewStaffRequest(req, 'approved');
                            flash(`Approved ${req.displayName} as Lecturer.`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Approve Lecturer
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await onReviewStaffRequest(req, 'rejected');
                            flash(`Declined request from ${req.displayName}.`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staff Invite Codes */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
            <h2 className="text-base font-semibold text-slate-900">Staff Onboarding Invite Codes</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inviteCodeInput.trim()) return;
                await onCreateInvite(inviteCodeInput.trim().toUpperCase(), inviteDeptId);
                setInviteCodeInput('');
                flash('Staff invite code created.');
              }}
              className="mt-4 space-y-3"
            >
              <input
                type="text"
                required
                minLength={4}
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="e.g., SCA-ENG-2026"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono uppercase"
              />
              <select
                value={inviteDeptId}
                onChange={(e) => setInviteDeptId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                Generate Invite Code
              </button>
            </form>

            <div className="mt-5 divide-y divide-slate-100">
              {staffInvites.map((inv) => (
                <div key={inv.code} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <p className="font-mono font-semibold text-slate-900">{inv.code}</p>
                    <p className="text-slate-500">{inv.active ? 'Active' : 'Disabled'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleInvite(inv.code, !inv.active)}
                    className="rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {inv.active ? 'Disable' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All Users Directory */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">All Accounts ({users.length})</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-2.5 pr-4 font-semibold">Name</th>
                  <th className="py-2.5 pr-4 font-semibold">Department / Level</th>
                  <th className="py-2.5 pr-4 font-semibold">Role</th>
                  <th className="py-2.5 text-right font-semibold">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-3 pr-4 font-medium text-slate-900">{u.displayName}</td>
                    <td className="py-3 pr-4 text-xs text-slate-600">
                      {u.departmentName || u.departmentId} · {u.level}
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={u.role}
                        onChange={async (e) => {
                          await onUpdateUserRole(u.uid, e.target.value as UserRole, u.status);
                          flash(`Updated role for ${u.displayName}.`);
                        }}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="student">Student</option>
                        <option value="lecturer">Lecturer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          const next = u.status === 'active' ? 'suspended' : 'active';
                          await onUpdateUserRole(u.uid, u.role, next);
                          flash(`${u.displayName} is now ${next}.`);
                        }}
                        className={`rounded px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-800 hover:bg-red-100'
                        }`}
                      >
                        {u.status === 'active' ? 'Active' : 'Suspended'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'academics') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments &amp; Courses</h1>
          <p className="mt-1 text-sm text-slate-600">
            Organize institutional departments and official course offerings.
          </p>
        </div>

        {banner && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
            {banner}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onCreateDepartment(deptCode, deptName, deptFaculty, deptDesc);
              setDeptCode('');
              setDeptName('');
              setDeptFaculty('');
              setDeptDesc('');
              flash('Department created.');
            }}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-base font-semibold text-slate-900">Add Department</h2>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
                placeholder="Code (e.g. MTH)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
              />
              <input
                type="text"
                required
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Department Name"
                className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <input
              type="text"
              required
              value={deptFaculty}
              onChange={(e) => setDeptFaculty(e.target.value)}
              placeholder="Faculty (e.g. Faculty of Science)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
              placeholder="Short description..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              Create Department
            </button>
          </form>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const d = departments.find((x) => x.id === cDeptId);
              await onCreateCourse({
                code: cCode,
                title: cTitle,
                departmentId: cDeptId,
                departmentName: d?.name || 'Department',
                level: cLevel,
                description: '',
                creditUnits: cUnits,
              });
              setCCode('');
              setCTitle('');
              flash('Course added.');
            }}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-base font-semibold text-slate-900">Add Course</h2>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={cCode}
                onChange={(e) => setCCode(e.target.value)}
                placeholder="Code (MTH 201)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
              />
              <input
                type="text"
                required
                value={cTitle}
                onChange={(e) => setCTitle(e.target.value)}
                placeholder="Course Title"
                className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select
                value={cDeptId}
                onChange={(e) => setCDeptId(e.target.value)}
                className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                ))}
              </select>
              <select
                value={cLevel}
                onChange={(e) => setCLevel(e.target.value as AcademicLevel)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {ACADEMIC_LEVELS.map((l) => (
                  <option key={l} value={l}>{l} Level</option>
                ))}
              </select>
            </div>
            <input
              type="number"
              min={1}
              max={12}
              value={cUnits}
              onChange={(e) => setCUnits(Number(e.target.value))}
              placeholder="Credit Units"
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
            />
            <div>
              <button
                type="submit"
                className="rounded-lg bg-[#0A1628] px-4 py-2 text-xs font-semibold text-white hover:bg-[#14294A] cursor-pointer"
              >
                Create Course
              </button>
            </div>
          </form>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">Departments ({departments.length})</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {departments.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{d.code} — {d.name}</p>
                    <p className="text-xs text-slate-500">{d.faculty}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteDepartment(d.id)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">Courses ({courses.length})</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {courses.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.code} — {c.title}</p>
                    <p className="text-xs text-slate-500">{c.departmentName} · {c.level} Level</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteCourse(c.id)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
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
  }

  // Content Moderation
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Content Moderation</h1>
        <p className="mt-1 text-sm text-slate-600">
          Approve, withhold, or remove uploaded learning materials and recorded lectures across all courses.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Learning Materials ({materials.length})</h2>
        <div className="divide-y divide-slate-100">
          {materials.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
              <div>
                <p className="text-xs font-medium text-blue-700">
                  {m.courseCode} · {m.lecturerName} · Status: {m.moderationStatus.toUpperCase()}
                </p>
                <p className="text-sm font-semibold text-slate-900">{m.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onModerateMaterial(m.id, 'approved')}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onModerateMaterial(m.id, 'removed')}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
                >
                  Hide
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteMaterial(m.id)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Recorded Lectures ({lectures.length})</h2>
        <div className="divide-y divide-slate-100">
          {lectures.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
              <div>
                <p className="text-xs font-medium text-blue-700">
                  {l.courseCode} · {l.lecturerName} · Status: {l.moderationStatus.toUpperCase()}
                </p>
                <p className="text-sm font-semibold text-slate-900">{l.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onModerateLecture(l.id, 'approved')}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onModerateLecture(l.id, 'removed')}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
                >
                  Hide
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteLecture(l.id)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
