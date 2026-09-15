# ACCA LMS · Powered by ZSkillup

A clickable prototype of ZSkillup's ACCA learning platform. It has **six logins**, and each
one has its own workspace, navigation, dashboard and permissions:

1. **ZSkillup Super Admin** runs the platform: universities, programmes, users, the ACCA
   framework, configuration and governance.
2. **Programme Admin** runs day-to-day operations: cohorts, calendars, ACCA registrations,
   exemptions and exams, university coordination, student support and finance.
3. **University Admin** is a partner university's own workspace (Brightwater University), with
   read access to its learners and edit access for authorised staff.
4. **Faculty and Academic Team** teach, author content, build question banks and mocks, and grade.
5. **Mentor and Career Team** handle student success and careers: risk alerts, action plans,
   recovery, resumes, mock interviews, jobs and placements.
6. **Student** is either a graduate ACCA learner or a university undergraduate, and the
   student workspace adapts to the type.

Every feature in the client's requirements is on a named page with at least one working
interaction. All data is sample data held in the browser: there is no backend. The ACCA
structure, rules and terminology are real (15 papers, EPSM, PER, exam sessions, entry windows,
exemptions, a 50% pass mark). Partner universities, companies and people are fictional. The
prototype does not claim ACCA endorsement.

Demo "today" is **Monday 14 September 2026**, IST. Programme fees are in INR; fees paid to ACCA
are in GBP and recorded here for tracking only.

## Run it

```bash
npm install
npm run dev              # http://localhost:3000 (add -- -p 3100 for another port)
```

Other scripts:

```bash
npm run build            # production build (Next.js, Turbopack)
npm start                # serve the production build
npm run lint             # ESLint
npx tsc --noEmit -p .    # typecheck
npm run check:themes     # WCAG contrast checks for every theme, light and dark
```

Start at `/` for the overview of the six logins, or `/login` to pick one. Any credentials sign
you in; the login form fills the chosen persona's email and the demo password
`acca-lms-2026`. Deep links preselect a login: `/login?role=faculty`, `/login?as=p-deepa`.

A link to any page works on its own. Opening a page that belongs to another login switches to
that login's first persona, and keeps the current persona if it already has that role.

## Personas and permissions

The **Signed in as** card at the bottom of the sidebar switches persona, and with it the role.
The choice is kept in `localStorage` under `acca-persona`. The default persona is Anaya Rao.

| Persona id | Name | Title | Login | Permissions | What changes |
|---|---|---|---|---|---|
| `p-neha` | Neha Kapoor | Platform Director · ZSkillup | Super Admin | `platform:all` | Full access |
| `p-arjun` | Arjun Shetty | Technology Administrator · ZSkillup | Super Admin | `platform:all` | Full access |
| `p-priya` | Priya Menon | ACCA Programme Lead | Programme Admin | `programme:ops` `programme:acca` `programme:universities` `programme:support` `finance:view` `finance:record` | Full programme access, with finance |
| `p-imran` | Imran Sheikh | Student Support Executive | Programme Admin | `programme:ops` `programme:acca` `programme:universities` `programme:support` | No finance: finance nav items show a lock and the pages show a restricted notice |
| `p-deepa` | Deepa Iyer | Finance Operations | Programme Admin | `programme:support` `finance:view` `finance:record` | Operations, ACCA and university pages are read-only, with disabled controls and tooltips |
| `p-suresh` | Dr Suresh Nair | Programme Director · Brightwater University | University Admin | `university:edit` | Editor |
| `p-lakshmi` | Prof. Lakshmi Rao | Dean of Commerce · Brightwater University | University Admin | none | View-only: a "View-only access" chip and every create, edit and upload control disabled |
| `p-marcus` | Marcus Bell | Faculty · FR and SBR | Faculty | `content:publish` `faculty:grade` `faculty:approve-reattempt` | Publishes content and approves reattempts |
| `p-farah` | Farah Siddiqui | Content Author · PM | Faculty | `content:submit` `faculty:grade` | Publish buttons become "Submit for review"; cannot approve reattempts |
| `p-aisha` | Aisha Khan | Academic Mentor | Mentor | `students:allocated` | Sees her 18 allocated students; career pages are read-only |
| `p-rahul` | Rahul Verma | Placement Lead | Mentor | `placement:manage` `students:placement-eligible` | Sees the 26 placement-eligible learners; publishes jobs and moves pipeline stages |
| `p-anaya` | Anaya Rao | Graduate ACCA learner | Student | none | Graduate: current paper FR, completion plan, batches, exemptions |
| `p-rohan` | Rohan Iyer | B.Com (Hons) with ACCA · Semester 3 | Student | none | Undergraduate at Brightwater: university identity, semester roadmap, cohort leaderboard |

