const SPREADSHEET_ID = '1kCJmCsJXGtn0Nn2YIXGAw4cwhRCbqvTlmlxzIBvJovg';
const DRIVE_FOLDER_ID = '1lBULpKer-gPnROOZv9x2B_0j-pA8EJhC';

// ===== TIMESTAMP STANDARD =====
// Every timestamp the app generates or displays uses this single format/timezone.
// M/d/yyyy HH:mm:ss (e.g. 9/23/2026 12:19:37), always India Standard Time,
// regardless of the script's or spreadsheet's own timezone setting.
const APP_TIMEZONE = 'Asia/Kolkata';
const DATE_FORMAT = 'M/d/yyyy HH:mm:ss';

// Columns (case-insensitive match against sheet headers) that hold timestamps.
const TIMESTAMP_COLUMN_NAMES = ['Timestamp', 'Planned1', 'Planned2', 'Planned3', 'Actual1', 'Actual2', 'Actual3'];

// ===== UTILITY FUNCTIONS =====
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`${sheetName} sheet not found`);
  return sheet;
}

// Formats a Date as the app-wide standard string, always in IST.
// Used to build JSON response strings and to reformat legacy text values.
function formatDate(date) {
  return Utilities.formatDate(date, APP_TIMEZONE, DATE_FORMAT);
}

// Writes a real Date value into a cell (so Google Sheets stores it as a true
// DateTime, not text) and pins the cell's display format to the app standard,
// independent of the spreadsheet's locale/timezone settings.
function setTimestampCell(range, date) {
  range.setValue(date);
  range.setNumberFormat(DATE_FORMAT);
}

// Works out the real MIME type of an uploaded file so Drive can preview it
// (a PDF saved as image/jpeg cannot be opened in the browser, only downloaded).
function resolveMimeType(base64WithPrefix, fileName, mimeTypeFromClient) {
  if (mimeTypeFromClient) return mimeTypeFromClient;

  const prefix = (base64WithPrefix || '').match(/^data:([^;]+);base64,/);
  if (prefix) return prefix[1];

  const ext = (fileName || '').split('.').pop().toLowerCase();
  const byExt = {
    pdf: 'application/pdf',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain'
  };
  return byExt[ext] || 'application/octet-stream';
}

function createResponse(result, callback) {
  const output = callback
    ? `${callback}(${JSON.stringify(result)})`
    : JSON.stringify(result);

  return ContentService
    .createTextOutput(output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

// Helper function to find column index with case-insensitive matching
function findColumnIndex(headers, columnName) {
  if (!headers || !Array.isArray(headers)) return -1;

  const targetName = columnName.toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header && header.toString().toLowerCase().trim() === targetName) {
      return i;
    }
  }
  return -1;
}

// ===== ONE-TIME SETUP: run manually once from the Apps Script editor =====
// Forces the spreadsheet's own timezone to IST so any Date value written to a
// cell displays as the same real-world instant the app generated it as.
function setupSpreadsheetTimezone() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ss.setSpreadsheetTimeZone(APP_TIMEZONE);
  Logger.log('Spreadsheet timezone set to ' + ss.getSpreadsheetTimeZone());
}

// ===== ONE-TIME MIGRATION: run manually once from the Apps Script editor =====
// Converts existing FMS timestamp columns (Timestamp, Planned1-3, Actual1-3)
// from the old "dd/MM/yyyy HH:mm:ss" text values into real Date values, and
// applies the new M/d/yyyy HH:mm:ss display format to every cell in those
// columns (including already-Date cells). Safe to run more than once.
//
// IMPORTANT: back up the sheet (File > Make a copy) before running this, and
// run it BEFORE any new submissions go through the updated code below, since
// this assumes any remaining text values are still in the OLD dd/MM order.
function migrateExistingTimestamps() {
  const sheet = getSheet('FMS');
  const headerRow = 6;
  const lastColumn = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();

  if (lastRow <= headerRow) {
    Logger.log('No data rows to migrate.');
    return;
  }

  const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());
  const colIndexes = TIMESTAMP_COLUMN_NAMES
    .map(name => headers.findIndex(h => h.toLowerCase() === name.toLowerCase()))
    .filter(idx => idx !== -1);

  if (colIndexes.length === 0) {
    Logger.log('No timestamp columns found to migrate.');
    return;
  }

  const numRows = lastRow - headerRow;
  let migratedCount = 0;
  const oldFormatPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/;

  colIndexes.forEach(colIndex => {
    const range = sheet.getRange(headerRow + 1, colIndex + 1, numRows, 1);
    const values = range.getValues();

    const newValues = values.map(row => {
      const cell = row[0];

      if (cell instanceof Date) {
        return [cell];
      }

      if (typeof cell === 'string' && cell.trim() !== '') {
        const match = cell.trim().match(oldFormatPattern);
        if (match) {
          let [, day, month, year, hour, minute, second] = match;
          // Text already in MM/dd order (month slot > 12 is impossible) - swap back
          if (parseInt(month, 10) > 12 && parseInt(day, 10) <= 12) {
            [day, month] = [month, day];
          }
          const parsed = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hour, 10),
            parseInt(minute, 10),
            parseInt(second, 10)
          );
          if (!isNaN(parsed.getTime()) && parsed.getMonth() === parseInt(month, 10) - 1) {
            migratedCount++;
            return [parsed];
          }
        }
      }

      return [cell];
    });

    range.setValues(newValues);
    range.setNumberFormat(DATE_FORMAT);
  });

  SpreadsheetApp.flush();
  Logger.log('Migration complete. Converted ' + migratedCount + ' cell(s) to real DateTime values.');
}

