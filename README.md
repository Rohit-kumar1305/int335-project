# Exam Week Routine Kit
**INT335 Design Thinking Project — Problem Statement P013: Exam Week Without the Crash**

A complete, responsive, and client-side behavioural-design web application designed to help university students maintain balanced daily cornerstone routines (meals, hydration, and sleep) alongside their study goals during high-stress exam periods.

---

## 🌟 Key Features

1. **Main Dashboard**:
   - Live date display and context-aware greeting.
   - Dynamic Circular Routine Score (0–100%) tracking overall habit execution.
   - Real-time snapshot indicators for study sessions, meals eaten, glasses of water, and wind-down routine.

2. **Daily Routine Checklist**:
   - 6 actionable cornerstone items: Study task completed, Breakfast completed, Lunch completed, Dinner completed, Water goal reached, Evening wind-down completed.
   - Interactive ticking and unticking synchronized with routine status cards.

3. **Study Session Planner**:
   - Add study tasks with subject, start time, and end time.
   - Inline edit, mark completed (with strikethrough feedback), and delete sessions.
   - Real-time study completion percentage bar.

4. **Meal Reminders**:
   - Dedicated cards for Breakfast, Lunch, and Dinner.
   - Custom target meal times with toggleable "Pending / Completed" status.
   - Strictly behavioural reminder; does not provide diet plans or nutritional advice.

5. **Hydration Tracker**:
   - 1-click glass logging (+250ml) and decrement controls.
   - User-customizable personal daily reminder goal (default 8 glasses).
   - Instant daily reset for fresh starts.
   - Explicit disclaimer that the goal is student-selected and non-medical.

6. **Sleep & Wind-down Routine**:
   - Configurable planned bedtime and wake-up times.
   - Automatic calculation of planned rest hours window.
   - Dedicated evening wind-down checkbox to encourage stepping away from blue light.

7. **Authentic 7-Day Weekly Overview**:
   - Visual 7-day bar chart showing completion percentages across the past week.
   - Built on actual logged data (no fabricated or fake research numbers). Shows a clear empty state before any routine is logged.

8. **Daily Motivation & Reflection**:
   - Three structured self-reflection prompts:
     1. *What went well today?*
     2. *Which routine was difficult to maintain?*
     3. *What small change will I try tomorrow?*
   - Timestamped save state persisted in browser storage.

9. **Data Management & Reset**:
   - Persistent `localStorage` keeping user habits across browser refreshes and tabs.
   - Selective reset modal: Reset only today's routine or wipe the entire app clean.
   - Starter demo plan loader for immediate exploration.

---

## 🎨 Design Philosophy & Palette
- **Primary Calm Blue**: `#2563EB` / `#1D4ED8` — Evokes focus, clarity, and steady organization.
- **Supportive Calm Green**: `#10B981` / `#ECFDF5` — Positive habit reinforcement without cognitive overload.
- **Crisp White & Slate Neutrals**: `#FFFFFF` / `#F8FAFC` / `#0F172A` — High contrast, readable typography using *Plus Jakarta Sans*.
- **Mobile-First Responsive Layout**: Flexbox and CSS Grid adapt from small mobile screens up to 4K desktops.

---

## 🚀 How to Run the Web Application

The project is a zero-dependency, pure web front-end application. No Node.js build step, backend server, or database is required.

### Method 1: Direct Browser Launch (Fastest)
1. Navigate to the project directory:
   ```
   c:\Users\lenovo\OneDrive\Desktop\int\
   ```
2. Double-click `index.html` or right-click and select **Open with > Chrome / Edge / Firefox / Safari**.

### Method 2: Local HTTP Server (Python)
If you prefer running through a local development server:
```bash
# In the project directory:
python -m http.server 8000
```
Then visit `http://localhost:8000` in your web browser.

### Method 3: VS Code / IDE Live Server
If using VS Code or any modern IDE:
- Right-click `index.html` and click **"Open with Live Server"**.

---

## 🌐 Publishing the Prototype Online

You can deploy and share this prototype with evaluators or student peers for free in seconds:

### Option A: GitHub Pages
1. Push this folder to a GitHub repository.
2. In the repository settings, go to **Pages** > Select `main` branch > `/root` folder.
3. Click **Save**; your site will be live at `https://<username>.github.io/<repo-name>/`.

### Option B: Netlify / Vercel Drop
1. Go to [Netlify Drop](https://app.netlify.com/drop) or [Vercel](https://vercel.com).
2. Drag and drop the `int` folder containing `index.html`, `style.css`, and `app.js`.
3. An instant live URL is generated automatically.

---

## 🧪 Testing Report

All required functional test cases were executed and verified against the implementation.

| # | Test Case Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| **TC-01** | Add new study task with subject and time | Task displays in schedule list with time badge and unchecked box | Task appeared accurately with formatted time range badge | **PASS** |
| **TC-02** | Edit existing study task | Input fields prefill; updating title/time modifies existing item without duplicates | Form transitioned to edit mode, modified record in-place, and recalculated score | **PASS** |
| **TC-03** | Mark study task completed & delete | Checkbox marks strikethrough; delete button removes task after confirmation | Task marked finished, study progress updated to 100%, and deletion cleanly removed item | **PASS** |
| **TC-04** | Meal completion toggle & target time | Status switches between "Pending" and "Completed"; time change persists | Meals toggle correctly with visual pill status and timestamp persistence | **PASS** |
| **TC-05** | Hydration increment, decrement & reset | Glass counter increments, progress bar updates, reset button returns count to 0 | Glass count and bar responded immediately; daily reset successfully cleared count | **PASS** |
| **TC-06** | Custom water reminder goal | User can adjust goal from 8 to custom value (e.g. 10) | Progress bar adjusted scale to 10 and validated upper/lower bounds | **PASS** |
| **TC-07** | Sleep schedule & wind-down toggle | Planned bedtime/wake-up display duration window; wind-down checkbox updates checklist | Rest duration computed (e.g., 8.0 hours) across midnight; wind-down toggled | **PASS** |
| **TC-08** | Daily checklist bidirectional sync | Checking checklist items synchronizes dashboard score and individual cards | Checklist reflects study, meal, hydration, and sleep statuses in real-time | **PASS** |
| **TC-09** | Save and reopen daily reflections | Reflection prompts save to localStorage with formatted timestamp and reload intact | Positive, difficulty, and next step answers preserved and rendered on load | **PASS** |
| **TC-10** | Browser refresh data persistence | Hard refreshing the browser retains all tasks, logged water, and meal status | All state retrieved cleanly from `localStorage` without data loss | **PASS** |
| **TC-11** | Mobile and desktop responsive layout | UI columns stack gracefully on viewports < 992px and < 640px | Tested across screen widths; layout adapts smoothly without horizontal overflow | **PASS** |
| **TC-12** | Input validation & empty field handling | Submitting blank task or invalid time string shows inline warning | Helpful error text surfaced; invalid submissions prevented gracefully | **PASS** |
| **TC-13** | Reset function (Today vs All Data) | Reset modal presents options to clear today only or reset entire application history | "Reset Today" reset daily routine; "Reset All" cleared complete localStorage state | **PASS** |

---

## 👥 INT335 Coursework Credits
- **Course**: INT335 Design Thinking
- **Problem Statement**: P013 — Exam Week Without the Crash
- **Artifact**: Interactive Behavioural-Design Web Application Prototype
