# Work Log (Alma)

## Sprint 15: Student Exam Delivery Core
- Added the student attempt route at `/exams/:examId/attempt`.
- Kept `/exams/:examId/session` as a compatibility alias for the same flow.
- Connected student exam cards and exam detail actions to the attempt screen.
- Student can open an allowed exam, view questions, answer text/code/SQL-style prompts, and submit the attempt.

## Sprint 16: Timer, Auto-Save, and Attempt Safety
- Added a stable timer layout with warning styling near the end of the attempt.
- Added autosave and restore using the local attempt draft, including answers, flags, and session timing.
- Added question navigation, unanswered indicators, flagged question states, disabled submit states, and final submit review.
- Student refresh does not lose draft answers on the same device.

## Sprint 17: Student Results and Review Experience
- Added student-facing results route at `/results`.
- Results remain hidden until staff publishes them.
- Published results show score cards, submitted/published timestamps, grading notes, and pending review status.
- Student dashboard and sidebar navigation link to results.

## Sprint 18: Security, Cleanup, and Delivery Readiness
- Polished review-critical UI for attempt, gradebook, student results, and sidebar navigation.
- Tuned sidebar sizing so navigation, operational note, and logout remain visible without sidebar scrolling.
- Verified frontend lint/build and backend build during the final sprint pass.

## Sprint 19: Exam Integrity Guard
- Added student exam integrity warnings for fullscreen exit, hidden tab, window blur, right-click, copy, and paste attempts.
- Added violation counter, warning banner, final warning modal, and interaction lock state after repeated violations.
- Added backend integrity-event logging through the exam attempt flow.

## Sprint 20: Exam Lock Policy and Auto Action
- Added frontend policy enforcement that blocks manual interaction after repeated integrity violations.
- Added gradebook integrity summary so professors can review violation count and recent event timeline per attempt.
- Connected integrity events to audit logs for backend review.

## Sprint 21: Safe Exam Browser / Kiosk Mode Preparation
- Added exam lockdown configuration fields: require lockdown, allowed client, and advisory/strict mode.
- Added professor-facing lockdown readiness panel on exam details.
- Added backend compatibility columns and start-attempt validation for lockdown-required exams.

## Sprint 22: SMU Integration Planning
- Kept admin/academic UX direction aligned with synced data views instead of long-term manual ownership.
- Added wording and UI direction for external-source readiness through exam/course context and demo notes.

## Sprint 23: SMU Data Sync Implementation Preparation
- Prepared the UI cleanup direction for future synced dropdowns and read-only administrative data.
- Kept exam creation tied to assigned offerings, so synced offerings can replace manual admin input later.

## Sprint 24: Final System Validation
- Re-tested backend build, frontend lint, frontend production build, API exam list, and gradebook API.
- Confirmed professor gradebook returns integrity fields and lockdown fields return through exam APIs.

## Demo Summary
- Student flow: Available exams -> Start attempt -> answer questions -> autosave/flag/review -> submit.
- Staff flow: My exams -> exam details -> Gradebook -> AI-assisted review -> save human grade -> publish results.
- Student result flow: My results -> see only published scores and feedback.
- Integrity flow: Student session records suspicious actions -> student sees warnings -> professor reviews violations in gradebook.
