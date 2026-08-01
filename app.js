const form = document.querySelector('#rsvp-form');
const inviteeList = document.querySelector('#invitee-list');
const missingInvitees = document.querySelector('#missing-invitees');
const declineDetails = document.querySelector('#decline-details');
const menuSection = document.querySelector('#menu-section');
const adultDietaryQuestion = document.querySelector('#adult-dietary-question');
const adultSpecialMenuQuestion = document.querySelector('#adult-special-menu-question');
const babyNeedsSection = document.querySelector('#baby-needs-section');
const accommodationSection = document.querySelector('#accommodation-section');
const finalInformationSection = document.querySelector('#final-information-section');
const farewellMessage = document.querySelector('#farewell-message');
const message = document.querySelector('#form-message');
const adultDietaryDetails = document.querySelector('#adult-dietary-details');
const otherMenuDetails = document.querySelector('#other-menu-details');
const childMenuQuestion = document.querySelector('#child-menu-question');
const childDietaryQuestion = document.querySelector('#child-dietary-question');
const childDietaryDetails = document.querySelector('#child-dietary-details');
const adultDietaryMessage = document.querySelector('#adult-dietary-message');
const otherMenuMessage = document.querySelector('#other-menu-message');
const childDietaryMessage = document.querySelector('#child-dietary-message');
const marinaRoomOptions = document.querySelector('#marina-room-options');
const marinaRoomTypes = [...document.querySelectorAll('input[name="marinaRoomType"]')];
const childMenuInputs = [...document.querySelectorAll('input[name="childMenu"]')];
const childDietaryInputs = [...document.querySelectorAll('input[name="childDietaryNeeds"]')];
const submitButton = form.querySelector('button[type="submit"]');
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzVj3sA3dbndnm5H7U3dRhyoVdWBtd-18PgmSzQfmwWJCMcvIUp0JQqI5sTwgMTdLXI0g/exec';
const STORAGE_KEY = 'rsvp-boda-jely-jaime';
const PENDING_STORAGE_KEY = `${STORAGE_KEY}-pending`;
let pendingSubmission = null;

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 200);
}

function getInviteesFromUrl() {
  const params = new URLSearchParams(globalThis.location.search);
  const namedAdults = [params.get('adult1'), params.get('adult2')];
  const repeatedAdults = params.getAll('adult');
  const namedChildren = [params.get('child')];
  const repeatedChildren = params.getAll('childName');
  const adults = (namedAdults.some(Boolean) ? namedAdults : repeatedAdults).slice(0, 2);
  const children = (namedChildren.some(Boolean) ? namedChildren : repeatedChildren).slice(0, 1);

  return [
    ...adults.map((name) => ({ name: normalizeName(name), type: 'adult' })),
    ...children.map((name) => ({ name: normalizeName(name), type: 'child' })),
  ].filter((invitee) => invitee.name);
}

const invitees = getInviteesFromUrl();

function renderInvitees() {
  missingInvitees.hidden = invitees.length > 0;
  submitButton.disabled = invitees.length === 0;

  invitees.forEach((invitee, index) => {
    const row = document.createElement('div');
    row.className = 'invitee-row';

    const name = document.createElement('p');
    name.id = `invitee-name-${index}`;
    name.className = 'invitee-name';
    name.textContent = invitee.name;

    const toggle = document.createElement('fieldset');
    toggle.className = 'attendance-toggle';
    toggle.setAttribute('aria-labelledby', name.id);
    const legend = document.createElement('legend');
    legend.className = 'visually-hidden';
    legend.textContent = `Asistencia de ${invitee.name}`;
    toggle.append(legend);

    [
      ['no', 'No asistirá'],
      ['yes', 'Sí asistirá'],
    ].forEach(([value, labelText]) => {
      const label = document.createElement('label');
      label.className = 'toggle-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `inviteeAttendance${index}`;
      input.value = value;
      input.required = true;
      input.setAttribute('aria-label', `${invitee.name}: ${labelText}`);
      input.addEventListener('change', updateAttendanceState);
      const labelSpan = document.createElement('span');
      labelSpan.textContent = labelText;
      label.append(input, labelSpan);
      toggle.append(label);
    });

    row.append(name, toggle);
    inviteeList.append(row);
  });
}

function getInviteeResponses() {
  return invitees.map((invitee, index) => ({
    ...invitee,
    attendance: form.elements[`inviteeAttendance${index}`]?.value || '',
  }));
}

function clearRadioGroup(name) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = false;
  });
}

