const SPREADSHEET_ID = '1tLCB4Zy4emIi5qjzoSfPh5WB7bBkcdCEeRXlnmNvfn4';
const SHEET_NAME = 'Respuestas';

const HEADERS = [
  'Fecha de recepción',
  'ID de envío',
  'Código de invitación',
  'Asistencia',
  'Mensaje de no asistencia',
  'Adultos',
  'Niños/bebés',
  'Adulto 1',
  'Adulto 2',
  'Niño/bebé',
  'Alergias adultos',
  'Detalle alergias adultos',
  'Menú especial',
  'Detalle otro menú',
  'Menú infantil',
  'Alergias niño',
  'Detalle alergias niño',
  'Trona',
  'Espacio carrito',
  'Necesidades bebé',
  'Alojamiento',
  'Tipo habitación Marina',
  'Observaciones',
  'Fecha del cliente',
  'URL de origen',
  'Navegador',
];

function doGet() {
  return jsonResponse_({ ok: true, service: 'rsvp-boda-jely-jaime' });
}

function doPost(event) {
  try {
    const payload = parsePayload_(event);

    // Campo trampa: los navegadores reales lo dejan vacío.
    if (optionalText_(payload.website, 200)) {
      return jsonResponse_({ ok: true });
    }

    const response = normalizeResponse_(payload);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sheet = getResponseSheet_();
      const duplicate = hasSubmission_(sheet, response.submissionId);

      if (!duplicate) {
        sheet.appendRow(toRow_(response));
      }

      return jsonResponse_({
        ok: true,
        duplicate,
        submissionId: response.submissionId,
      });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: 'invalid_request' });
  }
}

function setup() {
  const sheet = getResponseSheet_();
  return {
    spreadsheetId: SPREADSHEET_ID,
    sheetName: sheet.getName(),
    columns: HEADERS.length,
  };
}

function parsePayload_(event) {
  if (!event || !event.postData || !event.postData.contents) {
    throw new Error('Missing request body');
  }

  const payload = JSON.parse(event.postData.contents);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid request body');
  }

  return payload;
}

function normalizeResponse_(payload) {
  const attendance = requiredChoice_(payload.attendance, ['yes', 'no']);
  const attending = attendance === 'yes';
  const adultCount = attending ? integer_(payload.adultCount, 0, 2) : 0;
  const toddlerCount = attending ? integer_(payload.toddlerCount, 0, 1) : 0;

  if (attending && adultCount + toddlerCount < 1) {
    throw new Error('At least one guest is required');
  }

  return {
    submissionId: requiredText_(payload.submissionId, 100),
    inviteCode: optionalText_(payload.inviteCode, 100),
    attendance,
    declineMessage: attending ? '' : optionalText_(payload.declineMessage, 2000),
    adultCount,
    toddlerCount,
    guestName1: attending && adultCount >= 1 ? requiredText_(payload.guestName1, 200) : '',
    guestName2: attending && adultCount >= 2 ? requiredText_(payload.guestName2, 200) : '',
    guestName3: attending && toddlerCount >= 1 ? requiredText_(payload.guestName3, 200) : '',
    adultDietaryNeeds: attending ? optionalChoice_(payload.adultDietaryNeeds, ['yes', 'no']) : '',
    adultDietaryMessage: attending ? optionalText_(payload.adultDietaryMessage, 2000) : '',
    specialMenu: attending ? optionalChoice_(payload.specialMenu, ['no', 'vegetarian', 'vegan', 'other']) : '',
    otherMenuMessage: attending ? optionalText_(payload.otherMenuMessage, 2000) : '',
    childMenu: attending && toddlerCount ? optionalChoice_(payload.childMenu, ['yes', 'no']) : '',
    childDietaryNeeds: attending && toddlerCount ? optionalChoice_(payload.childDietaryNeeds, ['yes', 'no']) : '',
    childDietaryMessage: attending && toddlerCount ? optionalText_(payload.childDietaryMessage, 2000) : '',
    highChair: attending && toddlerCount ? optionalChoice_(payload.highChair, ['yes', 'no']) : '',
    strollerSpace: attending && toddlerCount ? optionalChoice_(payload.strollerSpace, ['yes', 'no']) : '',
    babyNeedsMessage: attending && toddlerCount ? optionalText_(payload.babyNeedsMessage, 2000) : '',
    accommodationOption: attending ? optionalChoice_(payload.accommodationOption, [
      'marina-portals',
      'maricel',
      'own-accommodation',
      'mallorca-resident',
    ]) : '',
    marinaRoomType: attending && payload.accommodationOption === 'marina-portals'
      ? optionalChoice_(payload.marinaRoomType, [
          'double-deluxe',
          'double-deluxe-2',
          'double-deluxe-cot',
          'triple-deluxe',
        ])
      : '',
    comfortMessage: attending ? optionalText_(payload.comfortMessage, 2000) : '',
    clientSubmittedAt: optionalText_(payload.clientSubmittedAt, 100),
    sourceUrl: optionalText_(payload.sourceUrl, 500),
    userAgent: optionalText_(payload.userAgent, 500),
  };
}

