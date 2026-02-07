// Site Access Logger - Options Page

const DEFAULT_DOMAINS = ["reddit.com", "nytimes.com", "wsj.com"];
const DEFAULT_SESSION_DURATION = 15;

const sessionDurationInput = document.getElementById("sessionDuration");
const domainsList = document.getElementById("domainsList");
const newDomainInput = document.getElementById("newDomain");
const addDomainButton = document.getElementById("addDomain");
const status = document.getElementById("status");

let domains = [];
let subdomainWhitelist = {};
let subdirectoryWhitelist = {};

async function loadSettings() {
  const data = await browser.storage.local.get(["settings"]);
  const settings = data.settings || {};

  domains = settings.domains || DEFAULT_DOMAINS;
  subdomainWhitelist = settings.subdomainWhitelist || {};
  subdirectoryWhitelist = settings.subdirectoryWhitelist || {};
  sessionDurationInput.value = settings.sessionDuration || DEFAULT_SESSION_DURATION;

  renderDomains();
}

async function saveSettings() {
  await browser.storage.local.set({
    settings: {
      domains,
      subdomainWhitelist,
      subdirectoryWhitelist,
      sessionDuration: parseInt(sessionDurationInput.value, 10),
    },
  });
  showStatus("Settings saved");
}

function renderDomains() {
  domainsList.replaceChildren();
  for (const domain of domains) {
    const item = document.createElement("div");
    item.className = "domain-item";

    const chevronBtn = document.createElement("button");
    chevronBtn.textContent = "▶";
    chevronBtn.className = "chevron-btn";
    chevronBtn.title = "Manage allowlists";
    chevronBtn.dataset.domain = domain;

    const span = document.createElement("span");
    span.textContent = domain;
    span.style.flex = "1";

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.className = "remove-btn";
    removeBtn.dataset.domain = domain;

    item.appendChild(chevronBtn);
    item.appendChild(span);
    item.appendChild(removeBtn);
    domainsList.appendChild(item);

    // Allowlist panel (collapsible)
    const panel = document.createElement("div");
    panel.className = "allowlist-panel";
    panel.id = "allowlist-panel-" + domain;

    // Subdomain section
    const subdomainSection = document.createElement("div");
    subdomainSection.className = "subdomain-panel";
    subdomainSection.id = "subdomain-panel-" + domain;
    renderSubdomainPanel(subdomainSection, domain);
    panel.appendChild(subdomainSection);

    // Subdirectory section
    const subdirectorySection = document.createElement("div");
    subdirectorySection.className = "subdirectory-panel";
    subdirectorySection.id = "subdirectory-panel-" + domain;
    renderSubdirectoryPanel(subdirectorySection, domain);
    panel.appendChild(subdirectorySection);

    domainsList.appendChild(panel);
  }
}

function renderSubdomainPanel(panel, domain) {
  panel.replaceChildren();

  const header = document.createElement("div");
  header.className = "subdomain-panel-header";
  header.textContent = "Whitelisted subdomains";
  panel.appendChild(header);

  const whitelist = subdomainWhitelist[domain] || [];

  if (whitelist.length === 0) {
    const empty = document.createElement("div");
    empty.className = "subdomain-empty";
    empty.textContent = "No whitelisted subdomains";
    panel.appendChild(empty);
  } else {
    for (const sub of whitelist) {
      const subItem = document.createElement("div");
      subItem.className = "subdomain-item";

      const subSpan = document.createElement("span");
      subSpan.textContent = sub;

      const subRemoveBtn = document.createElement("button");
      subRemoveBtn.textContent = "×";
      subRemoveBtn.dataset.domain = domain;
      subRemoveBtn.dataset.subdomain = sub;

      subItem.appendChild(subSpan);
      subItem.appendChild(subRemoveBtn);
      panel.appendChild(subItem);
    }
  }

  const addRow = document.createElement("div");
  addRow.className = "add-subdomain";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "sub." + domain;
  input.dataset.domain = domain;

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add";
  addBtn.dataset.domain = domain;

  addRow.appendChild(input);
  addRow.appendChild(addBtn);
  panel.appendChild(addRow);
}

function toggleAllowlistPanel(domain) {
  const panel = document.getElementById("allowlist-panel-" + domain);
  if (panel) {
    panel.classList.toggle("open");
    const chevron = domainsList.querySelector(
      `.chevron-btn[data-domain="${domain}"]`
    );
    if (chevron) {
      chevron.classList.toggle("expanded");
    }
  }
}

function addSubdomainWhitelist(domain) {
  const panel = document.getElementById("subdomain-panel-" + domain);
  const input = panel.querySelector(".add-subdomain input");
  const subdomain = input.value.trim().toLowerCase();
  if (!subdomain) return;

  if (!subdomain.endsWith("." + domain)) {
    showStatus("Subdomain must end with ." + domain);
    return;
  }

  if (!subdomainWhitelist[domain]) {
    subdomainWhitelist[domain] = [];
  }

  if (subdomainWhitelist[domain].includes(subdomain)) {
    showStatus("Subdomain already whitelisted");
    return;
  }

  subdomainWhitelist[domain].push(subdomain);
  input.value = "";
  renderSubdomainPanel(panel, domain);
  saveSettings();
}