// ===== MAIN HANDLERS =====
function doGet(e) {
  const { action, callback, ...params } = e.parameter;

  try {
    Logger.log(`GET - Action: ${action}`);
    Logger.log('Parameters: ' + JSON.stringify(params));

    let result;

    switch(action) {
      case 'login':
        result = handleLogin(params.username, params.password);
        break;
      case 'getFMSHistory':
        result = handleGetFMSHistory();
        break;
      case 'getPendingApprovals':
        result = handleGetPendingApprovals();
        break;
      case 'getPendingLifting':
        result = handleGetPendingLifting();
        break;
      case 'getPendingStoreIn':
        result = handleGetPendingStoreIn();
        break;
      case 'getPendingTallyEntry':
        result = handleGetPendingTallyEntry();
        break;
      case 'getPendingPayments':  // ✅ ADD THIS
        result = handleGetPendingPayments();
        break;
      case 'submitFMS':
        result = handleSubmitFMS(params);
        break;
      case 'approvalAction':
        result = handleApprovalAction({
          rowNumber: parseInt(params.rowNumber),
          action: params.actionType
        });
        break;
      case 'submitTallyEntry':
        result = handleSubmitTallyEntry({
          rowNumber: parseInt(params.rowNumber),
          status: params.status,
          reason: params.reason
        });
        break;
      default:
        result = { success: false, error: 'Invalid action: ' + action };
    }

    Logger.log('Result: ' + JSON.stringify(result));
    return createResponse(result, callback);

  } catch (error) {
    Logger.log(`Error: ${error}`);
    return createResponse({ success: false, error: error.toString(), stack: error.stack }, callback);
  }
}
function doPost(e) {
  try {
    Logger.log('POST request received');

    let data;
    if (e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    Logger.log(`POST - Action: ${data.action}`);

    const handlers = {
      login: () => handleLogin(data.username, data.password),
      submitFMS: () => handleSubmitFMS(data),
      approvalAction: () => handleApprovalAction(data),
      submitLifting: () => handleSubmitLifting(data),
      submitStoreIn: () => handleSubmitStoreIn(data),
      submitTallyEntry: () => handleSubmitTallyEntry(data)
    };

    const result = handlers[data.action] || { success: false, error: 'Invalid action' };
    return createResponse(typeof result === 'function' ? result() : result);

  } catch (error) {
    Logger.log(`POST Error: ${error}`);
    return createResponse({ success: false, error: error.toString() });
  }
}

// ===== LOGIN WITH PAGE ACCESS =====
function handleLogin(username, password) {
  try {
    Logger.log('🔐 Login attempt for user: ' + username);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Try both 'USER' and 'Users' sheet names
    let userSheet = ss.getSheetByName('USER');
    if (!userSheet) {
      userSheet = ss.getSheetByName('Users');
    }

    if (!userSheet) {
      Logger.log('❌ USER/Users sheet not found');
      Logger.log('Available sheets: ' + ss.getSheets().map(s => s.getName()).join(', '));
      return { success: false, error: 'User database not found' };
    }

    Logger.log('✅ Found sheet: ' + userSheet.getName());

    const data = userSheet.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log('❌ No user data found');
      return { success: false, error: 'No users registered' };
    }

    const headers = data[0].map(h => h.toString().trim().toLowerCase());
    Logger.log('📋 Headers: ' + headers.join(', '));

    // Find column indexes
    const usernameCol = headers.indexOf('username');
    const passwordCol = headers.indexOf('password');
    const nameCol = headers.indexOf('name');
    const pageCol = headers.indexOf('page');

    Logger.log('🔍 Columns - Username: ' + usernameCol + ', Password: ' + passwordCol + ', Name: ' + nameCol + ', Page: ' + pageCol);

    if (usernameCol === -1 || passwordCol === -1) {
      Logger.log('❌ Required columns not found');
      return { success: false, error: 'Database configuration error' };
    }

    // Find user
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      const storedUsername = row[usernameCol] ? row[usernameCol].toString().trim() : '';
      const storedPassword = row[passwordCol] ? row[passwordCol].toString().trim() : '';
      const userName = row[nameCol] ? row[nameCol].toString().trim() : storedUsername;
      const userPageRaw = row[pageCol] ? row[pageCol].toString().trim() : '';

      Logger.log('👤 Row ' + (i + 1) + ': username="' + storedUsername + '"');

      // Check credentials (case-insensitive username)
      if (storedUsername.toLowerCase() === username.toLowerCase().trim() &&
          storedPassword === password.trim()) {

        Logger.log('✅ MATCH FOUND! Pages: "' + userPageRaw + '"');

        // Parse pages
        const allowedPages = parsePages(userPageRaw);

        Logger.log('✅ Mapped pages: ' + JSON.stringify(allowedPages));

        return {
          success: true,
          user: {
            username: storedUsername,
            name: userName,
            allowedPages: allowedPages
          }
        };
      }
    }

    Logger.log('❌ No matching user');
    return { success: false, error: 'Invalid username or password' };

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return {
      success: false,
      error: 'Login failed: ' + error.toString()
    };
  }
}

