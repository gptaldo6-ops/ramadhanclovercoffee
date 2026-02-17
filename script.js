let pendingPayload = null;

const API_URL =
  "https://script.google.com/macros/s/AKfycbwFU-fHZR5lphEAX0R-I_BvKQx5H1MtCBxgfQU7s6Xnc-RYgx3UZX61RY7eXshk3EX0Sw/exec";

const tanggalInput = document.getElementById("tanggal");
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

function applyBookingDateRange() {
  const { min, max } = getBookingDateRange();
  tanggalInput.min = min;
  tanggalInput.max = max;

  if (tanggalInput.value) {
    if (tanggalInput.value < min || tanggalInput.value > max) {
      tanggalInput.value = "";
    }
  }
}


function formatRupiah(value) {
  return value.toLocaleString("id-ID");
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

tanggalInput.addEventListener("change", () => {
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
