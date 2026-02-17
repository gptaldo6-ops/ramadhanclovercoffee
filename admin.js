const ADMIN_PASSWORD = "ramadhan2026";
const ADMIN_AUTH_KEY = "ramadhan_admin_auth";
const ADMIN_SETTINGS_KEY = "ramadhan_admin_settings";
const RESERVATION_HISTORY_KEY = "ramadhan_reservation_history";

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const adminPassword = document.getElementById("adminPassword");
const btnLogin = document.getElementById("btnLogin");
const btnSave = document.getElementById("btnSave");
const btnLogout = document.getElementById("btnLogout");
const siteClosedInput = document.getElementById("siteClosed");
const capacityPerDateInput = document.getElementById("capacityPerDate");
const dateToggleGrid = document.getElementById("dateToggleGrid");
const monitorTableWrap = document.getElementById("monitorTableWrap");

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

function getAdminSettings() {
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      siteClosed: Boolean(parsed.siteClosed),
      capacityPerDate: Number(parsed.capacityPerDate) > 0 ? Number(parsed.capacityPerDate) : 80,
      closedDates: Array.isArray(parsed.closedDates) ? parsed.closedDates : [],
    };
  } catch {
    return {
      siteClosed: false,
      capacityPerDate: 80,
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

function getReservedPeopleByDate() {
  const map = {};
  getReservationHistory().forEach((item) => {
    const date = item.tanggal;
    const people = Number(item.jumlah_orang || 0);
    if (!date || people <= 0) return;
    map[date] = (map[date] || 0) + people;
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

function renderDateToggleGrid(settings) {
  dateToggleGrid.innerHTML = "";

  const { min, max } = getBookingDateRange();
  let cursor = parseDateLocal(min);
  const end = parseDateLocal(max);

  while (cursor <= end) {
    const value = toDateString(cursor);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tanggal-item";

    if (settings.closedDates.includes(value)) {
      button.classList.add("closed-manual");
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
  const reservedPeopleByDate = getReservedPeopleByDate();
  const rows = [];

  const { min, max } = getBookingDateRange();
  let cursor = parseDateLocal(min);
  const end = parseDateLocal(max);

  while (cursor <= end) {
    const dateKey = toDateString(cursor);
    const reserved = Number(reservedPeopleByDate[dateKey] || 0);
    const remaining = settings.capacityPerDate - reserved;
    const status = settings.closedDates.includes(dateKey)
      ? "Ditutup Manual"
      : remaining <= 0
        ? "Penuh"
        : "Tersedia";

    rows.push(`
      <tr>
        <td>${formatDisplayDay(cursor)}, ${formatDisplayDate(cursor)}</td>
        <td>${reserved}</td>
        <td>${settings.capacityPerDate}</td>
        <td>${remaining > 0 ? remaining : 0}</td>
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
          <th>Kapasitas</th>
          <th>Sisa</th>
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
  capacityPerDateInput.value = settings.capacityPerDate;

  renderDateToggleGrid(settings);
  renderMonitoringTable(settings);
}

btnLogin.addEventListener("click", () => {
  if (adminPassword.value !== ADMIN_PASSWORD) {
    alert("Password admin salah");
    return;
  }

  localStorage.setItem(ADMIN_AUTH_KEY, "1");
  showDashboard();
});

btnSave.addEventListener("click", () => {
  const current = getAdminSettings();
  const updated = {
    ...current,
    siteClosed: siteClosedInput.checked,
    capacityPerDate: Number(capacityPerDateInput.value) > 0 ? Number(capacityPerDateInput.value) : 80,
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