// Helper function to parse and map page names
function parsePages(pageString) {
  if (!pageString || pageString.trim() === '') {
    Logger.log('⚠️ No pages, returning default dashboard');
    return ['dashboard'];
  }

  const pages = pageString.split(',').map(p => p.trim());
  const mapped = [];

  Logger.log('📄 Parsing pages: ' + JSON.stringify(pages));

  pages.forEach(function(page) {
    if (!page) return;

    const lower = page.toLowerCase();

    if (lower === 'dashboard') {
      mapped.push('dashboard');
    } else if (lower === 'create indent') {
      mapped.push('create-indent');
    } else if (lower === 'approve indent') {
      mapped.push('approve-indent');
    } else if (lower === 'lifting') {
      mapped.push('lifting');
    } else if (lower === 'store in') {
      mapped.push('store-in');
    } else if (lower === 'tally entry') {
      mapped.push('tally-entry');
    } else if (lower === 'make payment') {
      mapped.push('make-payment');
    } else if (lower === 'license') {
      mapped.push('license');
    } else {
      Logger.log('⚠️ Unknown page: "' + page + '"');
    }
  });

  // If no valid pages found, return dashboard
  if (mapped.length === 0) {
    Logger.log('⚠️ No valid pages found, returning dashboard');
    return ['dashboard'];
  }

  Logger.log('✅ Final pages: ' + JSON.stringify(mapped));
  return mapped;
}

// TEST FUNCTION - Run this to test login
function testLogin() {
  Logger.log('=== TESTING LOGIN ===');
  const result = handleLogin('admin', 'admin12345');
  Logger.log('Result: ' + JSON.stringify(result));
}


// ===== GET PENDING PAYMENTS =====
function handleGetPendingPayments() {
  try {
    Logger.log('=== Fetching Pending Payments ===');

    const sheet = getSheet('FMS');
    const headerRow = 6;
    const lastColumn = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    if (lastRow <= headerRow) return { success: true, payments: [] };

    // Get headers
    const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());
    Logger.log('Headers: ' + JSON.stringify(headers));

    // Define required columns - Add Payment Status column
    const requiredColumns = [
      'Indent No.',
      'Indentor Name',
      'Product Name',
      'Qty',
      'Bill No.',
      'Amount',
      'Paid Amount',
      'Photo Of Bill',
      'Photo Of Product',
      'Make Payment',  // Column AG
      'Payment Status' // Column 36 - ADD THIS
    ];

    // Find column indices
    const columnIndices = {};
    requiredColumns.forEach(col => {
      // Search for column by name
      columnIndices[col] = headers.findIndex(h =>
        h.toLowerCase().includes(col.toLowerCase())
      );
    });

    Logger.log('Column indices: ' + JSON.stringify(columnIndices));

    // Check if Payment Status column was found
    if (columnIndices['Payment Status'] === -1) {
      Logger.log('❌ Payment Status column not found in headers');
      Logger.log('Available headers: ' + headers.join(', '));
      return {
        success: false,
        error: 'Payment Status column (Column 36) not found in sheet. Available columns: ' + headers.join(', ')
      };
    }

    // Get data rows
    const dataRows = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastColumn).getValues();
    Logger.log('Total data rows: ' + dataRows.length);

    const payments = dataRows
      .map((row, i) => {
        const payment = { rowNumber: headerRow + 1 + i };

        // Extract data for each required column
        requiredColumns.forEach(col => {
          const index = columnIndices[col];
          if (index !== -1) {
            let value = row[index];

            // Format dates
            if (value instanceof Date) {
              value = formatDate(value);
            }

            // Handle empty values
            payment[col] = value === null || value === undefined || value === '' ? '' : value.toString().trim();
          } else {
            payment[col] = '';
          }
        });

        return payment;
      })
      .filter(payment => {
        // Get payment status and normalize it
        const paymentStatus = payment['Payment Status'] || '';
        const normalizedStatus = paymentStatus.toString().trim().toLowerCase();

        // Get payment link
        const paymentLink = payment['Make Payment'] || '';

        Logger.log(`Row ${payment.rowNumber}: Status="${paymentStatus}" -> Normalized="${normalizedStatus}", Link="${paymentLink.substring(0, 50)}..."`);

        // Filter: Only show rows where:
        // 1. Payment Status is "Pending" (case-insensitive)
        // 2. AND Make Payment column has a link
        const isPending = normalizedStatus === 'pending';
        const hasPaymentLink = paymentLink && paymentLink.trim() !== '' && paymentLink.startsWith('http');

        return isPending && hasPaymentLink;
      });

    Logger.log('Found ' + payments.length + ' pending payments with payment links');

    // Debug: Log first few payments
    payments.slice(0, 3).forEach((payment, i) => {
      Logger.log(`Payment ${i + 1}:`);
      Logger.log(`  Indent No: ${payment['Indent No.']}`);
      Logger.log(`  Status: "${payment['Payment Status']}"`);
      Logger.log(`  Link: ${payment['Make Payment']}`);
    });

    return { success: true, payments };

  } catch (error) {
    Logger.log('Error in getPendingPayments: ' + error);
    Logger.log('Stack: ' + error.stack);
    return { success: false, error: error.toString(), stack: error.stack };
  }
}
// DEBUG FUNCTION - Run this to check your sheet
function debugSheet() {
  try {
    Logger.log('=== DEBUGGING SHEETS ===');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    Logger.log('Available sheets: ' + ss.getSheets().map(s => s.getName()).join(', '));

    // Try USER sheet
    let userSheet = ss.getSheetByName('USER');
    if (!userSheet) {
      userSheet = ss.getSheetByName('Users');
    }

    if (!userSheet) {
      Logger.log('❌ No USER or Users sheet found!');
      return;
    }

    Logger.log('✅ Found sheet: ' + userSheet.getName());

    const data = userSheet.getDataRange().getValues();
    Logger.log('Total rows: ' + data.length);
    Logger.log('Headers: ' + data[0].join(', '));

    for (let i = 1; i < Math.min(data.length, 6); i++) {
      Logger.log('Row ' + (i + 1) + ': ' + data[i].join(' | '));
    }

  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
  }
}// Helper function to map page names from sheet to app IDs
function mapPageNames(pageString) {
  if (!pageString || pageString.trim() === '') {
    Logger.log('⚠️ No pages found, returning empty array');
    return [];
  }

  // Split by comma and process each page
  const pages = pageString.split(',').map(p => p.trim());
  const mappedPages = [];

  Logger.log(`📄 Processing pages: ${JSON.stringify(pages)}`);

  pages.forEach(page => {
    if (!page) return;

    const pageLower = page.toLowerCase();

    // Map sheet page names to app page IDs
    if (pageLower === 'dashboard') {
      mappedPages.push('dashboard');
    } else if (pageLower === 'create indent') {
      mappedPages.push('create-indent');
    } else if (pageLower === 'approve indent') {
      mappedPages.push('approve-indent');
    } else if (pageLower === 'lifting') {
      mappedPages.push('lifting');
    } else if (pageLower === 'store in') {
      mappedPages.push('store-in');
    } else if (pageLower === 'tally entry') {
      mappedPages.push('tally-entry');
    } else if (pageLower === 'license') {
      mappedPages.push('license');
    } else {
      Logger.log(`⚠️ Unknown page: "${page}"`);
    }
  });

  Logger.log(`✅ Final mapped pages: ${JSON.stringify(mappedPages)}`);
  return mappedPages;
}

