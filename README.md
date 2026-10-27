# Budget Bot

A personal expense-tracking Telegram bot. It runs as a Firebase Cloud Functions v2 webhook (`europe-west3`, Node 22, TypeScript), stores everything in Firestore, and has an AI assistant (Claude) for questions about your spending. The bot talks to the user in Ukrainian.

## Features

- **Quick input**: send `250 продукти моно сільпо` and the expense is saved; only what is missing is asked with buttons.
- **Guided input** with category and bank buttons, a *Skip* button for the description and a *Cancel* button everywhere.
- **Foreign currencies**: `20 usd кафе`, `20$ кафе`, `15 євро` are converted at the official NBU rate and stored in UAH, with the original amount kept.
- **Edit and delete** the last record (`/edit`) or any of the latest eight (`/last`).
- **Monthly summary** (`/month`): total, today, daily average, forecast, top categories, biggest expense, USD equivalent, and the change against the previous month.
- **Category limits**: a warning right after a save when a category passes 80% and 100% of its monthly limit.
- **Subscriptions and installments** that are recorded automatically every month, with a reminder the day before and a delete button in the reminder.
- **Weekly digest** every Monday.
- **AI assistant** (`/ai`): answers questions about your expenses, compares periods, and can prepare a new expense that you confirm with a button.
- **Monitoring**: errors are sent to the admin in Telegram, and `/status` shows the last result of each scheduled job.

## Commands

| Command | What it does |
|---|---|
| `/start` | Start a new expense. |
| `/month` | Summary for the current month with the previous-month comparison. |
| `/edit` | Edit or delete the last record. |
| `/last` | Pick any of the 8 latest records to edit or delete. |
| `/limits`, `/limit <category> <sum>` | Show monthly category limits with this month's spend; set one (`/limit їжа 5000`) or remove it (`/limit їжа 0`). |
| `/recurring [<day> <quick input>]` | List recurring items (tap one to delete it), or add one: `/recurring 5 800 підписка моно Netflix`. Add `x6` for a six-payment installment plan, or `2/6` if two of six are already paid. |
| `/subs` | All subscriptions and installments with this month's status (✅ charged, ⏳ upcoming) and the month total. |
| `/digest on\|off` | Switch the weekly digest on or off (on by default). |
| `/status` | Admin only: last run of each scheduled job. |
| `/ai <question>` | Ask Claude about your expenses, for example `/ai скільки я витратив на каву цього місяця?` or `/ai додай 250 на продукти, моно, вчора`. |
| `/cancel` | Cancel the current action and clear the AI follow-up context. |

### Quick input

```
250                          just the amount, then buttons
250 продукти моно сільпо     amount, category, bank, note
50+30 кафе                   the amount may be an arithmetic expression
20 usd кафе                  foreign amount, converted at the NBU rate
```

The leading amount is evaluated (`+ - * /` and parentheses, no code execution). The remaining words are matched against the category list (by name, by a prefix of at least three letters, or by a built-in alias such as `продукти`, `бензин`, `кеш`) and the bank list; whatever is left becomes the note (up to 100 characters). Aliases live in `functions/src/bot/quickInput.ts`.

## How it works

```
Telegram → POST / → Express (src/index.ts) → grammY webhookCallback
         → src/bot/telegramBotService.ts → src/bot/handlers/*
```

- The webhook is protected by the `SECRET` token, and only Telegram user ids listed in `ALLOWED_TG_USERS` are served; everyone else is silently ignored.
- **Conversation state** lives in Firestore (`state/current`) and expires after an hour, so it survives cold starts. Callback buttons are routed by prefix (`cat:`, `bank:`, `edit:`, `rec:`, `del:`, `rcr:`, `flow:`, `ai:`).
- **Dates** are always computed in `Europe/Kyiv` (Cloud Functions run in UTC), so a record made just after midnight lands in the right day and month.
- **Scheduled functions** (`europe-west3`, Kyiv time):
  - `recurringExpenses`, daily 08:00: records every due recurring item with a deterministic id (`rec-<item>-<YYYY-MM>`, so a retry cannot duplicate it), removes finished installment plans, and sends the "charged tomorrow" reminders.
  - `weeklyDigest`, Monday 09:00: last week's spend, change against the week before, top categories, biggest expense.
- **AI assistant**: a manual tool loop against the Anthropic Messages API. Tools: `get_expenses`, `get_summary` (grouping by category, bank, month or day is done on the server) and `add_expense`, which only prepares a draft that is saved after you press the confirm button. Limits (daily question quota, follow-up context, token caps) are in `src/configs/aiConfig.ts`.
- **Monitoring**: `reportError` logs and messages the admin (the same error at most once per ten minutes). Scheduled functions run through `runMonitored`, which records the outcome for `/status`, alerts on a crash and rethrows so the run is marked as failed in Cloud logs.

### Project structure

