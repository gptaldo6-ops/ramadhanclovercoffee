let pendingPayload = null;

const API_URL =
  "https://script.google.com/macros/s/AKfycbwFU-fHZR5lphEAX0R-I_BvKQx5H1MtCBxgfQU7s6Xnc-RYgx3UZX61RY7eXshk3EX0Sw/exec";

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

function applyBookingDateRange() {
  const { min, max } = getBookingDateRange();
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
    button.innerHTML = `<span>${labelDay}</span><strong>${labelDate}</strong>`;

    if (value === currentValue) {
      button.classList.add("active");
      hasSelection = true;
    }

    button.addEventListener("click", () => {
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

function buildCotarQtyFields() {
  const qtyByCode = {
    COTAR1: 0,
    COTAR2: 0,
    COTAR3: 0,
    COTAR4: 0,
  };

  document.querySelectorAll(".paket-card").forEach((card) => {
    const code = String(card.dataset.paket || "").trim().toUpperCase();
    const qty = Number(card.querySelector(".paket-qty")?.textContent || 0);

    if (qtyByCode[code] !== undefined) {
      qtyByCode[code] = qty;
    }
  });

  const totalQty =
    qtyByCode.COTAR1 +
    qtyByCode.COTAR2 +
    qtyByCode.COTAR3 +
    qtyByCode.COTAR4;

  return {
    cotar1: qtyByCode.COTAR1,
    cotar2: qtyByCode.COTAR2,
    cotar3: qtyByCode.COTAR3,
    cotar4: qtyByCode.COTAR4,
    cotar_1: qtyByCode.COTAR1,
    cotar_2: qtyByCode.COTAR2,
    cotar_3: qtyByCode.COTAR3,
    cotar_4: qtyByCode.COTAR4,
    cotar1_qty: qtyByCode.COTAR1,
    cotar2_qty: qtyByCode.COTAR2,
    cotar3_qty: qtyByCode.COTAR3,
    cotar4_qty: qtyByCode.COTAR4,
    cotar_1_qty: qtyByCode.COTAR1,
    cotar_2_qty: qtyByCode.COTAR2,
    cotar_3_qty: qtyByCode.COTAR3,
    cotar_4_qty: qtyByCode.COTAR4,
    cotar1Qty: qtyByCode.COTAR1,
    cotar2Qty: qtyByCode.COTAR2,
    cotar3Qty: qtyByCode.COTAR3,
    cotar4Qty: qtyByCode.COTAR4,
    paketAQty: qtyByCode.COTAR1,
    paketBQty: qtyByCode.COTAR2,
    paketCQty: qtyByCode.COTAR3,
    paketDQty: qtyByCode.COTAR4,
    paket_a_qty: qtyByCode.COTAR1,
    paket_b_qty: qtyByCode.COTAR2,
    paket_c_qty: qtyByCode.COTAR3,
    paket_d_qty: qtyByCode.COTAR4,
    a_qty: qtyByCode.COTAR1,
    b_qty: qtyByCode.COTAR2,
    c_qty: qtyByCode.COTAR3,
    d_qty: qtyByCode.COTAR4,
    cotar_total_qty: totalQty,
    cotarTotalQty: totalQty,
    total_paket_qty: totalQty,
    totalPaketQty: totalQty,
  };
}

submitButton.addEventListener("click", () => {
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

  const cotarQtyFields = buildCotarQtyFields();
  const totalHarga = paket.reduce((sum, item) => sum + item.harga * item.qty, 0);

  pendingPayload = {
    nama,
    whatsapp,
    tanggal,
    jumlah_orang: jumlahOrang,
    jumlahOrang,
    jumlahorang: jumlahOrang,
    jumlah_pax: jumlahOrang,
    jumlahPax: jumlahOrang,
    pax: jumlahOrang,
    paket,
    total_harga: totalHarga,
    totalHarga,
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

btnWA.addEventListener("click", (event) => {
  event.preventDefault();
  if (!pendingPayload) return;

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

  const waUrl = btnWA.href;
  if (waUrl) {
    window.open(waUrl, "_blank", "noopener");
  }
});

window.closePayment = closePayment;
