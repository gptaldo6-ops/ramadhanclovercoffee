let pendingPayload = null;

const ADMIN_SETTINGS_KEY = "ramadhan_admin_settings";
const RESERVATION_HISTORY_KEY = "ramadhan_reservation_history";

const API_URL =
  "https://script.google.com/macros/s/AKfycbxJWjkbqXoxGfxZqZdq3O6RHqtmJ-cfp_PNNanwAfKNZBbi6XgcUxr6NE6ZepUTa5Xw/exec";

const ADMIN_SETTINGS_ACTION_GET = "getAdminSettings";
const ADMIN_SETTINGS_ACTION_SET = "setAdminSettings";

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
    manualReservedByDate:
      parsed.manualReservedByDate && typeof parsed.manualReservedByDate === "object"
        ? parsed.manualReservedByDate
        : {},
    reservationHistoryBackup: Array.isArray(parsed.reservationHistoryBackup)
      ? parsed.reservationHistoryBackup
      : [],
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

const addonDrinkGrid = document.getElementById("addonDrinkGrid");
const addonFoodGrid = document.getElementById("addonFoodGrid");
const addonDrinkWrap = document.getElementById("addonDrinkWrap");
const addonFoodWrap = document.getElementById("addonFoodWrap");
const btnShowDrinkAddon = document.getElementById("btnShowDrinkAddon");
const btnShowFoodAddon = document.getElementById("btnShowFoodAddon");
const drinkConsentInline = document.getElementById("drinkConsentInline");
const foodConsentInline = document.getElementById("foodConsentInline");
const btnDrinkAgree = document.getElementById("btnDrinkAgree");
const btnDrinkDecline = document.getElementById("btnDrinkDecline");
const btnFoodAgree = document.getElementById("btnFoodAgree");
const btnFoodDecline = document.getElementById("btnFoodDecline");

