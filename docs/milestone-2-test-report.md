# Milestone 2 test report: US-01 and US-09

Branch: `sprint1/turn1-setup-us01-us09` (changes not yet committed). Stories: US-01 Consumer registration and US-09 Arabic/English with right-to-left layout.

This report keeps three kinds of results apart:

1. **Manual tests** on a real phone with Expo Go, done by a person.
2. **Automated tests** (Jest) and checks run on the developer laptop.
3. **CI** (GitHub Actions).

## 1. Manual tests on the phone (Expo Go)

- **Tester:** Maryam
- **Date:** 2026-10-24
- **Phone and OS:** device name reported as "elinx9", Android 16 (recorded 2026-10-24, N-12). TalkBack version not recorded.
- **App build:** Expo Go, development server on the laptop, API on the laptop, local Docker database

| #   | Check                     | What was checked                                                                                                             | Requirements                                        | Result                                                                                                                           |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| M-1 | Welcome screen            | Logo, Register, Log in and the language switch display correctly                                                             | FR-ACC-09, IF-UI-02, NFR-06                         | Passed                                                                                                                           |
| M-2 | Language switching        | English and Arabic texts; RTL/LTR layout; header and back-arrow direction change; the choice is kept after reopening the app | FR-ACC-09, IF-UI-02, IF-UI-03, NFR-06               | Passed                                                                                                                           |
| M-3 | Registration screen       | Field visibility, password Show/Hide, layout, readability of error messages                                                  | FR-ACC-01, IF-UI-06, NFR-06                         | Passed                                                                                                                           |
| M-4 | Password validation       | The tested invalid and valid passwords behave as expected                                                                    | E-ACC-02 (rules D-11)                               | Passed                                                                                                                           |
| M-5 | Registration flow         | Empty and invalid inputs, successful registration with test data, already-registered feedback                                | FR-ACC-01, E-ACC-01, E-ACC-02                       | Passed                                                                                                                           |
| M-6 | Password rule labels (EN) | The three rules under the password field show their full text in English                                                     | NFR-06 (no clipped text), E-ACC-02                  | **Failed** in the first test; **Passed** in the retest after the fix (2026-10-24)                                                |
| M-7 | Log in button             | Tapping Log in shows the note "Log in will be available soon."                                                               | None in US-01 or US-09 (Log in is US-04, FR-ACC-04) | **Not in scope:** planned for Turn 3, works as designed for this turn (decision D-20). Not a defect. Confirmed again 2026-10-24. |
| M-8 | Duplicate mobile number   | Registering with a mobile number that is already registered shows the "This mobile number is already registered" error       | E-ACC-01                                            | Passed (2026-10-24)                                                                                                              |
| M-9 | Server status on Welcome  | With the API server stopped, the Welcome screen shows "Server: not reachable" (seen while diagnosing the connection)         | None (skeleton check HEALTH-04)                     | Observed (2026-10-24); not an SRS requirement                                                                                    |

**Where these results come from:** M-1 to M-6 (first run) are the tester's written results of the first phone session on 2026-10-24. The M-6 retest, M-7 and M-8 were confirmed by the tester in a second session the same day. M-9 was seen during the connection diagnosis. The N- checks below were added later; their status and source are given in their own table.

### Issue M-6: English password rule labels cut off

- **Found:** 2026-10-24, manual test M-6.
- **What the tester saw:** in English the rules read "At least 8 characters", "At least one", "At least one". The expected texts are "At least 8 characters", "At least one letter", "At least one number". The Arabic labels were complete.
- **Root cause:** the translations were complete (app/src/i18n/en.json), and the component passed the full text. Each rule label in app/src/components/PasswordRules.tsx sat in a row without a width from the layout; it was sized only to its own measured text width. On the phone that measured width came out too small, so the last word wrapped onto a second line that the one-line-high row did not show. The error messages under the fields already took the rest of their row (`flex: 1`) and were not affected.
- **Fix:** the rule label now takes the rest of its row (`flex: 1`, style `ruleText` in PasswordRules.tsx). No validation rule or other screen was changed.
- **Retest:** 2026-10-24, Maryam, Expo Go on the same phone. The English rules now read in full: "At least 8 characters", "At least one letter", "At least one number". The clipping is gone.
- **Status:** **Passed after the fix.** The Arabic labels were complete in the first test; this retest report covers the English labels.

### Log in (M-7): planned, not part of this turn

