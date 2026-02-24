const ADMIN_AUTH_KEY = "ramadhan_admin_auth";
const ADMIN_SETTINGS_KEY = "ramadhan_admin_settings";
const RESERVATION_HISTORY_KEY = "ramadhan_reservation_history";

const API_URL =
  "https://script.google.com/macros/s/AKfycbxJWjkbqXoxGfxZqZdq3O6RHqtmJ-cfp_PNNanwAfKNZBbi6XgcUxr6NE6ZepUTa5Xw/exec";
const ADMIN_SETTINGS_ACTION_GET = "getAdminSettings";
const ADMIN_SETTINGS_ACTION_SET = "setAdminSettings";

function normalizeAdminSettings(parsed) {
  return {
    siteClosed: Boolean(parsed.siteClosed),
    closedDates: Array.isArray(parsed.closedDates) ? parsed.closedDates : [],
    manualReservedByDate: parsed.manualReservedByDate && typeof parsed.manualReservedByDate === "object" ? parsed.manualReservedByDate : {},
    maxPeopleByDate: parsed.maxPeopleByDate && typeof parsed.maxPeopleByDate === "object" ? parsed.maxPeopleByDate : {},
    reservationHistoryBackup: Array.isArray(parsed.reservationHistoryBackup) ? parsed.reservationHistoryBackup : [],
  };
}

async function fetchSharedAdminSettings() {
  const response = await fetch(`${API_URL}?action=${ADMIN_SETTINGS_ACTION_GET}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil pengaturan admin (${response.status})`);
  }

  const payload = await response.json();
  return normalizeAdminSettings(payload && typeof payload === "object" ? payload : {});
}

