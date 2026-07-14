import * as XLSX from "xlsx";
import { ULP_ORDER, normRegu, type PoskoKey } from "./roster";
import { formatIndonesianDate, compareDdMmYyyyDesc } from "./dateId";

const HEADER_SCAN_ROWS = 12;

function normHeader(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function normText(v: unknown): string {
  return String(v ?? "").trim();
}

function readFirstSheet(buffer: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
}

function findHeaderRowIndex(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(HEADER_SCAN_ROWS, rows.length); i++) {
    const normed = rows[i].map(normHeader);
    if (normed.includes("no laporan") && normed.includes("nama regu")) {
      return i;
    }
  }
  throw new Error(
    "Tidak menemukan baris header (kolom 'No Laporan' & 'Nama Regu') dalam 12 baris pertama. Pastikan ini file Laporan Detail Check In Check Out (CICO)."
  );
}

interface Cols {
  posko: number;
  sumberLapor: number;
  namaRegu: number;
  noLaporan: number;
  tglLapor: number;
  rating: number;
  apktStatus: number;
}

function resolveCols(header: unknown[]): Cols {
  const idx = (name: string) => header.findIndex((h) => normHeader(h) === name);
  const cols: Cols = {
    posko: idx("posko"),
    sumberLapor: idx("sumber lapor"),
    namaRegu: idx("nama regu"),
    noLaporan: idx("no laporan"),
    tglLapor: idx("tgl lapor"),
    rating: idx("rating"),
    apktStatus: idx("apkt status"),
  };
  for (const [k, v] of Object.entries(cols)) {
    if (v === -1) {
      throw new Error(`Kolom "${k}" tidak ditemukan di file CICO.`);
    }
  }
  return cols;
}

interface Row {
  posko: string;
  sumberLapor: string;
  namaRegu: string;
  noLaporan: string;
  tglLaporDate: string; // dd/mm/yyyy
  rating: string | null;
  status: string;
}

function extractRows(rows: unknown[][], headerIdx: number, cols: Cols): Row[] {
  const out: Row[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const noLaporan = normText(row[cols.noLaporan]);
    if (!noLaporan) continue;
    const tglLaporRaw = normText(row[cols.tglLapor]);
    const datePart = tglLaporRaw.split(" ")[0];
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(datePart)) continue;
    const ratingRaw = row[cols.rating];
    const rating =
      ratingRaw === null || ratingRaw === undefined || String(ratingRaw).trim() === ""
        ? null
        : String(ratingRaw).trim();
    out.push({
      posko: normText(row[cols.posko]),
      sumberLapor: normText(row[cols.sumberLapor]),
      namaRegu: normText(row[cols.namaRegu]),
      noLaporan,
      tglLaporDate: datePart,
      rating,
      status: normText(row[cols.apktStatus]),
    });
  }
  return out;
}

export function listAvailableDates(buffer: ArrayBuffer): string[] {
  const rows = readFirstSheet(buffer);
  const headerIdx = findHeaderRowIndex(rows);
  const cols = resolveCols(rows[headerIdx]);
  const dataRows = extractRows(rows, headerIdx, cols);
  const dates = new Set(dataRows.map((r) => r.tglLaporDate));
  return Array.from(dates).sort(compareDdMmYyyyDesc);
}

export interface ReguReportResult {
  text: string;
  warnings: string[];
}

export function buildReguReport(buffer: ArrayBuffer, targetDate: string): ReguReportResult {
  const rows = readFirstSheet(buffer);
  const headerIdx = findHeaderRowIndex(rows);
  const cols = resolveCols(rows[headerIdx]);
  const dataRows = extractRows(rows, headerIdx, cols);

  const warnings: string[] = [];

  const seen = new Map<string, Row>();
  for (const r of dataRows) {
    if (r.tglLaporDate !== targetDate) continue;
    if (normHeader(r.sumberLapor) !== "pln mobile") continue;
    if (!seen.has(r.noLaporan)) seen.set(r.noLaporan, r);
  }

  const buckets = new Map<PoskoKey, Map<string, { noLaporan: string; mark: "✅" | "❌" }[]>>();
  for (const u of ULP_ORDER) buckets.set(u.key, new Map());

  const unmatched: string[] = [];
  const uncategorized: string[] = [];

  for (const r of seen.values()) {
    const posko = r.posko as PoskoKey;
    const ulp = ULP_ORDER.find((u) => u.key === posko);
    if (!ulp) {
      unmatched.push(`${r.noLaporan} (posko="${r.posko}")`);
      continue;
    }
    const reguNorm = normRegu(r.namaRegu);
    const matchedRegu = ulp.regu.find((g) => normRegu(g) === reguNorm);
    if (!matchedRegu) {
      unmatched.push(`${r.noLaporan} (posko="${r.posko}", regu="${r.namaRegu}")`);
      continue;
    }
    const statusNorm = normHeader(r.status);
    let mark: "✅" | "❌" | null = null;
    if (statusNorm === "selesai" && r.rating === "5") mark = "✅";
    else if (statusNorm === "selesai" && r.rating === null) mark = "❌";
    else {
      uncategorized.push(`${r.noLaporan} (status="${r.status}", rating="${r.rating ?? ""}")`);
      continue;
    }
    const map = buckets.get(posko)!;
    if (!map.has(matchedRegu)) map.set(matchedRegu, []);
    map.get(matchedRegu)!.push({ noLaporan: r.noLaporan, mark });
  }

  if (unmatched.length > 0) {
    warnings.push(
      `${unmatched.length} baris tidak dikenali posko/regu-nya (diabaikan): ${unmatched
        .slice(0, 5)
        .join("; ")}${unmatched.length > 5 ? ", ..." : ""}`
    );
  }
  if (uncategorized.length > 0) {
    warnings.push(
      `${uncategorized.length} baris dengan status/rating tidak dikenali (diabaikan): ${uncategorized
        .slice(0, 5)
        .join("; ")}${uncategorized.length > 5 ? ", ..." : ""}`
    );
  }

  const lines: string[] = [];
  lines.push("REKAP HARIAN RATING BINTANG 5 PLN MOBILE");
  lines.push("UP3 Merauke");
  lines.push(formatIndonesianDate(targetDate));
  lines.push("");

  for (const u of ULP_ORDER) {
    lines.push(`${u.emoji} ${u.label}`);
    const map = buckets.get(u.key)!;
    for (const regu of u.regu) {
      lines.push(`${regu} `);
      const items = (map.get(regu) ?? []).sort((a, b) => a.noLaporan.localeCompare(b.noLaporan));
      if (items.length === 0) {
        lines.push("* nihil");
      } else {
        for (const item of items) {
          lines.push(`* ${item.noLaporan} ${item.mark}`);
        }
      }
    }
    lines.push("");
  }
  lines.push("Keterangan :");
  lines.push("✅ : Sudah Rating ");
  lines.push("❌ : Belum Rating ");

  return { text: lines.join("\n"), warnings };
}
