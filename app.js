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

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const response = { ...data, submittedAt: new Date().toISOString() };

  localStorage.setItem('rsvp-boda-jely-jaime', JSON.stringify(response));
  message.textContent = data.attendance === 'yes'
    ? '\u00a1Gracias! Hemos guardado vuestra confirmaci\u00f3n.'
    : 'Gracias por avisarnos. Os echaremos de menos.';
  message.className = 'form-message';
  form.querySelector('button').textContent = 'Confirmaci\u00f3n enviada';
});
