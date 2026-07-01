# University UI Consistency Review

This review defines the frontend quality baseline for presenting Online Exam as a university assessment system.

## 1. Goal

The interface should feel operational, academic, and stable. Pages should support repeated staff work, student exam focus, and clear administrative review without looking like a temporary prototype.

## 2. Core UI Standards

### Forms and Dropdowns

- Use dropdowns for controlled choices such as role, status, semester, course offering, delivery type, question type, and result status.
- Each dropdown must have a clear label and a neutral placeholder when no value is selected.
- Required dropdowns must not rely on hidden defaults.
- Disabled dropdowns must visibly explain that the field is locked, synced, or not currently available.
- Long option labels should remain readable on desktop and mobile.

### Tables and Lists

- Tables should be used for operational comparison, not decorative layout.
- Header labels must be short, consistent, and scannable.
- Empty tables must show a helpful empty state instead of a blank body.
- Action columns should remain predictable and not change position between rows.
- Mobile screens should keep horizontal scrolling controlled inside the table wrapper.

### Empty, Error, and Loading States

- Empty states should explain why no data is visible and what the next valid action is.
- Error states should state the failing workflow, not only show a generic technical message.
- Loading states should preserve page structure where possible so the screen does not jump.
- Review-critical pages must never look broken when the database has no matching records.

### Academic Tone

- Labels should use professional terms such as `Course offering`, `Published`, `Submitted`, `Pending review`, and `Result visibility`.
- Avoid casual wording on staff and student workflows.
- Keep button text action-oriented: `Publish exam`, `Save draft`, `Submit exam`, `Review results`.
- Keep Albanian and English translations aligned when a screen has both.

## 3. Role-Specific Review

### Admin

Admin screens should prioritize review and control:

- Academic structure screens should clearly distinguish SMU-synced records from local fallback records.
- Enrollment actions should show selected cohort counts.
- Read-only synced states should remain inspectable even when actions are disabled.

### Professor and Assistant

Staff screens should prioritize assigned offering context:

- The selected course offering should remain visible while authoring questions or exams.
- Question bank filters should not become active before an offering is selected.
- Publish and grade actions should show readiness or blocking reasons.

### Student

Student screens should prioritize focus and safety:

- Exam attempts should avoid unnecessary navigation while the exam is active.
- Timer, autosave, unanswered count, and submit state should remain visible.
- Result pages must clearly separate pending results from published results.

## 4. Responsive Requirements

The UI must be usable at:

- Desktop: `1440px`
- Laptop: `1024px`
- Tablet: `768px`
- Mobile: `390px`

Required checks:

1. No button text overflows.
2. Dropdowns remain readable and tappable.
3. Tables scroll inside their wrapper instead of breaking the page width.
4. Empty states remain visible without covering other content.
5. Exam attempt actions remain reachable on mobile.

## 5. Sprint Acceptance Checklist

Before opening a frontend pull request, confirm:

- [ ] Main forms use dropdowns for controlled values.
- [ ] Dropdowns have labels, placeholders, disabled states, and readable spacing.
- [ ] Tables have empty states or clear fallback copy.
- [ ] Mobile layout does not overflow horizontally outside table wrappers.
- [ ] Review-critical text is professional and consistent.
- [ ] The manual test guide and release evidence are updated when the change affects demo flow.

## 6. Known Follow-Up

Future UI work should apply the same review to each major page individually with screenshots from desktop and mobile.
