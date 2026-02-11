
/**
 * KPI Tracking System - Google Apps Script Backend
 */

// --- Configuration ---
const SHEETS = {
  DEPARTMENTS: 'Departments',
  EMPLOYEES: 'Employees',
  KPIS: 'KPIs',
  ASSIGNMENTS: 'Assignments',
  ACTIVITIES: 'Activities',
  RECORDS: 'Records',
  LEVEL_RULES: 'LevelRules'
};

// --- Web App Handlers ---

function doGet(e) {
  return ContentService.createTextOutput("KPI System API is running.");
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload;
    
    let result = null;
    
    switch (action) {
      case 'getAllData':
        result = getAllData();
        break;
      case 'saveDepartment':
        result = saveItem(SHEETS.DEPARTMENTS, payload);
        break;
      case 'deleteDepartment':
        result = deleteItem(SHEETS.DEPARTMENTS, payload);
        break;
      case 'saveEmployee':
        result = saveItem(SHEETS.EMPLOYEES, payload);
        break;
      case 'deleteEmployee':
        result = deleteItem(SHEETS.EMPLOYEES, payload);
        break;
      case 'saveKPI':
        result = saveItem(SHEETS.KPIS, payload);
        break;
      case 'deleteKPI':
        result = deleteItem(SHEETS.KPIS, payload);
        break;
      case 'saveAssignment':
        result = saveItem(SHEETS.ASSIGNMENTS, payload);
        break;
      case 'deleteAssignment':
        result = deleteItem(SHEETS.ASSIGNMENTS, payload);
        break;
      case 'saveActivity':
        result = saveItem(SHEETS.ACTIVITIES, payload);
        break;
      case 'deleteActivity':
        result = deleteItem(SHEETS.ACTIVITIES, payload);
        break;
      case 'saveRecord':
        result = saveRecord(payload);
        break;
      case 'deleteRecord':
        result = deleteItem(SHEETS.RECORDS, payload);
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Data Operations ---

function getAllData() {
  return {
    departments: getSheetData(SHEETS.DEPARTMENTS),
    employees: getSheetData(SHEETS.EMPLOYEES),
    kpis: getSheetData(SHEETS.KPIS),
    assignments: getSheetData(SHEETS.ASSIGNMENTS),
    activities: getSheetData(SHEETS.ACTIVITIES),
    records: getRecordsData(), // Special handler for Records to include userNote
    levelRules: getSheetData(SHEETS.LEVEL_RULES)
  };
}

// Generic get data
function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // Only header or empty
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      // Convert header to camelCase for JSON keys if needed, 
      // but simpler to assume headers match keys or close enough
      const key = header.toString().trim(); 
      // Simple logic: Use header as key. 
      // Ensure your Sheet headers match the property names (e.g., id, code, name)
      obj[key.charAt(0).toLowerCase() + key.slice(1)] = row[index];
    });
    return obj;
  });
}

// Specific handler for Records to ensure field mapping is correct
function getRecordsData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.RECORDS);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  // Mapping based on Fixed Column Order (More reliable than headers for this specific issue)
  // Columns: ID, Date, EmployeeId, KpiId, ActivityId, ActivityName, Period, PeriodDetail, Level, Score, Weight, WeightedScore, Note, UserNote
  return data.slice(1).map(row => ({
    id: row[0],
    date: row[1],
    employeeId: row[2],
    kpiId: row[3],
    activityId: row[4],
    activityName: row[5],
    period: row[6],
    periodDetail: row[7],
    level: row[8],
    score: row[9],
    weight: row[10],
    weightedScore: row[11],
    note: row[12],      // System Note (Rubric)
    userNote: row[13]   // User Note (Manual Input) - Column 14 (Index 13)
  }));
}

// Generic Save (Create/Update) based on ID matching
function saveItem(sheetName, item) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Find row by ID
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  // Assume ID is always in the first column (index 0)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(item.id)) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }
  
  const rowData = headers.map(header => {
    // Map header name to item property
    // Assumes header "Name" maps to item.name, "Code" to item.code
    const key = header.charAt(0).toLowerCase() + header.slice(1);
    return item[key] !== undefined ? item[key] : '';
  });
  
  if (rowIndex > 0) {
    // Update
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // Create
    sheet.appendRow(rowData);
  }
  
  return item;
}

// Specific Save for Record to handle the specific column structure
function saveRecord(item) {
  const sheet = getSheet(SHEETS.RECORDS);
  
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(item.id)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  // Explicit Column Mapping for Records
  const rowData = [
    item.id,
    item.date,
    item.employeeId,
    item.kpiId,
    item.activityId,
    item.activityName,
    item.period,
    item.periodDetail,
    item.level,
    item.score,
    item.weight,
    item.weightedScore,
    item.note,      // System Note
    item.userNote   // User Note (New Field)
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return item;
}

function deleteItem(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, id: id };
    }
  }
  
  throw new Error('Item not found');
}

// Helper to get or create sheet
function getSheet(name) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(name);
    // Initialize headers if new (Simple Default)
    if (name === SHEETS.RECORDS) {
      sheet.appendRow(['id', 'date', 'employeeId', 'kpiId', 'activityId', 'activityName', 'period', 'periodDetail', 'level', 'score', 'weight', 'weightedScore', 'note', 'userNote']);
    } else {
      // Basic headers for other sheets (User should setup sheets properly ideally)
      sheet.appendRow(['id', 'code', 'name', 'description']); 
    }
  }
  return sheet;
}