const ADD_ON_ITEMS = [
  { name: "Matcha Latte Ice", category: "Drink", price: 23000 },
  { name: "Taro Latte Ice", category: "Drink", price: 20000 },
  { name: "Choco Dubai", category: "Drink", price: 25000 },
  { name: "Choco Milk Ice", category: "Drink", price: 20000 },
  { name: "Creamento (1Liter)", category: "Drink", price: 80000 },
  { name: "Creamento (250ml)", category: "Drink", price: 25000 },
  { name: "Comiclo (1Liter)", category: "Drink", price: 80000 },
  { name: "Comiclo (250ml)", category: "Drink", price: 20000 },
  { name: "Cloren (1Liter)", category: "Drink", price: 80000 },
  { name: "Cloren (250ml)", category: "Drink", price: 23000 },
  { name: "Sweet Tea", category: "Drink", price: 15000 },
  { name: "Lemon Tea", category: "Drink", price: 18000 },
  { name: "Lychee Tea", category: "Drink", price: 20000 },
  { name: "Peach Tea", category: "Drink", price: 20000 },
  { name: "Javakisa", category: "Drink", price: 20000 },
  { name: "Apple Rock", category: "Drink", price: 20000 },
  { name: "Mie Nyemek", category: "Food", price: 23000 },
  { name: "Spaghetti Bolognese", category: "Food", price: 30000 },
  { name: "Nasi", category: "Food", price: 5000 },
  { name: "Mix Platter", category: "Food", price: 25000 },
  { name: "Kentang Goreng", category: "Food", price: 22000 },
  { name: "Dimsum Siomay Nori", category: "Food", price: 20000 },
  { name: "Dimsum Siomay Ayam", category: "Food", price: 20000 },
  { name: "Dimsum Siomay Mercon", category: "Food", price: 20000 },
  { name: "Dimsum Siomay Kulit Tahu Ayam", category: "Food", price: 20000 },
  { name: "Banana Split", category: "Food", price: 20000 },
  { name: "Cireng Bumbu Rujak", category: "Food", price: 20000 },
  { name: "Keju Aroma", category: "Food", price: 20000 },
  { name: "Matcha Cake", category: "Food", price: 25000 },
  { name: "Cheesecake", category: "Food", price: 27000 },
  { name: "Blueberry Cheese Cake", category: "Food", price: 29000 },
  { name: "Carbonara", category: "Food", price: 28000 },
  { name: "Madu Aren", category: "Food", price: 20000 },
  { name: "Cihu Sambal Kecap", category: "Food", price: 20000 },
  { name: "Sour Berry", category: "Drink", price: 20000 },
  { name: "Ice Berg Cheese Cake", category: "Food", price: 33000 },
  { name: "Choco Dubai", category: "Drink", price: 25000 },
  { name: "Matcha Latte", category: "Drink", price: 23000 },
  { name: "Sour Berry", category: "Drink", price: 20000 },
  { name: "Americano", category: "Drink", price: 20000 },
  { name: "Soto Ayam", category: "Food", price: 35000 },
  { name: "Pempek", category: "Food", price: 27000 },
  { name: "Americano", category: "Drink", price: 20000 },
  { name: "Matcha Latte", category: "Drink", price: 23000 },
  { name: "Es Lemon Tea", category: "Drink", price: 18000 },
  { name: "Choco Milk Ice", category: "Drink", price: 20000 },
  { name: "Espresso", category: "Drink", price: 20000 },
  { name: "Split Shoot", category: "Drink", price: 20000 },
  { name: "Oriental", category: "Food", price: 30000 },
  { name: "Dimsum Siomay Mix", category: "Food", price: 22000 },
  { name: "Chicken Wings", category: "Food", price: 29000 },
  { name: "Corn Ribs", category: "Food", price: 23000 },
  { name: "Singkong Thailand", category: "Food", price: 28000 },
  { name: "Telor Ceplok", category: "Food", price: 5000 },
  { name: "Indomie Kuah Komplit", category: "Food", price: 15000 },
  { name: "Indomie Goreng Komplit", category: "Food", price: 17000 },
  { name: "Cafe Latte", category: "Drink", price: 20000 },
  { name: "Cappucino", category: "Drink", price: 20000 },
  { name: "Magic", category: "Drink", price: 20000 },
  { name: "Blue Purple", category: "Drink", price: 25000 },
  { name: "Choco Jerry", category: "Drink", price: 23000 },
  { name: "Choco Berry", category: "Drink", price: 23000 },
  { name: "Apple Tea Sparkle", category: "Drink", price: 20000 },
  { name: "Hyo Sunset", category: "Drink", price: 23000 },
  { name: "Red Candy", category: "Drink", price: 23000 },
  { name: "Berry Crush", category: "Drink", price: 25000 },
  { name: "Nasi Bakar Ayam", category: "Food", price: 25000 },
  { name: "Chicken Teriyaki", category: "Food", price: 35000 },
  { name: "Aglio Olio", category: "Food", price: 28000 },
  { name: "Tahu Lada Garam", category: "Food", price: 23000 },
  { name: "Palubasa", category: "Food", price: 40000 },
  { name: "Chicken Salted Egg", category: "Food", price: 35000 },
  { name: "Chicken Honey Garlic", category: "Food", price: 32000 },
  { name: "Matcha The Coco", category: "Drink", price: 25000 },
  { name: "Matcha Berry", category: "Drink", price: 25000 },
  { name: "Blueberry Matcha", category: "Drink", price: 25000 },
  { name: "Cocotaro", category: "Drink", price: 23000 },
  { name: "Cloud Citrus", category: "Drink", price: 20000 },
  { name: "Waffle", category: "Food", price: 25000 },
  { name: "Curry Katsu", category: "Food", price: 35000 },
  { name: "Sapi Lada Hitam", category: "Food", price: 40000 },
  { name: "Choco Almond", category: "Food", price: 25000 },
];

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
      manualReservedByDate: {},
      reservationHistoryBackup: [],
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

