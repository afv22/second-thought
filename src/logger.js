// Site Access Logger - Logging Utilities

const POST_TIMEOUT_MS = 3000;
const DEFAULT_SERVER_URL = "http://localhost:5000";

/**
 * Get the configured server URL from settings
 * @returns {Promise<string|null>} Server URL or null if not configured
 */
async function getServerUrl() {
  const data = await browser.storage.local.get("settings");
  const settings = data.settings || {};
  return settings.serverUrl || DEFAULT_SERVER_URL;
}

/**
 * Attempt to POST logs to the remote server with a timeout
 * @param {string} serverUrl - The server base URL
 * @param {Array} logs - Array of log entries to send
 * @returns {Promise<boolean>} true if the POST succeeded
 */
async function postLogsToServer(serverUrl, logs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);

  try {
    const response = await fetch(`${serverUrl}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logs),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (e) {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Clear all logs from local storage
 */
async function clearLogs() {
  await browser.storage.local.set({ logs: [] });
}

/**
 * Append a log entry to storage, then attempt to flush all logs to the server.
 * On successful POST, local logs are cleared.
 * On failure, logs remain in local storage for next attempt.
 * @param {Object} entry - Log entry to append
 */
async function appendLog(entry) {
  // Always save to local storage first (guarantees no data loss)
  const data = await browser.storage.local.get("logs");
  const logs = data.logs || [];
  logs.push(entry);
  await browser.storage.local.set({ logs });

  // Attempt to flush all local logs to the server
  const serverUrl = await getServerUrl();
  if (serverUrl) {
    const success = await postLogsToServer(serverUrl, logs);
    if (success) {
      await clearLogs();
    }
  }
}