// Debug function
function debugUserSheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName('USER');

    if (!userSheet) {
      Logger.log('❌ USER sheet not found');
      return;
    }

    const data = userSheet.getDataRange().getValues();

    Logger.log('=== USER SHEET DEBUG ===');
    Logger.log(`Total rows: ${data.length}`);
    Logger.log('Headers: ' + data[0].join(', '));

    for (let i = 1; i < data.length; i++) {
      Logger.log(`Row ${i + 1}: ${data[i].join(' | ')}`);
    }

  } catch (error) {
    Logger.log('Debug error: ' + error);
  }
}

// ===== GET FMS HISTORY =====
function handleGetFMSHistory() {
  try {
    const sheet = getSheet('FMS');
    const headerRow = 6;
    const lastColumn = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    if (lastRow < headerRow) return { success: true, indents: [] };

    const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());

    if (lastRow <= headerRow) return { success: true, indents: [] };

    const dataRows = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastColumn).getValues();

    const indents = dataRows.reverse()
      .filter(row => row.some(cell => cell !== ''))
      .map(row => {
        const indent = {};
        headers.forEach((header, colIndex) => {
          let value = row[colIndex];
          if (value instanceof Date) value = formatDate(value);
          indent[header] = value === null || value === undefined || value === '' ? '' : value;
        });
        return indent;
      });

    Logger.log(`Found ${indents.length} indents`);
    return { success: true, indents };

  } catch (error) {
    Logger.log(`Error in getFMSHistory: ${error}`);
    return { success: false, error: error.toString() };
  }
}

