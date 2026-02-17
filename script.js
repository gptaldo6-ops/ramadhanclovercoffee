let pendingPayload = null;

const API_URL =
  "https://script.google.com/macros/s/AKfycbwFU-fHZR5lphEAX0R-I_BvKQx5H1MtCBxgfQU7s6Xnc-RYgx3UZX61RY7eXshk3EX0Sw/exec";

const ADMIN_SETTINGS_KEY = "ramadhan_admin_settings";
const RESERVATION_HISTORY_KEY = "ramadhan_reservation_history";

const TABLE_CAPACITIES = [10, 10, 8, 6, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 2, 2];
const TOTAL_SEATS = TABLE_CAPACITIES.reduce((sum, seats) => sum + seats, 0);

const tanggalInput = document.getElementById("tanggal");
const tanggalGrid = document.getElementById("tanggalGrid");
const tanggalTrigger = document.getElementById("tanggalTrigger");
const tanggalPanel = document.getElementById("tanggalPanel");
const jumlahOrangInput = document.getElementById("jumlahOrang");
const summaryContainer = document.getElementById("order-summary");
const submitButton = document.getElementById("btnSubmit");
const paymentModal = document.getElementById("paymentModal");
const payTotal = document.getElementById("payTotal");
const btnWA = document.getElementById("btnWA");
const siteStatusMsg = document.getElementById("siteStatusMsg");

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

  const now = new Date();
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayCutoff = addDays(currentDay, now.getHours() >= 16 ? 1 : 0);

  const effectiveMin = todayCutoff > rangeStart ? todayCutoff : rangeStart;

  return {
    min: toDateString(effectiveMin),
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

function formatRupiah(value) {
  return value.toLocaleString("id-ID");
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
      manualReservedByDate: parsed.manualReservedByDate && typeof parsed.manualReservedByDate === "object" ? parsed.manualReservedByDate : {},
      maxPeopleByDate: parsed.maxPeopleByDate && typeof parsed.maxPeopleByDate === "object" ? parsed.maxPeopleByDate : {},
    };
  } catch {
    return {
      siteClosed: false,
      closedDates: [],
      manualReservedByDate: {},
      maxPeopleByDate: {},
    };
  }
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