Log in and log out are US-04 (FR-ACC-04), assigned to Menna in Turn 3 of Sprint 1. Until then, tapping Log in on the Welcome screen or in the "already registered" notice shows "Log in will be available soon." (decision D-20 in PROGRESS.md). The tester confirmed this note appears. It is the planned behaviour for this turn and is **not a defect in US-01**. It is recorded here only so the next tester knows it is expected.

### Follow-up manual checks (N-1 to N-12)

Statuses as reported by the tester on 2026-10-24, on the device "elinx9" (Android 16, Expo Go). All N- checks were performed by the tester, Maryam, during the Turn 1 testing session on 2026-10-24.

| #    | Check                                                                                       | Requirements      | Status                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-1  | Screen-by-screen check in English and Arabic: Welcome, Register and Account created         | NFR-06, IF-UI-03  | **Passed** (2026-10-24): no visible clipping and no RTL issues on these three screens                                                                                     |
| N-2  | Arabic password rule labels after the fix (the retest covered English only)                 | NFR-06            | **Passed** (2026-10-24): the Arabic password rule labels were fully visible, with no clipping                                                                             |
| N-3  | Duplicate email, including different letter case, on the phone                              | E-ACC-01          | **Passed** (2026-10-24): a duplicate email was rejected, also with different capitalisation; no new account was created                                                   |
| N-4  | "Reset password" in the already-registered notice shows the "contact the NoWaste team" text | E-ACC-01 (D-20)   | **Passed** (2026-10-24): Reset password showed the expected contact-the-team message                                                                                      |
| N-5  | Register screen "We could not reach the server" notice (submit while the API is stopped)    | FR-ACC-01         | **Passed** (2026-10-24): with the backend stopped, registering showed the expected server connection error and the app did not crash; the server was restarted afterwards |
| N-6  | Successful registration, Account created screen and "Back to start" in both languages       | FR-ACC-01, NFR-06 | **Passed** (2026-10-24): successful registration, the Account created screen and Back to start worked in English and in Arabic                                            |
| N-7  | Sign-up walkthrough with TalkBack (Android)                                                 | NFR-07a, IF-UI-08 | **Needs Investigation / Blocked** (see below)                                                                                                                             |
| N-8  | Sign-up walkthrough with VoiceOver (iOS)                                                    | NFR-07a, IF-UI-08 | **Not Tested**: no iOS device test                                                                                                                                        |
| N-9  | Accessibility scanner report for contrast                                                   | NFR-07b           | **Not Tested**: deferred                                                                                                                                                  |
| N-10 | Test on both platforms (the SRS asks for one Android and one iOS device for NFR-14)         | NFR-14            | **Partly tested**: Android tested (elinx9, Android 16); iOS **Not Tested**. Cross-platform is not passed                                                                  |
| N-11 | Proofreading of the Arabic texts by an Arabic speaker                                       | NFR-06            | **Passed** (2026-10-24) for the Welcome, Register and Account created screens; other texts not reviewed                                                                   |
| N-12 | Record the test device and OS                                                               | –                 | **Done**: device name "elinx9" (as reported), Android 16, Expo Go                                                                                                         |

**Note on N-2 to N-6:** these were first recorded as **Unconfirmed**, because the tester reported them as passed without an earlier written record of the tests. On 2026-10-24 the tester confirmed that she personally performed N-2 to N-6 on her Android 16 phone with Expo Go during this testing session, and gave the observations shown in the table. They are now recorded as **Passed**. These results cover what is written in each row only: they do not cover the layout of each special screen state in each language (see docs/nfr-06-checklist.md) and they do not cover iOS (N-10).

### N-7 TalkBack walkthrough: Needs Investigation / Blocked

- **Device:** "elinx9", Android 16, Expo Go in development mode. TalkBack version not recorded. **Tester:** Maryam.
- **First observation (2026-10-24):** TalkBack correctly reads field names such as "Password", but it also announces unnecessary technical information, including text sizes, colours, and phrases such as "Language for accessibility". This does not happen in other apps on the same phone.
- **Diagnostic results (2026-10-24):**
  - TalkBack announces text formatting information, for example "55 pixels" and "text color grey", before reading text inside NoWaste.
  - This does **not** happen on the Expo Go home screen.
  - The Element Inspector option was not available in Expo Go's developer menu, so that check could not be done.