// ===== GET PENDING APPROVALS =====
function handleGetPendingApprovals() {
  try {
    const sheet = getSheet('FMS');
    const headerRow = 6;
    const lastColumn = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    if (lastRow <= headerRow) return { success: true, indents: [] };

    const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());

    const plannedIndex = headers.findIndex(h => h.toLowerCase().includes('planned'));
    const actualIndex = headers.findIndex(h => h.toLowerCase().includes('actual'));

    if (plannedIndex === -1 || actualIndex === -1) {
      return { success: false, error: 'Planned or Actual column not found' };
    }

    const dataRows = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastColumn).getValues();

    const pendingIndents = dataRows
      .map((row, i) => ({ row, rowNumber: headerRow + 1 + i }))
      .filter(({ row }) => {
        const hasPlanned = row[plannedIndex] && row[plannedIndex].toString().trim() !== '';
        const hasNoActual = !row[actualIndex] || row[actualIndex].toString().trim() === '';
        return hasPlanned && hasNoActual;
      })
      .map(({ row, rowNumber }) => {
        const indent = { rowNumber };
        headers.forEach((header, colIndex) => {
          let value = row[colIndex];
          if (value instanceof Date) value = formatDate(value);
          indent[header] = value === null || value === undefined || value === '' ? '' : value;
        });
        return indent;
      });

    Logger.log(`Found ${pendingIndents.length} pending approvals`);
    return { success: true, indents: pendingIndents };

  } catch (error) {
    Logger.log(`Error in getPendingApprovals: ${error}`);
    return { success: false, error: error.toString() };
  }
}

// ===== GET PENDING LIFTING =====
function handleGetPendingLifting() {
  try {
    Logger.log('=== Fetching Pending Lifting ===');

    const sheet = getSheet('FMS');
    const headerRow = 6;
    const lastColumn = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    if (lastRow <= headerRow) return { success: true, indents: [] };

    const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());

    const planned1Index = headers.findIndex(h => h.toLowerCase().includes('planned1'));
    const actual1Index = headers.findIndex(h => h.toLowerCase().includes('actual1'));
    const whatIndex = headers.findIndex(h => h.toLowerCase() === 'what');

    if (planned1Index === -1 || actual1Index === -1) {
      return { success: false, error: 'Planned1 or Actual1 column not found' };
    }

    const dataRows = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastColumn).getValues();

    const pendingLifting = dataRows
      .map((row, i) => ({ row, rowNumber: headerRow + 1 + i }))
      .filter(({ row }) => {
        const hasPlanned1 = row[planned1Index] && row[planned1Index].toString().trim() !== '';
        const hasNoActual1 = !row[actual1Index] || row[actual1Index].toString().trim() === '';
        // Only approved indents go to lifting (rejected / blank approval rows are skipped)
        const isApproved = whatIndex === -1 ||
          (row[whatIndex] || '').toString().trim().toLowerCase() === 'approved';
        return hasPlanned1 && hasNoActual1 && isApproved;
      })
      .map(({ row, rowNumber }) => {
        const indent = { rowNumber };
        headers.forEach((header, colIndex) => {
          let value = row[colIndex];
          if (value instanceof Date) value = formatDate(value);
          indent[header] = value === null || value === undefined || value === '' ? '' : value;
        });
        return indent;
      });

    Logger.log(`Found ${pendingLifting.length} pending lifting items`);
    return { success: true, indents: pendingLifting };

  } catch (error) {
    Logger.log(`Error in getPendingLifting: ${error}`);
    return { success: false, error: error.toString() };
  }
}