function collectAddonData() {
  const data = [];

  document.querySelectorAll(".addon-card").forEach((card) => {
    const qty = Number(card.querySelector(".addon-qty").textContent);
    if (qty <= 0) return;

    data.push({
      namaAddOn: card.dataset.nama,
      kategori: card.dataset.kategori,
      harga: Number(card.dataset.harga),
      qty,
    });
  });

  return data;
}

function updateSummary() {
  let html = "";
  const paket = collectPaketData();
  const addOn = collectAddonData();

  const totalPaket = paket.reduce((sum, item) => sum + item.harga * item.qty, 0);
  const totalAddOn = addOn.reduce((sum, item) => sum + item.harga * item.qty, 0);

  if (paket.length) {
    html += '<div class="summary-group"><strong>Paket Cotar</strong></div>';
    paket.forEach((item) => {
      html += `
        <div class="summary-item">
          <strong>${item.namaPaket} × ${item.qty}</strong><br/>
          <span class="summary-meta">${item.infoPaket}</span><br/>
          <span class="summary-meta">Rp${formatRupiah(item.harga)} / paket</span><br/>
        </div>
      `;
    });
    html += `
      <div class="summary-item">
        <strong>Total Paket: Rp${formatRupiah(totalPaket)}</strong>
      </div>
    `;
  }

  if (addOn.length) {
    html += '<div class="summary-group"><strong>Add On</strong></div>';
    addOn.forEach((item) => {
      html += `
        <div class="summary-item">
          <strong>${item.namaAddOn} × ${item.qty}</strong><br/>
          <span class="summary-meta">${item.kategori}</span><br/>
          <span class="summary-meta">Rp${formatRupiah(item.harga)} / item</span><br/>
        </div>
      `;
    });
    html += `
      <div class="summary-item">
        <strong>Total Add On: Rp${formatRupiah(totalAddOn)}</strong>
      </div>
    `;
  }

  if (paket.length || addOn.length) {
    html += `
      <div class="summary-item">
        <strong>Total Semua Pesanan: Rp${formatRupiah(totalPaket + totalAddOn)}</strong>
      </div>
    `;
  }

  summaryContainer.innerHTML = html || "<p>Belum ada pesanan dipilih</p>";
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

function createAddonCard(item) {
  const card = document.createElement("div");
  card.className = "addon-card";
  card.dataset.nama = item.name;
  card.dataset.kategori = item.category;
  card.dataset.harga = String(item.price);

  card.innerHTML = `
    <p class="addon-name">${item.name}</p>
    <p class="addon-price">Rp${formatRupiah(item.price)}</p>
    <div class="qty-control addon-qty-control">
      <button type="button" class="addon-minus">−</button>
      <span class="addon-qty">0</span>
      <button type="button" class="addon-plus">+</button>
    </div>
  `;

  const qtyEl = card.querySelector(".addon-qty");
  const plus = card.querySelector(".addon-plus");
  const minus = card.querySelector(".addon-minus");
  let qty = 0;

  plus.addEventListener("click", () => {
    qty += 1;
    qtyEl.textContent = qty;
    updateSummary();
  });

  minus.addEventListener("click", () => {
    if (qty > 0) qty -= 1;
    qtyEl.textContent = qty;
    updateSummary();
  });

  return card;
}

function renderAddOnMenu() {
  if (!addonDrinkGrid || !addonFoodGrid) return;

  addonDrinkGrid.innerHTML = "";
  addonFoodGrid.innerHTML = "";

  ADD_ON_ITEMS.forEach((item) => {
    const card = createAddonCard(item);
    if (item.category === "Drink") {
      addonDrinkGrid.appendChild(card);
    } else {
      addonFoodGrid.appendChild(card);
    }
  });
}

function setAddonCategoryVisibility(category, isVisible) {
  const isDrink = category === "Drink";
  const wrap = isDrink ? addonDrinkWrap : addonFoodWrap;

  if (!wrap) return;

  wrap.classList.toggle("expanded", isVisible);
  wrap.setAttribute("aria-hidden", isVisible ? "false" : "true");

  if (isVisible) {
    const grid = isDrink ? addonDrinkGrid : addonFoodGrid;
    if (grid) {
      const targetHeight = grid.scrollHeight + 12;
      wrap.style.maxHeight = `${targetHeight}px`;
    }
  } else {
    wrap.style.maxHeight = "0px";
  }
}

renderAddOnMenu();
setAddonCategoryVisibility("Drink", false);
setAddonCategoryVisibility("Food", false);

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

if (btnShowDrinkAddon) {
  btnShowDrinkAddon.addEventListener("click", () => {
    if (drinkConsentInline) {
      drinkConsentInline.classList.remove("hidden");
    }
  });
}

if (btnShowFoodAddon) {
  btnShowFoodAddon.addEventListener("click", () => {
    if (foodConsentInline) {
      foodConsentInline.classList.remove("hidden");
    }
  });
}

if (btnDrinkAgree) {
  btnDrinkAgree.addEventListener("click", () => {
    setAddonCategoryVisibility("Drink", true);
    if (drinkConsentInline) {
      drinkConsentInline.classList.add("hidden");
    }
    if (btnShowDrinkAddon) {
      btnShowDrinkAddon.classList.add("hidden");
    }
  });
}

if (btnFoodAgree) {
  btnFoodAgree.addEventListener("click", () => {
    setAddonCategoryVisibility("Food", true);
    if (foodConsentInline) {
      foodConsentInline.classList.add("hidden");
    }
    if (btnShowFoodAddon) {
      btnShowFoodAddon.classList.add("hidden");
    }
  });
}

if (btnDrinkDecline) {
  btnDrinkDecline.addEventListener("click", () => {
    if (drinkConsentInline) {
      drinkConsentInline.classList.add("hidden");
    }
  });
}

if (btnFoodDecline) {
  btnFoodDecline.addEventListener("click", () => {
    if (foodConsentInline) {
      foodConsentInline.classList.add("hidden");
    }
  });
}

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
  btnWA.textContent = "Mengirim...";
}

