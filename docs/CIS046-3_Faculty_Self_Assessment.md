# CIS046-3 Software for Enterprise  
## Student Self-Assessment against the Published Marking Criteria

**Module:** CIS046-3 Software for Enterprise  
**Project:** Banana Quiz Challenge (Banana Arcade)  
**Repository:** https://github.com/deeyoooooooo/Banana-Quiz-Challenge  
**Nature of this document:** Progress self-assessment mapped to the four official criteria (version control, event-driven programming, interoperability, virtual identity). Marks below are **estimated bands based on completed evidence**, not a claim of the final awarded grade.

---

## 1. Purpose

This report is submitted so that faculty can see:

1. How the current implementation maps to each row of the marking chart.  
2. An honest estimate of the band that the **completed work** can currently support.  
3. A concrete improvement plan aimed at a **First Class (70%+)** outcome.

The chart assesses not only working software, but the student’s ability to **identify**, **reflect on**, and **critically evaluate** the four themes in relation to their own code.

---

## 2. Summary of estimated attainment (current evidence)

| Criterion | Theme | Evidence currently in the project | Estimated band *if explained to the matching depth* | Risk if only “mentioned” in the presentation |
|---|---|---|---|---|
| 1 | Version control and component structure | Git/GitHub, organised frontend/backend modules, meaningful commits | **50–59% (2:2)**, approaching **60%** on structure | 40–49% |
| 2 | Event-driven programming | Form submits, clicks, async API state, timer/timeout handlers | **60–69% (2:1)** | 40–49% |
| 3 | Interoperability | HTTP JSON to own API; Banana Game API as third-party web service | **60–69% (2:1)** | 40–49% |
| 4 | Virtual identity | Registration, bcrypt, server sessions, cookies, CSRF, access control | **60–69% (2:1)**, strongest criterion | 40–49% |

**Overall estimate on work completed now: approximately 58–66% (high 2:2 to low 2:1).**

This is not a guaranteed mark. The published 70% descriptors require **critical evaluation, justification, and discussion of alternative approaches**. Those are only partly evidenced in the repository today (mainly in `README.md`). Git practice (single `master` branch, no tags or code reviews) is the main criterion that currently sits below 2:1.

---

## 3. What has been completed

The application is a small distributed web system:

- **Frontend:** React (Vite) — pages, components, authentication context, protected routes.  
- **Backend:** Node.js / Express — validation, sessions, quiz rules, Banana API adapter.  
- **Persistence:** SQLite (`users`, `quiz_results`, `sessions`).  
- **Third party:** official Banana Game API (`http://marcconrad.com/uob/banana/api.php?out=json`).

A registered user logs in, chooses Easy / Medium / Difficult, answers five banana puzzles, and receives a **server-calculated** score. The official score is never decided in the browser.

Automated backend tests exist (authentication, Banana service, quiz behaviour, database migration) using the Node.js test runner and Supertest.

---

## 4. Criterion-by-criterion mapping

### 4.1 Version control (Criterion 1)

**Chart requirement (abridged)**  
Threshold: mention Git and that code is organised into components.  
2:2: show how organisation supports component responsibilities and collaboration.  
2:1: reflect on modularity, maintainability, branch management, commit granularity, and dependencies.  
First: critically evaluate structure, version-control strategies (branching, tagging, reviews), quality, scalability, and alternatives.

**Completed evidence**

- Remote repository on GitHub with a linear commit history on `master` (initialisation, frontend pages, backend configuration, authentication, sessions, tests).  
- Clear component boundaries: `frontend/src/pages`, `frontend/src/components`, `frontend/src/context`, `backend/src/routes`, `backend/src/services`, `backend/src/middleware`, `backend/src/store`.  
- `.gitignore` excludes secrets and generated data (for example `.env` and SQLite files).

**Honest gap against 70%**

- Development has been on a **single branch**; there is no demonstrated feature-branch workflow, tagging, or code review.  
- Some completed work (including the project README, difficulty service, and related UI) has been **developed locally and is not fully reflected in the last pushed commit**. Faculty cloning GitHub would not yet see that material unless it is committed and pushed.  
- Alternative structures and scalability limits (single-node SQLite sessions) are documented in the README but are not yet shown as a Git strategy (branches/tags/reviews).

**Current supported band: 50–59%, with folder organisation capable of 60% if discussed confidently.**

---

### 4.2 Event-driven programming (Criterion 2)

**Chart requirement (abridged)**  
Threshold: mention events and relate them to code.  
2:2: identify events and their role.  
2:1: reflect on how events are generated and which mechanisms handle them.  
First: **justify** the approach taken for events and handlers.

**Completed evidence (implemented handlers, not empty listeners)**

