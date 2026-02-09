let pendingPayload = null;
let selectedTable = null;
let selectedRoom = "R1";

console.log("SCRIPT READY");

/* =========================
   INIT ROOM (DEFAULT)
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const defaultBtn = document.querySelector('.room-buttons button[data-room="R1"]');
  if (defaultBtn) defaultBtn.click();
});

/* =========================
   ROOM SELECTOR
========================= */
document.querySelectorAll(".room-buttons button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".room-buttons button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    selectedRoom = btn.dataset.room;

    document.querySelectorAll(".room-denah").forEach(d => {
      d.classList.toggle("hidden", d.dataset.room !== selectedRoom);
    });

    selectedTable = null;
    const info = document.getElementById("mejaTerpilih");
    if (info) info.innerText = "";

    const tgl = document.getElementById("tanggal").value;
    if (tgl) loadTableStatus(tgl);

    bindMejaClick();
  };
});

/* =========================
   RINGKASAN PESANAN
========================= */
function updateSummary() {
  const summary = document.getElementById("order-summary");
  let html = "";
  let hasData = false;

  document.querySelectorAll(".paket-card").forEach(card => {
    const paket = card.dataset.paket;
    const qty = parseInt(card.querySelector(".paket-qty").innerText, 10);
    if (qty <= 0) return;

    hasData = true;
    html += `<strong>Paket ${paket} × ${qty}</strong><br/>`;

    card.querySelectorAll(".variant").forEach(v => {
      const vQty = parseInt(v.querySelector(".variant-qty").innerText, 10);
      if (vQty > 0) html += `${v.dataset.variant} × ${vQty}<br/>`;
    });

    html += "<hr/>";
  });

  summary.innerHTML = hasData
    ? html
    : "<p>Belum ada paket dipilih</p>";
}

/* =========================
   PAKET & VARIANT
========================= */
document.querySelectorAll(".paket-card").forEach(card => {
  const capacity = parseInt(card.dataset.capacity, 10);
  const qtyEl = card.querySelector(".paket-qty");
  const plus = card.querySelector(".paket-plus");
  const minus = card.querySelector(".paket-minus");
  const variants = card.querySelectorAll(".variant");

  let paketQty = 0;

  function totalVariant() {
    let t = 0;
    variants.forEach(v => t += parseInt(v.querySelector(".variant-qty").innerText, 10));
    return t;
  }

  function refreshVariantUI() {
    const max = paketQty * capacity;
    variants.forEach(v => {
      const vp = v.querySelector(".variant-plus");
      const vm = v.querySelector(".variant-minus");
      if (paketQty === 0) {
        v.classList.remove("active", "selected");
        vp.disabled = vm.disabled = true;
      } else {
        v.classList.add("active");
        vm.disabled = false;
        vp.disabled = totalVariant() >= max;
      }
    });
  }

  plus.onclick = () => {
    paketQty++;
    qtyEl.innerText = paketQty;
    refreshVariantUI();
    updateSummary();
  };

  minus.onclick = () => {
    if (paketQty > 0) paketQty--;
    qtyEl.innerText = paketQty;
    if (paketQty === 0)
      variants.forEach(v => v.querySelector(".variant-qty").innerText = "0");
    refreshVariantUI();
    updateSummary();
  };

  variants.forEach(v => {
    const vQty = v.querySelector(".variant-qty");
    v.querySelector(".variant-plus").onclick = () => {
      if (totalVariant() < paketQty * capacity) {
        vQty.innerText = +vQty.innerText + 1;
        v.classList.add("selected");
        refreshVariantUI();
        updateSummary();
      }
    };
    v.querySelector(".variant-minus").onclick = () => {
      if (+vQty.innerText > 0) {
        vQty.innerText--;
        if (+vQty.innerText === 0) v.classList.remove("selected");
        refreshVariantUI();
        updateSummary();
      }
    };
  });

  refreshVariantUI();
});

updateSummary();

/* =========================
   DENAH MEJA (CLICK)
========================= */
function bindMejaClick() {
  document.querySelectorAll(".room-denah:not(.hidden) .meja").forEach(m => {
    m.onclick = () => {
      if (m.classList.contains("full")) return;

      document.querySelectorAll(".meja").forEach(x =>
        x.classList.remove("selected")
      );

      m.classList.add("selected");
      selectedTable = m.dataset.id;

      const info = document.getElementById("mejaTerpilih");
      if (info) info.innerText = "Meja terpilih: " + selectedTable;
    };
  });
}

/* =========================
   LOAD STATUS MEJA (API)
========================= */
const API_URL =
  "https://script.google.com/macros/s/AKfycbwFU-fHZR5lphEAX0R-I_BvKQx5H1MtCBxgfQU7s6Xnc-RYgx3UZX61RY7eXshk3EX0Sw/exec";

function loadTableStatus(tanggal) {
  if (!tanggal) return;

  const cb = "cb_" + Date.now();
  window[cb] = status => {
    document.querySelectorAll(".meja").forEach(m => {
      if (!m.closest(`.room-denah[data-room="${selectedRoom}"]`)) return;
      m.classList.remove("available", "full", "selected");
      m.classList.add(status[m.dataset.id] === "FULL" ? "full" : "available");
    });
    delete window[cb];
    script.remove();
  };

  const script = document.createElement("script");
  script.src = `${API_URL}?action=getTableStatus&tanggal=${tanggal}&callback=${cb}`;
  document.body.appendChild(script);
}

document.getElementById("tanggal")
  .addEventListener("change", e => loadTableStatus(e.target.value));

/* =========================
   SUBMIT
========================= */
function collectPaketData() {
  const data = [];
  document.querySelectorAll(".paket-card").forEach(card => {
    const qty = +card.querySelector(".paket-qty").innerText;
    if (qty > 0) {
      const variants = [];
      card.querySelectorAll(".variant").forEach(v => {
        const q = +v.querySelector(".variant-qty").innerText;
        if (q > 0) variants.push({ code: v.dataset.variant, qty: q });
      });
      data.push({ paket: card.dataset.paket, qty, variants });
    }
  });
  return data;
}

document.getElementById("btnSubmit").onclick = () => {
  const nama = document.getElementById("nama").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const tanggal = document.getElementById("tanggal").value;

  if (!nama || !whatsapp || !tanggal || !selectedTable)
    return alert("Lengkapi data & pilih meja");

  const paket = collectPaketData();
  if (!paket.length) return alert("Pilih paket");

  pendingPayload = {
    nama, whatsapp, tanggal,
    room: selectedRoom,
    tableId: selectedTable,
    paket
  };

  showPaymentPopup({
    resvId: "R-TEST-01",
    nama, tanggal,
    meja: selectedTable,
    total: 150000
  });
};

/* =========================
   PAYMENT
========================= */
function showPaymentPopup({ resvId, nama, tanggal, meja, total }) {
  payTotal.innerText = total.toLocaleString("id-ID");

  btnWA.href =
    "https://wa.me/6285156076002?text=" +
    encodeURIComponent(`Kode: ${resvId}\nNama: ${nama}\nTanggal: ${tanggal}\nMeja: ${meja}`);

  paymentModal.classList.remove("hidden");
}

function closePayment() {
  paymentModal.classList.add("hidden");
}

btnWA.onclick = () => {
  if (!pendingPayload) return;
  const form = document.createElement("form");
  form.method = "POST";
  form.action = API_URL;

  Object.entries(pendingPayload).forEach(([k, v]) => {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = typeof v === "string" ? v : JSON.stringify(v);
    form.appendChild(i);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
};