```
firebase.json                   Firebase config (functions codebase)
functions/
  src/
    index.ts                    Express app, webhook function and the two scheduled functions
    types.ts                    Expense, RecurringItem, UserState, Step
    bot/
      telegramBotService.ts     access control, command and callback routing, error handler
      handlers/                 one file per command or conversation step
      ai/                       tools for /ai and the pure aggregation behind them
      quickInput.ts             quick-input parser (amount, category, bank, currency, note)
      keyboards.ts, categories.ts, banks.ts, userState.ts
    jobs/                       recurring charges, weekly digest, runMonitored
    utils/                      Firestore access, dates, limits, recurring logic, digest, currency, monitoring
    configs/                    Firebase and Telegram clients, AI settings, budget id
  test/                         Vitest unit tests
```

## Firestore data model

```
budgets/{BUDGET_ID}/users/{chatId}/
  expenses/{id}      id, type ('expense'|'income'), sum (always UAH), category, bank, note, date,
                     tags (['розстрочка'] on installment payments from /recurring plans),
                     and for foreign-currency entries: currency, originalSum, rate
  recurring/{id}     day, sum, category, bank, note, lastRun, reminded, payments, paid
  settings/limits    { limits: { <category>: <amount> } }
  settings/prefs     { digest: boolean }
  state/current      conversation state (expires after an hour)
  state/aiHistory    last question/answer pairs for /ai follow-ups
  state/aiUsage      daily /ai counter
budgets/{BUDGET_ID}/meta/jobs     last result of each scheduled job
```

`BUDGET_ID` is a constant in `functions/src/configs/consts.ts`, and `chatId` is the Telegram chat id. Income uses the category `Дохід` and is also saved with `kind: 'income'`, the record kind the r-budget web app reads.

Categories: Їжа, Дім, Ремонт, Техніка, Авто, Пальне, Розваги, Кафе, Подарунки, Медицина, Проїзд, Кредити, ЖКХ, Туризм, Спорт, Одяг, Краса, Підписки і зв'язок, Проєкти, Освіта, Донат, Хобі, Дохід, Інше. The category list is duplicated in the r-budget web app (`BudgetCategory`); change both together. Banks: ПБ, Моно, Сенс, ПУМБ, А-банк, IZI, Rozetka, Готівка.

## Setup

### Prerequisites

- Node.js 22 and the Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project on the Blaze plan (Cloud Functions v2, Cloud Scheduler, Secret Manager)
- A bot token from [@BotFather](https://t.me/BotFather) and an [Anthropic API key](https://console.anthropic.com/) for `/ai`
- JDK 21 or newer, only if you run the Firestore emulator

### Project files that are not in the repository

`firestore.rules` and `.firebaserc` are git-ignored on purpose (they carry the project id and a personal chat id). Create your own:

```
// .firebaserc
{"projects": {"default": "<your-firebase-project-id>"}}

// firestore.rules: the bot uses the Admin SDK, which bypasses rules, so deny everything
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

### Configuration

Plain values in `functions/.env` (not committed):

| Variable | Purpose |
|---|---|
| `ALLOWED_TG_USERS` | Comma-separated Telegram user ids that may use the bot. Empty means nobody. |
| `ADMIN_TG_ID` | Who receives error alerts and may use `/status`. Falls back to the first allowed user. |
| `PUBLIC_HOST` | The deployed function URL, handy for registering the webhook. |

Secrets in Secret Manager (`firebase functions:secrets:set NAME`):

| Secret | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot token. |
| `SECRET` | Webhook secret token that Telegram sends with every update. |
| `ANTHROPIC_API_KEY` | Claude API key for `/ai`. |

For the local emulator copy `functions/.secret.local.example` to `functions/.secret.local` and fill it in. The file is git-ignored and excluded from deploys.

```bash
cd functions
npm install
```

## Development

All commands run from `functions/`:

```bash
npm run build         # compile src/ to lib/ with tsc (strict mode)
npm run build:watch
npm test              # Vitest unit tests
npm run serve         # build and start the Functions emulator
npm run deploy        # deploy the functions (predeploy runs the build)
npm run logs          # tail function logs
```

`npm run serve` starts only the Functions emulator, so the code would talk to your real Firestore. To use local data, run `firebase emulators:start --only functions,firestore` (needs JDK 21+). To receive real Telegram updates locally, expose the emulator through a tunnel (for example `cloudflared tunnel --url http://127.0.0.1:5001`) and point the webhook at it (the path is `/<project-id>/europe-west3/telegramWebhook`).

The tests cover the pure logic: arithmetic parser, quick input, Kyiv date helpers, limits, month statistics, recurring and installment rules, the digest, AI aggregation and draft validation, and error-report helpers.

## Deployment

```bash
cd functions
npm run deploy
```

This deploys `telegramWebhook` and the two scheduled functions. After the first deploy, register the webhook with Telegram:

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=<FUNCTION_URL>&secret_token=<SECRET>
```

`<FUNCTION_URL>` is the URL printed by the deploy, and `<SECRET>` must equal the `SECRET` secret.

## Notes

- Amounts are stored in UAH. For a foreign-currency entry, `sum` is the UAH equivalent at that day's NBU rate and the original amount is kept next to it.
- Editing the amount of such a record with `/edit` takes the new amount in UAH, keeps the stored rate and recalculates the original amount.
- A recurring item added after its day of the month has passed starts next month. Days 29 to 31 use the last day of shorter months.
- Errors that the bot catches are reported in Telegram. For crashes and failed deploys, add a Cloud Monitoring alert on 5xx responses of the three functions.