function toRow_(response) {
  return [
    new Date(),
    safeCell_(response.submissionId),
    safeCell_(response.inviteCode),
    response.attendance,
    safeCell_(response.declineMessage),
    response.adultCount,
    response.toddlerCount,
    safeCell_(response.guestName1),
    safeCell_(response.guestName2),
    safeCell_(response.guestName3),
    response.adultDietaryNeeds,
    safeCell_(response.adultDietaryMessage),
    response.specialMenu,
    safeCell_(response.otherMenuMessage),
    response.childMenu,
    response.childDietaryNeeds,
    safeCell_(response.childDietaryMessage),
    response.highChair,
    response.strollerSpace,
    safeCell_(response.babyNeedsMessage),
    response.accommodationOption,
    response.marinaRoomType,
    safeCell_(response.comfortMessage),
    safeCell_(response.clientSubmittedAt),
    safeCell_(response.sourceUrl),
    safeCell_(response.userAgent),
  ];
}

function getResponseSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  spreadsheet.setSpreadsheetLocale('es_ES');
  spreadsheet.setSpreadsheetTimeZone('Europe/Madrid');
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];

  if (currentHeaders.join('\u001f') !== HEADERS.join('\u001f')) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  sheet.setFrozenRows(1);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange
    .setBackground('#e6e6e6')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  if (!sheet.getFilter()) {
    sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length).createFilter();
  }

  sheet.setColumnWidth(1, 165);
  sheet.setColumnWidths(2, 2, 180);
  sheet.setColumnWidths(4, 4, 115);
  sheet.setColumnWidths(8, 3, 175);
  sheet.setColumnWidths(11, 12, 165);
  sheet.setColumnWidths(23, 4, 240);

  return sheet;
}

function hasSubmission_(sheet, submissionId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  return sheet
    .getRange(2, 2, lastRow - 1, 1)
    .createTextFinder(submissionId)
    .matchEntireCell(true)
    .findNext() !== null;
}

function requiredText_(value, maxLength) {
  const text = optionalText_(value, maxLength);
  if (!text) throw new Error('Missing required text');
  return text;
}

function optionalText_(value, maxLength) {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  if (text.length > maxLength) throw new Error('Text is too long');
  return text;
}

function requiredChoice_(value, choices) {
  const choice = optionalChoice_(value, choices);
  if (!choice) throw new Error('Missing required choice');
  return choice;
}

function optionalChoice_(value, choices) {
  if (value === undefined || value === null || value === '') return '';
  const choice = String(value);
  if (!choices.includes(choice)) throw new Error('Invalid choice');
  return choice;
}

function integer_(value, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error('Invalid integer');
  }
  return number;
}

function safeCell_(value) {
  const text = String(value || '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
