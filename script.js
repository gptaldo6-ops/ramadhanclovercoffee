let pendingPayload = null;

const ADMIN_SETTINGS_KEY = "ramadhan_admin_settings";
const RESERVATION_HISTORY_KEY = "ramadhan_reservation_history";

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
const payAddonTotal = document.getElementById("payAddonTotal");
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
  { name: "Matcha Latte Ice", category: "Drink", price: 23000, image: "./img/addon/matcha-latte.jpg" },
  { name: "Taro Latte Ice", category: "Drink", price: 20000, image: "./img/addon/taro-latte.jpg" },
  { name: "Choco Dubai", category: "Drink", price: 25000, image: "./img/addon/choco-dubai.jpg" },
  { name: "Choco Milk Ice", category: "Drink", price: 20000, image: "./img/addon/choco-milk-ice.jpg" },
  { name: "Cremento (1Liter)", category: "Drink", price: 80000, image: "./img/addon/cremento-1liter.jpg" },
  { name: "Cremento (250ml)", category: "Drink", price: 25000, image: "./img/addon/cremento-250ml.jpg" },
  { name: "Comiclo (1Liter)", category: "Drink", price: 80000, image: "./img/addon/comiclo-1liter.jpg" },
  { name: "Comiclo (250ml)", category: "Drink", price: 20000, image: "./img/addon/comiclo-250ml.jpg" },
  { name: "Cloren (1Liter)", category: "Drink", price: 80000, image: "./img/addon/cloren-1liter.jpg" },
  { name: "Cloren (250ml)", category: "Drink", price: 23000, image: "./img/addon/cloren-250ml.jpg" },
  { name: "Sweet Tea", category: "Drink", price: 15000, image: "./img/addon/sweet-tea.jpg" },
  { name: "Lemon Tea", category: "Drink", price: 18000, image: "./img/addon/lemon-tea.jpg" },
  { name: "Lychee Tea", category: "Drink", price: 20000, image: "./img/addon/lychee-tea.jpg" },
  { name: "Peach Tea", category: "Drink", price: 20000, image: "./img/addon/peach-tea.jpg" },
  { name: "Javakisa", category: "Drink", price: 20000, image: "./img/addon/javakisa.jpg" },
  { name: "Apple Rock", category: "Drink", price: 20000, image: "./img/addon/apple-rocl.jpg" },
  { name: "Nasi", category: "Food", price: 5000, image: "./img/addon/rice.jpg" },
  { name: "Mix Platter", category: "Food", price: 25000, image: "./img/addon/mix-platter.jpg" },
  { name: "Kentang Goreng", category: "Food", price: 22000, image: "./img/addon/kentang-goreng.jpg" },
  { name: "Dimsum Siomay Nori", category: "Food", price: 20000, image: "./img/addon/dimsum-siomay-nori.jpg" },
  { name: "Dimsum Siomay Ayam", category: "Food", price: 20000, image: "./img/addon/dimsum-siomay-ayam.jpg" },
  { name: "Dimsum Siomay Mercon", category: "Food", price: 20000, image: "./img/addon/dimsum-siomay-mercon.jpg" },
  { name: "Dimsum Siomay Kulit Tahu Ayam", category: "Food", price: 20000, image: "./img/addon/dimsum-siomay-kulit-tahu-ayam.jpg" },
  { name: "Banana Split", category: "Food", price: 20000, image: "./img/addon/banana-split.jpg" },
  { name: "Waffle", category: "Food", price: 25000, image: "./img/addon/waffle.jpg" },
  { name: "Cireng Bumbu Rujak", category: "Food", price: 20000, image: "./img/addon/cireng-bumbu-rujak.jpg" },
  { name: "Keju Aroma", category: "Food", price: 20000, image: "./img/addon/keju-aroma.jpg" },
  { name: "Matcha Cake", category: "Food", price: 25000, image: "./img/addon/matcha-cake.jpg" },
  { name: "Choco Almond", category: "Food", price: 25000, image: "./img/addon/choco-almond.jpg" },
  { name: "Cheese Cake", category: "Food", price: 27000, image: "./img/addon/cheese-cake.jpg" },
  { name: "Blueberry Cheese Cake", category: "Food", price: 29000, image: "./img/addon/blueberry-cheese-cake.jpg" },
  { name: "Ice Berg Cheese Cake", category: "Food", price: 33000, image: "./img/addon/ice-berg-cheese-cake.jpg" },
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

  const addOnImageHtml = item.image
    ? `<img src="${item.image}" alt="${item.name}" class="addon-img" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />`
    : "";

  card.innerHTML = `
    ${addOnImageHtml}
    <div class="addon-img-dummy" aria-hidden="true" style="display:${item.image ? "none" : "block"}"></div>
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
  btnWA.textContent = "Kirim Bukti via WhatsApp";
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
  const totalHarga = paket.reduce((sum, item) => sum + item.harga * item.qty, 0);
  const totalAddOn = addOn.reduce((sum, item) => sum + item.harga * item.qty, 0);

  pendingPayload = {
    nama,
    whatsapp,
    tanggal,
    jumlah_orang: jumlahOrang,
    jumlahOrang,
    paket,
    add_on: addOn,
    total_harga: totalHarga,
    totalHarga,
    addon_total_harga: totalAddOn,
    addonTotalHarga: totalAddOn,
    ...cotarQtyFields,
  };

  saveReservationBackup({
    ...pendingPayload,
    backup_created_at: new Date().toISOString(),
  });

  showPaymentPopup({
    nama,
    tanggal,
    total: totalHarga,
    addonTotal: totalAddOn,
  });
});

function showPaymentPopup({ nama, tanggal, total, addonTotal = 0 }) {
  payTotal.textContent = formatRupiah(total);
  if (payAddonTotal) {
    payAddonTotal.textContent = formatRupiah(addonTotal);
  }

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
