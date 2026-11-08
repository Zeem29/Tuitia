# Tuitia

**Every naira. Every source. One clear picture.**

Tuitia is a demonstration of a financial operating system for university fee payments in Nigeria. It shows how a bursary office could see every tuition payment, from every payer, matched to the right student, in one place.

> **This is a demonstration.** All students, payments and institutions are fictional. Payments are simulated. Tuitia does **not** process payments, does not connect to any bank, Paystack, Remita or Flutterwave, and never holds or moves money. Channel names such as "Paystack" and "Remita" are labels only.

---

## Table of contents

1. [What Tuitia is](#1-what-tuitia-is)
2. [What you can do in the demo](#2-what-you-can-do-in-the-demo)
3. [Tech stack and design choices](#3-tech-stack-and-design-choices)
4. [Getting started](#4-getting-started)
5. [Project structure](#5-project-structure)
6. [How the app starts and moves between screens](#6-how-the-app-starts-and-moves-between-screens)
7. [The data model](#7-the-data-model)
8. [The demo data](#8-the-demo-data)
9. [The business rules, step by step](#9-the-business-rules-step-by-step)
10. [Screen-by-screen guide](#10-screen-by-screen-guide)
11. [Pop-ups, forms and interactions](#11-pop-ups-forms-and-interactions)
12. [Look and feel (design system)](#12-look-and-feel-design-system)
13. [Responsive behaviour](#13-responsive-behaviour)
14. [Accessibility](#14-accessibility)
15. [Saving data and resetting](#15-saving-data-and-resetting)
16. [Tests](#16-tests)
17. [Known limitations](#17-known-limitations)
18. [Roadmap (not built)](#18-roadmap-not-built)
19. [Glossary](#19-glossary)

---

## 1. What Tuitia is

Universities collect tuition from many people at once: parents, guardians, students, scholarship bodies and student-loan schemes. They pay through different channels (bank transfer, Paystack, Remita). The bursary office then has to work out who paid for whom.

Tuitia solves this with one idea: **every student gets a unique Tuitia Reference Code** (for example `TU-BEL-4721-K9P`). Anyone paying for that student includes the code. When a payment confirmation arrives, Tuitia reads the code, finds the student and credits the payment automatically.

The demo has two experiences that share the same data and the same matching engine:

| Experience | For | What it shows |
|---|---|---|
| **Student Demo** | A student | Their fee, their reference code, their payment history, and a way to simulate a contribution |
| **Bursary Workspace** | A bursary administrator | Live totals, every payment, an unmatched queue, a student directory and clearance status |

Because both use one engine, a payment simulated in the Student Demo appears in the Bursary Workspace straight away, and the other way round.

## 2. What you can do in the demo

- Open the **Student Demo** as one of 12 fictional students, and copy their reference code.
- **Simulate a contribution** from a parent, guardian, student, scholarship or loan scheme.
- Watch the payment be **reconciled automatically** when the code is right.
- Enter a wrong code and see the payment land in the **unmatched queue**.
- As the administrator, **assign an unmatched payment** to the right student by hand.
- Reuse a transaction ID and see **duplicate protection** block it.
- Search and filter payments and students.
- See **clearance status** (Cleared, Partially paid, Not cleared) and **overpayment** flags.
- **Reset** the demo to its starting data at any time.

## 3. Tech stack and design choices

| Choice | Detail |
|---|---|
| Languages | Plain HTML, CSS and vanilla JavaScript. No framework, no build step, no dependencies to install |
| Fonts | Fraunces (headings), DM Sans (interface), JetBrains Mono (codes and IDs), loaded from Google Fonts |
| Storage | The browser's `localStorage`. No server, no database |
| Routing | The URL hash (`#/student`, `#/bursary/overview`), so refresh and the back button work |
| Money | Always stored as whole **kobo** (1 naira = 100 kobo) to avoid rounding errors |
| Structure | Every file adds its functions to one global object called `Tuitia` (written `T` inside each file). There are no imports, so **script order matters** |
| Derived values | Totals, balances and statuses are **never stored**. They are calculated from the list of transactions every time |

## 4. Getting started

### Run it

The app is a static website. Any static file server works.

1. Put the `client` folder somewhere on your computer.
2. Serve it. For example, from the project folder:
   ```
   npx serve client
   ```
   or open `client/index.html` with a "Live Server" extension in your editor.
3. Open the address it prints. The app starts on the Student Demo.

Notes:
- Opening `index.html` straight from the disk mostly works. The "Copy code" button needs `https` or `localhost`, but has a fallback.
- Your browser must allow `localStorage`.
- The page needs internet once to load the Google Fonts. Without it, the app falls back to system fonts.

### Run the logic tests

You need [Node.js](https://nodejs.org). From the project folder:

```
node client/public/tests/engine-tests.cjs
```

You should see 26 passing tests.

### Use your own logo

Put your logo at `client/public/assets/logo.png`. The favicon and phone icon are made from the same image.

## 5. Project structure

Everything for Tuitia lives in `client/public/`.

```
client/
  index.html                      Page shell: fonts, 3 CSS files, then 11 JS files in order
  public/
    assets/logo.png               The Tuitia logo
    favicon.png                   Browser tab icon
    apple-touch-icon.png          Phone home-screen icon
    og.png                        Share-preview image
    robots.txt                    Search engine rules
    css/
      style.css                   Colours, fonts, spacing, layout, sidebar, header
      components.css              Buttons, cards, tables, badges, forms, modals, toasts
      responsive.css              Laptop, tablet and phone rules
    js/                           (load order, top to bottom)
      data.js                     Settings, helpers, demo seed data
      storage.js                  The one shared state, save, load, reset
      students.js                 Reference codes, student lookup, balances, clearance
      payments.js                 Validation, transaction queries, totals, alerts
      reconciliation.js           The matching engine
      ui.js                       Icons, badges, tables, toasts, modals, copy
      simulate.js                 The "simulate a payment" form
      student-view.js             The Student Demo screen
      dashboard.js                The five Bursary pages and their pop-ups
      navigation.js               Routing and the app shell
      app.js                      Start-up and every click, filter and form
    tests/
      engine-tests.cjs            26 logic tests
```

The other folders in the repository (`client/src`, `server`, `shared`, Dockerfiles, `docker-compose.yml`, `nginx.conf`) are workspace starter files. The Tuitia screens do not use them.

### What each file is responsible for

| File | Responsibility |
|---|---|
| `data.js` | `T.CONFIG` (sources, channels, limits), `T.util` (money and date formatting, escaping, initials) and `T.buildSeedState()` (the fictional world) |
| `storage.js` | Holds `T.state`; `saveState`, `loadState`, `resetState`; `subscribe` and `notify` so screens redraw when data changes |
| `students.js` | Create, normalise, validate and look up reference codes; find students; total paid; outstanding; overpayment; clearance status |
| `payments.js` | Naira to kobo conversion; transaction validation; lists (unmatched, reconciled, recent); filters and sorting; totals; daily summary; clearance counts; overpayment list; alerts |
| `reconciliation.js` | `reconcilePayment` (automatic matching) and `manuallyReconcilePayment` |
| `ui.js` | Icons, status badges, code chips, empty states, stat cards, tables, toasts, modals, confirm dialog, copy to clipboard, keyboard handling for dialogs |
| `simulate.js` | The simulate form, its inline errors and its result panel |
| `student-view.js` | The Student Demo page |
| `dashboard.js` | Overview, Payments, Reconciliation, Students, Clearance, plus the detail pop-ups |
| `navigation.js` | Reads the URL, draws the sidebar, bottom bar and demo bar, picks the page, updates alert badges |
| `app.js` | Starts everything and handles all clicks through one listener |

## 6. How the app starts and moves between screens

### Start-up, step by step

1. `index.html` loads, containing only an empty `#root`, a `#modal-root`, a `#toast-root` and the script tags.
2. The scripts load in order. Each attaches its functions to the global `Tuitia` object.
3. `app.js` calls `loadState()`. If saved data exists and is valid, it is used. Otherwise the demo seed data is built.
4. `app.js` subscribes the page redraw to data changes, listens for URL changes, and calls `renderApp()`.
5. JavaScript draws the whole interface into `#root`.

### Routes

| Address | Screen |
|---|---|
| `#/welcome` | "About this demo" introduction and entry |
| `#/student` | Student Demo (also the default for unknown addresses) |
| `#/bursary/overview` | Bursary: Overview |
| `#/bursary/payments` | Bursary: Payments |
| `#/bursary/reconciliation` | Bursary: Reconciliation |
| `#/bursary/students` | Bursary: Students |
| `#/bursary/clearance` | Bursary: Clearance. Add `?filter=cleared`, `partial`, `not-cleared` or `overpaid` to open a tab directly |

An unknown bursary section falls back to Overview.

### The shell

- **Demo bar** (top): a "DEMO" tag, the line "Fictional students. Simulated payments. No real money moves.", a switch between Student Demo and Bursary Workspace, an "About this demo" link and a "Reset demo data" button.
- **Sidebar** (laptop and up): the Tuitia logo and the five Bursary sections, with an amber count badge on Reconciliation.
- **Bottom navigation** (tablet and phone): the same five sections as a bar at the bottom.
- **Bursary header**: page title, description, a "Simulate incoming payment" button, a bell with the unmatched-payment count, and the administrator's name and role.

## 7. The data model

All state sits in one object, `T.state`, defined in `storage.js` and saved to `localStorage`.

```
state = {
  version: 1,
  students: [ ... ],
  transactions: [ ... ],
  duplicateAttempts: [ ... ],
  settings: { demoStudentId, institution, adminName, adminRole }
}
```

### Student

| Field | Meaning |
|---|---|
| `id` | `s01`, `s02`, ... |
| `fullName` | Full name |
| `matricNumber` | For example `FU/20/LAW/0187` |
| `faculty`, `department`, `level` | Where the student studies |
| `requiredFees` | Fee for the session, in kobo |
| `referenceCode` | The unique Tuitia code |
| `createdAt` | Creation time |

A student has **no** stored "paid" or "balance" field.

### Transaction

| Field | Meaning |
|---|---|
| `id` | Internal id, `tx-001`, `tx-002`, ... |
| `transactionId` | The payment provider's id, for example `PSK-20481937` |
| `referenceCode` | The code that came with the payment |
| `amountKobo` | Amount in kobo |
| `source` | Parent, Guardian, Student, Scholarship or Student loan |
| `channel` | Bank transfer, Paystack or Remita |
| `date`, `time` | `YYYY-MM-DD` and `HH:MM` |
| `status` | `reconciled` or `unmatched` |
| `studentId` | The student credited, or `null` when unmatched |
| `reconciliation` | How it was matched: `automatic` or `manual`, when and why, or the reason it is unmatched |

### Duplicate attempt

A repeat of a transaction ID that was already processed. It records the transaction ID, code, amount, source, channel, when it was attempted and which original transaction it repeated. **It is kept apart from the ledger and never counted.**

### Allowed values

- **Sources:** Parent, Guardian, Student, Scholarship, Student loan
- **Channels:** Bank transfer, Paystack, Remita
- **Maximum single amount:** ₦50,000,000 (a demo safety limit)
- **Page size for tables:** 10 rows

## 8. The demo data

Everything is fictional. Demo University (fictional); administrator **Folasade Adekunle**, Bursary Administrator.

### 12 students

| # | Student | Faculty | Fee | Reference code |
|---|---|---|---|---|
| 1 | Chinedu Okafor | Science | ₦250,000 | TU-OKA-2048-H7M |
| 2 | **Aisha Bello** (default demo student) | Law | ₦200,000 | TU-BEL-4721-K9P |
| 3 | Tunde Adebayo | Engineering | ₦220,000 | TU-ADE-3315-R4X |
| 4 | Ngozi Eze | Arts | ₦180,000 | TU-EZE-5902-W2N |
| 5 | Ibrahim Musa | Engineering | ₦300,000 | TU-MUS-1187-T8C |
| 6 | Folake Adeyemi | Social Sciences | ₦220,000 | TU-ADE-7640-B5Q |
| 7 | Emeka Nwosu | Science | ₦240,000 | TU-NWO-8236-F3D |
| 8 | Zainab Yusuf | Health Sciences | ₦200,000 | TU-YUS-6419-J6V |
| 9 | Oluwaseun Balogun | Engineering | ₦260,000 | TU-BAL-2753-M9Z |
| 10 | Hauwa Garba | Social Sciences | ₦190,000 | TU-GAR-9084-P2L |
| 11 | Kelechi Obi | Management Sciences | ₦210,000 | TU-OBI-3571-G7S |
| 12 | Damilola Ogunleye | Arts | ₦230,000 | TU-OGU-4468-X8A |

### Payments (21 on the ledger)

- **18 reconciled** payments across students 1, 2, 4, 5, 6, 7, 9, 10 and 11, mixing sources and channels.
- **3 unmatched** payments that carry codes no student holds:
  - `PSK-20760932`, ₦25,000, code `TU-MUS-1178-T8C` (a typo of Ibrahim Musa's code)
  - `BNK-55301775`, ₦60,000, code `TU-BEL-4712-K9P` (a typo of Aisha Bello's code)
  - `RMT-70402291`, ₦85,000, code `TU-ELE-9931-Q4R`
- **1 duplicate attempt:** a repeat of `PSK-20745608`, ₦60,000, which is blocked and not counted.
- Dates are written as "days ago", so "today" always has activity.

### Scenarios built into the data

| Student | Situation |
|---|---|
| Aisha Bello | Partly paid: ₦125,000 of ₦200,000 |
| Hauwa Garba | Fully paid: ₦190,000 of ₦190,000 (cleared exactly) |
| Ngozi Eze | **Overpaid:** ₦200,000 against ₦180,000, excess ₦20,000 |
| Zainab Yusuf, Tunde Adebayo, Damilola Ogunleye | No payments yet (Not cleared) |
| Several others | Mixed sources, for example parent + guardian + student |

### Numbers on a fresh demo

- Total transactions: **21**; matched **18** (₦1,605,000); unmatched **3** (₦170,000); duplicates blocked **1**
- Students cleared: **4 of 12**
- Reconciliation badge: **3**

## 9. The business rules, step by step

### 9.1 Reference codes

- Format: `TU-<first 3 letters of surname>-<4 digits>-<3 letters or digits>`, for example `TU-BEL-4721-K9P`.
- `generateReferenceCode(name)` keeps generating until the code is not already taken, so codes are unique.
- Seed codes are fixed, so they do not change when the page reloads.
- Matching is **exact** after trimming spaces and upper-casing. `tu-bel-4721-k9p` matches; `TU-BEL-4712-K9P` (digits swapped) does not.

### 9.2 Entering an amount

`parseNairaToKobo` accepts text such as `50,000`, `₦50000` or `1250.50`.
- Commas, spaces and the ₦ sign are removed.
- Up to 2 decimal places are allowed.
- Empty text, letters or zero give an inline error.
- The result is converted to whole kobo (`50000` becomes `5000000`).

### 9.3 Validation

A payment is only recorded if all of these pass; otherwise nothing is stored and each failing field gets an inline message.

| Field | Rule |
|---|---|
| Transaction ID | Required |
| Reference code | Required |
| Amount | A whole number of kobo, greater than 0, and at most ₦50,000,000 |
| Source | One of the 5 allowed sources |
| Channel | One of the 3 allowed channels |
| Date | A real date, not in the future (defaults to today) |
| Time | A valid `HH:MM` (defaults to now) |

### 9.4 Reconciliation (`reconcilePayment`)

Both forms in the app call this one function. It returns one of four outcomes.

1. **Receive** the payment and fill in today's date and the current time if missing.
2. **Validate** it. If invalid, the outcome is `invalid` and nothing is stored.
3. **Check for a duplicate.** If the transaction ID was already processed, the outcome is `duplicate`. The attempt is saved in the duplicate list and **not** added to the ledger.
4. **Look for a student** whose code matches exactly.
5. **Found:** store the transaction as `reconciled` with method `automatic`. Outcome: `reconciled`.
6. **Not found:** store the transaction as `unmatched` with the reason "No student holds this reference code". It is credited to nobody. Outcome: `unmatched`.
7. **Save** to `localStorage` and **notify** so every open screen redraws.

### 9.5 Manual reconciliation (`manuallyReconcilePayment`)

For an administrator fixing an unmatched payment:
- It refuses a payment that is already reconciled, or a student that does not exist.
- Otherwise it assigns the payment, marks it `reconciled` with method `manual`, saves and notifies.
- The interface asks the administrator to confirm before assigning.

### 9.6 Money rules

| Value | Calculation |
|---|---|
| Total paid | Sum of every `reconciled` transaction for the student, from any source |
| Outstanding balance | `max(0, required fee - total paid)` |
| Overpayment | `max(0, total paid - required fee)` |
| Percent paid | `paid / fee`, capped at 100% |

Unmatched payments and duplicates are **never** counted in any student's total.

### 9.7 Clearance status

| Condition | Status |
|---|---|
| Total paid is 0 | **Not cleared** |
| Some paid, but less than the fee | **Partially paid** |
| Paid at least the fee | **Cleared** |

An overpaid student is Cleared and is also flagged as an overpayment exception. Tuitia flags this for review only. **It never issues a refund.**

### 9.8 Operational alerts

Calculated live and shown on the Overview and in the bell:
- unmatched payments waiting (with the total amount);
- duplicate attempts blocked;
- overpayment flags (with names and excess);
- students with outstanding balances (with the total still to be received).

### 9.9 Dashboard figures

Totals, the daily summary, clearance counts and alerts are all computed from the transaction list in `payments.js`. The screens only display them, so a figure can never disagree with the underlying data.

### 9.10 Search and filters

Search is case-insensitive and combines with every filter. Typing redraws only the results area, so the cursor and focus stay where they are.

## 10. Screen-by-screen guide

### 10.1 Welcome / About this demo (`#/welcome`)
Opened from the "About this demo" link in the demo bar. It has the headline "Every naira. Every source. One clear picture.", two entry cards (Student Demo, marked "Start here", and Bursary Workspace), a four-step "How it works" list (a payment confirmation arrives; Tuitia reads the reference code; it is matched or queued; everyone sees one clear picture), and two boxes: "What this demonstration is" and "What it is not".

### 10.2 Student Demo (`#/student`)
Shows a limited, student's-eye view.
1. **Banner:** "Student Demo. A limited view of ...", which can be dismissed.
2. **Student header:** initials avatar, name, matric number, and a **drop-down to switch between the 12 students**.
3. **Fee summary cards:** Fee due, Paid so far, Outstanding, and Clearance status with a progress bar and percent paid.
4. **Your Tuitia Reference Code:** the code in large type with a **Copy code** button and the instruction to include it with every fee payment.
5. **How it works:** a short explanation plus **Simulate a contribution** and **Open Bursary Workspace** buttons.
6. **Payment history:** a table of date, amount, source, channel, transaction ID and status, with a count of reconciled payments.

### 10.3 Bursary: Overview (`#/bursary/overview`)
- **Row 1, three cards:** Total payments received; Successfully reconciled; Unmatched payments (with a link to review).
- **Row 2, four cards:** Total students; Cleared; Partially paid; Not cleared (each links to the matching Clearance tab).
- **Left column:** Recent payment activity (latest 8, newest first) and Operational alerts.
- **Right column:** Today's summary (amount received, transactions, reconciled, unmatched), **Find a student** (live search by name, matric or code), and the Unmatched queue preview with Review buttons.

### 10.4 Bursary: Payments (`#/bursary/payments`)
A single live feed of all payments.
- **Search** by transaction ID, student or reference code.
- **Filters:** Status, Source, Channel.
- **Sort:** Newest first, Oldest first, Amount high to low, Amount low to high.
- 10 rows per page with Previous/Next.
- Clicking a row opens the transaction detail pop-up.
- A "No payments match" empty state offers to clear filters.

### 10.5 Bursary: Reconciliation (`#/bursary/reconciliation`)
Where exceptions are handled.
- **Four cards:** Total transactions; Matched; Unmatched; Duplicate attempts.
- **Banner** summarising unmatched payments and overpayments.
- **Unmatched payment queue:** transaction ID, reference code received, amount, source, channel, date, reason and a **Review** button.
- **Overpayment exceptions:** student, required fees, total paid, excess and the transactions involved. A note says nothing is refunded automatically.
- **Duplicate attempts:** transaction ID, amount not counted, source and when it was attempted.
- **Recently matched:** transaction, student, amount, how it was matched and date.

### 10.6 Bursary: Students (`#/bursary/students`)
An internal directory with search (name, matric or code) and filters for Faculty, Department and Clearance. Each row shows the student, matric number, faculty and department, level, fee, paid, outstanding, status and code. Clicking a name opens the student pop-up.

### 10.7 Bursary: Clearance (`#/bursary/clearance`)
Tabs with live counts: **All, Cleared, Partially paid, Not cleared, Overpayment exception**. Each tab lists the matching students with their fee, amount paid, outstanding balance and status. Links from the Overview open the right tab directly.

## 11. Pop-ups, forms and interactions

### 11.1 Simulate a contribution (Student Demo)
- **Fields:** Who is contributing (source), Amount (₦), Payment channel, Transaction ID (auto-generated, with a **New ID** button), and the student's reference code.
- The code is locked. A checkbox, "Edit the code (only to demonstrate an unmatched payment)", unlocks it.
- A notice says nothing real happens.
- **Submit** shows inline errors if anything is invalid, plus a toast "Please fix the highlighted fields."
- **On success** the pop-up shows a result panel:
  - *Reconciled:* transaction ID, who was credited, total paid now, outstanding balance and clearance status. Buttons: **View in Bursary Workspace**, **Simulate another**, **Done**.
  - *Unmatched:* explains that no student holds the code and the payment waits in the queue.
  - *Duplicate:* explains that the transaction ID was already processed and was blocked.

### 11.2 Simulate incoming payment (Bursary)
The same form, but with a free reference-code field (not locked), so an administrator can try any code. It calls the same engine.

### 11.3 Transaction detail
Opens from any payment row. Shows transaction ID, reference code, amount, source, channel, date, status, who it was credited to (a link to the student) and how it was matched. An unmatched payment has a **Review and assign** button.

### 11.4 Student detail
Opens from any student name. Shows personal and academic details, the reference code with a copy button, the fee summary, the full payment history and a **Simulate payment** shortcut with the code pre-filled.

### 11.5 Review unmatched payment
A warning that the payment is not credited to anyone, the payment's details, the reason it is unmatched, and a **Choose a student** drop-down. **Assign payment** asks for confirmation, then credits the student and shows "Manual reconciliation complete".

### 11.6 Shared behaviour
- **One click listener** on the whole document reads `data-action` attributes (event delegation), so new content needs no extra wiring.
- **Toasts** confirm each outcome (success, warning, error) and can be dismissed.
- **Escape** closes the top pop-up; **Tab** stays inside it; focus returns to where it was.
- **Reset demo data** asks for confirmation, then restores the starting data.
- The **bell** in the Bursary header shows the number of unmatched payments and links to Reconciliation. The full list of alerts is on the Overview.
- **Copy code** copies to the clipboard with a fallback for older browsers.

## 12. Look and feel (design system)

Defined as CSS variables at the top of `style.css`.

### Colours

| Name | Value | Use |
|---|---|---|
| Navy | `#1a1265` | Brand, primary buttons, headings accents |
| Navy deep | `#0f0b3d` | Demo bar and sidebar background |
| Cream | `#ebebdf` | Brand accent surface |
| Page background | `#f5f4ec` | Main background |
| Surface | `#ffffff` | Cards and tables |
| Text | `#17143a` | Main text |
| Muted | `#5d5a73` | Secondary text |
| Green / green ink | `#1a7a4a` / `#14653c` | Cleared, reconciled, success |
| Amber / amber ink | `#c47d0e` / `#7d4e03` | Partially paid, unmatched, warnings |
| Danger | `#a82a2a` | Errors |
| Border | `#dedcce` | Dividers and outlines |

Status colours always come with text or an icon, never colour alone.

### Type

- **Headings:** Fraunces (a serif), giving a trusted, institutional tone.
- **Interface:** DM Sans.
- **Codes, IDs, amounts in tables:** JetBrains Mono, so reference codes are easy to read and compare.

### Shape and depth
- Corner radius 8px (6px for small items).
- Soft shadows: a light one for cards, a larger one for pop-ups.
- Sidebar width 248px; demo bar height 44px.

### Components
Buttons (primary, secondary, small), cards, stat cards, tables, status badges (with a dot), code chips, form fields, tabs, filter bars, pager, toasts, modals, alerts, empty states and a progress bar.

## 13. Responsive behaviour

Breakpoints are in `responsive.css`.

| Width | What changes |
|---|---|
| Up to 1200px | Grids tighten |
| Up to 960px | The sidebar becomes a **bottom navigation bar** and multi-column layouts stack |
| Up to 720px | Each table row becomes a **card** (using each cell's `data-label`), pop-ups slide up as a **sheet**, and stat cards stack |

Animation is switched off for people who prefer reduced motion.

## 14. Accessibility

- Every form field has a visible label, and errors are shown next to the field.
- Dialogs trap focus, close on Escape and return focus on close.
- Status is shown with words and icons as well as colour.
- Result areas use `aria-live`, so screen readers hear updates.
- Tables have captions and headers.
- Text colours were checked for contrast of at least 4.5 on the pages tested.

Not fully verified: a complete keyboard-only and screen-reader pass.

## 15. Saving data and resetting

- Storage key: `tuitia.demo.state.v1` in `localStorage`.
- The state is saved after **every** change and loaded on start. The seed data never overwrites saved data.
- If the saved data is missing a required part or cannot be read, Tuitia replaces it with the seed data and shows a warning.
- **Reset demo data** (demo bar) asks for confirmation, then restores the starting state.
- Data stays in **this browser only**. Another browser or device starts fresh.

## 16. Tests

`client/public/tests/engine-tests.cjs` runs 26 checks in Node without a browser. It loads the real engine files and covers:

- reference code uniqueness, stability across reloads, exact matching, and typo rejection;
- seed scenarios and totals agreeing with the ledger;
- invalid input (zero, negative, missing ID or code, bad source or channel) leaving the ledger untouched;
- automatic reconciliation, exact clearance, overpayment, a student with no payments, and several sources for one student;
- padded and lower-case codes, unknown and malformed codes;
- duplicate blocking;
- manual reconciliation, repeated manual reconciliation, and an unknown student;
- saving and loading, corrupt storage, and reset;
- naira formatting and whole-kobo sums.

Run with `node client/public/tests/engine-tests.cjs`.

## 17. Known limitations

- All data is fictional and simulated. No real payment is ever made or read.
- No sign-in. Anyone who opens the page sees both experiences.
- Data lives in one browser's `localStorage`, with no server or database.
- The Student Demo is a limited presentation, not a real student portal.
- No refunds, receipts, emails, SMS, reports export or multi-institution support.
- Tested in a headless Chromium browser only. Real touch devices, other browsers and a full screen-reader pass are not verified.

## 18. Roadmap (not built)

These are future phases and are **not** part of the demo:

1. A real database and server in place of `localStorage`.
2. Sign-in for students and bursary staff, with roles.
3. A real student portal.
4. Live connections to payment providers for confirmations.
5. Receipts, notifications, and export of reports.
6. Refund workflow for overpayments.

## 19. Glossary

| Term | Meaning |
|---|---|
| **Tuitia Reference Code** | The unique code per student, included with every payment so Tuitia can identify the student |
| **Reconciliation** | Matching a payment to the right student |
| **Reconciled** | A payment matched to a student and counted |
| **Unmatched** | A payment whose code matches nobody; waits for manual review and counts for no student |
| **Duplicate attempt** | A repeat of an already-processed transaction ID; blocked and not counted |
| **Overpayment** | A student has paid more than the required fee |
| **Clearance** | Whether a student has paid enough: Cleared, Partially paid or Not cleared |
| **Kobo** | One hundredth of a naira; all money is stored in kobo |
| **Bursary** | The university office that collects fees |
| **Matric number** | A student's registration number |
