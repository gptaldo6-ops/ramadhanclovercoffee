const ADMIN_AUTH_KEY = "ramadhan_admin_auth";
const ADMIN_SETTINGS_KEY = "ramadhan_admin_settings";
const RESERVATION_HISTORY_KEY = "ramadhan_reservation_history";

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
    return {
      siteClosed: Boolean(parsed.siteClosed),
      closedDates: Array.isArray(parsed.closedDates) ? parsed.closedDates : [],
    };
  } catch {
    return {
      siteClosed: false,
      closedDates: [],
    };
  }
}

function setAdminSettings(settings) {
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
}

function getReservationHistory() {
  try {
    const raw = localStorage.getItem(RESERVATION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  renderAdminUI();
}

function showLogin() {
  dashboardSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
}

function isDateFull(dateValue, groupsByDate) {
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

    const full = isDateFull(value, groupsByDate);
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
    const reserved = parties.reduce((sum, p) => sum + p, 0);
    const estimateRemaining = Math.max(TOTAL_SEATS - reserved, 0);
    const stillCanFit = canServeParties([...parties, 1]);

    const status = settings.closedDates.includes(dateKey)
      ? "Ditutup Manual"
      : !stillCanFit
        ? "Penuh (meja tidak cukup)"
        : "Tersedia";

    rows.push(`
      <tr>
        <td>${formatDisplayDay(cursor)}, ${formatDisplayDate(cursor)}</td>
        <td>${reserved}</td>
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
          <th>Sudah Reservasi (orang)</th>
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
  showDashboard();
});

btnSave.addEventListener("click", () => {
  const current = getAdminSettings();
  const updated = {
    ...current,
    siteClosed: siteClosedInput.checked,
  };

  setAdminSettings(updated);
  renderAdminUI();
  alert("Pengaturan admin disimpan");
});

btnLogout.addEventListener("click", () => {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  showLogin();
});

if (localStorage.getItem(ADMIN_AUTH_KEY) === "1") {
  showDashboard();
} else {
  showLogin();
}