// ===== SUBMIT FMS =====
function handleSubmitFMS(formData) {
  try {
    Logger.log('=== FMS SUBMISSION ===');

    const sheet = getSheet('FMS');
    const headerRow = 6;
    const lastColumn = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());

    let nextIndentNo = 'IND-001';
    const indentNoIndex = headers.findIndex(h => h === 'Indent No.' || h === 'Indent No');

    if (lastRow > headerRow && indentNoIndex !== -1) {
      const existingData = sheet.getRange(headerRow + 1, indentNoIndex + 1, lastRow - headerRow, 1).getValues();
      const existingIndentNos = existingData
        .flat()
        .filter(val => val && val.toString().startsWith('IND-'))
        .map(val => {
          const match = val.toString().match(/IND-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      if (existingIndentNos.length > 0) {
        const maxNum = Math.max(...existingIndentNos);
        nextIndentNo = `IND-${String(maxNum + 1).padStart(3, '0')}`;
      }
    }

    // Real Date object goes into the cell (true DateTime value for Sheets);
    // the formatted string is only for the JSON response back to the client.
    const now = new Date();
    const timestamp = formatDate(now);

    const fieldMap = {
      'Timestamp': now,
      'Indent No.': nextIndentNo,
      'Indent No': nextIndentNo,
      'Indentor Name': formData.indentorName || '',
      'Area Of Machine': formData.areaOfMachine || '',
      'Area of Machine': formData.areaOfMachine || '',
      'Group Head': formData.groupHead || '',
      'Product Name': formData.productName || '',
      'Qty': parseInt(formData.qty) || 0,
      'Specifications': formData.specifications || ''
    };

    const newRow = headers.map(header => fieldMap[header] || '');

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();

    // Pin the new row's Timestamp cell to the app-wide display format.
    const timestampColIndex = headers.findIndex(h => h.toLowerCase() === 'timestamp');
    if (timestampColIndex !== -1) {
      sheet.getRange(sheet.getLastRow(), timestampColIndex + 1).setNumberFormat(DATE_FORMAT);
    }

    Logger.log('✅ Row appended successfully');
    return {
      success: true,
      indentNo: nextIndentNo,
      timestamp,
      message: 'Indent created successfully'
    };

  } catch (error) {
    Logger.log(`Submission error: ${error}`);
    return { success: false, error: error.toString(), stack: error.stack };
  }
}

// ===== APPROVAL ACTION =====
function handleApprovalAction(data) {
  try {
    Logger.log('=== Processing Approval Action ===');

    const { rowNumber, action } = data;

    if (!rowNumber || !action) {
      return { success: false, error: 'Row number and action are required' };
    }

    const sheet = getSheet('FMS');
    const headerRow = 6;
    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());

    // Find "What" column
    const possibleNames = ['what', 'status', 'approval'];
    let whatIndex = -1;

    for (let name of possibleNames) {
      whatIndex = headers.findIndex(h => h.toLowerCase().includes(name));
      if (whatIndex !== -1) break;
    }

    if (whatIndex === -1) whatIndex = 11; // Column L as fallback

    const whatColumn = whatIndex + 1;
    const now = new Date();
    const timestamp = formatDate(now);
    const statusValue = action === 'approve' ? 'Approved' : 'Rejected';

    sheet.getRange(rowNumber, whatColumn).setValue(statusValue);

    const actualIndex = headers.findIndex(h => h.toLowerCase().includes('actual'));
    if (actualIndex !== -1 && action === 'approve') {
      setTimestampCell(sheet.getRange(rowNumber, actualIndex + 1), now);
    }

    SpreadsheetApp.flush();

    Logger.log('✅ Row updated successfully');
    return {
      success: true,
      message: `Indent ${statusValue.toLowerCase()} successfully`,
      status: statusValue,
      timestamp
    };

  } catch (error) {
    Logger.log(`Approval error: ${error}`);
    return { success: false, error: error.toString() };
  }
}

// ===== SUBMIT LIFTING =====
function handleSubmitLifting(data) {
  try {
    Logger.log('=== Processing Lifting Submission ===');
    Logger.log('Data keys: ' + Object.keys(data).join(', '));

    const { rowNumber, billNo, vendorName, liftQty, typeOfBill, billAmount, photoOfBillBase64, photoFileName, photoMimeType } = data;

    if (!rowNumber) {
      return { success: false, error: 'Row number is required' };
    }

    const sheet = getSheet('FMS');
    const headerRow = 6;
    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());

    Logger.log('Looking for columns...');

    // Find column indices
    const actual1Index = headers.findIndex(h => h.toLowerCase().includes('actual1'));
    const billNoIndex = headers.findIndex(h => h.toLowerCase().includes('bill no'));
    const vendorNameIndex = headers.findIndex(h => h.toLowerCase().includes('vendor name'));
    const liftQtyIndex = headers.findIndex(h => h.toLowerCase().includes('lift qty'));
    const typeOfBillIndex = headers.findIndex(h => h.toLowerCase().includes('type of bill'));
    const billAmountIndex = headers.findIndex(h => h.toLowerCase().includes('bill amount'));
    const photoOfBillIndex = headers.findIndex(h => h.toLowerCase().includes('photo of bill'));

    Logger.log('Column indices found - Actual1: ' + actual1Index + ', BillNo: ' + billNoIndex);

    const now = new Date();
    const timestamp = formatDate(now);

    // Upload photo to Google Drive
    let photoUrl = '';
    if (photoOfBillBase64 && photoFileName) {
      try {
        Logger.log('Uploading photo to Drive...');
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

        // Remove data:image/...;base64, prefix
        const base64Data = photoOfBillBase64.includes(',')
          ? photoOfBillBase64.split(',')[1]
          : photoOfBillBase64;

        const blob = Utilities.newBlob(
          Utilities.base64Decode(base64Data),
          resolveMimeType(photoOfBillBase64, photoFileName, photoMimeType),
          photoFileName
        );

        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        photoUrl = file.getUrl();

        Logger.log('✅ Photo uploaded: ' + photoUrl);
      } catch (uploadError) {
        Logger.log('❌ Photo upload error: ' + uploadError);
        photoUrl = 'Upload failed: ' + uploadError.toString();
      }
    } else {
      Logger.log('No photo data received');
    }

    // Update the row
    if (actual1Index !== -1) {
      setTimestampCell(sheet.getRange(rowNumber, actual1Index + 1), now);
    }

    if (billNoIndex !== -1) {
      sheet.getRange(rowNumber, billNoIndex + 1).setValue(billNo || '');
    }

    if (vendorNameIndex !== -1) {
      sheet.getRange(rowNumber, vendorNameIndex + 1).setValue(vendorName || '');
    }

    if (liftQtyIndex !== -1) {
      sheet.getRange(rowNumber, liftQtyIndex + 1).setValue(parseInt(liftQty) || 0);
    }

    if (typeOfBillIndex !== -1) {
      sheet.getRange(rowNumber, typeOfBillIndex + 1).setValue(typeOfBill || '');
    }

    if (billAmountIndex !== -1) {
      sheet.getRange(rowNumber, billAmountIndex + 1).setValue(parseFloat(billAmount) || 0);
    }

    if (photoOfBillIndex !== -1) {
      sheet.getRange(rowNumber, photoOfBillIndex + 1).setValue(photoUrl);
    }

    SpreadsheetApp.flush();

    Logger.log('✅ Lifting data submitted successfully');
    return {
      success: true,
      message: 'Lifting entry submitted successfully',
      timestamp,
      photoUrl,
      updatedRow: rowNumber
    };

  } catch (error) {
    Logger.log('❌ Lifting submission error: ' + error);
    Logger.log('Stack: ' + error.stack);
    return {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }
}

// ===== GET PENDING STORE IN (Planned2 not null, Actual2 null) =====
function handleGetPendingStoreIn() {
  try {
    Logger.log('=== Fetching Pending Store In ===');

    const sheet = getSheet('FMS');
    const headerRow = 6;
    const lastColumn = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    if (lastRow <= headerRow) return { success: true, indents: [] };

    const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());
    Logger.log('Headers: ' + JSON.stringify(headers));

    const planned2Index = headers.findIndex(h => h.toLowerCase().includes('planned2'));
    const actual2Index = headers.findIndex(h => h.toLowerCase().includes('actual2'));

    Logger.log('Planned2 index: ' + planned2Index + ', Actual2 index: ' + actual2Index);

    if (planned2Index === -1 || actual2Index === -1) {
      return { success: false, error: 'Planned2 or Actual2 column not found. Headers: ' + JSON.stringify(headers) };
    }

    const dataRows = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastColumn).getValues();
    Logger.log('Total data rows: ' + dataRows.length);

    const pendingStoreIn = dataRows
      .map((row, i) => ({ row, rowNumber: headerRow + 1 + i }))
      .filter(({ row }) => {
        const planned2Value = row[planned2Index];
        const actual2Value = row[actual2Index];

        const hasPlanned2 = planned2Value !== null && planned2Value !== undefined &&
                           planned2Value !== '' && planned2Value.toString().trim() !== '';
        const hasNoActual2 = actual2Value === null || actual2Value === undefined ||
                            actual2Value === '' || actual2Value.toString().trim() === '';

        return hasPlanned2 && hasNoActual2;
      })
      .map(({ row, rowNumber }) => {
        const indent = { rowNumber };
        headers.forEach((header, colIndex) => {
          let value = row[colIndex];
          if (value instanceof Date) value = formatDate(value);
          indent[header] = value === null || value === undefined || value === '' ? '' : value;
        });
        return indent;
      });

    Logger.log('Found ' + pendingStoreIn.length + ' pending store in items');
    return { success: true, indents: pendingStoreIn };

  } catch (error) {
    Logger.log('Error in getPendingStoreIn: ' + error);
    Logger.log('Stack: ' + error.stack);
    return { success: false, error: error.toString(), stack: error.stack };
  }
}