async function saveSharedAdminSettings(settings) {
  const body = new URLSearchParams({
    action: ADMIN_SETTINGS_ACTION_SET,
    settings: JSON.stringify(settings),
  });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Gagal menyimpan pengaturan admin (${response.status})`);
  }
}

const TABLE_CAPACITIES = [10, 10, 8, 6, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 2, 2];
const TOTAL_SEATS = TABLE_CAPACITIES.reduce((sum, seats) => sum + seats, 0);

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const adminPassword = document.getElementById("adminPassword");
const btnLogin = document.getElementById("btnLogin");
const btnSave = document.getElementById("btnSave");
const btnLogout = document.getElementById("btnLogout");
const siteClosedInput = document.getElementById("siteClosed");
const dateToggleGrid = document.getElementById("dateToggleGrid");
const monitorTableWrap = document.getElementById("monitorTableWrap");
const reservationHistoryWrap = document.getElementById("reservationHistoryWrap");

const ADMIN_HASH_PARTS = [
  "3d985db745e09e72",
  "f07e86ec5efd656e",
  "43caeb9e276b7c7b",
  "da7c171288fcc81d",
];

function getExpectedAdminHash() {
  return ADMIN_HASH_PARTS.join("");
}

function toDateString(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateLocal(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateObj, days) {
  const next = new Date(dateObj);
  next.setDate(next.getDate() + days);
  return next;
}

function getBookingDateRange() {
  const rangeStart = new Date(2026, 1, 20);
  const rangeEnd = addDays(rangeStart, 29);
  return {
    min: toDateString(rangeStart),
    max: toDateString(rangeEnd),
  };
}

function formatDisplayDate(dateObj) {
  return dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

function formatDisplayDay(dateObj) {
  return dateObj.toLocaleDateString("id-ID", { weekday: "short" });
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function canServeParties(parties) {
  const demands = parties.filter((x) => x > 0).sort((a, b) => b - a);
  if (!demands.length) return true;

  const demandTotal = demands.reduce((sum, value) => sum + value, 0);
  if (demandTotal > TOTAL_SEATS) return false;

  const memo = new Map();
  const demandSuffix = new Array(demands.length + 1).fill(0);
  for (let i = demands.length - 1; i >= 0; i -= 1) {
    demandSuffix[i] = demandSuffix[i + 1] + demands[i];
  }

  function dfs(index, usedMask) {
    if (index === demands.length) return true;

    const key = `${index}|${usedMask}`;
    if (memo.has(key)) return memo.get(key);

    let remainingSeats = 0;
    for (let i = 0; i < TABLE_CAPACITIES.length; i += 1) {
      if ((usedMask & (1 << i)) === 0) {
        remainingSeats += TABLE_CAPACITIES[i];
      }
    }

    if (remainingSeats < demandSuffix[index]) {
      memo.set(key, false);
      return false;
    }

    const need = demands[index];
    const candidates = [];

    function buildSubsets(start, mask, sum, count) {
      if (sum >= need) {
        candidates.push({ mask, overflow: sum - need, count });
        return;
      }

      for (let t = start; t < TABLE_CAPACITIES.length; t += 1) {
        const bit = 1 << t;
        if ((usedMask & bit) !== 0 || (mask & bit) !== 0) continue;
        buildSubsets(t + 1, mask | bit, sum + TABLE_CAPACITIES[t], count + 1);
      }
    }

    buildSubsets(0, 0, 0, 0);
    candidates.sort((a, b) => a.overflow - b.overflow || a.count - b.count);

    for (const option of candidates) {
      if (dfs(index + 1, usedMask | option.mask)) {
        memo.set(key, true);
        return true;
      }
    }

    memo.set(key, false);
    return false;
  }

  return dfs(0, 0);
}

function getAdminSettings() {
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return normalizeAdminSettings(parsed);
  } catch {
    return {
      siteClosed: false,
      closedDates: [],
      manualReservedByDate: {},
      maxPeopleByDate: {},
      reservationHistoryBackup: [],
    };
  }
}

function setAdminSettings(settings) {
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
}

function getReservationHistory() {
  const settings = getAdminSettings();
  if (Array.isArray(settings.reservationHistoryBackup)) {
    return settings.reservationHistoryBackup;
  }

  try {
    const raw = localStorage.getItem(RESERVATION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function setReservationHistory(history) {
  const current = getAdminSettings();
  const normalizedHistory = Array.isArray(history) ? history : [];
  const updated = {
    ...current,
    reservationHistoryBackup: normalizedHistory,
  };

  localStorage.setItem(RESERVATION_HISTORY_KEY, JSON.stringify(normalizedHistory));
  setAdminSettings(updated);

  try {
    await saveSharedAdminSettings(updated);
  } catch (error) {
    console.warn("Gagal sinkron history reservasi ke server:", error);
    alert("History cadangan tersimpan lokal, tapi gagal sync ke server.");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildOrderItemsHtml(row) {
  const paketItems = Array.isArray(row.paket)
    ? row.paket.map((item) => `Paket: ${item.namaPaket || "-"} × ${Number(item.qty || 0)}`)
    : [];

  const addOnItems = Array.isArray(row.add_on)
    ? row.add_on.map((item) => `Add On: ${item.namaAddOn || "-"} × ${Number(item.qty || 0)}`)
    : [];

  const allItems = [...paketItems, ...addOnItems];
  if (!allItems.length) {
    return "<span>Tidak ada data pesanan</span>";
  }

  return `<details class="order-dropdown"><summary>Lihat Pesanan (${allItems.length})</summary><ul>${allItems.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</ul></details>`;
}

function getReservationId(row, index) {
  if (row && row.reservation_id) return String(row.reservation_id);
  const stamp = row && row.backup_created_at ? String(row.backup_created_at).replace(/[^0-9]/g, "").slice(0, 14) : "";
  return stamp ? `RSV-${stamp}` : `RSV-${index + 1}`;
}

function renderReservationHistoryTable() {
  if (!reservationHistoryWrap) return;

  const history = getReservationHistory();
  if (!Array.isArray(history) || history.length === 0) {
    reservationHistoryWrap.innerHTML = '<p class="hint">Belum ada history reservasi cadangan.</p>';
    return;
  }

  const rows = [...history].reverse().map((row, reverseIndex) => {
    const sourceIndex = history.length - 1 - reverseIndex;
    return `
      <tr>
        <td>${escapeHtml(getReservationId(row, sourceIndex))}</td>
        <td>${escapeHtml(row.nama || "-")}</td>
        <td>${escapeHtml(row.tanggal || "-")}</td>
        <td>${buildOrderItemsHtml(row)}</td>
        <td><button type="button" class="history-delete-btn" data-index="${sourceIndex}">Hapus</button></td>
      </tr>
    `;
  });

  reservationHistoryWrap.innerHTML = `
    <table class="monitor-table">
      <thead>
        <tr>
          <th>ID Reservasi</th>
          <th>Nama</th>
          <th>Tanggal</th>
          <th>Dropdown Pesanan</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;

  reservationHistoryWrap.querySelectorAll('.history-delete-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const index = Number(button.dataset.index);
      const currentHistory = getReservationHistory();
      if (!Array.isArray(currentHistory) || !Number.isInteger(index) || index < 0 || index >= currentHistory.length) return;
      currentHistory.splice(index, 1);
      await setReservationHistory(currentHistory);
      renderAdminUI();
    });
  });
}