function updateAttendanceState() {
  const responses = getInviteeResponses();
  const allAnswered = responses.length > 0 && responses.every(({ attendance }) => attendance);
  const attending = responses.filter(({ attendance }) => attendance === 'yes');
  const attendingAdults = attending.filter(({ type }) => type === 'adult');
  const attendingChildren = attending.filter(({ type }) => type === 'child');
  const hasAttendees = attending.length > 0;
  const hasAdult = attendingAdults.length > 0;
  const hasChild = attendingChildren.length > 0;
  const nobodyAttends = allAnswered && !hasAttendees;
  const needsChildMenu = hasChild && form.elements.childMenu.value === 'yes';
  const hasChildDietaryNeeds = needsChildMenu && form.elements.childDietaryNeeds.value === 'yes';

  declineDetails.hidden = !nobodyAttends;
  menuSection.hidden = !hasAttendees;
  adultDietaryQuestion.hidden = !hasAdult;
  adultSpecialMenuQuestion.hidden = !hasAdult;
  accommodationSection.hidden = !hasAttendees;
  finalInformationSection.hidden = !hasAttendees;
  farewellMessage.hidden = !hasAttendees;
  babyNeedsSection.hidden = !hasChild;
  childMenuQuestion.hidden = !hasChild;
  childDietaryQuestion.hidden = !needsChildMenu;
  childDietaryDetails.hidden = !hasChildDietaryNeeds;

  if (!hasAdult) {
    clearRadioGroup('adultDietaryNeeds');
    clearRadioGroup('specialMenu');
    adultDietaryDetails.hidden = true;
    otherMenuDetails.hidden = true;
    adultDietaryMessage.required = false;
    otherMenuMessage.required = false;
  }

  childMenuInputs.forEach((input) => {
    input.disabled = !hasChild;
    if (!hasChild) input.checked = false;
  });
  childDietaryInputs.forEach((input) => {
    input.disabled = !needsChildMenu;
    if (!needsChildMenu) input.checked = false;
  });
  childDietaryMessage.required = hasChildDietaryNeeds;
  message.textContent = '';
  message.className = 'form-message';
}

function createSubmissionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildSubmission() {
  const data = Object.fromEntries(new FormData(form));
  Object.keys(data).forEach((key) => {
    if (key.startsWith('inviteeAttendance')) delete data[key];
  });

  const responses = getInviteeResponses();
  const attending = responses.filter(({ attendance }) => attendance === 'yes');
  const allAttend = attending.length === responses.length;
  const params = new URLSearchParams(globalThis.location.search);

  return {
    ...data,
    submissionId: createSubmissionId(),
    inviteCode: params.get('invite') || '',
    attendance: attending.length === 0 ? 'no' : allAttend ? 'yes' : 'partial',
    adultCount: attending.filter(({ type }) => type === 'adult').length,
    toddlerCount: attending.filter(({ type }) => type === 'child').length,
    invitees: responses,
    clientSubmittedAt: new Date().toISOString(),
    sourceUrl: globalThis.location.href,
    userAgent: globalThis.navigator.userAgent,
  };
}

async function sendSubmission(response) {
  if (!RSVP_ENDPOINT.startsWith('https://script.google.com/macros/s/')) {
    throw new Error('El servicio de confirmaciones todavía no está configurado.');
  }

  await fetch(RSVP_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(response),
  });
}

document.querySelectorAll('input[name="adultDietaryNeeds"]').forEach((input) => {
  input.addEventListener('change', () => {
    const needsDetails = input.value === 'yes';
    adultDietaryDetails.hidden = !needsDetails;
    adultDietaryMessage.required = needsDetails;
  });
});

document.querySelectorAll('input[name="specialMenu"]').forEach((input) => {
  input.addEventListener('change', () => {
    const needsDetails = input.value === 'other';
    otherMenuDetails.hidden = !needsDetails;
    otherMenuMessage.required = needsDetails;
  });
});

document.querySelectorAll('input[name="childMenu"]').forEach((input) => {
  input.addEventListener('change', updateAttendanceState);
});

document.querySelectorAll('input[name="childDietaryNeeds"]').forEach((input) => {
  input.addEventListener('change', updateAttendanceState);
});

document.querySelectorAll('input[name="accommodationOption"]').forEach((input) => {
  input.addEventListener('change', () => {
    const isMarinaPortals = input.value === 'marina-portals';
    marinaRoomOptions.hidden = !isMarinaPortals;
    marinaRoomTypes.forEach((roomType) => {
      roomType.disabled = !isMarinaPortals;
      roomType.required = isMarinaPortals;
    });
  });
});

form.addEventListener('input', () => {
  if (!submitButton.disabled) pendingSubmission = null;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = pendingSubmission || buildSubmission();
  pendingSubmission = response;

  submitButton.disabled = true;
  submitButton.setAttribute('aria-busy', 'true');
  submitButton.textContent = 'Enviando confirmaci\u00f3n\u2026';
  message.textContent = '';
  message.className = 'form-message';
  localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(response));

  try {
    await sendSubmission(response);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    localStorage.removeItem(PENDING_STORAGE_KEY);
    pendingSubmission = null;
    message.textContent = response.attendance === 'no'
      ? 'Gracias por avisarnos. Os echaremos de menos.'
      : '\u00a1Gracias! Hemos recibido vuestra confirmaci\u00f3n.';
    submitButton.textContent = 'Confirmaci\u00f3n enviada';
  } catch (error) {
    console.error(error);
    message.textContent = 'No hemos podido enviar la confirmaci\u00f3n. Comprobad la conexi\u00f3n e intentadlo de nuevo.';
    message.className = 'form-message error';
    submitButton.disabled = false;
    submitButton.textContent = 'Reintentar confirmaci\u00f3n';
  } finally {
    submitButton.removeAttribute('aria-busy');
  }
});

renderInvitees();
updateAttendanceState();
