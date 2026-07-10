// Second Thought - Chrome Background Service Worker
// Blocking is implemented with declarativeNetRequest: the dynamic ruleset is
// re-derived from storage (settings + sessions) whenever either changes, and
// an alarm fires at the earliest session expiry to re-enable blocking.

const DEFAULT_DOMAINS = ["reddit.com", "nytimes.com", "wsj.com"];
const EXPIRY_ALARM = "sessionExpiry";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Matches the scheme + a hostname equal to `domain` or any subdomain of it.
function hostPattern(domain) {
  return `^https?://([^/]+\\.)?${escapeRegex(domain)}(:\\d+)?`;
}

function computeRules(sessions, settings, now) {
  const domains = settings.domains || DEFAULT_DOMAINS;
  const subdomainWhitelist = settings.subdomainWhitelist || {};
  const subdirectoryWhitelist = settings.subdirectoryWhitelist || {};
  const justifyUrl = chrome.runtime.getURL("shared/justify_page/justify.html");

  const rules = [];
  let id = 1;

  for (const domain of domains) {
    const session = sessions[domain];
    if (session && now <= session.expiresAt) continue;

    rules.push({
      id: id++,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          // \0 is the full matched URL, passed through unencoded;
          // justify.js knows how to read it back out.
          regexSubstitution: `${justifyUrl}?domain=${encodeURIComponent(
            domain
          )}&url=\\0`,
        },
      },
      condition: {
        regexFilter: `${hostPattern(domain)}(/.*)?$`,
        resourceTypes: ["main_frame"],
      },
    });

    for (const subdomain of subdomainWhitelist[domain] || []) {
      rules.push({
        id: id++,
        priority: 2,
        action: { type: "allow" },
        condition: {
          regexFilter: `^https?://${escapeRegex(subdomain)}(:\\d+)?(/.*)?$`,
          resourceTypes: ["main_frame"],
        },
      });
    }

    for (const dir of subdirectoryWhitelist[domain] || []) {
      rules.push({
        id: id++,
        priority: 2,
        action: { type: "allowAllRequests" },
        condition: {
          regexFilter: `${hostPattern(domain)}${escapeRegex(dir)}([/?#].*)?$`,
          resourceTypes: ["main_frame"],
        },
      });
    }
  }

  return rules;
}

async function scheduleExpiryAlarm(sessions, now) {
  const expiries = Object.values(sessions)
    .map((s) => s.expiresAt)
    .filter((t) => t > now);
  await chrome.alarms.clear(EXPIRY_ALARM);
  if (expiries.length > 0) {
    chrome.alarms.create(EXPIRY_ALARM, { when: Math.min(...expiries) });
  }
}

async function doRefresh() {
  const data = await chrome.storage.local.get(["sessions", "settings"]);
  const sessions = data.sessions || {};
  const settings = data.settings || {};
  const now = Date.now();

  const rules = computeRules(sessions, settings, now);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: rules,
  });

  await scheduleExpiryAlarm(sessions, now);
}

// Serialize refreshes so overlapping storage events can't interleave rule updates
let refreshChain = Promise.resolve();
function refreshRules() {
  refreshChain = refreshChain
    .then(doRefresh)
    .catch((e) => console.error("Second Thought: rule refresh failed", e));
  return refreshChain;
}

async function pruneExpiredSessions() {
  const data = await chrome.storage.local.get("sessions");
  const sessions = data.sessions || {};
  const now = Date.now();
  const active = {};
  for (const [domain, session] of Object.entries(sessions)) {
    if (now <= session.expiresAt) active[domain] = session;
  }
  if (Object.keys(active).length !== Object.keys(sessions).length) {
    // storage.onChanged fires and triggers refreshRules()
    await chrome.storage.local.set({ sessions: active });
  } else {
    refreshRules();
  }
}

chrome.runtime.onInstalled.addListener(refreshRules);
chrome.runtime.onStartup.addListener(refreshRules);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.sessions || changes.settings)) {
    refreshRules();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === EXPIRY_ALARM) {
    pruneExpiredSessions();
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Keep rules current on every service worker wake
refreshRules();
