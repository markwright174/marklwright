const defaultClasses = [
  { id: 'class-a', day: 'A Days', slot: 'A1', name: 'Theatre Arts', note: 'Monday, Wednesday, Friday', href: '/study/class-a/' },
  { id: 'class-b', day: 'A Days', slot: 'A2', name: 'US History', note: 'Monday, Wednesday, Friday', href: '/study/class-b/' },
  { id: 'class-c', day: 'A Days', slot: 'A3', name: 'Fundamentals of Computer Science', note: 'Monday, Wednesday, Friday', href: '/study/class-c/' },
  { id: 'class-d', day: 'A Days', slot: 'A4', name: 'Science', note: 'Monday, Wednesday, Friday', href: '/study/class-d/' },
  { id: 'class-e', day: 'B Days', slot: 'B1', name: 'English', note: 'Tuesday, Thursday, Friday', href: '/study/class-e/' },
  { id: 'class-f', day: 'B Days', slot: 'B2', name: 'PE/Health', note: 'Tuesday, Thursday, Friday', href: '/study/class-f/' },
  { id: 'class-g', day: 'B Days', slot: 'B3', name: 'Exploring Science', note: 'Tuesday, Thursday, Friday', href: '/study/class-g/' },
  { id: 'class-h', day: 'B Days', slot: 'B4', name: 'Algebra 1', note: 'Tuesday, Thursday, Friday', href: '/study/class-h/' },
];

const storageKey = 'studyWorkspaceTranscripts';
const selectedRecordingKey = 'studyWorkspaceSelectedRecording';
const retiredTestSourceIds = new Set([
  'email:3eacc7add5bddd8785577eed56f1bd06bbc40125b78c5ef04a0e7418ce215928',
  'email:020dfd355bc419b3608364de78299a5f83236a5eb69bc662f9c9812a8b6a862d:summary',
]);
const classGrid = document.querySelector('#classGrid');
const intakeList = document.querySelector('#intakeList');
const recordingPreview = document.querySelector('#recordingPreview');
const updateTranscripts = document.querySelector('#updateTranscripts');
const plaudStatus = document.querySelector('#plaudStatus');
const frontStudyChat = document.querySelector('#frontStudyChat');

function getSaved() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function isRetiredTestItem(item) {
  return retiredTestSourceIds.has(item?.sourceId)
    || String(item?.title || '').startsWith('[Plaud-AutoFlow] 2026-08-06 11:52:36');
}