// ===== SUBMIT STORE IN DATA =====
function handleSubmitStoreIn(data) {
  try {
    Logger.log('=== Processing Store In Submission ===');
    Logger.log('Data keys: ' + Object.keys(data).join(', '));

    const { rowNumber, inQty, unitOfMeasurement, photoOfProductBase64, photoFileName, photoMimeType } = data;

    if (!rowNumber) {
      return { success: false, error: 'Row number is required' };
    }

    const sheet = getSheet('FMS');
    const headerRow = 6;
    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());

    Logger.log('Looking for columns...');

    // Find column indices
    const actual2Index = headers.findIndex(h => h.toLowerCase().includes('actual2'));
    const inQtyIndex = headers.findIndex(h => h.toLowerCase().includes('in qty'));
    const photoOfProductIndex = headers.findIndex(h => h.toLowerCase().includes('photo of product'));
    const unitOfMeasurementIndex = headers.findIndex(h => h.toLowerCase().includes('unit of measurement'));

    Logger.log('Column indices - Actual2: ' + actual2Index + ', InQty: ' + inQtyIndex +
               ', Photo: ' + photoOfProductIndex + ', Unit: ' + unitOfMeasurementIndex);

    const now = new Date();
    const timestamp = formatDate(now);

    // Upload photo to Google Drive
    let photoUrl = '';
    if (photoOfProductBase64 && photoFileName) {
      try {
        Logger.log('Uploading photo to Drive...');
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

        const base64Data = photoOfProductBase64.includes(',')
          ? photoOfProductBase64.split(',')[1]
          : photoOfProductBase64;

        const blob = Utilities.newBlob(
          Utilities.base64Decode(base64Data),
          resolveMimeType(photoOfProductBase64, photoFileName, photoMimeType),
          photoFileName
        );

        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        photoUrl = file.getUrl();

        Logger.log('✅ Photo uploaded: ' + photoUrl);
      } catch (uploadError) {
        Logger.log('❌ Photo upload error: ' + uploadError);
        photoUrl = 'Upload failed: ' + uploadError.toString();
      }
    } else {
      Logger.log('No photo data received');
    }

    // Update the row
    if (actual2Index !== -1) {
      setTimestampCell(sheet.getRange(rowNumber, actual2Index + 1), now);
      Logger.log('Set Actual2 timestamp');
    }

    if (inQtyIndex !== -1) {
      sheet.getRange(rowNumber, inQtyIndex + 1).setValue(parseInt(inQty) || 0);
      Logger.log('Set In Qty: ' + inQty);
    }

    if (photoOfProductIndex !== -1) {
      sheet.getRange(rowNumber, photoOfProductIndex + 1).setValue(photoUrl);
      Logger.log('Set Photo URL');
    }

    if (unitOfMeasurementIndex !== -1) {
      sheet.getRange(rowNumber, unitOfMeasurementIndex + 1).setValue(unitOfMeasurement || '');
      Logger.log('Set Unit: ' + unitOfMeasurement);
    }

    SpreadsheetApp.flush();

    Logger.log('✅ Store In data submitted successfully');
    return {
      success: true,
      message: 'Store In entry submitted successfully',
      timestamp,
      photoUrl,
      updatedRow: rowNumber
    };

  } catch (error) {
    Logger.log('❌ Store In submission error: ' + error);
    Logger.log('Stack: ' + error.stack);
    return {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }
}

