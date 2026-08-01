const SPREADSHEET_ID = '1tLCB4Zy4emIi5qjzoSfPh5WB7bBkcdCEeRXlnmNvfn4';
const SHEET_NAME = 'Respuestas';

const HEADERS = [
  'Fecha de recepción',
  'ID de envío',
  'Código de invitación',
  'Asistencia general',
  'Mensaje de no asistencia',
  'Adultos asistentes',
  'Niños/bebés asistentes',
  'Adulto 1',
  'Asiste adulto 1',
  'Adulto 2',
  'Asiste adulto 2',
  'Niño/bebé',
  'Asiste niño/bebé',
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
  const invitees = normalizeInvitees_(payload.invitees);
  const adults = invitees.filter(({ type }) => type === 'adult');
  const children = invitees.filter(({ type }) => type === 'child');
  const attendingAdults = adults.filter(({ attendance }) => attendance === 'yes');
  const attendingChildren = children.filter(({ attendance }) => attendance === 'yes');
  const adultCount = attendingAdults.length;
  const toddlerCount = attendingChildren.length;
  const attending = adultCount + toddlerCount > 0;
  const attendance = !attending
    ? 'no'
    : adultCount + toddlerCount === invitees.length
      ? 'yes'
      : 'partial';
  const adult1 = adults[0] || { name: '', attendance: '' };
  const adult2 = adults[1] || { name: '', attendance: '' };
  const child = children[0] || { name: '', attendance: '' };

  return {
    submissionId: requiredText_(payload.submissionId, 100),
    inviteCode: optionalText_(payload.inviteCode, 100),
    attendance,
    declineMessage: attending ? '' : optionalText_(payload.declineMessage, 2000),
    adultCount,
    toddlerCount,
    guestName1: adult1.name,
    guestAttendance1: adult1.attendance,
    guestName2: adult2.name,
    guestAttendance2: adult2.attendance,
    guestName3: child.name,
    guestAttendance3: child.attendance,
    adultDietaryNeeds: adultCount ? optionalChoice_(payload.adultDietaryNeeds, ['yes', 'no']) : '',
    adultDietaryMessage: adultCount ? optionalText_(payload.adultDietaryMessage, 2000) : '',
    specialMenu: adultCount ? optionalChoice_(payload.specialMenu, ['no', 'vegetarian', 'vegan', 'other']) : '',
    otherMenuMessage: adultCount ? optionalText_(payload.otherMenuMessage, 2000) : '',
    childMenu: toddlerCount ? optionalChoice_(payload.childMenu, ['yes', 'no']) : '',
    childDietaryNeeds: toddlerCount ? optionalChoice_(payload.childDietaryNeeds, ['yes', 'no']) : '',
    childDietaryMessage: toddlerCount ? optionalText_(payload.childDietaryMessage, 2000) : '',
    highChair: toddlerCount ? optionalChoice_(payload.highChair, ['yes', 'no']) : '',
    strollerSpace: toddlerCount ? optionalChoice_(payload.strollerSpace, ['yes', 'no']) : '',
    babyNeedsMessage: toddlerCount ? optionalText_(payload.babyNeedsMessage, 2000) : '',
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
    response.guestAttendance1,
    safeCell_(response.guestName2),
    response.guestAttendance2,
    safeCell_(response.guestName3),
    response.guestAttendance3,
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

  if (sheet.getMaxColumns() < HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  }

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

  const currentFilter = sheet.getFilter();
  if (currentFilter && currentFilter.getRange().getNumColumns() !== HEADERS.length) {
    currentFilter.remove();
  }
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

function normalizeInvitees_(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    throw new Error('Invalid invitee list');
  }

  const invitees = value.map((invitee) => {
    if (!invitee || typeof invitee !== 'object' || Array.isArray(invitee)) {
      throw new Error('Invalid invitee');
    }

    return {
      name: requiredText_(invitee.name, 200),
      type: requiredChoice_(invitee.type, ['adult', 'child']),
      attendance: requiredChoice_(invitee.attendance, ['yes', 'no']),
    };
  });

  if (invitees.filter(({ type }) => type === 'adult').length > 2
      || invitees.filter(({ type }) => type === 'child').length > 1) {
    throw new Error('Too many invitees');
  }

  return invitees;
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