function getReservationGroupsByDate() {
  const map = {};
  getReservationHistory().forEach((item) => {
    const date = item.tanggal;
    const people = Number(item.jumlah_orang || 0);
    if (!date || people <= 0) return;
    if (!map[date]) map[date] = [];
    map[date].push(people);
  });
  return map;
}


function getReservedCountForDate(dateKey, groupsByDate, settings) {
  const manualValue = Number(settings.manualReservedByDate?.[dateKey]);
  if (Number.isFinite(manualValue) && manualValue >= 0) {
    return manualValue;
  }

  const parties = groupsByDate[dateKey] || [];
  return parties.reduce((sum, p) => sum + p, 0);
}

async function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");

  try {
    const remoteSettings = await fetchSharedAdminSettings();
    setAdminSettings(remoteSettings);
    localStorage.setItem(
      RESERVATION_HISTORY_KEY,
      JSON.stringify(Array.isArray(remoteSettings.reservationHistoryBackup) ? remoteSettings.reservationHistoryBackup : []),
    );
  } catch (error) {
    console.warn("Gagal sinkron dari server, memakai cache lokal:", error);
  }

  renderAdminUI();
}

function showLogin() {
  dashboardSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
}

function isDateFull(dateValue, groupsByDate, settings) {
  const manualValue = Number(settings.manualReservedByDate?.[dateValue]);
  if (Number.isFinite(manualValue) && manualValue >= 0) {
    return manualValue >= TOTAL_SEATS;
  }

  const parties = groupsByDate[dateValue] || [];
  return !canServeParties([...parties, 1]);
}

function renderDateToggleGrid(settings) {
  dateToggleGrid.innerHTML = "";
  const groupsByDate = getReservationGroupsByDate();

  const { min, max } = getBookingDateRange();
  let cursor = parseDateLocal(min);
  const end = parseDateLocal(max);

  while (cursor <= end) {
    const value = toDateString(cursor);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tanggal-item";

    const full = isDateFull(value, groupsByDate, settings);
    const manualClosed = settings.closedDates.includes(value);

    if (manualClosed) {
      button.classList.add("closed-manual");
    } else if (full) {
      button.classList.add("disabled");
    }

    button.innerHTML = `<span>${formatDisplayDay(cursor)}</span><strong>${formatDisplayDate(cursor)}</strong>`;

    button.addEventListener("click", () => {
      const current = getAdminSettings();
      const hasDate = current.closedDates.includes(value);

      current.closedDates = hasDate
        ? current.closedDates.filter((d) => d !== value)
        : [...current.closedDates, value];

      setAdminSettings(current);
      renderAdminUI();
    });

    dateToggleGrid.appendChild(button);
    cursor = addDays(cursor, 1);
  }
}

