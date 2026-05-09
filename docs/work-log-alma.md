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

## Sprint 18: Security, Cleanup, and Demo Readiness
- Polished demo-critical UI for attempt, gradebook, student results, and sidebar navigation.
- Tuned sidebar sizing so navigation, operational note, and logout remain visible without sidebar scrolling.
- Verified frontend lint/build and backend build during the final sprint pass.

## Demo Summary
- Student flow: Available exams -> Start attempt -> answer questions -> autosave/flag/review -> submit.
- Staff flow: My exams -> exam details -> Gradebook -> AI-assisted review -> save human grade -> publish results.
- Student result flow: My results -> see only published scores and feedback.
