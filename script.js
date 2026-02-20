let pendingPayload = null;

const ADMIN_SETTINGS_KEY = "ramadhan_admin_settings";

const API_URL =
  "https://script.google.com/macros/s/AKfycbxJWjkbqXoxGfxZqZdq3O6RHqtmJ-cfp_PNNanwAfKNZBbi6XgcUxr6NE6ZepUTa5Xw/exec";

const ADMIN_SETTINGS_ACTION_GET = "getAdminSettings";

async function fetchSharedAdminSettings() {
  const response = await fetch(`${API_URL}?action=${ADMIN_SETTINGS_ACTION_GET}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil pengaturan admin (${response.status})`);
  }

  const payload = await response.json();
  return payload && typeof payload === "object" ? payload : {};
}

function normalizeAdminSettings(parsed) {
  return {
    siteClosed: Boolean(parsed.siteClosed),
    closedDates: Array.isArray(parsed.closedDates)
      ? parsed.closedDates.filter((dateValue) => typeof dateValue === "string")
      : [],
    maxPeopleByDate:
      parsed.maxPeopleByDate && typeof parsed.maxPeopleByDate === "object"
        ? parsed.maxPeopleByDate
        : {},
  };
}

async function syncAdminSettingsFromServer() {
  try {
    const remote = await fetchSharedAdminSettings();
    const normalized = normalizeAdminSettings(remote);
    localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(normalized));
    applyBookingDateRange();
    renderMaintenanceBanner();
  } catch (error) {
    console.warn("Sinkronisasi pengaturan admin gagal:", error);
  }
}

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
const menuPreviewModal = document.getElementById("menuPreviewModal");
const previewImage = document.getElementById("previewImage");
const previewCaption = document.getElementById("previewCaption");
const previewClose = document.getElementById("previewClose");
const paketList = document.getElementById("paketList");
const paketSkeleton = document.getElementById("paketSkeleton");
const maintenanceBanner = document.getElementById("maintenanceBanner");

function getAdminSettings() {
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return normalizeAdminSettings(parsed);
  } catch {
    return {
      siteClosed: false,
      closedDates: [],
      maxPeopleByDate: {},
    };
  }
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

function formatRupiah(value) {
  return value.toLocaleString("id-ID");
}

function isDateClosedByAdmin(dateValue, adminSettings) {
  return adminSettings.siteClosed || adminSettings.closedDates.includes(dateValue);
}

function getMaxPeopleForDate(dateValue, adminSettings) {
  const rawValue = Number(adminSettings.maxPeopleByDate?.[dateValue]);
  if (!Number.isFinite(rawValue) || rawValue <= 0) return null;
  return Math.floor(rawValue);
}

function renderMaintenanceBanner() {
  if (!maintenanceBanner) return;

  const settings = getAdminSettings();
  maintenanceBanner.classList.toggle("hidden", !settings.siteClosed);
}