function renderMonitoringTable(settings) {
  const groupsByDate = getReservationGroupsByDate();
  const rows = [];

  const { min, max } = getBookingDateRange();
  let cursor = parseDateLocal(min);
  const end = parseDateLocal(max);

  while (cursor <= end) {
    const dateKey = toDateString(cursor);
    const parties = groupsByDate[dateKey] || [];
    const reserved = getReservedCountForDate(dateKey, groupsByDate, settings);
    const estimateRemaining = Math.max(TOTAL_SEATS - reserved, 0);
    const manualValue = Number(settings.manualReservedByDate?.[dateKey]);
    const maxPeopleRaw = Number(settings.maxPeopleByDate?.[dateKey]);
    const maxPeople = Number.isFinite(maxPeopleRaw) && maxPeopleRaw > 0 ? Math.floor(maxPeopleRaw) : null;
    const stillCanFit = Number.isFinite(manualValue) && manualValue >= 0
      ? reserved < TOTAL_SEATS
      : canServeParties([...parties, 1]);

    const status = settings.closedDates.includes(dateKey)
      ? "Ditutup Manual"
      : !stillCanFit
        ? "Penuh"
        : "Tersedia";

    rows.push(`
      <tr>
        <td>${formatDisplayDay(cursor)}, ${formatDisplayDate(cursor)}</td>
        <td><input type="number" min="0" class="reserved-input" data-date="${dateKey}" value="${reserved}" /></td>
        <td><input type="number" min="1" step="1" class="max-people-input" data-date="${dateKey}" value="${maxPeople ?? ""}" placeholder="-" /></td>
        <td>${TOTAL_SEATS}</td>
        <td>${estimateRemaining}</td>
        <td>${status}</td>
      </tr>
    `);

    cursor = addDays(cursor, 1);
  }

  monitorTableWrap.innerHTML = `
    <table class="monitor-table">
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Sudah Reservasi (editable)</th>
          <th>Max Orang / Reservasi</th>
          <th>Total Kursi</th>
          <th>Sisa Kursi (estimasi)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;
}

function renderAdminUI() {
  const settings = getAdminSettings();

  siteClosedInput.checked = settings.siteClosed;
  renderDateToggleGrid(settings);
  renderMonitoringTable(settings);
  renderReservationHistoryTable();
}

btnLogin.addEventListener("click", async () => {
  const pass = adminPassword.value;
  const hash = await sha256(pass);

  if (hash !== getExpectedAdminHash()) {
    alert("Password admin salah");
    return;
  }

  localStorage.setItem(ADMIN_AUTH_KEY, "1");
  adminPassword.value = "";
  void showDashboard();
});

btnSave.addEventListener("click", async () => {
  const current = getAdminSettings();
  const manualReservedByDate = { ...(current.manualReservedByDate || {}) };
  const maxPeopleByDate = { ...(current.maxPeopleByDate || {}) };

  document.querySelectorAll(".reserved-input").forEach((input) => {
    const date = input.dataset.date;
    const value = Number(input.value);
    if (!date) return;
    manualReservedByDate[date] = Number.isFinite(value) && value >= 0 ? value : 0;
  });

  document.querySelectorAll(".max-people-input").forEach((input) => {
    const date = input.dataset.date;
    const value = Number(input.value);
    if (!date) return;
    if (Number.isFinite(value) && value > 0) {
      maxPeopleByDate[date] = Math.floor(value);
    } else {
      delete maxPeopleByDate[date];
    }
  });

  const updated = {
    ...current,
    siteClosed: siteClosedInput.checked,
    manualReservedByDate,
    maxPeopleByDate,
    reservationHistoryBackup: Array.isArray(current.reservationHistoryBackup)
      ? current.reservationHistoryBackup
      : [],
  };

  setAdminSettings(updated);

  try {
    await saveSharedAdminSettings(updated);
    alert("Pengaturan admin disimpan & dipublish ke semua perangkat");
  } catch (error) {
    console.warn("Simpan ke server gagal:", error);
    alert("Pengaturan tersimpan lokal, tapi gagal publish ke server. Cek Apps Script.");
  }

  renderAdminUI();
});

btnLogout.addEventListener("click", () => {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  showLogin();
});

if (localStorage.getItem(ADMIN_AUTH_KEY) === "1") {
  void showDashboard();
} else {
  showLogin();
}
