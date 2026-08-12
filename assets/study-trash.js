const trashClasses = [
  { id: 'class-a', name: 'Theatre Arts' },
  { id: 'class-b', name: 'US History' },
  { id: 'class-c', name: 'Fundamentals of Computer Science' },
  { id: 'class-d', name: 'Science' },
  { id: 'class-e', name: 'English' },
  { id: 'class-f', name: 'PE/Health' },
  { id: 'class-g', name: 'Exploring Science' },
  { id: 'class-h', name: 'Algebra 1' },
];

const trashContainer = document.querySelector('#trashMaterials');
let trashItems = [];
let selectedSourceId = '';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

function getItemText(item) {
  return String(item.text || item.summary || '').trim();
}

function getKindLabel(item) {
  if (item.kind === 'summary') return 'Summary';
  if (item.kind === 'transcript') return 'Transcript';
  return 'Recording';
}

function getDateLabel(item) {
  return item.recordedAt ? new Date(item.recordedAt).toLocaleDateString() : '';
}

function createCourseOptions() {
  return trashClasses
    .map((course) => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.name)}</option>`)
    .join('');
}

async function fetchTrashItems() {
  const response = await fetch('/api/study/course-materials?classId=trash', {
    headers: window.getStudyAccessHeaders(),
  });
  if (!response.ok) {
    throw new Error('Trash could not be loaded.');
  }
  const result = await response.json();
  return Array.isArray(result.items) ? result.items : [];
}

async function persistMaterialChange(sourceId, changes) {
  const response = await fetch('/api/study/assign-material', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...window.getStudyAccessHeaders() },
    body: JSON.stringify({ sourceId, ...changes }),
  });
  if (!response.ok) {
    throw new Error('The material could not be updated.');
  }
}

async function deleteMaterial(sourceId) {
  const response = await fetch('/api/study/assign-material', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...window.getStudyAccessHeaders() },
    body: JSON.stringify({ sourceId, deleteForever: true }),
  });
  if (!response.ok) {
    throw new Error('The material could not be deleted.');
  }
}

function renderTrash() {
  const selected = trashItems.find((item) => item.sourceId === selectedSourceId) || trashItems[0] || null;
  selectedSourceId = selected?.sourceId || '';

  trashContainer.classList.remove('single-column');
  trashContainer.classList.add('course-workbench');
  trashContainer.innerHTML = `
    <div class="course-recording-list" aria-label="Trashed materials">
      <div class="explorer-items">
        <div class="explorer-header" aria-hidden="true">
          <span>Date</span>
          <span>Name</span>
          <span>Type</span>
        </div>
      </div>
    </div>
    <article class="course-recording-detail" aria-live="polite"></article>
  `;

  const explorerItems = trashContainer.querySelector('.explorer-items');
  const detail = trashContainer.querySelector('.course-recording-detail');

  if (!trashItems.length) {
    explorerItems.innerHTML = `
      <div class="empty-list-panel">
        <p class="meta">Trash</p>
        <h3>Trash is empty</h3>
        <p>Materials moved to Trash will appear here before they are permanently deleted.</p>
      </div>
    `;
    detail.innerHTML = `
      <div class="detail-head">
        <p class="meta">Recovery</p>
        <h3>No item selected</h3>
      </div>
      <div class="detail-scroll">
        <h4>Trashed material</h4>
        <p>Nothing is waiting in Trash right now.</p>
      </div>
    `;
    return;
  }

  trashItems.forEach((item) => {
    const button = document.createElement('button');
    button.className = `course-recording-button${item.sourceId === selectedSourceId ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.sourceId = item.sourceId;
    button.innerHTML = `
      <span class="material-date">${escapeHtml(getDateLabel(item))}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <span class="material-type">${escapeHtml(getKindLabel(item))}</span>
    `;
    explorerItems.append(button);
  });

  detail.innerHTML = `
    <div class="detail-head">
      <h3>${escapeHtml(selected.title)}</h3>
      <div class="material-actions trash-actions">
        <label>
          <span>Move to</span>
          <select id="trashMove">
            <option value="">Choose class</option>
            ${createCourseOptions()}
          </select>
        </label>
        <button class="button secondary" id="restoreMaterial" type="button">Move item</button>
        <button class="button danger" id="deleteForever" type="button">Delete forever</button>
      </div>
      <p class="material-status" id="trashStatus">Move this item back to a class, or delete it permanently.</p>
    </div>
    <div class="detail-scroll">
      <h4>${escapeHtml(getKindLabel(selected))}</h4>
      <p>${escapeHtml(getItemText(selected) || 'No text is saved for this item.')}</p>
    </div>
  `;

  explorerItems.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-source-id]');
    if (!button) return;
    selectedSourceId = button.dataset.sourceId;
    renderTrash();
  });

  detail.querySelector('#restoreMaterial').addEventListener('click', async () => {
    const nextClassId = detail.querySelector('#trashMove').value;
    const status = detail.querySelector('#trashStatus');
    if (!nextClassId) {
      status.textContent = 'Choose a class first.';
      return;
    }
    await persistMaterialChange(selected.sourceId, { classId: nextClassId });
    trashItems = trashItems.filter((item) => item.sourceId !== selected.sourceId);
    selectedSourceId = '';
    renderTrash();
  });

  detail.querySelector('#deleteForever').addEventListener('click', async () => {
    const confirmed = window.confirm('Delete this material forever? This cannot be undone.');
    if (!confirmed) return;
    await deleteMaterial(selected.sourceId);
    trashItems = trashItems.filter((item) => item.sourceId !== selected.sourceId);
    selectedSourceId = '';
    renderTrash();
  });
}

async function loadTrash() {
  try {
    trashItems = await fetchTrashItems();
    renderTrash();
  } catch (error) {
    trashContainer.innerHTML = `
      <div class="empty-list-panel">
        <p class="meta">Trash</p>
        <h3>Trash could not load</h3>
        <p>${escapeHtml(error.message || 'Try again in a minute.')}</p>
      </div>
    `;
  }
}

loadTrash();
