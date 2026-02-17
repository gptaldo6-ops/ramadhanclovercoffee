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
    const paket = card.dataset.paket;
    const qty = Number(card.querySelector(".paket-qty").textContent);
    if (qty <= 0) return;

    hasData = true;
    html += `<strong>Paket ${paket} × ${qty}</strong><br/>`;

    card.querySelectorAll(".variant").forEach((variant) => {
      const variantQty = Number(variant.querySelector(".variant-qty").textContent);
      if (variantQty > 0) {
        html += `${variant.dataset.variant} × ${variantQty}<br/>`;
      }
    });

    html += "<hr/>";
  });

  summaryContainer.innerHTML = hasData ? html : "<p>Belum ada paket dipilih</p>";
}

document.querySelectorAll(".paket-card").forEach((card) => {
  const capacity = Number(card.dataset.capacity);
  const qtyEl = card.querySelector(".paket-qty");
  const plus = card.querySelector(".paket-plus");
  const minus = card.querySelector(".paket-minus");
  const variants = card.querySelectorAll(".variant");

  let paketQty = 0;

  function totalVariant() {
    let total = 0;
    variants.forEach((variant) => {
      total += Number(variant.querySelector(".variant-qty").textContent);
    });
    return total;
  }

  function refreshVariantUI() {
    const max = paketQty * capacity;

    variants.forEach((variant) => {
      const variantPlus = variant.querySelector(".variant-plus");
      const variantMinus = variant.querySelector(".variant-minus");

      if (paketQty === 0) {
        variant.classList.remove("active", "selected");
        variantPlus.disabled = true;
        variantMinus.disabled = true;
        return;
      }

      variant.classList.add("active");
      variantMinus.disabled = false;
      variantPlus.disabled = totalVariant() >= max;
    });
  }

  plus.addEventListener("click", () => {
    paketQty += 1;
    qtyEl.textContent = paketQty;
    refreshVariantUI();
    updateSummary();
  });

  minus.addEventListener("click", () => {
    if (paketQty > 0) {
      paketQty -= 1;
    }

    qtyEl.textContent = paketQty;

    if (paketQty === 0) {
      variants.forEach((variant) => {
        variant.querySelector(".variant-qty").textContent = "0";
      });
    }

    refreshVariantUI();
    updateSummary();
  });

  variants.forEach((variant) => {
    const variantQty = variant.querySelector(".variant-qty");
    const variantPlus = variant.querySelector(".variant-plus");
    const variantMinus = variant.querySelector(".variant-minus");

    variantPlus.addEventListener("click", () => {
      if (totalVariant() >= paketQty * capacity) return;

      variantQty.textContent = Number(variantQty.textContent) + 1;
      variant.classList.add("selected");
      refreshVariantUI();
      updateSummary();
    });

    variantMinus.addEventListener("click", () => {
      if (Number(variantQty.textContent) <= 0) return;

      variantQty.textContent = Number(variantQty.textContent) - 1;

      if (Number(variantQty.textContent) === 0) {
        variant.classList.remove("selected");
      }

      refreshVariantUI();
      updateSummary();
    });
  });

  refreshVariantUI();
});

updateSummary();

function collectPaketData() {
  const data = [];

  document.querySelectorAll(".paket-card").forEach((card) => {
    const qty = Number(card.querySelector(".paket-qty").textContent);
    if (qty <= 0) return;

    const variants = [];
    card.querySelectorAll(".variant").forEach((variant) => {
      const variantQty = Number(variant.querySelector(".variant-qty").textContent);
      if (variantQty > 0) {
        variants.push({ code: variant.dataset.variant, qty: variantQty });
      }
    });

    data.push({ paket: card.dataset.paket, qty, variants });
  });

  return data;
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

  pendingPayload = {
    nama,
    whatsapp,
    tanggal,
    paket,
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