- **Status:** **Needs Investigation / Blocked.** Not passed and not failed. The root cause is **still unconfirmed**, so NFR-07a and IF-UI-08 cannot be signed off on Android. No app code was changed.
- **What the code review found (2026-10-24, no code changed):**
  - No accessibility label or hint in the app contains a size, colour or language. All labels and hints come from the translation files and are plain words.
  - React Native draws text on Android with formatting spans inside the text itself (font size and colour). If TalkBack describes text formatting, it can read these spans. "55 pixels" would fit a 16-point font (the app's body text size) on a screen of about 3.4x density, and "grey" would fit the app's grey secondary text colour. This makes the span explanation more likely, but it is **not confirmed**: Expo Go's home screen is also built with React Native and does not show the behaviour.
  - React Native's Android text code adds no language information, so "Language for accessibility" from the first observation is still unexplained.
  - Development information visible to everyone: the Welcome screen shows the server status line ("Server: connected"), a skeleton check kept for debugging (decision D-21). TalkBack reads it like any other text.
  - Smaller findings: the language-switch hint "Changes the language of the whole app" is repeated on both options; `aria-invalid` on the text fields has no effect on Android (invalid fields are announced through the error hint instead).
- **Remaining diagnostic steps (before any code change):**
  1. Note which element is focused when TalkBack says "55 pixels" or "text color grey", and whether it happens on every text or only some (for example only grey text).
  2. Record the TalkBack version (Settings, Accessibility, TalkBack, Settings, About).
  3. The team decides whether to investigate the text styling (a code change that needs approval) or to retest TalkBack in a development build instead of Expo Go.

## 2. Automated tests and checks (developer laptop)

### Final run before the Turn 1 commit

Run on 2026-10-24 at 03:49 on Windows 11, Node 24.22.1, npm 11.19.1, from the project root, with the Docker database `nowaste-db` running (healthy).

| Command             | Exit code | Result                                                                       |
| ------------------- | --------- | ---------------------------------------------------------------------------- |
| `npm test`          | 0         | Passed: server 92 tests in 5 suites, app 63 tests in 6 suites (155 in total) |
| `npm run lint`      | 0         | Passed, no errors or warnings                                                |
| `npm run typecheck` | 0         | Passed, no type errors                                                       |

`npm run build`, `npx prettier --check .` and the Android bundle export were not run again in this final run. Their last results are in the table below.

### Earlier run (after the M-6 fix)

Run on 2026-10-24 on Windows 11, Node 24.22.1, npm 11.19.1, from the project root, with the Docker database running and both migrations applied to the test database.

| Command                                        | Result                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm test`                                     | Passed: server 92 tests in 5 suites, app 63 tests in 6 suites (155 in total)               |
| `npm run lint`                                 | Passed (exit 0, no errors or warnings)                                                     |
| `npm run typecheck`                            | Passed (exit 0)                                                                            |
| `npm run build`                                | Passed (server compiled, exit 0)                                                           |
| `npx prettier --check .`                       | Passed (all files formatted)                                                               |
| `npx expo export --platform android` (in app/) | Passed: the Android bundle builds (the output went to a temporary folder outside the repo) |

New automated tests for issue M-6 (app/\_\_tests\_\_/password-rules.test.tsx):

| Test                                                                                                | Checks                                                                             |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| NFR-06 the translation files hold the full password rule texts                                      | The exact English and Arabic rule texts in en.json and ar.json                     |
| NFR-06 the Register screen shows the full password rules in English / Arabic                        | Each full rule text is on the screen (exact match, so a shortened text would fail) |
| NFR-06 each password rule label takes the rest of its row so its last word is not cut off (EN / AR) | The layout fix itself. These two tests fail when the fix is removed (checked)      |
| NFR-07a screen readers hear the full rule and whether it is met (English / Arabic)                  | The full rule text plus "met" / "not met" in the accessibility label               |

**Limit of the automated tests:** Jest does not draw text with real phone fonts, so it cannot measure whether text is cut off on a screen. The tests check the full text and the layout rule that prevents the cut; the manual retest (M-6, passed on 2026-10-24) confirmed the result on the real screen.

## 3. CI (GitHub Actions)

**Not run.** Nothing from these changes has been pushed, so the `test` job in .github/workflows/ci.yml has not run on them. Record the CI result here after the first push.

## 4. Decisions waiting for the team

These affect what the tests check. See PROGRESS.md for the full list.

- D-11 password rules (closes TBD-4), D-12 phone format, D-15 first-launch language English: need team approval.
- Open question 14: SRS 4.1.2 says registration also logs the consumer in. This build shows an "Account created" screen; log in arrives with US-04.
- Open question 15: the password rule lives in shared code, while CLAUDE.md says rule values come from the settings table.