function clearRetiredTestItems() {
  const items = getSaved();
  const filtered = items.filter((item) => !isRetiredTestItem(item));
  if (filtered.length === items.length) return;
  setSaved(filtered);
  const selectedId = localStorage.getItem(selectedRecordingKey);
  if (!filtered.some((item) => item.id === selectedId)) {
    setSelectedItem(null);
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

function createStoredItem(item, existingItem = {}) {
  const text = getItemText(item);
  return {
    id: existingItem.id || crypto.randomUUID(),
    sourceId: item.sourceId,
    parentSourceId: item.parentSourceId || existingItem.parentSourceId || '',
    title: String(item.title || existingItem.title || 'Plaud recording').trim(),
    kind: item.kind || existingItem.kind || getItemKind(item),
    classId: existingItem.classId || 'unassigned',
    text,
    summary: String(item.summary || '').trim(),
    preview: getPreview(text),
    createdAt: existingItem.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    recordedAt: item.recordedAt || existingItem.recordedAt || null,
  };
}

function isCloudEmailImport(item) {
  return String(item?.sourceId || '').startsWith('email:');
}

function isSortedItem(item) {
  return Boolean(item?.classId && item.classId !== 'unassigned');
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

  ['A Days', 'B Days'].forEach((day) => {
    const group = document.createElement('section');
    group.className = 'class-day-group';
    group.innerHTML = `
      <div class="class-day-head">
        <h3>${day}</h3>
        <p>${day === 'A Days' ? 'Monday, Wednesday, Friday' : 'Tuesday, Thursday, Friday'}</p>
      </div>
      <div class="class-day-grid"></div>
    `;
    const grid = group.querySelector('.class-day-grid');

    defaultClasses.filter((klass) => klass.day === day).forEach((klass) => {
      const count = items.filter((item) => item.classId === klass.id).length;
      const card = document.createElement('a');
      card.className = 'class-card';
      card.href = klass.href;
      card.innerHTML = `
        <div>
          <h3>${klass.name}</h3>
          <p>${klass.note}</p>
          <p class="class-count">${count} item${count === 1 ? '' : 's'}</p>
        </div>
        <span class="button secondary">Open course</span>
      `;
      grid.append(card);
    });

    classGrid.append(group);
  });
}

function renderIntakeList() {
  const items = getUnassignedItems().slice().reverse();
  const selected = getSelectedItem(items);
  intakeList.innerHTML = '';

  if (!items.length) {
    intakeList.innerHTML = '<p class="study-note">No unsorted study materials right now.</p>';
    setSelectedItem(null);
    return;
  }

  items.forEach((item) => {
    const button = document.createElement('button');
    button.className = `intake-item${selected && selected.id === item.id ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.recordingId = item.id;
    const kindLabel = getKindLabel(getItemKind(item));
    button.innerHTML = `
      <span class="meta">${item.recordedAt ? new Date(item.recordedAt).toLocaleDateString() : 'Plaud'} · ${kindLabel}</span>
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
      <h3>Select an item</h3>
      <p>Choose one from the list to check it before sending it to a class.</p>
    `;
    return;
  }

  const kind = getItemKind(selected);
  const kindLabel = getKindLabel(kind);
  const content = getItemText(selected) || 'No text is saved for this item yet.';
  const controls = document.createElement('div');
  controls.className = 'preview-actions';
  const label = document.createElement('span');
  label.textContent = 'Send to';
  controls.append(label, createClassSelect(selected));

  recordingPreview.innerHTML = `
    <p class="meta">${kindLabel}</p>
    <h3>${escapeHtml(selected.title)}</h3>
    <h4>${kindLabel} glance</h4>
    <p>${escapeHtml(getPreview(content, 900))}</p>
  `;
  recordingPreview.append(controls);
}

function renderAll() {
  renderClasses();
  renderIntakeList();
  renderPreview();
}

function renderFrontStudyChat() {
  if (!frontStudyChat) return;

  let selectedMode = 'coach';
  const modeButtons = frontStudyChat.querySelectorAll('button[data-mode]');
  const status = frontStudyChat.querySelector('#frontChatStatus');
  const answer = frontStudyChat.querySelector('#frontChatAnswer');

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedMode = button.dataset.mode;
      modeButtons.forEach((entry) => entry.classList.remove('active'));
      button.classList.add('active');
    });
  });

  frontStudyChat.querySelector('#askFrontStudyHelper').addEventListener('click', async () => {
    const question = frontStudyChat.querySelector('#frontQuestion').value.trim();
    const contextText = frontStudyChat.querySelector('#frontContext').value.trim();

    if (!question) {
      status.textContent = 'Type a question first.';
      answer.innerHTML = '<p>No answer was created.</p>';
      return;
    }

    status.textContent = 'Thinking...';
    answer.innerHTML = '<p>Working on it.</p>';

    try {
      const response = await fetch('/api/study/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...window.getStudyAccessHeaders() },
        body: JSON.stringify({
          scope: 'general',
          mode: selectedMode,
          question,
          contextText,
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
      headers: { 'Content-Type': 'application/json', ...window.getStudyAccessHeaders() },
      body: JSON.stringify({ source: 'study-page' }),
    });
    const result = await response.json();

    if (!response.ok) {
      plaudStatus.textContent = result.message || 'The Plaud import is not connected yet.';
      return;
    }

    const incoming = Array.isArray(result.items) ? result.items : [];
    const saved = getSaved();
    const incomingBySourceId = new Map(incoming.filter((item) => item.sourceId).map((item) => [item.sourceId, item]));
    const reconciledSaved = saved.filter((item) => (
      !isCloudEmailImport(item) || incomingBySourceId.has(item.sourceId) || isSortedItem(item)
    ));
    const staleCount = saved.length - reconciledSaved.length;
    const existingBySourceId = new Map(reconciledSaved.map((item) => [item.sourceId, item]).filter(([sourceId]) => sourceId));
    const updatedItems = reconciledSaved.map((item) => {
      const incomingItem = incomingBySourceId.get(item.sourceId);
      return incomingItem ? createStoredItem(incomingItem, item) : item;
    });
    const newItems = incoming
      .filter((item) => item.sourceId && !existingBySourceId.has(item.sourceId))
      .map((item) => {
        const parent = item.parentSourceId
          ? saved.find((savedItem) => savedItem.sourceId === item.parentSourceId)
          : null;
        return createStoredItem(item, parent ? { classId: parent.classId } : {});
      });

    if (!incoming.length && !staleCount) {
      plaudStatus.textContent = 'No new Lily recordings were ready to import.';
      return;
    }

    if (!newItems.length && incomingBySourceId.size && !staleCount) {
      plaudStatus.textContent = 'Everything Plaud returned is already in the sorting list.';
      return;
    }

    setSaved([...updatedItems, ...newItems]);
    const selectedId = localStorage.getItem(selectedRecordingKey);
    if (selectedId && ![...updatedItems, ...newItems].some((item) => item.id === selectedId)) {
      setSelectedItem(null);
    }
    if (newItems.length) {
      setSelectedItem(newItems[0].id);
    }
    renderAll();
    if (newItems.length) {
      plaudStatus.textContent = `Added ${newItems.length} item${newItems.length === 1 ? '' : 's'} to the sorting list.`;
    } else if (staleCount) {
      plaudStatus.textContent = `Removed ${staleCount} old item${staleCount === 1 ? '' : 's'} that are no longer in Cloudflare.`;
    } else {
      plaudStatus.textContent = `Updated ${incomingBySourceId.size} existing item${incomingBySourceId.size === 1 ? '' : 's'}.`;
    }
  } catch {
    plaudStatus.textContent = 'The import endpoint is not available from this preview yet.';
  } finally {
    updateTranscripts.disabled = false;
  }
});

clearRetiredTestItems();
renderAll();
renderFrontStudyChat();
