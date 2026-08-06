const STUDY_ACCESS_CODE = 'lily-study';
const STUDY_ACCESS_KEY = 'studyWorkspaceAccessCode';

function hasStudyAccess() {
  try {
    return localStorage.getItem(STUDY_ACCESS_KEY) === STUDY_ACCESS_CODE;
  } catch {
    return false;
  }
}

function setStudyAccess(code) {
  try {
    localStorage.setItem(STUDY_ACCESS_KEY, code);
  } catch {
    return false;
  }
  return true;
}

window.getStudyAccessHeaders = function getStudyAccessHeaders() {
  try {
    return { 'X-Study-Access': localStorage.getItem(STUDY_ACCESS_KEY) || '' };
  } catch {
    return { 'X-Study-Access': '' };
  }
};

function unlockStudyPage() {
  document.body.classList.remove('study-gated');
  const gate = document.querySelector('#studyAccessGate');
  if (gate) gate.remove();
}

function renderStudyGate() {
  if (hasStudyAccess()) {
    unlockStudyPage();
    return;
  }

  const gate = document.createElement('section');
  gate.className = 'study-access-gate';
  gate.id = 'studyAccessGate';
  gate.innerHTML = `
    <form class="study-access-card">
      <p class="eyebrow">Lily's study space</p>
      <h1>Study access</h1>
      <p>Enter the family study password to open this workspace.</p>
      <label for="studyAccessPassword">Password</label>
      <input id="studyAccessPassword" type="password" autocomplete="current-password">
      <button class="button primary" type="submit">Open study site</button>
      <p class="study-access-error" id="studyAccessError" role="status"></p>
    </form>
  `;

  gate.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = gate.querySelector('#studyAccessPassword');
    const error = gate.querySelector('#studyAccessError');
    const value = input.value.trim();
    if (value !== STUDY_ACCESS_CODE) {
      error.textContent = 'That password did not open the study site.';
      input.select();
      return;
    }
    setStudyAccess(value);
    unlockStudyPage();
  });

  document.body.append(gate);
  gate.querySelector('#studyAccessPassword').focus();
}

document.addEventListener('DOMContentLoaded', renderStudyGate);
