const defaultClasses = [
  { id: 'class-a', name: 'Class A', note: 'Rename when the schedule arrives.', href: '/study/class-a/' },
  { id: 'class-b', name: 'Class B', note: 'Keep recordings, notes, and review questions together.', href: '/study/class-b/' },
  { id: 'class-c', name: 'Class C', note: 'Good for lectures, labs, or class discussions.', href: '/study/class-c/' },
  { id: 'class-d', name: 'Class D', note: 'Use this as a parking place until subjects are known.', href: '/study/class-d/' },
  { id: 'class-e', name: 'Class E', note: 'Save transcript work without needing perfect notes first.', href: '/study/class-e/' },
  { id: 'class-f', name: 'Class F', note: 'Optional sixth class or study hall support.', href: '/study/class-f/' },
];

const storageKey = 'studyWorkspaceTranscripts';
const selectedRecordingKey = 'studyWorkspaceSelectedRecording';
const classGrid = document.querySelector('#classGrid');
const intakeList = document.querySelector('#intakeList');
const recordingPreview = document.querySelector('#recordingPreview');
const updateTranscripts = document.querySelector('#updateTranscripts');
const plaudStatus = document.querySelector('#plaudStatus');

function getSaved() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function setSaved(items) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function getClassName(classId) {
  const klass = defaultClasses.find((entry) => entry.id === classId);
  return klass ? klass.name : 'Unassigned';
}

function getPreview(text, length = 220) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.slice(0, length) + (clean.length > length ? '...' : '');
}

function getItemText(item) {
  return String(item.text || item.summary || '').trim();
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

function getUnassignedItems() {
  return getSaved().filter((item) => !item.classId || item.classId === 'unassigned');
}

function getSelectedItem(items = getUnassignedItems()) {
  const selectedId = localStorage.getItem(selectedRecordingKey);
  return items.find((item) => item.id === selectedId) || items[0] || null;
}

function setSelectedItem(itemId) {
  if (itemId) {
    localStorage.setItem(selectedRecordingKey, itemId);
  } else {
    localStorage.removeItem(selectedRecordingKey);
  }
}

function createClassSelect(item) {
  const select = document.createElement('select');
  select.className = 'saved-class-select';
  select.setAttribute('aria-label', `Send ${item.title} to a class`);

  const unassigned = document.createElement('option');
  unassigned.value = 'unassigned';
  unassigned.textContent = 'Choose class';
  select.append(unassigned);

  defaultClasses.forEach((klass) => {
    const option = document.createElement('option');
    option.value = klass.id;
    option.textContent = klass.name;
    select.append(option);
  });

  select.value = item.classId || 'unassigned';
  select.addEventListener('change', () => {
    const items = getSaved();
    const target = items.find((entry) => entry.id === item.id);
    if (!target) return;
    target.classId = select.value;
    setSaved(items);
    if (select.value !== 'unassigned') {
      setSelectedItem(null);
    }
    renderAll();
  });

  return select;
}

function renderClasses() {
  const items = getSaved();
  classGrid.innerHTML = '';

  defaultClasses.forEach((klass) => {
    const count = items.filter((item) => item.classId === klass.id).length;
    const card = document.createElement('a');
    card.className = 'class-card';
    card.href = klass.href;
    card.innerHTML = `
      <div>
        <p class="meta">${klass.id.replace('-', ' ')}</p>
        <h3>${klass.name}</h3>
        <p>${klass.note}</p>
        <p class="class-count">${count} recording${count === 1 ? '' : 's'}</p>
      </div>
      <span class="button secondary">Open course</span>
    `;
    classGrid.append(card);
  });
}

function renderIntakeList() {
  const items = getUnassignedItems().slice().reverse();
  const selected = getSelectedItem(items);
  intakeList.innerHTML = '';

  if (!items.length) {
    intakeList.innerHTML = '<p class="study-note">No unsorted recordings right now.</p>';
    setSelectedItem(null);
    return;
  }

  items.forEach((item) => {
    const button = document.createElement('button');
    button.className = `intake-item${selected && selected.id === item.id ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.recordingId = item.id;
    button.innerHTML = `
      <span class="meta">${item.recordedAt ? new Date(item.recordedAt).toLocaleDateString() : 'Plaud'}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.summary ? getPreview(item.summary, 110) : getPreview(getItemText(item), 110))}</span>
    `;
    intakeList.append(button);
  });
}

function renderPreview() {
  const selected = getSelectedItem();
  recordingPreview.innerHTML = '';

  if (!selected) {
    recordingPreview.innerHTML = `
      <p class="meta">Preview</p>
      <h3>Select a recording</h3>
      <p>Choose one from the list to check the summary and transcript before sending it to a class.</p>
    `;
    return;
  }

  const summary = selected.summary || 'No Plaud summary is saved for this recording yet.';
  const transcript = getItemText(selected) || 'No transcript text is saved for this recording yet.';
  const controls = document.createElement('div');
  controls.className = 'preview-actions';
  const label = document.createElement('span');
  label.textContent = 'Send to';
  controls.append(label, createClassSelect(selected));

  recordingPreview.innerHTML = `
    <p class="meta">Preview</p>
    <h3>${escapeHtml(selected.title)}</h3>
    <h4>Summary</h4>
    <p>${escapeHtml(getPreview(summary, 520))}</p>
    <h4>Transcript glance</h4>
    <p>${escapeHtml(getPreview(transcript, 520))}</p>
  `;
  recordingPreview.append(controls);
}

function renderAll() {
  renderClasses();
  renderIntakeList();
  renderPreview();
}

intakeList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-recording-id]');
  if (!button) return;
  setSelectedItem(button.dataset.recordingId);
  renderAll();
});

updateTranscripts.addEventListener('click', async () => {
  updateTranscripts.disabled = true;
  plaudStatus.textContent = 'Checking Plaud for new recordings...';

  try {
    const response = await fetch('/api/study/update-transcripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'study-page' }),
    });
    const result = await response.json();

    if (!response.ok) {
      plaudStatus.textContent = result.message || 'The Plaud import is not connected yet.';
      return;
    }

    const incoming = Array.isArray(result.items) ? result.items : [];
    if (!incoming.length) {
      plaudStatus.textContent = 'No new Lily recordings were ready to import.';
      return;
    }

    const saved = getSaved();
    const existingSourceIds = new Set(saved.map((item) => item.sourceId).filter(Boolean));
    const newItems = incoming
      .filter((item) => item.sourceId && !existingSourceIds.has(item.sourceId))
      .map((item) => {
        const text = getItemText(item);
        return {
          id: crypto.randomUUID(),
          sourceId: item.sourceId,
          title: String(item.title || 'Plaud recording').trim(),
          classId: 'unassigned',
          text,
          summary: String(item.summary || '').trim(),
          preview: getPreview(text),
          createdAt: new Date().toISOString(),
          recordedAt: item.recordedAt || null,
        };
      });

    if (!newItems.length) {
      plaudStatus.textContent = 'Everything Plaud returned is already in the sorting list.';
      return;
    }

    setSaved([...saved, ...newItems]);
    setSelectedItem(newItems[0].id);
    renderAll();
    plaudStatus.textContent = `Added ${newItems.length} recording${newItems.length === 1 ? '' : 's'} to the sorting list.`;
  } catch {
    plaudStatus.textContent = 'The import endpoint is not available from this preview yet.';
  } finally {
    updateTranscripts.disabled = false;
  }
});

renderAll();
