const form = document.querySelector('#rsvp-form');
const guestDetails = document.querySelector('#guest-details');
const declineDetails = document.querySelector('#decline-details');
const counts = [...document.querySelectorAll('[name$="Count"]')];
const guestNames = [...document.querySelectorAll('[name^="guestName"]')];
const toddlerNameField = document.querySelector('#toddler-name-field');
const menuSection = document.querySelector('#menu-section');
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
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwgfUEv_E6vWb9yOaA5XEhjt0nI-x4LQD86znFrZ4wDhlq2drqg5VAVLMgLf0z1szjXDQ/exec';
const STORAGE_KEY = 'rsvp-boda-jely-jaime';
const PENDING_STORAGE_KEY = `${STORAGE_KEY}-pending`;
let pendingSubmission = null;

function createSubmissionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildSubmission() {
  const data = Object.fromEntries(new FormData(form));
  return {
    ...data,
    submissionId: createSubmissionId(),
    inviteCode: new URLSearchParams(globalThis.location.search).get('invite') || '',
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

function updateGuestFields() {
  const attending = form.elements.attendance.value === 'yes';
  const adultCount = Number(form.elements.adultCount.value);
  const toddlerCount = Number(form.elements.toddlerCount.value);
  const totalGuests = adultCount + toddlerCount;

  counts[0].setCustomValidity(attending && (totalGuests < 1 || totalGuests > 3)
    ? 'Indicad entre una y tres personas asistentes.'
    : '');
  const hasMinor = attending && toddlerCount > 0;
  const needsChildMenu = hasMinor && form.elements.childMenu.value === 'yes';
  const hasChildDietaryNeeds = needsChildMenu && form.elements.childDietaryNeeds.value === 'yes';

  toddlerNameField.hidden = toddlerCount === 0;
  babyNeedsSection.hidden = !hasMinor;
  childMenuQuestion.hidden = !hasMinor;
  childDietaryQuestion.hidden = !needsChildMenu;
  childDietaryDetails.hidden = !hasChildDietaryNeeds;

  childMenuInputs.forEach((input) => {
    input.disabled = !hasMinor;
    if (!hasMinor) input.checked = false;
  });
  childDietaryInputs.forEach((input) => {
    input.disabled = !needsChildMenu;
    if (!needsChildMenu) input.checked = false;
  });
  childDietaryMessage.required = hasChildDietaryNeeds;

  guestNames[0].required = attending && adultCount >= 1;
  guestNames[1].required = attending && adultCount >= 2;
  guestNames[2].required = attending && toddlerCount === 1;
}

document.querySelectorAll('input[name="attendance"]').forEach((input) => {
  input.addEventListener('change', () => {
    const attending = input.value === 'yes';
    guestDetails.hidden = !attending;
    declineDetails.hidden = attending;
    menuSection.hidden = !attending;
    accommodationSection.hidden = !attending;
    finalInformationSection.hidden = !attending;
    farewellMessage.hidden = !attending;
    updateGuestFields();
    message.textContent = '';
    message.className = 'form-message';
  });
});

counts.forEach((input) => input.addEventListener('change', updateGuestFields));

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
  input.addEventListener('change', updateGuestFields);
});

document.querySelectorAll('input[name="childDietaryNeeds"]').forEach((input) => {
  input.addEventListener('change', updateGuestFields);
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
    message.textContent = response.attendance === 'yes'
      ? '\u00a1Gracias! Hemos recibido vuestra confirmaci\u00f3n.'
      : 'Gracias por avisarnos. Os echaremos de menos.';
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