// ===== GET PENDING TALLY ENTRY (Planned3 not null, Actual3 null) =====
function handleGetPendingTallyEntry() {
  try {
    Logger.log('=== Fetching Pending Tally Entry ===');

    const sheet = getSheet('FMS');
    const headerRow = 6;
    const lastColumn = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    if (lastRow <= headerRow) return { success: true, indents: [] };

    const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());
    Logger.log('Headers: ' + JSON.stringify(headers));

    const planned3Index = headers.findIndex(h => h.toLowerCase().includes('planned3'));
    const actual3Index = headers.findIndex(h => h.toLowerCase().includes('actual3'));

    Logger.log('Planned3 index: ' + planned3Index + ', Actual3 index: ' + actual3Index);

    if (planned3Index === -1 || actual3Index === -1) {
      return { success: false, error: 'Planned3 or Actual3 column not found. Headers: ' + JSON.stringify(headers) };
    }

    const dataRows = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastColumn).getValues();
    Logger.log('Total data rows: ' + dataRows.length);

    const pendingTallyEntry = dataRows
      .map((row, i) => ({ row, rowNumber: headerRow + 1 + i }))
      .filter(({ row }) => {
        const planned3Value = row[planned3Index];
        const actual3Value = row[actual3Index];

        const hasPlanned3 = planned3Value !== null && planned3Value !== undefined &&
                           planned3Value !== '' && planned3Value.toString().trim() !== '';
        const hasNoActual3 = actual3Value === null || actual3Value === undefined ||
                            actual3Value === '' || actual3Value.toString().trim() === '';

        return hasPlanned3 && hasNoActual3;
      })
      .map(({ row, rowNumber }) => {
        const indent = { rowNumber };
        headers.forEach((header, colIndex) => {
          let value = row[colIndex];
          if (value instanceof Date) value = formatDate(value);
          indent[header] = value === null || value === undefined || value === '' ? '' : value;
        });
        return indent;
      });

    Logger.log('Found ' + pendingTallyEntry.length + ' pending tally entry items');
    return { success: true, indents: pendingTallyEntry };

  } catch (error) {
    Logger.log('Error in getPendingTallyEntry: ' + error);
    Logger.log('Stack: ' + error.stack);
    return { success: false, error: error.toString(), stack: error.stack };
  }
}

// ===== SUBMIT TALLY ENTRY DATA =====
function handleSubmitTallyEntry(data) {
  try {
    Logger.log('=== Processing Tally Entry Submission ===');
    Logger.log('Data keys: ' + Object.keys(data).join(', '));

    const { rowNumber, status, reason } = data;

    if (!rowNumber) {
      return { success: false, error: 'Row number is required' };
    }

    const sheet = getSheet('FMS');
    const headerRow = 6;
    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0].map(h => h.toString().trim());

    Logger.log('Looking for columns...');

    // Find column indices
    const actual3Index = headers.findIndex(h => h.toLowerCase().includes('actual3'));
    const statusIndex = headers.findIndex(h => h.toLowerCase() === 'status');
    const reasonIndex = headers.findIndex(h => h.toLowerCase() === 'reason');

    Logger.log('Column indices - Actual3: ' + actual3Index + ', Status: ' + statusIndex + ', Reason: ' + reasonIndex);

    const now = new Date();
    const timestamp = formatDate(now);

    // Update the row
    if (actual3Index !== -1) {
      setTimestampCell(sheet.getRange(rowNumber, actual3Index + 1), now);
      Logger.log('Set Actual3 timestamp');
    }

    if (statusIndex !== -1) {
      sheet.getRange(rowNumber, statusIndex + 1).setValue(status || '');
      Logger.log('Set Status: ' + status);
    }

    if (reasonIndex !== -1) {
      sheet.getRange(rowNumber, reasonIndex + 1).setValue(reason || '');
      Logger.log('Set Reason: ' + reason);
    }

    SpreadsheetApp.flush();

    Logger.log('✅ Tally Entry data submitted successfully');
    return {
      success: true,
      message: 'Tally entry submitted successfully',
      timestamp,
      updatedRow: rowNumber
    };

  } catch (error) {
    Logger.log('❌ Tally Entry submission error: ' + error);
    Logger.log('Stack: ' + error.stack);
    return {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }
}