function removeSubdomainWhitelist(domain, subdomain) {
  if (!subdomainWhitelist[domain]) return;
  subdomainWhitelist[domain] = subdomainWhitelist[domain].filter(
    (s) => s !== subdomain
  );
  if (subdomainWhitelist[domain].length === 0) {
    delete subdomainWhitelist[domain];
  }

  const panel = document.getElementById("subdomain-panel-" + domain);
  if (panel) {
    renderSubdomainPanel(panel, domain);
  }
  saveSettings();
}

function renderSubdirectoryPanel(panel, domain) {
  panel.replaceChildren();

  const header = document.createElement("div");
  header.className = "subdirectory-panel-header";
  header.textContent = "Whitelisted subdirectories";
  panel.appendChild(header);

  const whitelist = subdirectoryWhitelist[domain] || [];

  if (whitelist.length === 0) {
    const empty = document.createElement("div");
    empty.className = "subdirectory-empty";
    empty.textContent = "No whitelisted subdirectories";
    panel.appendChild(empty);
  } else {
    for (const dir of whitelist) {
      const dirItem = document.createElement("div");
      dirItem.className = "subdirectory-item";

      const dirSpan = document.createElement("span");
      dirSpan.textContent = dir;

      const dirRemoveBtn = document.createElement("button");
      dirRemoveBtn.textContent = "×";
      dirRemoveBtn.dataset.domain = domain;
      dirRemoveBtn.dataset.subdirectory = dir;

      dirItem.appendChild(dirSpan);
      dirItem.appendChild(dirRemoveBtn);
      panel.appendChild(dirItem);
    }
  }

  const addRow = document.createElement("div");
  addRow.className = "add-subdirectory";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "/" + domain.split(".")[0] + "/path";
  input.dataset.domain = domain;

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add";
  addBtn.dataset.domain = domain;

  addRow.appendChild(input);
  addRow.appendChild(addBtn);
  panel.appendChild(addRow);
}

function addSubdirectoryWhitelist(domain) {
  const panel = document.getElementById("subdirectory-panel-" + domain);
  const input = panel.querySelector(".add-subdirectory input");
  let subdirectory = input.value.trim().toLowerCase();
  if (!subdirectory) return;

  // Ensure it starts with /
  if (!subdirectory.startsWith("/")) {
    subdirectory = "/" + subdirectory;
  }

  // Remove trailing slash
  if (subdirectory.length > 1 && subdirectory.endsWith("/")) {
    subdirectory = subdirectory.slice(0, -1);
  }

  if (subdirectory === "/") {
    showStatus("Subdirectory cannot be just /");
    return;
  }

  if (!subdirectoryWhitelist[domain]) {
    subdirectoryWhitelist[domain] = [];
  }

  if (subdirectoryWhitelist[domain].includes(subdirectory)) {
    showStatus("Subdirectory already whitelisted");
    return;
  }

  subdirectoryWhitelist[domain].push(subdirectory);
  input.value = "";
  renderSubdirectoryPanel(panel, domain);
  saveSettings();
}

function removeSubdirectoryWhitelist(domain, subdirectory) {
  if (!subdirectoryWhitelist[domain]) return;
  subdirectoryWhitelist[domain] = subdirectoryWhitelist[domain].filter(
    (d) => d !== subdirectory
  );
  if (subdirectoryWhitelist[domain].length === 0) {
    delete subdirectoryWhitelist[domain];
  }

  const panel = document.getElementById("subdirectory-panel-" + domain);
  if (panel) {
    renderSubdirectoryPanel(panel, domain);
  }
  saveSettings();
}

function addDomain() {
  const domain = newDomainInput.value.trim().toLowerCase();
  if (!domain) return;
  if (domains.includes(domain)) {
    showStatus("Domain already exists");
    return;
  }

  domains.push(domain);
  newDomainInput.value = "";
  renderDomains();
  saveSettings();
}

function removeDomain(domain) {
  domains = domains.filter((d) => d !== domain);
  delete subdomainWhitelist[domain];
  delete subdirectoryWhitelist[domain];
  renderDomains();
  saveSettings();
}

function showStatus(message) {
  status.textContent = message;
  status.classList.add("success");
  setTimeout(() => {
    status.classList.remove("success");
  }, 2000);
}

// Event listeners
sessionDurationInput.addEventListener("change", saveSettings);
addDomainButton.addEventListener("click", addDomain);
newDomainInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addDomain();
});
domainsList.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") {
    if (e.target.classList.contains("remove-btn")) {
      removeDomain(e.target.dataset.domain);
    } else if (e.target.classList.contains("chevron-btn")) {
      toggleAllowlistPanel(e.target.dataset.domain);
    } else if (
      e.target.closest(".subdomain-item") &&
      e.target.dataset.subdomain
    ) {
      removeSubdomainWhitelist(e.target.dataset.domain, e.target.dataset.subdomain);
    } else if (e.target.closest(".add-subdomain")) {
      addSubdomainWhitelist(e.target.dataset.domain);
    } else if (
      e.target.closest(".subdirectory-item") &&
      e.target.dataset.subdirectory
    ) {
      removeSubdirectoryWhitelist(e.target.dataset.domain, e.target.dataset.subdirectory);
    } else if (e.target.closest(".add-subdirectory")) {
      addSubdirectoryWhitelist(e.target.dataset.domain);
    }
  }
});
domainsList.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && e.target.closest(".add-subdomain")) {
    addSubdomainWhitelist(e.target.dataset.domain);
  }
  if (e.key === "Enter" && e.target.closest(".add-subdirectory")) {
    addSubdirectoryWhitelist(e.target.dataset.domain);
  }
});
// Initialize
loadSettings();