Identity and permissions live in [`lib/personas.ts`](lib/personas.ts) (server-safe) and
[`lib/role.tsx`](lib/role.tsx) (`useRole()`, `useCan()`, `useSwitchPersona()`). Navigation for
every login is in [`lib/nav.ts`](lib/nav.ts).

## Routes by login

### Student (home `/dashboard`)

| Route | Page | Covers |
|---|---|---|
| `/dashboard` | Dashboard | Personal dashboard, adapted to graduate or undergraduate |
| `/journey` | ACCA journey | Registration and exemption status, current paper, EPSM and PER progress |
| `/papers` | Papers | Paper-wise learning and study material |
| `/classes` | Live classes | Live classes and recordings |
| `/practice` | Practice | Question bank and practice tests |
| `/mocks` | Mock exams | Mock examinations (open the test runner) |
| `/readiness` | Readiness | Readiness score and what drives it |
| `/exams` | Exams & results | Exam bookings, attempt history, results |
| `/assistant` | AI tutor | AI tutor |
| `/doubts` | Doubts | Doubt resolution |
| `/my-mentor` | My mentor | Mentor support |
| `/discussions` | Community | Community, plus the university cohort space for undergraduates (`?space=cohort`) |
| `/notifications` | Notifications | Notifications |
| `/support` | Support tickets | Support tickets |
| `/careers` | Career centre | Career centre |
| `/careers/resume` | Resume builder | Resume builder with ATS score |
| `/careers/interviews` | AI mock interviews | AI mock interviews |
| `/careers/jobs` | Jobs & internships | Jobs and internships |
| `/certificates` | Certificates | Certificates and joint-certificate eligibility |
| `/payments` | Payments | Payment information |
| `/exemptions` | Exemptions | Qualification-document upload, exemption evaluation (graduate) |
| `/plan` | Completion plan | Fast-track journey, paper selection, previous attempts, completion plan (graduate) |
| `/batches` | Batches & cohorts | Cohort, weekend or weekday batch, reattempt and revision cohorts (graduate) |
| `/career-transition` | Career transition | Career-transition roadmap (graduate) |
| `/my-university` | My university | University and cohort identity, semester, calendar alignment, announcements (undergraduate) |
| `/roadmap` | Semester roadmap | Semester-to-ACCA roadmap and subject overlap (undergraduate) |
| `/leaderboard` | Cohort leaderboard | Cohort leaderboard (undergraduate) |
| `/courses/[slug]` | (not in nav) | Paper overview with the diagnostic card |
| `/learn/[slug]` | (not in nav) | Lesson player |
| `/assessments/[id]` | (not in nav) | Test runner |
| `/profile` | (avatar menu) | Profile |

Graduate-only and undergraduate-only pages show a notice with a switch button when opened as
the other student type.

### ZSkillup Super Admin (home `/admin`)

| Route | Page | Covers |
|---|---|---|
| `/admin` | Overview | Platform usage; student, faculty and mentor activity |
| `/admin/reports` | Reports | Cross-university reports, graduate vs undergraduate, ACCA progression, career outcomes, exports |
| `/admin/universities` | Universities | Partner universities, workspaces, branding |
| `/admin/programmes` | Programmes | Programmes, programme structures, intakes, cohorts and batches |
| `/admin/users` | Users & roles | All platform users, roles and permissions, super admin seat limit |
| `/admin/acca-framework` | ACCA framework | Paper structure, exemption rules, curriculum-mapping framework |
| `/admin/content` | Content repository | Central content repository |
| `/admin/assessment-framework` | Assessment framework | Assessment framework |
| `/admin/communications` | Communications | Communication channels |
| `/admin/integrations` | Integrations | Integrations |
| `/admin/certificates` | Certificates | Certificate templates |
| `/admin/payment-rules` | Payment rules | Payment rules |
| `/admin/escalations` | Support escalation | Escalation matrix and escalated tickets |
| `/admin/audit` | Audit logs | Audit logs |
| `/admin/privacy` | Data & privacy | Data and privacy policies |

### Programme Admin (home `/programme`)

