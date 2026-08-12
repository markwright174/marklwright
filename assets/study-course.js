const courseClasses = [
  {
    id: 'class-a',
    name: 'Theatre Arts',
    driveFolderId: '1HvCY9j3GyUiSlc4bNu-WuW9HWlDnoDck',
  },
  {
    id: 'class-b',
    name: 'US History',
    driveFolderId: '1jZliIZU2o_Ax0npuK43W5RPXg4NzyLxt',
  },
  { id: 'class-c', name: 'Fundamentals of Computer Science' },
  {
    id: 'class-d',
    name: 'Science',
    driveFolderId: '1ySgqjEJ2Sgh1gxgYr_OfhYEQyu2hUc4K',
  },
  {
    id: 'class-e',
    name: 'English',
    driveFolderId: '1R0twGMKA9T-vEI5AZnJzKzsFqf06ppid',
  },
  {
    id: 'class-f',
    name: 'PE/Health',
    driveFolderId: '1hTeGGuBGWBKGq95iuf-QERGDCQHojx5v',
  },
  {
    id: 'class-g',
    name: 'Exploring Science',
    driveFolderId: '12B5q4Sd1bDIeChfzc1_fAdbaXD-pAolV',
  },
  {
    id: 'class-h',
    name: 'Algebra 1',
    driveFolderId: '1216wA1OcXDl4uebAN-F-hvhOyv5OUNA0',
  },
];

const courseStorageKey = 'studyWorkspaceTranscripts';
const retiredTestSourceIds = new Set([
  'email:3eacc7add5bddd8785577eed56f1bd06bbc40125b78c5ef04a0e7418ce215928',
  'email:020dfd355bc419b3608364de78299a5f83236a5eb69bc662f9c9812a8b6a862d:summary',
  'email:020dfd355bc419b3608364de78299a5f83236a5eb69bc662f9c9812a8b6a862d:transcript',
]);
const courseId = document.body.dataset.course;
const selectedCourseRecordingKey = `studyWorkspaceSelectedRecording:${courseId}`;
const course = courseClasses.find((entry) => entry.id === courseId) || courseClasses[0];
const title = document.querySelector('#courseTitle');
const count = document.querySelector('#courseCount');
const list = document.querySelector('#courseRecordings');
const chat = document.querySelector('#studyChat');
const driveMaterials = document.querySelector('#courseDriveMaterials');

function getSaved() {
  try {
    return JSON.parse(localStorage.getItem(courseStorageKey)) || [];
  } catch {
    return [];
  }
}

function setSaved(items) {
  localStorage.setItem(courseStorageKey, JSON.stringify(items));
}

function isRetiredTestItem(item) {
  return retiredTestSourceIds.has(item?.sourceId)
    || String(item?.title || '').startsWith('[Plaud-AutoFlow] 2026-08-06 11:52:36');
}

function clearRetiredTestItems() {
  const items = getSaved();
  const filtered = items.filter((item) => !isRetiredTestItem(item));
  if (filtered.length !== items.length) {
    setSaved(filtered);
  }
}

function getPreview(text, length = 360) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.slice(0, length) + (clean.length > length ? '...' : '');
}

function getItemText(item) {
  return String(item.text || item.summary || '').trim();
}

function getItemKind(item) {
  if (item.kind) return item.kind;
  if (item.text && !item.summary) return 'transcript';
  if (item.summary && !item.text) return 'summary';
  return 'recording';
}

