# Firebase Telegram Bot

A personal expense tracking Telegram bot built with Firebase Cloud Functions v2, grammY, and Firestore.

## Overview

The bot provides a guided multi-step conversation flow for logging personal expenses. It is deployed as a Firebase Cloud Function in `europe-west3` and receives messages via a Telegram webhook.

## Tech Stack

- **Runtime**: Node.js (Firebase Cloud Functions v2)
- **Telegram framework**: [grammY](https://grammy.dev/) + Express webhook adapter
- **Database**: Firestore
- **Region**: `europe-west3`

## Project Structure

```
functions/
  index.js                   # Express app + webhook entrypoint
  bot/
    userState.js             # In-memory conversation state (Map)
    categories.js            # Expense category list
    handlers/
      handleStart.js         # /start command
      handleWaitingSum.js    # Step 1: amount input
      handleConfirmCopy.js   # Step 2: copy previous fields
      handleSetCategory.js   # Step 3: category selection
      handleSetNote.js       # Step 4: description + save to Firestore
      handleMonthSum.js      # /month command: monthly summary
  configs/
    consts.js                # BUDGET_ID constant
    firebaseConfig.js        # Firebase app initialization
  utils/
    logger.js                # Logging utility
```

## Conversation Flow

User interactions follow a linear state machine:

1. **`waiting_sum`** — User enters a numeric amount or arithmetic expression (e.g. `100`, `50+30`, `200/4`)
2. **`confirm_copy`** — User answers `так` / `ні` to copy category and note from the last expense
3. **`set_category`** — User picks a category by number from the list
4. **`set_note`** — User types a short description; expense is saved to Firestore

Commands:
- `/start` — Reset state, begin a new expense entry
- `/cancel` — Clear state and cancel current entry
- `/month` — Show current month's total, daily average, and projected end-of-month spend (with optional USD conversion via NBU rate)

### Categories

Їжа, Дім/Ремонт, Техніка, Авто, Розваги, Кафе, Подарунки, Медецина, Проїзд, Обслуговування кредиту, ЖКХ, Туризм, Спорт, Одяг, Краса, Підписка, Донат, Хобі, Дохід, Інше

## Firestore Data Model

```
budgets/{BUDGET_ID}/users/{chatId}/expenses/{uuid}
  - id: string (uuid v4)
  - sum: number
  - category: string
  - note: string
  - date: Date
```

## Setup

### Prerequisites

- Node.js
- Firebase CLI (`npm install -g firebase-tools`)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### Environment Variables

Create `functions/.env`:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
SECRET=your_webhook_secret_token
PUBLIC_HOST=https://your-cloud-run-url
```

### Install Dependencies

```bash
cd functions
npm install
```

## Commands

All commands run from the `functions/` directory:

```bash
npm run lint    # ESLint check
npm run serve   # Start Firebase emulator (functions only)
npm run deploy  # Deploy to Firebase
npm run logs    # Tail Firebase function logs
```

## Deployment

```bash
cd functions
npm run deploy
```

After deploying, register the webhook with Telegram:

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=<PUBLIC_HOST>&secret_token=<SECRET>
```

## Notes

- Conversation state is stored in-memory and is **ephemeral** — it will be lost on Cloud Function cold starts or instance recycling.
- The `USER_ID` constant in `consts.js` is unused; Firestore paths use `chatId.toString()` as the user identifier.