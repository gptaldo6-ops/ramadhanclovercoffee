/**
 * Google Apps Script untuk menerima reservasi dari website.
 * Fokus: simpan data input pelanggan ke sheet RESERVATION.
 * Tidak ada table status / pemilihan meja.
 */

const SHEET_RESERVATION = "RESERVATION";

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: "Reservation API is running" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    validatePayload_(payload);

    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_RESERVATION);
    if (!sheet) {
      throw new Error(`Sheet '${SHEET_RESERVATION}' tidak ditemukan`);
    }

    const resvId = generateReservationId_(sheet, payload.tanggal);
    const now = new Date();

    sheet.appendRow([
      now,
      resvId,
      payload.tanggal,
      payload.nama,
      payload.whatsapp,
      payload.jumlah_orang,
      payload.cotar1_qty,
      payload.cotar2_qty,
      payload.cotar3_qty,
      payload.cotar4_qty,
      payload.cotar_total_qty,
      payload.total_harga,
      JSON.stringify(payload.paket),
    ]);

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
  const p = (e && e.parameter) || {};

  let paket = [];
  try {
    paket = JSON.parse(p.paket || "[]");
  } catch (_err) {
    throw new Error("Format paket tidak valid");
  }

  return {
    nama: String(p.nama || "").trim(),
    whatsapp: String(p.whatsapp || "").trim(),
    tanggal: String(p.tanggal || "").trim(),
    jumlah_orang: Number(p.jumlah_orang || 0),
    total_harga: Number(p.total_harga || 0),
    cotar1_qty: Number(p.cotar1_qty || 0),
    cotar2_qty: Number(p.cotar2_qty || 0),
    cotar3_qty: Number(p.cotar3_qty || 0),
    cotar4_qty: Number(p.cotar4_qty || 0),
    cotar_total_qty: Number(p.cotar_total_qty || 0),
    paket,
  };
}

function validatePayload_(payload) {
  if (!payload.nama) throw new Error("Nama wajib diisi");
  if (!payload.whatsapp) throw new Error("WhatsApp wajib diisi");
  if (!payload.tanggal) throw new Error("Tanggal wajib diisi");
  if (!payload.jumlah_orang || payload.jumlah_orang <= 0) throw new Error("Jumlah orang tidak valid");
  if (!Array.isArray(payload.paket) || payload.paket.length === 0) throw new Error("Paket belum dipilih");
}

function generateReservationId_(sheet, tanggalStr) {
  const d = new Date(tanggalStr);
  if (isNaN(d.getTime())) {
    throw new Error("Format tanggal tidak valid");
  }

  const day = ("0" + d.getDate()).slice(-2);
  const dateKey = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const values = sheet.getDataRange().getValues();
  let count = 0;

  // Asumsi kolom C (index 2) menyimpan tanggal reservasi (yyyy-mm-dd)
  for (let i = 1; i < values.length; i += 1) {
    const rawDate = values[i][2];
    if (!rawDate) continue;

    const rowDate = Utilities.formatDate(new Date(rawDate), Session.getScriptTimeZone(), "yyyy-MM-dd");
    if (rowDate === dateKey) count += 1;
  }

  const running = ("0" + (count + 1)).slice(-2);
  return `R-${day}-${running}`;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
