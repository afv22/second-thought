// Second Thought - Justification Page Logic

const MIN_REASON_LENGTH = 50;
const DEFAULT_SESSION_DURATION = 15;

const reasonInput = document.getElementById("reason");
const charCount = document.getElementById("charCount");
const submitButton = document.getElementById("submit");
const domainSpan = document.getElementById("domain");

// Parse URL parameters
const params = new URLSearchParams(window.location.search);
const targetDomain = params.get("domain");
const targetUrl = params.get("url");

let sessionDurationMinutes = DEFAULT_SESSION_DURATION;

/**
 * Update character count display and enable/disable submit button
 */
function updateCharCount() {
  const length = reasonInput.value.length;
  const isValid = length >= MIN_REASON_LENGTH;

  charCount.textContent = `${length} / ${MIN_REASON_LENGTH} characters`;
  charCount.classList.toggle("valid", isValid);
  submitButton.disabled = !isValid;
}

/**
 * Submit justification, log entry, and create session
 */
async function submitJustification() {
  const reason = reasonInput.value.trim();
  if (reason.length < MIN_REASON_LENGTH) return;

  // Create session with expiration
  const expiresAt = Date.now() + sessionDurationMinutes * 60 * 1000;
  const data = await browser.storage.local.get("sessions");
  const sessions = data.sessions || {};
  sessions[targetDomain] = { expiresAt };
  await browser.storage.local.set({ sessions });

  // Log the justification
  await appendLog({
    timestamp: new Date().toISOString(),
    domain: targetDomain,
    url: targetUrl,
    reason,
    duration_minutes: sessionDurationMinutes,
  });

  redirectToOriginal();
}

/**
 * Redirect to the originally requested URL
 */
function redirectToOriginal() {
  window.location.href = targetUrl;
}

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  // Load session duration from settings
  const data = await browser.storage.local.get("settings");
  const settings = data.settings || {};
  sessionDurationMinutes = settings.sessionDuration || DEFAULT_SESSION_DURATION;

  domainSpan.textContent = targetDomain;
  reasonInput.addEventListener("input", updateCharCount);
  submitButton.addEventListener("click", submitJustification);
  updateCharCount();
});