function getKindLabel(kind) {
  if (kind === 'summary') return 'Summary';
  if (kind === 'transcript') return 'Transcript';
  return 'Recording';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

function getCourseItems() {
  return getSaved().filter((item) => item.classId === course.id).slice().reverse();
}

function getSelectedCourseItem(items) {
  const selectedId = localStorage.getItem(selectedCourseRecordingKey);
  return items.find((item) => item.id === selectedId) || items[0] || null;
}

function setSelectedCourseItem(itemId) {
  if (itemId) {
    localStorage.setItem(selectedCourseRecordingKey, itemId);
  } else {
    localStorage.removeItem(selectedCourseRecordingKey);
  }
}

function getRecordingDateLabel(item) {
  return item.recordedAt ? new Date(item.recordedAt).toLocaleDateString() : 'Recording';
}

function getEmptyMaterialsMessage() {
  return `
    <div class="detail-head">
      <p class="meta">Recording details</p>
      <h3>No recording selected</h3>
    </div>
    <div class="detail-scroll">
      <h4>Study material</h4>
      <p>When a summary or transcript is selected, its content will appear in this scrollable panel so longer materials do not change the page shape.</p>
    </div>
  `;
}

function renderCourse() {
  const items = getCourseItems();
  const selected = getSelectedCourseItem(items);
  title.textContent = course.name;
  count.textContent = `${items.length} item${items.length === 1 ? '' : 's'} saved here`;
  list.innerHTML = '';
  list.classList.remove('single-column');
  list.classList.add('course-workbench');
  list.innerHTML = `
    <div class="course-recording-list" aria-label="Recordings"></div>
    <article class="course-recording-detail" aria-live="polite"></article>
  `;

  const recordingList = list.querySelector('.course-recording-list');
  const detail = list.querySelector('.course-recording-detail');

  if (!items.length) {
    recordingList.innerHTML = `
      <div class="empty-list-panel">
        <p class="meta">Study materials</p>
        <h3>No items yet</h3>
        <p>When a summary or transcript is sent to ${escapeHtml(course.name)}, it will show up here.</p>
      </div>
    `;
    detail.innerHTML = getEmptyMaterialsMessage();
    return;
  }

  items.forEach((item) => {
    const button = document.createElement('button');
    button.className = `course-recording-button${selected && selected.id === item.id ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.recordingId = item.id;
    const kindLabel = getKindLabel(getItemKind(item));
    button.innerHTML = `
      <span class="meta">${getRecordingDateLabel(item)} · ${kindLabel}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(getPreview(getItemText(item), 120))}</span>
    `;
    recordingList.append(button);
  });

  const selectedKindLabel = getKindLabel(getItemKind(selected));
  detail.innerHTML = `
    <div class="detail-head">
      <p class="meta">${getRecordingDateLabel(selected)} · ${selectedKindLabel}</p>
      <h3>${escapeHtml(selected.title)}</h3>
    </div>
    <div class="detail-scroll">
      <h4>${selectedKindLabel}</h4>
      <p>${escapeHtml(getItemText(selected) || 'No text is saved for this item yet.')}</p>
    </div>
  `;

  recordingList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-recording-id]');
    if (!button) return;
    setSelectedCourseItem(button.dataset.recordingId);
    renderCourse();
  });
}

function renderChat() {
  const items = getCourseItems();
  if (!chat) return;

  if (!items.length) {
    chat.innerHTML = `
      <div class="chat-controls">
        <label for="chatRecording">Use recording</label>
        <select id="chatRecording" disabled>
          <option>No study materials saved yet</option>
        </select>

        <div class="mode-row" aria-label="Study actions">
          <button class="button secondary active" type="button" disabled>Explain</button>
          <button class="button secondary" type="button" disabled>Quiz me</button>
          <button class="button secondary" type="button" disabled>Key terms</button>
          <button class="button secondary" type="button" disabled>Find info</button>
          <button class="button secondary" type="button" disabled>Audio review</button>
        </div>

        <label for="chatQuestion">Question</label>
        <textarea id="chatQuestion" rows="4" placeholder="Course-specific help will be available after a recording is saved here." disabled></textarea>
        <button class="button primary" type="button" disabled>Ask study helper</button>
        <p class="chat-status">Waiting for a course item.</p>
      </div>
      <div class="chat-answer" aria-live="polite">
        <h3>Class helper ready</h3>
        <p>After a summary or transcript is saved to ${escapeHtml(course.name)}, this helper can use that material as context. General questions can still go through the helper on the Study home page.</p>
      </div>
    `;
    return;
  }

  chat.innerHTML = `
    <div class="chat-controls">
      <label for="chatRecording">Use recording</label>
      <select id="chatRecording">
        ${items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)}</option>`).join('')}
      </select>

      <div class="mode-row" aria-label="Study actions">
        <button class="button secondary" type="button" data-mode="explain">Explain</button>
        <button class="button secondary" type="button" data-mode="quiz">Quiz me</button>
        <button class="button secondary" type="button" data-mode="terms">Key terms</button>
        <button class="button secondary" type="button" data-mode="find">Find info</button>
        <button class="button secondary" type="button" data-mode="audio">Audio review</button>
      </div>

      <label for="chatQuestion">Question</label>
      <textarea id="chatQuestion" rows="4" placeholder="Ask something short about the selected recording."></textarea>
      <button class="button primary" type="button" id="askStudyHelper">Ask study helper</button>
      <p class="chat-status" id="chatStatus">Free-use guardrails are on. The helper stops after the daily limit.</p>
    </div>
    <div class="chat-answer" id="chatAnswer" aria-live="polite">
      <p>Select a class item and ask for a small piece of help.</p>
    </div>
  `;

  let selectedMode = 'explain';
  const modeButtons = chat.querySelectorAll('button[data-mode]');
  const status = chat.querySelector('#chatStatus');
  const answer = chat.querySelector('#chatAnswer');
  modeButtons[0].classList.add('active');

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedMode = button.dataset.mode;
      modeButtons.forEach((entry) => entry.classList.remove('active'));
      button.classList.add('active');
    });
  });

  chat.querySelector('#askStudyHelper').addEventListener('click', async () => {
    const selectedId = chat.querySelector('#chatRecording').value;
    const selected = items.find((item) => item.id === selectedId) || items[0];
    const question = chat.querySelector('#chatQuestion').value.trim();
    status.textContent = 'Thinking...';
    answer.innerHTML = '<p>Working on it.</p>';

    try {
      const response = await fetch('/api/study/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...window.getStudyAccessHeaders() },
        body: JSON.stringify({
          mode: selectedMode,
          question,
          contextTitle: selected.title,
          contextSummary: selected.summary,
          contextText: getItemText(selected),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        status.textContent = result.message || 'The study helper could not answer right now.';
        answer.innerHTML = '<p>No answer was created.</p>';
        return;
      }
      status.textContent = `Daily helper uses left: ${result.usage.remaining}`;
      answer.innerHTML = `<p>${escapeHtml(result.answer).replace(/\n/g, '<br>')}</p>`;
    } catch {
      status.textContent = 'The study helper is not available right now.';
      answer.innerHTML = '<p>No answer was created.</p>';
    }
  });
}

function renderDriveMaterials() {
  if (!driveMaterials) return;

  if (!course.driveFolderId) {
    driveMaterials.innerHTML = `
      <div class="drive-empty">
        <p class="meta">Google Drive</p>
        <h3>No folder connected yet</h3>
        <p>When this course has a shared Google Drive folder, its materials will appear here.</p>
      </div>
    `;
    return;
  }

  const folderUrl = `https://drive.google.com/drive/folders/${encodeURIComponent(course.driveFolderId)}`;
  const embedUrl = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(course.driveFolderId)}#list`;
  driveMaterials.innerHTML = `
    <div class="drive-actions">
      <a class="button primary" href="${folderUrl}" target="_blank" rel="noopener">New</a>
      <a class="button secondary" href="${folderUrl}" target="_blank" rel="noopener">Open folder</a>
    </div>
    <iframe class="drive-frame" src="${embedUrl}" title="${escapeHtml(course.name)} Google Drive folder"></iframe>
  `;
}

clearRetiredTestItems();
renderCourse();
renderChat();
renderDriveMaterials();
