'use strict';
// Signs in without leaving the page so a wrong password shows a message
// instead of a raw response. Without JavaScript the form still posts normally.
const form = document.querySelector('form');
const message = document.getElementById('login-error');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  message.textContent = '';
  try {
    const response = await fetch('/admin/login', {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)),
      redirect: 'manual',
      cache: 'no-store',
    });
    if (response.type === 'opaqueredirect' || response.ok) {
      location.replace('/admin');
      return;
    }
    const body = await response.json().catch(() => ({}));
    message.textContent = body.error || 'Sign-in failed. Try again.';
    form.querySelector('input').select();
  } catch {
    message.textContent = 'The backend did not answer. Check your connection and try again.';
  } finally {
    button.disabled = false;
  }
});
