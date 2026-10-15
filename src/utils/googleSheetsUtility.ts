import {type sheets_v4, google} from 'googleapis';
import type {Expense} from '../types';
import {toJsDate} from './date';

function getSheetName(date: Date): string {
  const raw = date.toLocaleString('uk-UA', {month: 'long', year: 'numeric'});
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT as string);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function ensureSheet(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetName: string): Promise<void> {
  const meta = await sheets.spreadsheets.get({spreadsheetId});
  const exists = meta.data.sheets?.some((s) => s.properties?.title === sheetName);
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {requests: [{addSheet: {properties: {title: sheetName}}}]},
  });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'RAW',
    requestBody: {values: [['Дата', 'Сума', 'Повернення', 'Різниця', 'Категорія', 'Банк', 'Примітка']]},
  });
}

export async function appendExpenseToSheet(expense: Expense): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId || !process.env.GOOGLE_SERVICE_ACCOUNT) return;

  const sheets = google.sheets({version: 'v4', auth: getAuth()});

  const date = toJsDate(expense.date);
  const sheetName = getSheetName(date);

  await ensureSheet(sheets, spreadsheetId, sheetName);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          date.toLocaleDateString('uk-UA'),
          expense.type !== 'income' ? expense.sum : '',
          expense.type === 'income' ? expense.sum : '',
          '',
          expense.category || '',
          expense.bank || '',
          expense.note || '',
        ],
      ],
    },
  });
}
