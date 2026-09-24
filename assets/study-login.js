const form = document.querySelector('#studyLogin');
const input = document.querySelector('#studyAccessPassword');
const error = document.querySelector('#studyAccessError');

function returnPath() {
  const candidate = new URLSearchParams(location.search).get('next') || '/study/';
  try {
    const url = new URL(candidate, location.origin);
    if (url.origin === location.origin && (url.pathname === '/study' || url.pathname.startsWith('/study/'))
        && !url.pathname.startsWith('/study/login')) return url.pathname + url.search + url.hash;
  } catch {
    // Use the study home page for an invalid return path.
  }
  return '/study/';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.textContent = '';
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch('/api/study/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: input.value }),
    });
    if (!response.ok) {
      error.textContent = response.status === 401
        ? 'That password did not open the study site.'
        : 'Study access is unavailable right now. Please try again later.';
      input.select();
      return;
    }
    location.assign(returnPath());
  } catch {
    error.textContent = 'Could not connect. Please try again.';
  } finally {
    button.disabled = false;
  }
});