| User / system event | Location | Role |
|---|---|---|
| Register / login form submit | `frontend/src/pages/Register.jsx`, `Login.jsx` | `preventDefault`, POST credentials, update session identity |
| Start quiz / difficulty selection | `frontend/src/pages/Dashboard.jsx` | POST `/api/quiz/start` |
| Digit selection and submit | `frontend/src/pages/Quiz.jsx` | Local UI state, then POST `/api/quiz/answer` |
| Countdown reaching zero | `Quiz.jsx` (`setInterval` + timeout effect) | POST `/api/quiz/timeout`; server re-checks `deadlineAt` |
| Hint (Easy mode) | `Quiz.jsx` | POST `/api/quiz/hint` (even/odd only) |
| Quit / play again / logout | Quiz, Results, Layout | Abandon session quiz, restart, or destroy session |
| Async success / loading / error | Pages + `frontend/src/api/client.js` | Visible feedback when the API is slow or fails |

**Design already present (supports 2:1 reflection)**  
The browser timer is for user experience. The **authoritative deadline** is stored in the server session (`startedAt` / `deadlineAt` in `backend/src/routes/quizRoutes.js`). A late or client-altered answer cannot award points.

**Gap against 70%**  
The code implements a justified design, but the First Class descriptor requires the **student to justify it orally/in writing**, including alternatives (for example trusting a client-side score, or polling instead of a timeout event).

**Current supported band: 60–69% if the presentation explains generation and handling; 70%+ only with explicit justification.**

---

### 4.3 Interoperability (Criterion 3)

**Chart requirement (abridged)**  
Threshold: mention interoperability.  
2:2: identify where this code talks to someone else’s code and which protocol is used.  
2:1: reflect on cooperation with software of a different architecture / system.  
First: **critically justify** inclusion of third-party software such as a web service.

**Completed evidence**

1. **Browser ↔ Express (own distributed system):** HTTP JSON, session cookie (`credentials: "include"`), CSRF header on POST.  
2. **Express ↔ Banana Game API (third party, different host and owner):** isolated client in `backend/src/services/bananaService.js`.  
   - Documented GET: `api.php?out=json`  
   - Documented response: `{ "question", "solution" }`  
   - Official documentation: https://marcconrad.com/uob/banana/doc.php  
3. **Error handling as interoperability, not decoration:** network failure, non-OK HTTP, and malformed JSON are distinguished and returned as user-visible errors (503/502).  
4. **Tests use a mock adapter**; mock data is not presented in the UI as a live Banana result.  
5. The puzzle **solution is retained on the server** and is not sent to React.

**Gap against 70%**  
Critical justification still needs to be stated for faculty: why the backend (not the browser) calls the Banana API; why documented HTTP is used despite not being HTTPS; why a dedicated service module exists; what happens if the third-party service is slow or offline.

**Current supported band: 60–69% on implementation and identification; 70%+ with critical justification of the web-service approach.**

---

### 4.4 Virtual identity (Criterion 4)

**Chart requirement (abridged)**  
Threshold: mention virtual identity.  
2:2: identify use of passwords and/or cookies.  
2:1: explain how authentication mechanisms establish virtual identity.  
First: critically discuss those mechanisms, their role in security, and **alternative approaches**.

**Completed evidence**

| Mechanism | Where | Role in virtual identity |
|---|---|---|
| Registration with validation | `authRoutes.js`, `validation.js` | Creates a unique account (email uniqueness) |
| Password hashing (bcrypt) | `authRoutes.js` | Password is never stored in plaintext |
| Login comparison of hash | `authRoutes.js` | Establishes identity only if the secret matches |
| Server-side session (SQLite store) | `app.js`, `sqliteSessionStore.js` | Identity lives on the server, not as a trusted frontend flag |
| Session cookie (`HttpOnly`, `SameSite=Lax`, `Secure` in production) | `express-session` config | Browser presents the cookie; JavaScript cannot read it |
| CSRF token | `middleware/csrf.js` | Cookie-authenticated POSTs cannot be forged by another site |
| `GET /api/auth/me` + `requireAuth` | Auth routes and middleware | Protected APIs reject requests without a session user |
| React `ProtectedRoute` | `ProtectedRoute.jsx` | UX only; backend still enforces identity |
| Logout | Destroys session and clears cookie | Ends virtual identity |
| Login rate limiting | `express-rate-limit` | Reduces password-guessing |
| Result queries scoped by `user_id` | Quiz routes | One user cannot read another user’s history |

**Gap against 70%**  
The implementation already exceeds “passwords and cookies are used”. The First Class mark depends on a **critical discussion of alternatives** (for example JWT in `localStorage` versus server sessions; OAuth versus local accounts) and an honest statement of limitations (no email verification, no password reset, SQLite sessions not shared across multiple servers).

**Current supported band: 60–69% on completed work; this criterion is the most realistic route to 70%+ through evaluation rather than extra features.**