function applyBookingDateRange() {
  const { min, max } = getBookingDateRange();
  const adminSettings = getAdminSettings();
  const currentValue = tanggalInput.value;

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
    const closedByAdmin = isDateClosedByAdmin(value, adminSettings);

    if (closedByAdmin) {
      button.classList.add("disabled");
      button.disabled = true;
    }

    button.innerHTML = `<span>${labelDay}</span><strong>${labelDate}</strong>`;

    if (value === currentValue) {
      button.classList.add("active");
      hasSelection = true;
    }

    button.addEventListener("click", () => {
      if (closedByAdmin) return;

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
  let totalSubtotal = 0;

  document.querySelectorAll("#paketList .paket-card").forEach((card) => {
    const paketName = card.querySelector("strong").textContent;
    const paketInfo = card.dataset.info;
    const harga = Number(card.dataset.harga);
    const qty = Number(card.querySelector(".paket-qty").textContent);

    if (qty <= 0) return;

    hasData = true;
    totalSubtotal += harga * qty;
    html += `
      <div class="summary-item">
        <strong>${paketName} × ${qty}</strong><br/>
        <span class="summary-meta">${paketInfo}</span><br/>
        <span class="summary-meta">Rp${formatRupiah(harga)} / paket</span><br/>
      </div>
    `;
  });

  if (hasData) {
    html += `
      <div class="summary-item">
        <strong>Subtotal Semua Pesanan: Rp${formatRupiah(totalSubtotal)}</strong>
      </div>
    `;
  }

  summaryContainer.innerHTML = hasData ? html : "<p>Belum ada paket dipilih</p>";
}

document.querySelectorAll("#paketList .paket-card").forEach((card) => {
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
applyBookingDateRange();
renderMaintenanceBanner();

tanggalTrigger.addEventListener("click", () => {
  if (getAdminSettings().siteClosed) return;
  tanggalPanel.classList.toggle("hidden");
});

document.addEventListener("click", (event) => {
  const isInside = event.target.closest(".tanggal-dropdown");
  if (!isInside) {
    tanggalPanel.classList.add("hidden");
  }
});

function collectPaketData() {
  const data = [];

  document.querySelectorAll("#paketList .paket-card").forEach((card) => {
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

function revealPaketList() {
  if (paketSkeleton) {
    paketSkeleton.classList.add("hidden");
  }

  if (paketList) {
    paketList.classList.remove("hidden");
  }
}

function setupPaketSkeletonLoader() {
  if (!paketList) return;

  const images = Array.from(paketList.querySelectorAll(".paket-img"));
  if (!images.length) {
    revealPaketList();
    return;
  }

  const imageLoadTasks = images.map(
    (image) =>
      new Promise((resolve) => {
        if (image.complete) {
          resolve();
          return;
        }

        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      })
  );

  Promise.all(imageLoadTasks).then(revealPaketList);
}

function openMenuPreview(imageElement) {
  if (!menuPreviewModal || !previewImage || !previewCaption) return;

  previewImage.src = imageElement.src;
  previewImage.alt = imageElement.alt;
  previewCaption.textContent = imageElement.alt;

  menuPreviewModal.classList.remove("hidden");
  menuPreviewModal.classList.add("modal-opening");
}

function closeMenuPreview() {
  if (!menuPreviewModal) return;
  menuPreviewModal.classList.add("hidden");
  menuPreviewModal.classList.remove("modal-opening");
}

function setupImagePreviewPopup() {
  document.querySelectorAll("#paketList .paket-img").forEach((imageElement) => {
    imageElement.addEventListener("click", () => openMenuPreview(imageElement));
  });

  if (previewClose) {
    previewClose.addEventListener("click", closeMenuPreview);
  }

  if (menuPreviewModal) {
    menuPreviewModal.addEventListener("click", (event) => {
      if (event.target === menuPreviewModal) {
        closeMenuPreview();
      }
    });
  }
}

function buildWhatsappMessage({ nama, tanggal, total }) {
  return [
    "Halo, saya sudah melakukan pembayaran QRIS.",
    "",
    `Nama: ${nama}`,
    `Tanggal: ${tanggal}`,
    `Total: Rp${formatRupiah(total)}`,
    "",
    "Berikut saya lampirkan bukti transfer.",
    "Terima kasih.",
  ].join("\n");
}

function startWaButtonLoading() {
  btnWA.classList.add("loading");
  btnWA.setAttribute("aria-disabled", "true");
  btnWA.dataset.locked = "1";

  const originalText = "Kirim Bukti via WhatsApp";
  btnWA.textContent = "Mengirim...";

  setTimeout(() => {
    btnWA.classList.remove("loading");
    btnWA.removeAttribute("aria-disabled");
    btnWA.dataset.locked = "0";
    btnWA.textContent = originalText;
  }, 7000);
}

function startSubmitButtonLoading() {
  submitButton.classList.add("loading");
  submitButton.setAttribute("aria-disabled", "true");
  submitButton.disabled = true;

  const originalText = "Reservasi Sekarang";
  submitButton.textContent = "Memproses Reservasi...";

  setTimeout(() => {
    submitButton.classList.remove("loading");
    submitButton.removeAttribute("aria-disabled");
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }, 7000);
}

function submitPendingPayloadToSheet() {
  if (!pendingPayload) return;

  const latestSettings = getAdminSettings();
  if (isDateClosedByAdmin(pendingPayload.tanggal, latestSettings)) {
    alert("Tanggal reservasi sudah ditutup admin. Silakan pilih tanggal lain.");
    closePayment();
    pendingPayload = null;
    applyBookingDateRange();
    renderMaintenanceBanner();
    return;
  }

  const latestMaxPeople = getMaxPeopleForDate(pendingPayload.tanggal, latestSettings);
  if (latestMaxPeople !== null && Number(pendingPayload.jumlah_orang) > latestMaxPeople) {
    alert(`Maksimal jumlah orang untuk tanggal ini adalah ${latestMaxPeople}`);
    closePayment();
    pendingPayload = null;
    return;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = API_URL;

  Object.entries(pendingPayload).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    if (Array.isArray(value) || (value && typeof value === "object")) {
      input.value = JSON.stringify(value);
    } else {
      input.value = String(value);
    }
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

function buildCotarQtyFields(paketList) {
  const normalizeCode = (value) =>
    String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

  const qtyByCode = {
    COTAR1: 0,
    COTAR2: 0,
    COTAR3: 0,
    COTAR4: 0,
  };

  paketList.forEach((item) => {
    const fromCode = normalizeCode(item.paket);
    const fromName = normalizeCode(item.namaPaket);

    if (qtyByCode[fromCode] !== undefined) {
      qtyByCode[fromCode] += Number(item.qty) || 0;
      return;
    }

    if (fromName.includes("COTAR1")) {
      qtyByCode.COTAR1 += Number(item.qty) || 0;
    } else if (fromName.includes("COTAR2")) {
      qtyByCode.COTAR2 += Number(item.qty) || 0;
    } else if (fromName.includes("COTAR3")) {
      qtyByCode.COTAR3 += Number(item.qty) || 0;
    } else if (fromName.includes("COTAR4")) {
      qtyByCode.COTAR4 += Number(item.qty) || 0;
    }
  });

  return {
    cotar1_qty: qtyByCode.COTAR1,
    cotar2_qty: qtyByCode.COTAR2,
    cotar3_qty: qtyByCode.COTAR3,
    cotar4_qty: qtyByCode.COTAR4,
    cotar1Qty: qtyByCode.COTAR1,
    cotar2Qty: qtyByCode.COTAR2,
    cotar3Qty: qtyByCode.COTAR3,
    cotar4Qty: qtyByCode.COTAR4,
    cotar_total_qty:
      qtyByCode.COTAR1 +
      qtyByCode.COTAR2 +
      qtyByCode.COTAR3 +
      qtyByCode.COTAR4,
    cotarTotalQty:
      qtyByCode.COTAR1 +
      qtyByCode.COTAR2 +
      qtyByCode.COTAR3 +
      qtyByCode.COTAR4,
  };
}

submitButton.addEventListener("click", () => {
  if (submitButton.disabled) return;

  const adminSettings = getAdminSettings();
  const nama = document.getElementById("nama").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const tanggal = tanggalInput.value;
  const jumlahOrang = Math.floor(Number(jumlahOrangInput.value));

  if (adminSettings.siteClosed) {
    alert("Reservasi sedang ditutup sementara oleh admin");
    return;
  }

  if (!nama || !whatsapp || !tanggal || jumlahOrang <= 0) {
    alert("Lengkapi data terlebih dahulu");
    return;
  }

  const { min, max } = getBookingDateRange();
  if (tanggal < min || tanggal > max) {
    alert(`Tanggal reservasi hanya bisa dipilih dari ${min} sampai ${max}`);
    return;
  }

  if (isDateClosedByAdmin(tanggal, adminSettings)) {
    alert("Tanggal yang dipilih sedang ditutup oleh admin");
    return;
  }

  const maxPeople = getMaxPeopleForDate(tanggal, adminSettings);
  if (maxPeople !== null && jumlahOrang > maxPeople) {
    alert(`Mohon Maaf, hanya tersisa meja untuk ${maxPeople} orang`);
    return;
  }

  const paket = collectPaketData();
  if (!paket.length) {
    alert("Pilih paket");
    return;
  }

  const cotarQtyFields = buildCotarQtyFields(paket);
  const totalHarga = paket.reduce((sum, item) => sum + item.harga * item.qty, 0);

  pendingPayload = {
    nama,
    whatsapp,
    tanggal,
    jumlah_orang: jumlahOrang,
    jumlahOrang,
    paket,
    total_harga: totalHarga,
    totalHarga,
    ...cotarQtyFields,
  };

  showPaymentPopup({
    nama,
    tanggal,
    total: totalHarga,
  });

  startSubmitButtonLoading();
  setTimeout(() => {
    submitPendingPayloadToSheet();
  }, 7000);
});

function showPaymentPopup({ nama, tanggal, total }) {
  payTotal.textContent = formatRupiah(total);

  btnWA.href =
    "https://wa.me/6285121396083?text=" +
    encodeURIComponent(buildWhatsappMessage({ nama, tanggal, total }));

  btnWA.classList.remove("loading");
  btnWA.removeAttribute("aria-disabled");
  btnWA.dataset.locked = "0";
  btnWA.textContent = "Kirim Bukti via WhatsApp";

  paymentModal.classList.remove("hidden");
  paymentModal.classList.add("modal-opening");
}

function closePayment() {
  paymentModal.classList.add("hidden");
  paymentModal.classList.remove("modal-opening");
}

btnWA.addEventListener("click", (event) => {
  if (btnWA.dataset.locked === "1") {
    event.preventDefault();
    return;
  }

  startWaButtonLoading();
});

window.closePayment = closePayment;

window.addEventListener("storage", (event) => {
  if (event.key !== ADMIN_SETTINGS_KEY) return;
  applyBookingDateRange();
  renderMaintenanceBanner();
});

syncAdminSettingsFromServer();
setInterval(syncAdminSettingsFromServer, 15000);

setupPaketSkeletonLoader();
setupImagePreviewPopup();
