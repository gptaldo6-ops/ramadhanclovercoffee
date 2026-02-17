let pendingPayload = null;

const API_URL =
  "https://script.google.com/macros/s/AKfycbwFU-fHZR5lphEAX0R-I_BvKQx5H1MtCBxgfQU7s6Xnc-RYgx3UZX61RY7eXshk3EX0Sw/exec";

const tanggalInput = document.getElementById("tanggal");
const summaryContainer = document.getElementById("order-summary");
const submitButton = document.getElementById("btnSubmit");
const paymentModal = document.getElementById("paymentModal");
const payTotal = document.getElementById("payTotal");
const btnWA = document.getElementById("btnWA");

function updateSummary() {
  let html = "";
  let hasData = false;

  document.querySelectorAll(".paket-card").forEach((card) => {
    const paketName = card.querySelector("strong").textContent;
    const qty = Number(card.querySelector(".paket-qty").textContent);
    if (qty <= 0) return;

    hasData = true;
    html += `<strong>${paketName} × ${qty}</strong><br/>`;
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

function collectPaketData() {
  const data = [];

  document.querySelectorAll(".paket-card").forEach((card) => {
    const qty = Number(card.querySelector(".paket-qty").textContent);
    if (qty <= 0) return;

    data.push({
      paket: card.dataset.paket,
      namaPaket: card.querySelector("strong").textContent,
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

  if (!nama || !whatsapp || !tanggal) {
    alert("Lengkapi data terlebih dahulu");
    return;
  }

  const paket = collectPaketData();
  if (!paket.length) {
    alert("Pilih paket");
    return;
  }

  const cotarQtyFields = buildCotarQtyFields(paket);

  pendingPayload = {
    nama,
    whatsapp,
    tanggal,
    paket,
    ...cotarQtyFields,
  };

  showPaymentPopup({
    resvId: "R-TEST-01",
    nama,
    tanggal,
    total: 150000,
  });
});

function showPaymentPopup({ resvId, nama, tanggal, total }) {
  payTotal.textContent = total.toLocaleString("id-ID");

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