function stopWaButtonLoading() {
  btnWA.classList.remove("loading");
  btnWA.removeAttribute("aria-disabled");
  btnWA.dataset.locked = "0";
  btnWA.textContent = "Kirim Pesanan";
}

function saveReservationBackup(payload) {
  try {
    const raw = localStorage.getItem(RESERVATION_HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    const nextHistory = Array.isArray(history) ? history : [];
    nextHistory.push(payload);
    localStorage.setItem(RESERVATION_HISTORY_KEY, JSON.stringify(nextHistory));
  } catch {
    // Abaikan gagal simpan backup lokal.
  }
}

function buildReservationBackupPayload(basePayload) {
  return {
    ...basePayload,
    backup_created_at: new Date().toISOString(),
    backup_source: "reservasi_sekarang",
  };
}



const RESERVATION_HISTORY_FALLBACK_KEY = "__reservation_history_backup";

function getReservationHistoryFromSettings(settings) {
  if (Array.isArray(settings.reservationHistoryBackup)) {
    return settings.reservationHistoryBackup;
  }

  const rawFallback = settings?.manualReservedByDate?.[RESERVATION_HISTORY_FALLBACK_KEY];
  if (typeof rawFallback === "string") {
    try {
      const parsed = JSON.parse(rawFallback);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}
async function appendReservationBackupToServer(payload) {
  try {
    const remoteSettings = normalizeAdminSettings(await fetchSharedAdminSettings());
    const currentHistory = getReservationHistoryFromSettings(remoteSettings);
    const nextHistory = [...currentHistory, payload].slice(-300);

    const body = new URLSearchParams({
      action: ADMIN_SETTINGS_ACTION_SET,
      settings: JSON.stringify({
        ...remoteSettings,
        reservationHistoryBackup: nextHistory,
        manualReservedByDate: {
          ...(remoteSettings.manualReservedByDate && typeof remoteSettings.manualReservedByDate === "object"
            ? remoteSettings.manualReservedByDate
            : {}),
          [RESERVATION_HISTORY_FALLBACK_KEY]: JSON.stringify(nextHistory),
        },
      }),
    });

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Gagal sinkron backup reservasi (${response.status})`);
    }

    localStorage.setItem(
      ADMIN_SETTINGS_KEY,
      JSON.stringify({
        ...remoteSettings,
        reservationHistoryBackup: nextHistory,
        manualReservedByDate: {
          ...(remoteSettings.manualReservedByDate && typeof remoteSettings.manualReservedByDate === "object"
            ? remoteSettings.manualReservedByDate
            : {}),
          [RESERVATION_HISTORY_FALLBACK_KEY]: JSON.stringify(nextHistory),
        },
      }),
    );
  } catch (error) {
    console.warn("Sinkron backup reservasi ke server gagal:", error);
  }
}
function submitPendingPayloadToSheet() {
  if (!pendingPayload) return false;

  const payloadToSubmit = pendingPayload;
  pendingPayload = null;

  const latestSettings = getAdminSettings();
  if (isDateClosedByAdmin(payloadToSubmit.tanggal, latestSettings)) {
    alert("Tanggal reservasi sudah ditutup admin. Silakan pilih tanggal lain.");
    closePayment();
    applyBookingDateRange();
    renderMaintenanceBanner();
    return false;
  }

  const latestMaxPeople = getMaxPeopleForDate(payloadToSubmit.tanggal, latestSettings);
  if (latestMaxPeople !== null && Number(payloadToSubmit.jumlah_orang) > latestMaxPeople) {
    alert(`Maksimal jumlah orang untuk tanggal ini adalah ${latestMaxPeople}`);
    closePayment();
    return false;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = API_URL;

  Object.entries(payloadToSubmit).forEach(([key, value]) => {
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
  return true;
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
  const addOn = collectAddonData();

  if (!paket.length && !addOn.length) {
    alert("Pilih minimal 1 pesanan (paket atau add on)");
    return;
  }

  const cotarQtyFields = buildCotarQtyFields(paket);
  const totalPaket = paket.reduce((sum, item) => sum + item.harga * item.qty, 0);
  const totalAddOn = addOn.reduce((sum, item) => sum + item.harga * item.qty, 0);
  const totalHarga = totalPaket + totalAddOn;
  const reservationId = `RSV-${Date.now()}`;

  pendingPayload = {
    reservation_id: reservationId,
    nama,
    whatsapp,
    tanggal,
    jumlah_orang: jumlahOrang,
    jumlahOrang,
    paket,
    add_on: addOn,
    total_harga: totalHarga,
    totalHarga,
    paket_total_harga: totalPaket,
    paketTotalHarga: totalPaket,
    addon_total_harga: totalAddOn,
    addonTotalHarga: totalAddOn,
    ...cotarQtyFields,
  };

  const backupPayload = buildReservationBackupPayload(pendingPayload);

  saveReservationBackup(backupPayload);
  void appendReservationBackupToServer(backupPayload);

  showPaymentPopup({
    nama,
    tanggal,
    total: totalHarga,
  });
});

function showPaymentPopup({ nama, tanggal, total }) {
  payTotal.textContent = formatRupiah(total);


  btnWA.href =
    "https://wa.me/6285121396083?text=" +
    encodeURIComponent(buildWhatsappMessage({ nama, tanggal, total }));

  btnWA.classList.remove("loading");
  btnWA.removeAttribute("aria-disabled");
  btnWA.dataset.locked = "0";
  btnWA.textContent = "Kirim Pesanan";

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
  const isSubmitted = submitPendingPayloadToSheet();
  if (!isSubmitted) {
    stopWaButtonLoading();
  }
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
