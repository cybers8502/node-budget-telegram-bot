# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

Source is TypeScript in `functions/src/`, compiled by `tsc` to `functions/lib/` (git-ignored; `package.json` `main` is `lib/index.js`). Shared types (`Expense`, `UserState`, `Step`) are in `src/types.ts`.

The git repository root is the project root: the bot lives in `functions/`, and `firebase.json` is tracked at the root. `firestore.rules`, `.firebaserc` and `budget-widget.js` stay local and git-ignored because they carry the project id, the budget id and a personal chat id (the GitHub repository is public); never commit them, any service-account key, or deploy a key (the bot needs none: Firebase Admin uses the function's default credentials).

## Commands

All commands are run from the `functions/` directory:

```bash
npm run build      # Compile src/ (TypeScript) to lib/ with tsc
npm run build:watch
npm run serve      # Build + start Firebase emulator (functions only)
npm run deploy     # Deploy to Firebase (functions only; predeploy runs the build)
npm test           # Vitest unit tests (test/): arithmetic, quick input, Kyiv dates, AI aggregation
npm run logs       # Tail Firebase function logs
```

No linter script is configured; type errors are caught by `npm run build` (`tsc`, strict mode). Formatting is done by Biome via the husky pre-commit hook (`lint-staged` runs `biome format --write`).

## Architecture

This is a **Firebase Cloud Functions v2** Telegram bot for personal expense tracking, deployed to `europe-west3` (Node 22, TypeScript compiled to CommonJS). The bot uses a **webhook** delivery model (not polling) via grammY + Express.

### Request flow

```
Telegram → POST / → Express (src/index.ts) → webhookCallback (grammY) → src/bot/telegramBotService.ts → src/bot/handlers/
```

`src/index.ts` wires the Express app with `webhookCallback` from grammY, protected by the `SECRET` token. The single exported function is `telegramWebhook`; its `secrets` list in `src/index.ts` must contain every Secret Manager value the code reads.

### Access control

`src/bot/telegramBotService.ts` registers a grammY middleware before every handler: only Telegram user ids listed in `ALLOWED_TG_USERS` (comma-separated, from `functions/.env`) are served; everyone else is silently ignored and logged. An empty or missing list denies everyone.

### Commands

`/start` (new expense), `/month` (month summary), `/edit` (edit last record), `/last` (pick any of the 8 latest records to edit or delete), `/limits` + `/limit <category> <sum>` (monthly category limits, warning at 80% and 100% after each save), `/recurring [<day> <quick input>]` (monthly automatic records: subscriptions, or installments with `x6` / `2/6`), `/subs` (all subscriptions and installments with this month's status), `/digest on|off` (weekly summary), `/status` (admin: last result of each scheduled job), `/ai <question>` (ask Claude about expenses), `/cancel`. New expenses accept quick input (`250 продукти моно сільпо`, `20 usd кафе`: foreign amounts are converted at the NBU rate and stored in UAH with `currency`/`originalSum`/`rate`). Category/bank/note keyboards carry cancel and skip buttons (`flow:` callbacks).

### Conversation state machine

Multi-step input is managed in `src/bot/userState.ts`, which keeps the state in Firestore (`users/{chatId}/state/current`, expires after an hour), so it survives cold starts and instance recycling (handlers still handle a missing state by asking for the sum again). The helpers are async: always `await` them.

Create flow: `waiting_sum` → `set_category` (inline buttons, `cat:<index>` from `src/bot/categories.ts`) → bank (inline buttons, `bank:<index>` from `src/bot/banks.ts`) → `set_note` (saves the expense).

Edit flow (`/edit`, `/last`): `edit_choose` → `edit_sum` / `edit_category` / `edit_bank` / `edit_note`, or delete with confirmation (`del:`). `/ai` drafts wait in the `ai_confirm` step until the `ai:yes` button.

`/start` resets state to `waiting_sum`; `/cancel` clears it. Callback queries are dispatched by their prefix (`cat:`, `bank:`, `edit:`, `rec:`, `del:`, `rcr:`, `flow:`, `ai:`) in `telegramBotService.ts`.

### Scheduled functions

`recurringExpenses` (daily 08:00 Kyiv, `src/jobs/recurringJob.ts`) creates this month's record for every due `recurring` item with the deterministic id `rec-<itemId>-<YYYY-MM>` (retries cannot duplicate) and messages the user; installment items (`payments`/`paid`) are deleted after the last payment. The same run sends one "charged tomorrow" reminder per month (`reminded`) with a delete button (`rcr:del:<id>`) per item. A new item whose charge day already passed starts next month. `weeklyDigest` (Monday 09:00 Kyiv, `src/jobs/digestJob.ts`) sends last week's summary to users who have not switched it off. Both need only `TELEGRAM_BOT_TOKEN` and find users by listing `budgets/{BUDGET_ID}/users`.

### Monitoring

`src/utils/monitoring.ts` `reportError(context, err)` logs and sends the error text (no stack, no user data) to the admin in Telegram, at most once per 10 minutes per distinct error and instance. The admin is `ADMIN_TG_ID`, or the first id of `ALLOWED_TG_USERS` when it is not set. It is called from the grammY `bot.catch` (the user also gets a short apology), the `/ai` handler (not for rate limits), per-user failures in the scheduled jobs and `process.on('unhandledRejection')`. Scheduled functions run through `src/jobs/runMonitored.ts`: it records the outcome in `budgets/{id}/meta/jobs` (shown by `/status`), alerts on a crash and rethrows so the run is marked failed in Cloud logs. There is no Cloud Monitoring alert policy; a function that cannot start at all (bad deploy) is not reported by the bot itself.

### AI assistant (`/ai`)

`src/bot/handlers/handleAi.ts` runs a manual tool loop against the Anthropic Messages API (top-level `cache_control` caches tools, system and loop history). Model and limits live in `src/configs/aiConfig.ts` (`CLAUDE_MODEL`, `MAX_OUTPUT_TOKENS`, `TURN_TOKEN_LIMIT` per user message across all loop iterations, `MAX_TOOL_ITERATIONS`, `AI_DAILY_LIMIT` questions per user per Kyiv day, `AI_HISTORY_TURNS`/`AI_HISTORY_TTL_MS` for follow-up context). Tools (`src/bot/ai/tools.ts`, pure logic in `src/bot/ai/summary.ts`): read-only `get_expenses` and `get_summary` (server-side grouping by category/bank/month/day), and `add_expense`, which only prepares a draft: it is stored in the conversation state (`ai_confirm`) and saved after the user presses the `ai:yes` button. Context (the last few question/answer texts) and the daily counter live in Firestore under `users/{chatId}/state/aiHistory` and `aiUsage`; `/cancel` clears the history. Needs the `ANTHROPIC_API_KEY` secret.

### Storage

Each saved expense is written to Firestore.

```
budgets/{BUDGET_ID}/users/{chatId}/expenses/{uuid}
  - id: string (uuid v4)
  - type: 'expense' | 'income'
  - sum: number
  - category: string   (income uses category 'Дохід')
  - bank: string | null
  - note: string
  - date: Date
```

Per-user extras: `users/{chatId}/recurring/{id}` (`RecurringItem`), `settings/limits` (`{limits: {category: amount}}`), `settings/prefs` (`{digest}`), `state/*` (conversation, AI history/usage).

`BUDGET_ID` is hardcoded in `src/configs/consts.ts`. The `userId` used in Firestore paths is `chatId.toString()` (not the `USER_ID` constant, which is unused). Firestore access helpers are in `src/utils/firebaseUtility.ts`.

### Environment variables and secrets

Plain values in `functions/.env` (not committed): `PUBLIC_HOST` (deployed Cloud Run URL, used for webhook registration), `ADMIN_TG_ID`, `ALLOWED_TG_USERS`.

Secrets (set with `firebase functions:secrets:set NAME`, listed in `src/index.ts`): `TELEGRAM_BOT_TOKEN`, `SECRET`, `ANTHROPIC_API_KEY`.

For the local emulator, put secrets in `functions/.secret.local` (git-ignored and excluded from deploy via `*.local` in `firebase.json`; template in `.secret.local.example`).

### Code style

Single quotes, semicolons, trailing commas, `bracketSpacing: false` (`{a, b}`), 2-space indent, ES module `import`/`export` syntax (compiled to CommonJS; handlers use `export default`). `.prettierrc` sets 110-char width; `biome.json` (used by the pre-commit hook) sets 80, so expect Biome to reflow staged files. Match the surrounding code's style. User-facing bot text is in Ukrainian.

### Dependency caveats

Do not run `npm audit fix --force`: it downgrades `firebase-functions-test`, and pushes `firebase-admin` past the range `firebase-functions` supports (IDs are generated with `crypto.randomUUID`, so `uuid` is no longer a dependency). Use plain `npm audit fix` and review the diff.
