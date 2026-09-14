# Tekor

An expense tracker that understands one sentence.

Type `makan siang 25rb` and it becomes a categorized transaction. Then see where the money went through daily and monthly dashboards, receipt scanning, a question box, and a monthly statement with running balance.

Tekor is a progressive web app: it installs on Android from the browser and opens fullscreen like a native app.

## Features

- **One line input.** A rule based parser reads the amount, category, and note from a sentence. Amount suffixes like `rb`, `ribu`, `k`, `jt`, and `juta` are understood.
- **AI as a fallback, not the main path.** When the rules are unsure, the sentence is sent to Gemini through a server function. Gemini can also split one sentence into several transactions.
- **Receipt scanning.** Photograph a receipt or pick one from the gallery. Gemini reads the merchant, date, total, and items; the user confirms before anything is saved.
- **Dashboard.** Monthly total, number of transactions, daily average, largest transaction, a bar chart per day, expandable totals per day, and spending per category.
- **Monthly summary.** A few sentences about the month, written by Gemini from aggregate numbers only. No individual transaction is sent.
- **Question box.** Ask in plain language, for example `habis berapa buat kopi bulan ini?`. Gemini only translates the question into a filter; the app computes the answer from the database.
- **Statement.** Opening balance, money in, money out, closing balance, and every transaction with the balance after it.
- **Categories.** Add, rename, and delete categories and their keywords. The parser follows whatever the user edits.
- **Income.** Keywords like `gajian` mark a transaction as income.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Recharts |
| Backend | Supabase: Postgres with row level security, Auth, Edge Functions (Deno) |
| AI | Gemini API, called only from Edge Functions so the key never reaches the browser |
| PWA | vite-plugin-pwa (manifest, service worker, offline shell) |
| Hosting | Vercel |

## How the parser works

```
sentence
  -> rule based parser (instant, free)
       -> amount found and category matched   -> save
       -> unsure                               -> Edge Function parse-expense -> Gemini -> save
```

Categories and their keywords live in the `categories` table, so the rules improve as the user edits them.

## Privacy and security

- The Gemini API key is stored as a Supabase secret and used only inside Edge Functions.
- Every Edge Function requires a signed in user (`withSupabase({ auth: "user" })`).
- All tables use row level security. The database, not the app, stamps the owner of each row (`user_id default auth.uid()`).
- The monthly summary sends totals only. The question box sends the question only. Receipt scanning sends the photo.

## Project structure

```
src/
  components/   Login, Home, ExpensesForm, ReceiptScanner, ExpenseList, DayGroup, InsightCard, MonthPicker, PageShell
  pages/        Dashboard, Categories, Statement, Ask
  lib/          parser, categories, gemini, receipt, insight, ask, expenses, stats, month, format, image, supabase
supabase/
  migrations/   SQL for tables, policies, triggers, and default categories
  functions/    parse-expense, scan-receipt, monthly-insight, ask-query, _shared/gemini.ts
```

## Running locally

Requirements: Node 20 or newer, a Supabase project, and a Gemini API key.

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create `.env.local` from the example and fill in your Supabase project URL and publishable key.

   ```bash
   cp .env.example .env.local
   ```

3. In the Supabase SQL Editor, run the migration in `supabase/migrations/` and create a user under Authentication.

4. Deploy the Edge Functions and set the Gemini key.

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase secrets set GEMINI_API_KEY=<your-key>
   npx supabase functions deploy
   ```

   The model can be changed without redeploying: `npx supabase secrets set GEMINI_MODEL=<model-name>`.

5. Start the dev server.

   ```bash
   npm run dev
   ```

## Deploying

The app is a static build (`npm run build` produces `dist/`). On Vercel, import the repository, add the two environment variables from `.env.example`, and deploy. `vercel.json` rewrites every route to `index.html` for React Router.

After deploying, add the site URL to Supabase under Authentication, URL Configuration.

## Author

Brian Natanael Nainggolan. Built as a personal project to learn, with the help of an AI coding assistant for writing and refactoring code.
