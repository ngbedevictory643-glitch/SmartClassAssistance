# Smart Class Assistant — Security Specification

## 1. Data Invariants
1. **Identity & PII Isolation**: `users/{userId}` holds only public-safe academic display data (`uid`, `displayName`, `role`, `departmentId`, `level`, `status`). All PII (`email`, `phone`, `institutionalId`) resides in `users/{userId}/private/{docId}` readable only by the owner (`request.auth.uid == userId`) or verified Admin.
2. **Role Integrity**: Users cannot self-assign `admin` or escalate `role` on update. Self-registration permits `role == 'student'` or `role == 'lecturer'` solely with a valid active `staffInvites/{inviteCode}` document or Admin creation.
3. **Referential & Author Consistency**: Materials, lectures, assignments, quizzes, and announcements must reference an existing `courses/{courseId}` document and bind `lecturerId == request.auth.uid` on creation.
4. **Submission & Grading Separation**: Students can create `assignmentSubmissions` and `quizSubmissions` only with `studentId == request.auth.uid` and `status == 'submitted'`, binding `lecturerId` to the parent assignment/quiz's `lecturerId`. Only the course lecturer or Admin can transition `status` to `'graded'` and assign `score`/`feedback`. Once `'graded'`, submissions are terminally locked against student edits.
5. **Temporal Integrity**: All `createdAt`, `updatedAt`, `submittedAt`, `gradedAt`, and `lastAccessedAt` fields must equal `request.time` (server timestamps).
6. **Path & Volumetric Hardening**: Every document ID path variable is validated with `isValidId()`, and every string/list field enforces strict `.size()` bounds.

## 2. "Dirty Dozen" Adversarial Payloads
1. **Self-Assigned Admin on Signup**: `POST users/u1` with `{ role: 'admin', ... }` -> DENIED.
2. **Role Escalation Update**: `PATCH users/u1` changing `role: 'student'` to `'lecturer'` -> DENIED.
3. **Ghost Shadow Field Injection**: `POST materials/m1` with valid fields plus `{ isFeatured: true }` -> DENIED by `hasOnly(...)`.
4. **Unverified Email Spoof**: `POST materials/m1` where `request.auth.token.email == 'ngbedevictory643@gmail.com'` and `email_verified == false` -> DENIED.
5. **PII Blanket Read**: `GET users/u2/private/info` by `u1` (non-owner, non-admin) -> DENIED.
6. **Orphaned Material Creation**: `POST materials/m1` referencing non-existent `courseId: 'fake_course'` -> DENIED by `exists(...)`.
7. **Author Spoofing on Lecture**: `POST lectures/l1` by `u1` with `lecturerId: 'u2'` -> DENIED.
8. **Student Self-Grading Assignment**: `PATCH assignmentSubmissions/s1` by student changing `status: 'graded'`, `score: 100` -> DENIED.
9. **Post-Grading Tampering**: `PATCH assignmentSubmissions/s1` by student after `existing().status == 'graded'` -> DENIED (terminal state lock).
10. **Client Timestamp Forgery**: `POST announcements/a1` with client-supplied `createdAt` != `request.time` -> DENIED.
11. **1MB Resource Poisoning in ID**: `PUT courses/<1500-char-id>` -> DENIED by `isValidId(courseId)`.
12. **Cross-Student Progress Tampering**: `PATCH learningProgress/p1` belonging to `u2` by `u1` -> DENIED.
