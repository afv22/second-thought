// Site Access Logger - Background Script
// Handles request interception and session management

const DEFAULT_DOMAINS = ["reddit.com", "nytimes.com", "wsj.com"];
const DEFAULT_SESSION_DURATION = 15;

// In-memory caches for synchronous access in request listener
let sessionCache = {};
let monitoredDomains = DEFAULT_DOMAINS;
let subdomainWhitelist = {};
let subdirectoryWhitelist = {};
let subdirectoryTabs = {}; // tabId -> domain, tracks tabs on whitelisted subdirectory pages


/**
 * Extract the base domain from a URL (handles subdomains like old.reddit.com)
 */
function getBaseDomain(url) {
  const hostname = new URL(url).hostname;
  for (const domain of monitoredDomains) {
    if (hostname === domain || hostname.endsWith("." + domain)) {
      return domain;
    }
  }
  return null;
}

/**
 * Check if there's an active session for the given domain (synchronous, uses cache)
 */
function hasActiveSession(domain) {
  const session = sessionCache[domain];
  if (!session) return false;
  return Date.now() <= session.expiresAt;
}

/**
 * Check if a URL's hostname is a whitelisted subdomain
 */
function isWhitelistedSubdomain(url, baseDomain) {
  const hostname = new URL(url).hostname;
  const whitelist = subdomainWhitelist[baseDomain];
  if (!whitelist || whitelist.length === 0) return false;
  return whitelist.includes(hostname);
}

/**
 * Check if a URL's pathname matches a whitelisted subdirectory
 */
function isWhitelistedSubdirectory(url, baseDomain) {
  const pathname = new URL(url).pathname;
  const whitelist = subdirectoryWhitelist[baseDomain];
  if (!whitelist || whitelist.length === 0) return false;
  return whitelist.some(
    (dir) => pathname === dir || pathname.startsWith(dir + "/")
  );
}

/**
 * Intercept requests to monitored domains
 */
function onBeforeRequest(details) {
  const domain = getBaseDomain(details.url);
  if (!domain) return {};

  // Skip if this is the justification page itself
  if (details.url.includes(browser.runtime.getURL(""))) return {};

  // Allow if the subdomain is whitelisted
  if (isWhitelistedSubdomain(details.url, domain)) return {};

  // Subdirectory allowlist: track tabs on allowed pages so sub-resources also load
  if (details.type === "main_frame") {
    if (isWhitelistedSubdirectory(details.url, domain)) {
      subdirectoryTabs[details.tabId] = domain;
      return {};
    } else {
      delete subdirectoryTabs[details.tabId];
    }
  } else if (subdirectoryTabs[details.tabId] === domain) {
    return {};
  }

  // Allow if there's an active session
  if (hasActiveSession(domain)) return {};

  // Redirect to justification page
  const redirectUrl =
    browser.runtime.getURL("src/justify.html") +
    "?domain=" +
    encodeURIComponent(domain) +
    "&url=" +
    encodeURIComponent(details.url);

  return { redirectUrl };
}

/**
 * Clean up expired sessions periodically
 */
async function cleanExpiredSessions() {
  const now = Date.now();
  let changed = false;

  for (const domain of Object.keys(sessionCache)) {
    if (now > sessionCache[domain].expiresAt) {
      delete sessionCache[domain];
      changed = true;
    }
  }

  if (changed) {
    await browser.storage.local.set({ sessions: sessionCache });
  }
}

/**
 * Load settings and set up request interception
 */
async function initializeExtension() {
  // Load sessions
  const data = await browser.storage.local.get(["sessions", "settings"]);
  sessionCache = data.sessions || {};

  // Load settings
  const settings = data.settings || {};
  monitoredDomains = settings.domains || DEFAULT_DOMAINS;
  subdomainWhitelist = settings.subdomainWhitelist || {};
  subdirectoryWhitelist = settings.subdirectoryWhitelist || {};

  // Set up request interception for all http/https URLs
  // (we filter by domain in onBeforeRequest since domains are dynamic)
  browser.webRequest.onBeforeRequest.addListener(
    onBeforeRequest,
    { urls: ["http://*/*", "https://*/*"] },
    ["blocking"]
  );

  console.log("Site Access Logger initialized");
}

// Clean expired sessions periodically (every minute)
setInterval(cleanExpiredSessions, 60 * 1000);

// Listen for storage changes (sessions and settings)
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.sessions) {
      sessionCache = changes.sessions.newValue || {};
    }
    if (changes.settings) {
      const settings = changes.settings.newValue || {};
      monitoredDomains = settings.domains || DEFAULT_DOMAINS;
      subdomainWhitelist = settings.subdomainWhitelist || {};
      subdirectoryWhitelist = settings.subdirectoryWhitelist || {};
    }
  }
});

// Clean up subdirectory tab tracking when tabs are closed
browser.tabs.onRemoved.addListener((tabId) => {
  delete subdirectoryTabs[tabId];
});

// Open options page when clicking the extension icon
browser.browserAction.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});

// Initialize extension
initializeExtension();
