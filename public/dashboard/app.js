const API = "/api/v1";
const TOKEN_KEY = "gaa_token";
const PAGE_SIZE = 25;

const state = {
  token: localStorage.getItem(TOKEN_KEY) ?? "",
  games: { offset: 0 },
  achievements: { offset: 0 },
};

const $ = (sel) => document.querySelector(sel);

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${state.token}`,
  };
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

function formToQuery(form, extra = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  for (const [key, value] of new FormData(form).entries()) {
    if (value !== "" && value != null) params.set(key, String(value));
  }
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined) params.set(k, String(v));
  }
  return params;
}

function debounce(fn, ms = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function renderPager(containerId, total, offset, onPage) {
  const nav = $(containerId);
  if (total <= PAGE_SIZE) {
    nav.hidden = true;
    return;
  }
  nav.hidden = false;
  const page = Math.floor(offset / PAGE_SIZE);
  const maxPage = Math.ceil(total / PAGE_SIZE) - 1;
  nav.innerHTML = `
    <button type="button" ${page <= 0 ? "disabled" : ""} data-dir="prev">Previous</button>
    <span class="item-meta">Page ${page + 1} of ${maxPage + 1}</span>
    <button type="button" ${page >= maxPage ? "disabled" : ""} data-dir="next">Next</button>
  `;
  nav.querySelector("[data-dir=prev]")?.addEventListener("click", () =>
    onPage(Math.max(0, offset - PAGE_SIZE)),
  );
  nav.querySelector("[data-dir=next]")?.addEventListener("click", () =>
    onPage(Math.min(maxPage * PAGE_SIZE, offset + PAGE_SIZE)),
  );
}

async function loadGames(offset = 0) {
  const form = $("#games-filters");
  const params = formToQuery(form, { offset });
  const data = await api(`/users/me/games?${params}`);
  state.games.offset = offset;
  $("#games-count").textContent = `${data.total} total`;
  const list = $("#games-results");
  if (!data.games?.length) {
    list.innerHTML = '<li class="empty">No games match your filters.</li>';
  } else {
    list.innerHTML = data.games
      .map(
        (g) => `
      <li>
        <span class="item-title">${escapeHtml(g.name)}</span>
        <span class="item-meta">
          <span class="badge">${g.platform}</span>
          ${g.achievementEarned}/${g.achievementTotal} achievements
          (${g.completionPercent}%)
          · ${g.playtime ?? 0} min played
        </span>
      </li>`,
      )
      .join("");
  }
  renderPager("#games-pager", data.total, offset, loadGames);
}

async function loadAchievements(offset = 0) {
  const form = $("#achievements-filters");
  const params = formToQuery(form, { offset });
  const data = await api(`/users/me/achievements?${params}`);
  state.achievements.offset = offset;
  $("#achievements-count").textContent = `${data.total} total`;
  const list = $("#achievements-results");
  if (!data.achievements?.length) {
    list.innerHTML =
      '<li class="empty">No achievements match your filters.</li>';
  } else {
    list.innerHTML = data.achievements
      .map(
        (a) => `
      <li>
        <span class="item-title">${escapeHtml(a.name)}</span>
        <span class="item-meta">
          <span class="badge">${a.platform}</span>
          ${escapeHtml(a.gameName)} · ${a.points} pts
          · ${formatDate(a.dateEarned)}
        </span>
      </li>`,
      )
      .join("");
  }
  renderPager("#achievements-pager", data.total, offset, loadAchievements);
}

async function loadAccounts() {
  const form = $("#accounts-filters");
  const params = formToQuery(form);
  const data = await api(`/users/me/accounts?${params}`);
  $("#accounts-count").textContent = `${data.total} total`;
  const list = $("#accounts-results");
  if (!data.accounts?.length) {
    list.innerHTML = '<li class="empty">No linked accounts found.</li>';
  } else {
    list.innerHTML = data.accounts
      .map(
        (a) => `
      <li>
        <span class="item-title">${escapeHtml(a.platform)}</span>
        <span class="item-meta">
          ${escapeHtml(a.externalUsername ?? a.externalUserId)}
          · linked ${formatDate(a.linkedAt)}
        </span>
      </li>`,
      )
      .join("");
  }
}

async function loadSync() {
  const form = $("#sync-filters");
  const params = formToQuery(form);
  const data = await api(`/users/me/sync/status?${params}`);
  $("#sync-count").textContent = `${data.total} total`;
  const list = $("#sync-results");
  if (!data.syncStates?.length) {
    list.innerHTML = '<li class="empty">No sync history yet. Run a sync from the API.</li>';
  } else {
    list.innerHTML = data.syncStates
      .map(
        (s) => `
      <li>
        <span class="item-title">${escapeHtml(s.platform)}</span>
        <span class="item-meta">
          <span class="badge ${s.status === "success" ? "success" : s.status === "error" ? "error" : s.status === "running" ? "running" : ""}">${s.status}</span>
          ${s.lastSyncAt ? `Last sync ${formatDate(s.lastSyncAt)}` : "Never synced"}
          ${s.errorMessage ? ` · ${escapeHtml(s.errorMessage)}` : ""}
        </span>
      </li>`,
      )
      .join("");
  }
}

async function loadDashboard() {
  await Promise.all([
    loadGames(0),
    loadAchievements(0),
    loadAccounts(),
    loadSync(),
  ]);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function setAuthed(authed) {
  $("#dashboard").hidden = !authed;
  $("#btn-logout").hidden = !authed;
  $("#auth-status").textContent = authed
    ? "Signed in. Filters apply automatically as you type."
    : "Log in to load your data.";
}

$("#btn-login").addEventListener("click", async () => {
  try {
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    state.token = data.token;
    localStorage.setItem(TOKEN_KEY, state.token);
    setAuthed(true);
    await loadDashboard();
  } catch (err) {
    $("#auth-status").textContent = err.message;
  }
});

$("#btn-logout").addEventListener("click", () => {
  state.token = "";
  localStorage.removeItem(TOKEN_KEY);
  setAuthed(false);
});

for (const [id, loader, offsetKey] of [
  ["#games-filters", loadGames, "games"],
  ["#achievements-filters", loadAchievements, "achievements"],
]) {
  const form = $(id);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    loader(0);
  });
  form.querySelector('[name="q"]')?.addEventListener(
    "input",
    debounce(() => loader(0)),
  );
  for (const el of form.querySelectorAll("select, input:not([name=q])")) {
    el.addEventListener("change", () => loader(0));
  }
}

$("#accounts-filters").addEventListener("submit", (e) => {
  e.preventDefault();
  loadAccounts();
});
$("#accounts-filters")
  .querySelector('[name="q"]')
  ?.addEventListener("input", debounce(loadAccounts));
$("#accounts-filters")
  .querySelectorAll("select")
  .forEach((el) => el.addEventListener("change", loadAccounts));

$("#sync-filters").addEventListener("submit", (e) => {
  e.preventDefault();
  loadSync();
});
$("#sync-filters")
  .querySelectorAll("select")
  .forEach((el) => el.addEventListener("change", loadSync));

if (state.token) {
  setAuthed(true);
  loadDashboard().catch((err) => {
    $("#auth-status").textContent = err.message;
    setAuthed(false);
  });
}
