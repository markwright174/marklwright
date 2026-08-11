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
const courseId = document.body.dataset.course;
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

function renderCourse() {
  const items = getSaved().filter((item) => item.classId === course.id).slice().reverse();
  title.textContent = course.name;
  count.textContent = `${items.length} recording${items.length === 1 ? '' : 's'} saved here`;
  list.innerHTML = '';

  if (!items.length) {
    list.innerHTML = '<p class="study-note">No recordings have been sent to this class yet.</p>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'saved-card course-recording';
    card.innerHTML = `
      <p class="meta">${item.recordedAt ? new Date(item.recordedAt).toLocaleDateString() : 'Recording'}</p>
      <h3>${escapeHtml(item.title)}</h3>
      <h4>Summary</h4>
      <p>${escapeHtml(getPreview(item.summary || 'No Plaud summary is saved for this recording yet.'))}</p>
      <h4>Transcript glance</h4>
      <p>${escapeHtml(getPreview(item.text || 'No transcript text is saved for this recording yet.'))}</p>
    `;
    list.append(card);
  });
}

function getCourseItems() {
  return getSaved().filter((item) => item.classId === course.id).slice().reverse();
}

function renderChat() {
  const items = getCourseItems();
  if (!chat) return;

  if (!items.length) {
    chat.innerHTML = '<p class="study-note">Send a recording to this class before using the study helper.</p>';
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

renderCourse();
renderChat();
