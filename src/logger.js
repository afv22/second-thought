// Site Access Logger - Logging Utilities

/**
 * Clear all logs from local storage
 */
async function clearLogs() {
  await browser.storage.local.set({ logs: [] });
}

/**
 * Append a log entry to storage.
 * @param {Object} entry - Log entry to append
 */
async function appendLog(entry) {
  const data = await browser.storage.local.get("logs");
  const logs = data.logs || [];
  logs.push(entry);
  await browser.storage.local.set({ logs });
}

