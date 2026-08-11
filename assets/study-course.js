const courseClasses = [
  { id: 'class-a', name: 'Theatre Arts' },
  { id: 'class-b', name: 'US History' },
  { id: 'class-c', name: 'Fundamentals of Computer Science' },
  { id: 'class-d', name: 'Science' },
  { id: 'class-e', name: 'English' },
  { id: 'class-f', name: 'PE/Health' },
  { id: 'class-g', name: 'Exploring Science' },
  { id: 'class-h', name: 'Algebra 1' },
];

const courseStorageKey = 'studyWorkspaceTranscripts';
const retiredTestSourceIds = new Set([
  'email:3eacc7add5bddd8785577eed56f1bd06bbc40125b78c5ef04a0e7418ce215928',
]);
const courseId = document.body.dataset.course;
const selectedCourseRecordingKey = `studyWorkspaceSelectedRecording:${courseId}`;
const course = courseClasses.find((entry) => entry.id === courseId) || courseClasses[0];
const title = document.querySelector('#courseTitle');
const count = document.querySelector('#courseCount');
const list = document.querySelector('#courseRecordings');
const chat = document.querySelector('#studyChat');

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
      <p class="meta">Ready for materials</p>
      <h3>No recording selected</h3>
    </div>
    <div class="detail-scroll">
      <h4>How this area will work</h4>
      <p>Recordings, summaries, and transcripts for ${escapeHtml(course.name)} will appear in the list on the left. Select one to read the summary and transcript here without stretching the whole page.</p>
      <h4>Other course materials</h4>
      <p>This page can also hold study guides, assignments, vocabulary, review questions, and notes that are not tied to a Plaud recording.</p>
    </div>
  `;
}

function renderCourse() {
  const items = getCourseItems();
  const selected = getSelectedCourseItem(items);
  title.textContent = course.name;
  count.textContent = `${items.length} recording${items.length === 1 ? '' : 's'} saved here`;
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
        <p class="meta">Recordings</p>
        <h3>No recordings yet</h3>
        <p>When a recording is sent to ${escapeHtml(course.name)}, it will show up here.</p>
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
    button.innerHTML = `
      <span class="meta">${getRecordingDateLabel(item)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.summary ? getPreview(item.summary, 120) : getPreview(item.text, 120))}</span>
    `;
    recordingList.append(button);
  });

  detail.innerHTML = `
    <div class="detail-head">
      <p class="meta">${getRecordingDateLabel(selected)}</p>
      <h3>${escapeHtml(selected.title)}</h3>
    </div>
    <div class="detail-scroll">
      <h4>Summary</h4>
      <p>${escapeHtml(selected.summary || 'No Plaud summary is saved for this recording yet.')}</p>
      <h4>Transcript</h4>
      <p>${escapeHtml(selected.text || 'No transcript text is saved for this recording yet.')}</p>
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
      <div class="empty-helper-panel">
        <h3>Study helper is ready</h3>
        <p>After a recording is saved to this class, the helper can use that transcript as context. For general questions, use the helper on the Study home page.</p>
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
      <p>Select a recording and ask for a small piece of help.</p>
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
          contextText: selected.text,
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

clearRetiredTestItems();
renderCourse();
renderChat();