| Route | Page | Covers |
|---|---|---|
| `/programme` | Dashboard | Today's classes, open tickets, exemption queue, entry deadlines, payments due |
| `/programme/students` | Students | Allocate to cohorts, map to universities and semesters |
| `/programme/cohorts` | Cohorts & batches | ACCA and university-linked cohorts, batches and sections |
| `/programme/calendar` | Calendar | Programme calendars, examination cycles, live classes |
| `/programme/staffing` | Faculty & mentors | Assign faculty and mentors |
| `/programme/announcements` | Announcements & resources | Announcements and programme resources |
| `/programme/acca/registrations` | Registrations | ACCA student IDs, registration, annual subscriptions |
| `/programme/acca/exemptions` | Exemptions | Evaluate documents, estimated and approved exemptions, exemption payments |
| `/programme/acca/exams` | Exams & results | Bookings, results, paper attempts, revision and reattempt cohorts |
| `/programme/acca/progression` | Progression | EPSM, PER, progression reports |
| `/programme/universities` | Curriculum mapping | University curriculum, subject-to-ACCA mapping, semester roadmaps |
| `/programme/universities/calendars` | Academic calendars | University academic calendars and examination blackout periods |
| `/programme/universities/operations` | University operations | University announcements, reports, batches, joint certification |
| `/programme/support` | Support tickets | Ticket queue: categorise, assign, resolve, escalate, turnaround, history |
| `/programme/support/faqs` | FAQs & trends | FAQs and recurring problems |
| `/programme/whatsapp` | WhatsApp | WhatsApp inbox: watch the assistant, take over, hand back |
| `/programme/voice` | Voice agent | Voice agent console |
| `/programme/finance` | Fees & payments | Fee status, payment plans, offline payments, receipts, reminders (needs `finance:view`) |
| `/programme/finance/reconciliation` | Reconciliation & refunds | Refunds, ACCA-related payments, reconciliation (needs `finance:view`) |

Finance pages cover enrolled-student financial administration only. Admissions and sales are
managed elsewhere.

### University Admin (home `/university`, workspace Brightwater University)

| Route | Page | Covers |
|---|---|---|
| `/university` | Dashboard | University-specific dashboard |
| `/university/students` | Students | Linked students, record verification, semester updates, 360 view |
| `/university/cohorts` | Intakes & cohorts | Intakes, batches and cohorts |
| `/university/acca` | ACCA progress | Registrations, exemptions, exam bookings, attempts and results |
| `/university/performance` | Performance | Attendance, learning progress, mocks, readiness, at-risk students, mentor interventions |
| `/university/reports` | Reports | Student, cohort and executive reports |
| `/university/curriculum` | Curriculum & mapping | Curriculum upload, curriculum-to-ACCA mapping, roadmap review |
| `/university/calendar` | Academic calendar | Academic calendar, semester dates, university examination periods |
| `/university/support` | Support tickets | Support-ticket status |
| `/university/careers` | Careers | Internship participation, placement readiness, career outcomes |
| `/university/announcements` | Announcements | University announcements |
| `/university/certificates` | Joint certificates | Joint-certificate eligibility |
| `/university/users` | University users | Authorised university users, editable or view-only |

### Faculty and Academic Team (home `/faculty`)

| Route | Page | Covers |
|---|---|---|
| `/faculty` | Dashboard | Today's classes, questions waiting, scripts to grade, reviews |
| `/faculty/cohorts` | Papers & cohorts | Assigned papers and cohorts, student progress, weak topics, remedial learning |
| `/faculty/classes` | Live classes | Conduct classes, attendance, recordings, resources, class notes, doubt-clearing sessions |
| `/faculty/questions` | Student questions | Answer questions, academic announcements |
| `/faculty/evaluation` | Evaluation | Grading, feedback, plagiarism flags, reattempt approval, re-evaluation |
| `/faculty/analytics` | Analytics | Paper-level assessment analytics |
| `/faculty/content` | Content studio | Papers, modules, lessons, videos, study material, examiner reports, model answers, tagging, university variants |
| `/faculty/content/[slug]` | (not in nav) | Paper builder |
| `/faculty/content/reviews` | Reviews & versions | Content review, versions, outdated content |
| `/faculty/question-bank` | Question bank | Question banks, tagging, constructed-response questions, answer keys |
| `/faculty/mocks` | Quizzes & mocks | Quizzes, mock examinations, evaluation rubrics |

### Mentor and Career Team (home `/mentor`)