function getMaxPeopleForDate(dateKey, settings) {
  const value = Number(settings.maxPeopleByDate?.[dateKey]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getReservedCountForDate(dateKey, groupsByDate, settings) {
  const manualValue = Number(settings.manualReservedByDate?.[dateKey]);
  if (Number.isFinite(manualValue) && manualValue >= 0) {
    return manualValue;
  }

  const parties = groupsByDate[dateKey] || [];
  return parties.reduce((sum, p) => sum + p, 0);
}

function isDateClosedOrFull(dateValue, settings, groupsByDate) {
  if (settings.closedDates.includes(dateValue)) {
    return true;
  }

  const manualValue = Number(settings.manualReservedByDate?.[dateValue]);
  if (Number.isFinite(manualValue) && manualValue >= 0) {
    return manualValue >= TOTAL_SEATS;
  }

  const parties = groupsByDate[dateValue] || [];
  return !canServeParties([...parties, 1]);
}

function refreshSiteStatus() {
  const settings = getAdminSettings();

  if (settings.siteClosed) {
    siteStatusMsg.classList.remove("hidden");
    submitButton.disabled = true;
  } else {
    siteStatusMsg.classList.add("hidden");
    submitButton.disabled = false;
  }
}

function applyBookingDateRange() {
  const { min, max } = getBookingDateRange();
  const currentValue = tanggalInput.value;
  const settings = getAdminSettings();
  const groupsByDate = getReservationGroupsByDate();

  tanggalGrid.innerHTML = "";

  let cursor = parseDateLocal(min);
  const end = parseDateLocal(max);
  let hasSelection = false;

  while (cursor <= end) {
    const value = toDateString(cursor);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tanggal-item";
    button.dataset.value = value;

    const labelDay = formatDisplayDay(cursor);
    const labelDate = formatDisplayDate(cursor);
    const isBlocked = isDateClosedOrFull(value, settings, groupsByDate);

    button.innerHTML = `<span>${labelDay}</span><strong>${labelDate}</strong>`;

    if (isBlocked) {
      button.disabled = true;
      button.classList.add("disabled");
    }

    if (!isBlocked && value === currentValue) {
      button.classList.add("active");
      hasSelection = true;
    }

    button.addEventListener("click", () => {
      if (button.disabled) return;

      tanggalInput.value = value;
      tanggalTrigger.textContent = `${labelDay}, ${labelDate}`;

      document.querySelectorAll(".tanggal-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.value === value);
      });

      tanggalPanel.classList.add("hidden");
    });

    tanggalGrid.appendChild(button);
    cursor = addDays(cursor, 1);
  }

  if (!hasSelection) {
    tanggalInput.value = "";
    tanggalTrigger.textContent = "Pilih tanggal reservasi";
  }
}

function updateSummary() {
  let html = "";
  let hasData = false;

  document.querySelectorAll(".paket-card").forEach((card) => {
    const paketName = card.querySelector("strong").textContent;
    const paketInfo = card.dataset.info;
    const harga = Number(card.dataset.harga);
    const qty = Number(card.querySelector(".paket-qty").textContent);

    if (qty <= 0) return;

    hasData = true;
    html += `
      <div class="summary-item">
        <strong>${paketName} × ${qty}</strong><br/>
        <span class="summary-meta">${paketInfo}</span><br/>
        <span class="summary-meta">Rp${formatRupiah(harga)} / paket</span><br/>
        <span>Subtotal: Rp${formatRupiah(harga * qty)}</span>
      </div>
    `;
  });

  summaryContainer.innerHTML = hasData ? html : "<p>Belum ada paket dipilih</p>";
}

document.querySelectorAll(".paket-card").forEach((card) => {
  const qtyEl = card.querySelector(".paket-qty");
  const plus = card.querySelector(".paket-plus");
  const minus = card.querySelector(".paket-minus");

  let paketQty = 0;

  plus.addEventListener("click", () => {
    paketQty += 1;
    qtyEl.textContent = paketQty;
    updateSummary();
  });

  minus.addEventListener("click", () => {
    if (paketQty > 0) {
      paketQty -= 1;
    }

    qtyEl.textContent = paketQty;
    updateSummary();
  });
});

updateSummary();
refreshSiteStatus();
applyBookingDateRange();

tanggalTrigger.addEventListener("click", () => {
  tanggalPanel.classList.toggle("hidden");
});

document.addEventListener("click", (event) => {
  const isInside = event.target.closest(".tanggal-dropdown");
  if (!isInside) {
    tanggalPanel.classList.add("hidden");
  }
});

window.addEventListener("storage", () => {
  refreshSiteStatus();
  applyBookingDateRange();
});

function collectPaketData() {
  const data = [];

  document.querySelectorAll(".paket-card").forEach((card) => {
    const qty = Number(card.querySelector(".paket-qty").textContent);
    if (qty <= 0) return;

    data.push({
      paket: card.dataset.paket,
      namaPaket: card.querySelector("strong").textContent,
      infoPaket: card.dataset.info,
      harga: Number(card.dataset.harga),
      qty,
    });
  });

  return data;
}

function buildCotarQtyFields(paketList) {
  const qtyByCode = {
    "COTAR-1": 0,
    "COTAR-2": 0,
    "COTAR-3": 0,
    "COTAR-4": 0,
  };

  paketList.forEach((item) => {
    if (qtyByCode[item.paket] !== undefined) {
      qtyByCode[item.paket] = item.qty;
    }
  });

  return {
    cotar1_qty: qtyByCode["COTAR-1"],
    cotar2_qty: qtyByCode["COTAR-2"],
    cotar3_qty: qtyByCode["COTAR-3"],
    cotar4_qty: qtyByCode["COTAR-4"],
    cotar_total_qty:
      qtyByCode["COTAR-1"] +
      qtyByCode["COTAR-2"] +
      qtyByCode["COTAR-3"] +
      qtyByCode["COTAR-4"],
  };
}

submitButton.addEventListener("click", () => {
  const settings = getAdminSettings();

  if (settings.siteClosed) {
    alert("Reservasi sedang ditutup sementara oleh admin");
    return;
  }

  const nama = document.getElementById("nama").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const tanggal = tanggalInput.value;
  const jumlahOrang = Number(jumlahOrangInput.value);

  if (!nama || !whatsapp || !tanggal || jumlahOrang <= 0) {
    alert("Lengkapi data terlebih dahulu");
    return;
  }

  const { min, max } = getBookingDateRange();
  if (tanggal < min || tanggal > max) {
    alert(`Tanggal reservasi hanya bisa dipilih dari ${min} sampai ${max}`);
    return;
  }

  const groupsByDate = getReservationGroupsByDate();
  const maxPeople = getMaxPeopleForDate(tanggal, settings);

  if (maxPeople && jumlahOrang > maxPeople) {
    alert(`Mohon maaf, sudah penuh untuk ${jumlahOrang} orang`);
    return;
  }

  if (settings.closedDates.includes(tanggal)) {
    alert("Tanggal ini ditutup manual oleh admin");
    return;
  }

  const manualReserved = getReservedCountForDate(tanggal, groupsByDate, settings);
  const manualValue = Number(settings.manualReservedByDate?.[tanggal]);

  if (Number.isFinite(manualValue) && manualValue >= 0) {
    if (manualReserved + jumlahOrang > TOTAL_SEATS) {
      alert("Kapasitas tidak cukup berdasarkan jumlah reservasi yang diatur admin");
      return;
    }
  } else {
    const currentParties = groupsByDate[tanggal] || [];
    if (!canServeParties([...currentParties, jumlahOrang])) {
      alert("Meja tidak cukup untuk menampung reservasi ini pada tanggal tersebut");
      return;
    }
  }

  const paket = collectPaketData();
  if (!paket.length) {
    alert("Pilih paket");
    return;
  }

  const totalPaket = paket.reduce((sum, item) => sum + item.qty, 0);
  if (totalPaket < jumlahOrang) {
    alert("Jumlah paket harus sama atau lebih banyak dari jumlah orang");
    return;
  }

  const cotarQtyFields = buildCotarQtyFields(paket);
  const totalHarga = paket.reduce((sum, item) => sum + item.harga * item.qty, 0);

  pendingPayload = {
    nama,
    whatsapp,
    tanggal,
    jumlah_orang: jumlahOrang,
    paket,
    total_harga: totalHarga,
    ...cotarQtyFields,
  };

  showPaymentPopup({
    resvId: "R-TEST-01",
    nama,
    tanggal,
    total: totalHarga,
  });
});

function showPaymentPopup({ resvId, nama, tanggal, total }) {
  payTotal.textContent = formatRupiah(total);

  btnWA.href =
    "https://wa.me/6285156076002?text=" +
    encodeURIComponent(`Kode: ${resvId}\nNama: ${nama}\nTanggal: ${tanggal}`);

  paymentModal.classList.remove("hidden");
}

function closePayment() {
  paymentModal.classList.add("hidden");
}

btnWA.addEventListener("click", () => {
  if (!pendingPayload) return;

  const history = getReservationHistory();
  history.push({
    tanggal: pendingPayload.tanggal,
    jumlah_orang: pendingPayload.jumlah_orang,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(RESERVATION_HISTORY_KEY, JSON.stringify(history));

  const form = document.createElement("form");
  form.method = "POST";
  form.action = API_URL;

  Object.entries(pendingPayload).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = typeof value === "string" ? value : JSON.stringify(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
});

window.closePayment = closePayment;
