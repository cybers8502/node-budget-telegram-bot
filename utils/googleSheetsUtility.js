const {google} = require('googleapis');

function getSheetName(date) {
  const raw = date.toLocaleString('uk-UA', {month: 'long', year: 'numeric'});
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

async function getAuthClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth.getClient();
}

async function ensureSheet(sheets, spreadsheetId, sheetName) {
  const meta = await sheets.spreadsheets.get({spreadsheetId});
  const exists = meta.data.sheets.some((s) => s.properties.title === sheetName);
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

async function appendExpenseToSheet(expense) {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId || !process.env.GOOGLE_SERVICE_ACCOUNT) return;

  const auth = await getAuthClient();
  const sheets = google.sheets({version: 'v4', auth});

  const date = expense.date instanceof Date ? expense.date : expense.date.toDate();
  const sheetName = getSheetName(date);

  await ensureSheet(sheets, spreadsheetId, sheetName);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        date.toLocaleDateString('uk-UA'),
        expense.type !== 'income' ? expense.sum : '',
        expense.type === 'income' ? expense.sum : '',
        '',
        expense.category || '',
        expense.bank || '',
        expense.note || '',
      ]],
    },
  });
}

module.exports = {appendExpenseToSheet};