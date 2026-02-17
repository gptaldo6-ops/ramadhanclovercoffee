let pendingPayload = null;

const API_URL =
  "https://script.google.com/macros/s/AKfycbwFU-fHZR5lphEAX0R-I_BvKQx5H1MtCBxgfQU7s6Xnc-RYgx3UZX61RY7eXshk3EX0Sw/exec";

const ADMIN_SETTINGS_KEY = "ramadhan_admin_settings";
const RESERVATION_HISTORY_KEY = "ramadhan_reservation_history";

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

function isDateClosedOrFull(dateValue, settings, reservedPeopleByDate) {
  if (settings.closedDates.includes(dateValue)) {
    return true;
  }

  const currentReserved = Number(reservedPeopleByDate[dateValue] || 0);
  return currentReserved >= settings.capacityPerDate;
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
  const reservedPeopleByDate = getReservedPeopleByDate();

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
    const isBlocked = isDateClosedOrFull(value, settings, reservedPeopleByDate);

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

  const reservedPeopleByDate = getReservedPeopleByDate();
  if (isDateClosedOrFull(tanggal, settings, reservedPeopleByDate)) {
    alert("Tanggal ini sudah ditutup atau kapasitas penuh");
    return;
  }

  const currentReserved = Number(reservedPeopleByDate[tanggal] || 0);
  if (currentReserved + jumlahOrang > settings.capacityPerDate) {
    alert("Jumlah orang melebihi sisa kapasitas pada tanggal tersebut");
    return;
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
