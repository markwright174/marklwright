const courseClasses = [
  { id: 'class-a', name: 'Class A' },
  { id: 'class-b', name: 'Class B' },
  { id: 'class-c', name: 'Class C' },
  { id: 'class-d', name: 'Class D' },
  { id: 'class-e', name: 'Class E' },
  { id: 'class-f', name: 'Class F' },
];

const courseStorageKey = 'studyWorkspaceTranscripts';
const courseId = document.body.dataset.course;
const course = courseClasses.find((entry) => entry.id === courseId) || courseClasses[0];
const title = document.querySelector('#courseTitle');
const count = document.querySelector('#courseCount');
const list = document.querySelector('#courseRecordings');

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

renderCourse();