| Route | Page | Covers |
|---|---|---|
| `/mentor` | Dashboard | Risk alerts, today's sessions, interventions due, placement pipeline |
| `/mentor/students` | My students | Student type, ACCA journey, attendance, activity, mocks, readiness, attempts |
| `/mentor/alerts` | Risk alerts | Risk alerts, inactive learners, missed classes and mocks |
| `/mentor/plans` | Action plans & sessions | Action plans, mentoring sessions, notes, reminders, intervention outcomes |
| `/mentor/recovery` | Recovery & escalations | Failed-paper recovery, academic and operational escalations |
| `/mentor/careers` | Career profiles | Career profiles, resume review, ATS scores |
| `/mentor/interviews` | Mock interviews | Mock interviews, feedback, Company Readiness Scores |
| `/mentor/opportunities` | Jobs & internships | Publish jobs and internships, eligibility, matching, shortlisting |
| `/mentor/placements` | Placement pipeline | Interviews, recruiter feedback, placement stages, offers and joining, internships |
| `/mentor/reports` | Placement reports | Placement reports, alumni career outcomes |

### Redirects from earlier routes

| From | To |
|---|---|
| `/catalog`, `/my-learning` | `/papers` |
| `/paths`, `/paths/[slug]` | `/journey` |
| `/progress` | `/readiness` |
| `/assessments` | `/mocks` |
| `/manage` | `/admin` |
| `/people` | `/admin/users` |
| `/settings` | `/admin/communications` |
| `/channels/whatsapp` | `/programme/whatsapp` |
| `/channels/voice` | `/programme/voice` |
| `/grading` | `/faculty/evaluation` |
| `/studio` | `/faculty/content` |
| `/studio/[slug]` | `/faculty/content/[slug]` |
| `/programme/acca` | `/programme/acca/registrations` |

Also available: `/` (overview of the six logins and the theme gallery), `/login`, `/signup`,
`/reset`, and `/kit`, which renders every shared UI component with sample data.

## Themes

The default theme is **Prephasz**, modelled on ZSkillup's live product: high contrast, a black
identity (sidebar active item, secondary buttons, dashboard hero bands) and a yellow to gold
gradient for primary actions with dark text. Cards are flat white on a pale ground with 1px
borders. Type is Bricolage Grotesque for display, Plus Jakarta Sans for UI and JetBrains Mono
for IDs and figures. Light and dark are both drawn by hand; in dark mode the active nav item
turns yellow.

Seven more themes stay selectable from the palette button in the top bar and from the gallery
on `/`: Cobalt, Broadsheet, Bindery, Norrland, Flight Deck, Nitrate and Signal. A theme changes
surfaces, ink, accents, typefaces, radii and shadows, in light and dark. The choice is kept in
`localStorage` (`acca-theme`, `acca-mode`).

[`lib/themes.ts`](lib/themes.ts) is the single source of truth; the root layout inlines the
generated CSS and Tailwind reads the tokens (`cta`, `nav-active`, `surface-inv` and the rest).
`npm run check:themes` recomputes WCAG contrast for every theme and mode (8 themes, 546
assertions).

## Where things live

| Path | Contents |
|---|---|
| `app/(app)/` | Every in-app page. The group layout mounts the shell, persona, toasts and the student tutor dock |
| `app/(auth)/` | Login, sign-up, password reset |
| `components/ui/` | Shared kit: DataTable, FilterBar, StatusPill, KpiTile, HeroBand, FormDrawer, Kanban, Timeline, Stepper, MonthCalendar, Matrix, FileDrop, ScoreRing, charts, toasts |
| `components/<workspace>/` | Page components per login (`student`, `admin`, `programme`, `university`, `faculty`, `mentor`) |
| `lib/data/acca/` | The ACCA sample world: papers and exam sessions, universities, programmes, cohorts, 64 students, schedule, content, assessments, support, finance, careers, mentoring, communications, platform |
| `lib/data/` | Learner content reused as ACCA papers: courses, lessons, assessments, conversations |

## Prototype boundaries

- No backend, no real authentication, no email, WhatsApp, voice or payment integrations. Any
  credentials sign you in.
- Every create, edit, upload, assign, publish and export works in page state and confirms with a
  toast. Changes reset on reload and do not flow between pages (a payment recorded on one page
  does not appear on another). Exports queue a named report; no file is generated.
- File uploads keep the chosen file names; nothing is parsed. Imports preview fixed sample rows.
- The server renders each workspace as its first persona; a persona chosen in the switcher takes
  over after the page loads.
- Pages use a fixed demo clock on 14 September 2026 for SLA timers, join windows and "today".
- Some figures have no source in the sample data and are fixed, deterministic values
  (for example cohort averages on mocks, device split, university NPS, study-hour estimates).
- The AI tutor, AI mock interviews and the WhatsApp and voice assistants are scripted.
- The lesson player uses Financial Reporting content for every paper.
- University and cohort headcounts are headline figures; tables list the sample records that
  exist (for example 20 of Brightwater's 142 students).
