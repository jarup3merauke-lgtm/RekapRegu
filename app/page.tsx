"use client";

import { useCallback, useRef, useState } from "react";

type Status = "idle" | "loading-dates" | "ready" | "processing" | "success" | "error";

interface ApiResponse {
  success?: boolean;
  error?: string;
  text?: string;
  warnings?: string[];
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setStatus("loading-dates");
    setResult(null);
    setDates([]);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/dates", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error });
        setStatus("error");
        return;
      }
      setDates(data.dates);
      setSelectedDate(data.dates[0]);
      setStatus("ready");
    } catch (e) {
      setResult({ error: (e as Error).message });
      setStatus("error");
    }
  }, []);

  const handleProses = async () => {
    if (!file || !selectedDate) return;
    setStatus("processing");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("date", selectedDate);
      const res = await fetch("/api/process", { method: "POST", body: fd });
      const data: ApiResponse = await res.json();
      setResult(data);
      setStatus(res.ok ? "success" : "error");
    } catch (e) {
      setResult({ error: (e as Error).message });
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setDates([]);
    setSelectedDate("");
    setStatus("idle");
    setResult(null);
  };

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black min-h-screen">
      <main className="flex w-full max-w-2xl flex-col gap-6 py-16 px-6">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Rekap Harian Rating per Regu
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Drop 1 file &quot;Laporan Detail Check In Check Out (CICO)&quot;, pilih tanggal, lalu
            klik Proses. Sistem menghitung rating bintang 5 per regu per ULP dan mengirim hasilnya
            ke grup WhatsApp via Fonnte.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            dragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <p className="text-zinc-600 dark:text-zinc-400">
            Klik atau drag & drop file CICO ke sini
          </p>
          {file && <p className="mt-1 text-xs text-zinc-400">{file.name}</p>}
        </div>

        {status === "loading-dates" && (
          <p className="text-sm text-zinc-500">Membaca tanggal yang tersedia...</p>
        )}

        {dates.length > 0 && (status === "ready" || status === "processing" || status === "success" || status === "error") && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-black dark:text-zinc-100">
              Pilih tanggal laporan
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={status === "processing"}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-3 py-2 text-sm text-black dark:text-zinc-100"
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3">
          <button
            disabled={!file || !selectedDate || status === "processing" || status === "loading-dates"}
            onClick={handleProses}
            className="flex-1 rounded-full bg-foreground px-5 py-3 text-background font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors"
          >
            {status === "processing" ? "Memproses..." : "Proses & Kirim ke WhatsApp"}
          </button>
          {file && (
            <button
              onClick={reset}
              disabled={status === "processing"}
              className="rounded-full border border-zinc-300 dark:border-zinc-700 px-5 py-3 text-sm font-medium text-black dark:text-zinc-100"
            >
              Reset
            </button>
          )}
        </div>

        {status === "success" && result && (
          <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4">
            <p className="font-medium text-green-800 dark:text-green-300">
              ✅ Berhasil diproses dan dikirim ke WhatsApp.
            </p>
            {result.warnings && result.warnings.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-amber-700 dark:text-amber-400">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white dark:bg-black p-3 text-xs text-black dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
              {result.text}
            </pre>
          </div>
        )}

        {status === "error" && result && (
          <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4">
            <p className="font-medium text-red-800 dark:text-red-300">❌ {result.error}</p>
            {result.text && (
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white dark:bg-black p-3 text-xs text-black dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                {result.text}
              </pre>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
