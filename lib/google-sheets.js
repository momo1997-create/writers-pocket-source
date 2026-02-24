// Google Sheets Integration for Writer's Pocket
// Currently mocked, designed for Google Sheets API integration

const SHEETS_ENABLED = process.env.GOOGLE_SHEETS_ENABLED === 'true';
const SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS;
const LEADS_SHEET_ID = process.env.GOOGLE_SHEETS_LEADS_ID;
const ANTHOLOGY_SHEET_ID = process.env.GOOGLE_SHEETS_ANTHOLOGY_ID;

// Check if Google Sheets is configured
export function isSheetsConfigured() {
  return SHEETS_ENABLED && SHEETS_CREDENTIALS && (LEADS_SHEET_ID || ANTHOLOGY_SHEET_ID);
}

// Append row to a sheet
export async function appendToSheet(sheetId, sheetName, values) {
  try {
    if (!SHEETS_ENABLED) {
      console.log('[MOCK SHEETS] Would append to sheet:', { sheetId, sheetName, values });
      return { success: true, mocked: true };
    }

    if (!isSheetsConfigured()) {
      console.warn('[SHEETS] Not configured, skipping append');
      return { success: false, error: 'Sheets not configured' };
    }

    // TODO: Implement actual Google Sheets API
    // const auth = new google.auth.GoogleAuth({
    //   credentials: JSON.parse(SHEETS_CREDENTIALS),
    //   scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    // });
    // const sheets = google.sheets({ version: 'v4', auth });
    // await sheets.spreadsheets.values.append({...});

    console.log('[SHEETS] Would append row:', { sheetId, sheetName, rowCount: 1 });
    return { success: true, mocked: !SHEETS_ENABLED };
  } catch (error) {
    console.error('[SHEETS ERROR]', error);
    return { success: false, error: error.message };
  }
}

// Sync lead to Google Sheets
export async function syncLeadToSheets(lead) {
  const values = [
    new Date().toISOString(),
    lead.name,
    lead.email,
    lead.phone || '',
    lead.source,
    lead.interestArea || '',
    lead.status,
    lead.notes || '',
  ];

  return await appendToSheet(LEADS_SHEET_ID, 'Leads', values);
}

// Sync anthology submission to Google Sheets
export async function syncAnthologyToSheets(submission) {
  const values = [
    new Date().toISOString(),
    submission.name,
    submission.phone,
    submission.isWhatsApp ? 'Yes' : 'No',
    submission.whatsAppNumber || submission.phone,
    submission.email,
    submission.instagramUsername || '',
    submission.poetryTitle,
    submission.poetryContent.substring(0, 500) + (submission.poetryContent.length > 500 ? '...' : ''),
    submission.bio || '',
    submission.contactPreference,
  ];

  return await appendToSheet(ANTHOLOGY_SHEET_ID, 'Submissions', values);
}

// Get submissions count for today (for live counter)
export async function getTodaySubmissionsCount() {
  if (!isSheetsConfigured()) {
    // Return from database instead
    return null; // Will trigger DB fallback
  }

  // TODO: Implement actual count from Google Sheets
  // For now, return null to use DB fallback
  return null;
}
