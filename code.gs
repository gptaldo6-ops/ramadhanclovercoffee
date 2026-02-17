/**
 * Google Apps Script untuk menerima reservasi dari website.
 * Menyimpan data ke sheet RESERVATION dengan mapping kolom berdasarkan header.
 */

const SHEET_RESERVATION = "RESERVATION";

function doGet() {
  return jsonResponse_({ ok: true, message: "Reservation API is running" });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    validatePayload_(payload);

    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_RESERVATION);
    if (!sheet) {
      throw new Error(`Sheet '${SHEET_RESERVATION}' tidak ditemukan`);
    }

    const headers = getHeaderMap_(sheet);
    const resvId = generateReservationId_(sheet, payload.tanggal, headers);
    const rowValues = buildRowByHeader_(sheet, headers, payload, resvId);

    sheet.appendRow(rowValues);

    return jsonResponse_({
      success: true,
      message: "Reservasi berhasil disimpan",
      resvId,
    });
  } catch (err) {
    return jsonResponse_({
      success: false,
      message: err && err.message ? err.message : "Terjadi kesalahan",
    });
  }
}

function parsePayload_(e) {
  const params = (e && e.parameter) || {};

  let body = {};
  const rawBody = e && e.postData && e.postData.contents;
  if (rawBody && /^\s*[{[]/.test(rawBody)) {
    try {
      body = JSON.parse(rawBody);
    } catch (_err) {
      // Abaikan jika body bukan JSON valid; pakai parameter biasa.
    }
  }

  const source = Object.assign({}, body, params);

  let paket = source.paket;
  if (typeof paket === "string") {
    try {
      paket = JSON.parse(paket || "[]");
    } catch (_err) {
      throw new Error("Format paket tidak valid");
    }
  }
  if (!Array.isArray(paket)) paket = [];

  return {
    nama: String(source.nama || "").trim(),
    whatsapp: String(source.whatsapp || source.no_wa || source.noWa || "").trim(),
    tanggal: normalizeDateString_(source.tanggal),
    jumlah_orang: toNumber_(source.jumlah_orang, source.jumlahOrang),
    total_harga: toNumber_(source.total_harga, source.totalHarga),
    cotar1_qty: toNumber_(source.cotar1_qty, source.cotar1Qty),
    cotar2_qty: toNumber_(source.cotar2_qty, source.cotar2Qty),
    cotar3_qty: toNumber_(source.cotar3_qty, source.cotar3Qty),
    cotar4_qty: toNumber_(source.cotar4_qty, source.cotar4Qty),
    cotar_total_qty: toNumber_(source.cotar_total_qty, source.cotarTotalQty),
    paket,
  };
}

function validatePayload_(payload) {
  if (!payload.nama) throw new Error("Nama wajib diisi");
  if (!payload.whatsapp) throw new Error("WhatsApp wajib diisi");
  if (!payload.tanggal) throw new Error("Tanggal wajib diisi");

  if (!payload.jumlah_orang || payload.jumlah_orang <= 0) {
    throw new Error("Jumlah orang tidak valid");
  }

  if (!Array.isArray(payload.paket) || payload.paket.length === 0) {
    throw new Error("Paket belum dipilih");
  }

  if (payload.total_harga < 0) {
    throw new Error("Total harga tidak valid");
  }
}

function getHeaderMap_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const map = {};

  headers.forEach((name, idx) => {
    const key = normalizeHeaderKey_(name);

    if (key) map[key] = idx;
  });

  return { map, lastColumn };
}

function buildRowByHeader_(sheet, headers, payload, resvId) {
  const row = new Array(headers.lastColumn).fill("");

  setByHeader_(row, headers.map, ["id reservasi", "id", "resv id", "reservation id"], resvId);
  setByHeader_(row, headers.map, ["tanggal", "tgl"], payload.tanggal);
  setByHeader_(row, headers.map, ["pax", "jumlah orang", "jumlah_orang", "jumlah pax", "jumlah"], payload.jumlah_orang);
  setByHeader_(row, headers.map, ["nama"], payload.nama);
  setByHeader_(row, headers.map, ["no wa", "whatsapp", "no whatsapp", "wa"], payload.whatsapp);
  setByHeader_(row, headers.map, ["cotar 1", "cotar1", "cotar_1", "cotar1_qty", "cotar 1 qty"], payload.cotar1_qty);
  setByHeader_(row, headers.map, ["cotar 2", "cotar2", "cotar_2", "cotar2_qty", "cotar 2 qty"], payload.cotar2_qty);
  setByHeader_(row, headers.map, ["cotar 3", "cotar3", "cotar_3", "cotar3_qty", "cotar 3 qty"], payload.cotar3_qty);
  setByHeader_(row, headers.map, ["cotar 4", "cotar4", "cotar_4", "cotar4_qty", "cotar 4 qty"], payload.cotar4_qty);
  setByHeader_(row, headers.map, ["total paket", "total qty", "cotar total", "cotar_total_qty", "cotar total qty"], payload.cotar_total_qty);
  setByHeader_(row, headers.map, ["total bayar", "total", "total harga", "total_harga"], payload.total_harga);
  setByHeader_(row, headers.map, ["paket", "detail paket", "items"], JSON.stringify(payload.paket));
  setByHeader_(row, headers.map, ["created at", "timestamp", "waktu", "dibuat"], new Date());

  if (row.every((cell) => cell === "")) {
    return [
      resvId,
      payload.tanggal,
      payload.jumlah_orang,
      payload.nama,
      payload.whatsapp,
      payload.cotar1_qty,
      payload.cotar2_qty,
      payload.cotar3_qty,
      payload.cotar4_qty,
      payload.total_harga,
      JSON.stringify(payload.paket),
    ];
  }

  return row;
}

function setByHeader_(row, headerMap, aliases, value) {
  for (let i = 0; i < aliases.length; i += 1) {
    const key = normalizeHeaderKey_(aliases[i]);
    if (headerMap[key] !== undefined) {
      row[headerMap[key]] = value;
      return;
    }
  }
}

function generateReservationId_(sheet, tanggalStr, headers) {
  const d = new Date(tanggalStr);
  if (isNaN(d.getTime())) {
    throw new Error("Format tanggal tidak valid");
  }

  const day = ("0" + d.getDate()).slice(-2);
  const dateKey = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const values = sheet.getDataRange().getValues();
  let count = 0;

  const tanggalIdx = findHeaderIndex_(headers.map, ["tanggal", "tgl"]);

  for (let i = 1; i < values.length; i += 1) {
    let rawDate = "";

    if (tanggalIdx !== -1) {
      rawDate = values[i][tanggalIdx];
    } else if (values[i][1]) {
      rawDate = values[i][1];
    } else if (values[i][2]) {
      rawDate = values[i][2];
    }

    if (!rawDate) continue;

    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime())) continue;

    const rowDate = Utilities.formatDate(parsed, Session.getScriptTimeZone(), "yyyy-MM-dd");
    if (rowDate === dateKey) count += 1;
  }

  const running = ("0" + (count + 1)).slice(-2);
  return `R-${day}-${running}`;
}

function findHeaderIndex_(headerMap, aliases) {
  for (let i = 0; i < aliases.length; i += 1) {
    const key = normalizeHeaderKey_(aliases[i]);
    if (headerMap[key] !== undefined) {
      return headerMap[key];
    }
  }
  return -1;
}

function normalizeHeaderKey_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\/_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeDateString_(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return raw;

  return Utilities.formatDate(parsed, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function toNumber_(...values) {
  for (let i = 0; i < values.length; i += 1) {
    const val = values[i];
    if (val === null || val === undefined || val === "") continue;

    const num = Number(String(val).replace(/,/g, ".").trim());
    if (!isNaN(num)) return num;
  }
  return 0;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
