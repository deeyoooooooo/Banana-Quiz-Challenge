# Technical decisions

These notes explain the main design choices in Banana Quiz Challenge for the CIS046-3 assessment. They describe the application as it is implemented, including its limits.

## Git

Feature branches and pull requests keep unfinished work off the default branch until it has been reviewed and tested. A direct commit to `master` mixes experiments with the version that is meant to run. A branch such as `feature/assessment-improvements` records one purpose, a pull request shows the diff, and merging only after the tests pass leaves a history a marker can follow.

## Event-driven functionality

User actions are events, not a single script that runs from top to bottom. Submitting registration or login, choosing a difficulty, selecting a digit, sending an answer, and letting the countdown reach zero each call a handler. That handler sends an HTTP request; the backend then validates the session, checks the quiz deadline, scores the answer or records a timeout, and returns JSON the interface uses to update the page.

## Interoperability

The puzzles come from Marc Conrad's Banana Game API over HTTP using a JSON response (`out=json`). REST and JSON match a small browser application: one GET returns an image reference and a solution, and the backend adapter converts that object into the internal `{ question, solution }` shape. SOAP would add a heavier XML contract this teaching API does not provide. A hardcoded question list would not show interoperability, so a failed API call is reported as unavailable and is not replaced with a fake puzzle.

## Identity and authentication

Authentication uses server-side sessions stored in SQLite and an `HttpOnly` session cookie. The browser cannot read that cookie from JavaScript, which is safer than keeping a JWT in `localStorage`, where any script on the page could copy it. Logout destroys the session record, so the cookie no longer maps to a logged-in user. Cookie-authenticated POST requests also send a CSRF token. OAuth was not added: the assessment identity requirement is met by registration, bcrypt password hashes, login, logout, and password reset, without depending on a third-party identity provider.

## Password reset

A reset request creates a 32-byte random token. Only the SHA-256 hash of that token is stored, with an expiry time. In development the reset link is printed on the server console and is never returned in the JSON response. The response is the same whether or not the email is registered. Submitting a new password checks the hash, rejects expired or already used tokens, hashes the new password with the existing bcrypt settings, marks the token used, and clears that user's sessions.

## Database

SQLite fits this project because one Node process serves the site and can keep users, quiz results, sessions, and reset tokens in a local file. There is no separate database server to install. A deployment with several servers would need a shared database and a shared session store; SQLite and this session table are not a multi-server design.

## Limitations

The application is suitable for a local university demonstration, not a production launch. There is no OAuth. Password-reset links are delivered only by the development console, not by email. Quizzes depend on the external Banana API being reachable, and that API is documented as HTTP rather than HTTPS. The server keeps the puzzle solution out of browser responses, but anyone who calls the third-party API directly can still see it. Sessions and accounts live in one SQLite file, so this build is intended for a single server.
