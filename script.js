let pendingPayload = null;

const API_URL = "https://script.google.com/macros/s/AKfycbwFU-fHZR5lphEAX0R-I_BvKQx5H1MtCBxgfQU7s6Xnc-RYgx3UZX61RY7eXshk3EX0Sw/exec";

const tanggalInput = document.getElementById("tanggal");
const jumlahOrangInput = document.getElementById("jumlahOrang");
const submitButton = document.getElementById("btnSubmit");
const payTotal = document.getElementById("payTotal");
const btnWA = document.getElementById("btnWA");
const paymentModal = document.getElementById("paymentModal");

/* =====================
   FORMAT
===================== */

function formatRupiah(value) {
  return Number(value).toLocaleString("id-ID");
}

/* =====================
   QTY CONTROL
===================== */

document.querySelectorAll(".paket-card").forEach((card) => {
  const qtyEl = card.querySelector(".paket-qty");
  const plus = card.querySelector(".paket-plus");
  const minus = card.querySelector(".paket-minus");

  plus.addEventListener("click", () => {
    const current = Number(qtyEl.textContent) || 0;
    qtyEl.textContent = current + 1;
  });

  minus.addEventListener("click", () => {
    const current = Number(qtyEl.textContent) || 0;
    qtyEl.textContent = current > 0 ? current - 1 : 0;
  });
});

/* =====================
   COLLECT DATA
===================== */

function collectPaketData() {
  const data = [];

  document.querySelectorAll(".paket-card").forEach((card) => {
    const qty = Number(card.querySelector(".paket-qty").textContent) || 0;
    if (qty <= 0) return;

    data.push({
      kode: card.dataset.paket.replace("-", "").toUpperCase(),
      nama: card.querySelector("strong").textContent,
      harga: Number(card.dataset.harga),
      qty: qty
    });
  });

  return data;
}

function buildCotarQtyFields(paketList) {
  const result = {
    cotar1_qty: 0,
    cotar2_qty: 0,
    cotar3_qty: 0,
    cotar4_qty: 0
  };

  paketList.forEach(item => {
    if (item.kode === "COTAR1") result.cotar1_qty += item.qty;
    if (item.kode === "COTAR2") result.cotar2_qty += item.qty;
    if (item.kode === "COTAR3") result.cotar3_qty += item.qty;
    if (item.kode === "COTAR4") result.cotar4_qty += item.qty;
  });

  return result;
}

/* =====================
   SUBMIT
===================== */

submitButton.addEventListener("click", () => {
  const nama = document.getElementById("nama").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const tanggal = tanggalInput.value;
  const jumlahOrang = Number(jumlahOrangInput.value) || 0;

  if (!nama || !whatsapp || !tanggal || jumlahOrang <= 0) {
    alert("Lengkapi data terlebih dahulu");
    return;
  }

  const paket = collectPaketData();
  if (!paket.length) {
    alert("Pilih minimal satu paket");
    return;
  }

  const cotarFields = buildCotarQtyFields(paket);

  const totalHarga = paket.reduce((sum, p) => sum + (p.harga * p.qty), 0);

  pendingPayload = {
    nama,
    whatsapp,
    tanggal,
    jumlah_orang: jumlahOrang,
    total_harga: totalHarga,
    ...cotarFields,
    paket
  };

  payTotal.textContent = formatRupiah(totalHarga);

  btnWA.href =
    "https://wa.me/6285156076002?text=" +
    encodeURIComponent(`Nama: ${nama}\nTanggal: ${tanggal}`);

  paymentModal.classList.remove("hidden");
});

/* =====================
   SEND TO APPS SCRIPT
===================== */

btnWA.addEventListener("click", () => {
  if (!pendingPayload) return;

  const form = document.createElement("form");
  form.method = "POST";
  form.action = API_URL;

  Object.entries(pendingPayload).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
});