---

## 5. Overall position

The **software already demonstrates all four required themes**. On technical completeness, criteria 2–4 support a **2:1**. Criterion 1 (version-control *practice* as named in the 2:1/First columns) currently supports a **2:2**.

Therefore, with the work completed today, a fair overall outcome is **high 2:2 to low 2:1 (about 58–66%)**, provided the assessed presentation matches the code. A presentation that only *mentions* Git, events, APIs, and login would fall to **40–49%** despite a working product, because that is the threshold descriptor.

A **First Class (70%+)** is attainable without rebuilding the application, but not by UI polish alone. It requires stronger Git evidence and explicit critical evaluation.

---

## 6. Improvement plan to achieve 70%+ (First Class)

### 6.1 Complete and publish the current work (immediate)

- Commit and push remaining local work (README, difficulty rules, related components and tests) so GitHub matches the demonstrated system.  
- Add the missing supporting files referred to in the README (environment example without secrets, test-case notes, presentation outline).  
- Keep secrets in `.env` only; never commit real `SESSION_SECRET` values.

### 6.2 Criterion 1 — version control strategies the chart names

- Use at least one **feature branch**, merge to `master`, and retain that history on GitHub.  
- Apply a **version tag** (for example `v1.0-assessment`) for the build shown to faculty.  
- Record a **code review** (pull request with comments) as evidence of review practice.  
- In the assessed talk, evaluate: why services are separated from routes; why the frontend must not compute the official score; an alternative architecture (single monolith, or multi-server sessions) and why it was not chosen.  
- Do not fabricate back-dated Git history.

### 6.3 Criterion 2 — justify event handling

In the presentation, take three handlers and state **why** each exists:

1. Form `submit` with `preventDefault` (avoid full page reload; keep SPA state).  
2. Client countdown **plus** server deadline (usability without allowing cheat scores).  
3. Async loading and error events (Banana API latency is a real interoperability event).

Name one rejected alternative (for example trusting `score` from the browser, or using only `alert()` with no application state).

### 6.4 Criterion 3 — critically justify the third-party web service

Show `bananaService.js` beside the official API documentation and justify:

- Protocol and data contract (HTTP GET, JSON, documented fields only).  
- Why the **backend** is the only caller (solution confidentiality).  
- Handling of third-party failure (timeout, HTTP error, malformed body).  
- Why tests mock the remote system.  
- Known limitation: the vendor API is HTTP, not HTTPS, as documented.

Rejected alternative: calling the Banana API directly from React (simpler, but the solution would reach the browser).

### 6.5 Criterion 4 — critically discuss authentication and alternatives

Discuss, with code on screen:

| Chosen mechanism | Role | Alternative considered | Why it was not used |
|---|---|---|---|
| bcrypt password hash | Protect stored credentials | Unsalted SHA-256 | Weaker against offline attacks |
| Server session + HttpOnly cookie | Establish and persist virtual identity | JWT stored in `localStorage` | Easier to steal via XSS; harder to revoke on logout |
| CSRF token on POST | Bind cookie use to this application | No CSRF defence | Cross-site POST could act as the user |
| `requireAuth` + `user_id` in SQL | Authorisation, not only authentication | Hiding result URLs only | Identifiers can be guessed |
| Local registration | Sufficient for this enterprise teaching system | OAuth (Google/GitHub) | Extra identity provider; not required to demonstrate cookies/sessions |

State remaining security limits honestly (no email verification; no password reset; sessions tied to one SQLite file).

### 6.6 Presentation structure (how the chart is applied)

Use the four rows as the agenda, not a screen-by-screen tour:

1. GitHub, components, branch/tag/review (about 2 minutes).  
2. Events: click → handler → HTTP → UI/server reaction (about 2 minutes).  
3. Banana API: request, response, errors, why backend (about 2 minutes).  
4. Virtual identity: hash, session, cookie, CSRF, `/me` (about 3 minutes).  
5. Alternatives and limitations (about 1 minute).

For each criterion, use: **“In this file, X does Y. I chose this instead of Z because…”**  
That sentence matches the 70% language (*evaluate, justify, critically discuss, alternative approaches*).

---

## 7. Request to faculty

This self-assessment is offered as a transparent account of **current evidence versus the published descriptors**. I am not asking for a mark to be awarded from this document alone. I am recording:

- a working implementation that already covers all four themes;  
- an estimated present band of **58–66%**;  
- a specific plan to evidence First Class **critical evaluation** and the version-control practices named in the 70% column.

I welcome feedback on whether this reading of the chart is aligned with the module’s expectations before the final submission and presentation.

---

**Student acknowledgement:** Parts of the codebase and of this written self-assessment were produced with AI assistance (Cursor). I am responsible for understanding, explaining, and defending every claim against the live repository.
