import { NextRequest, NextResponse } from "next/server";
import { buildReguReport } from "@/lib/cico";
import { sendWhatsapp } from "@/lib/fonnte";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Gagal membaca form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const date = formData.get("date");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
  }
  if (typeof date !== "string" || !date) {
    return NextResponse.json({ error: "Tanggal belum dipilih." }, { status: 400 });
  }

  let result;
  try {
    const buffer = await file.arrayBuffer();
    result = buildReguReport(buffer, date);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  try {
    const waResult = await sendWhatsapp(result.text);
    if (!waResult.ok) {
      return NextResponse.json(
        {
          error: "Data berhasil diproses tapi gagal mengirim ke WhatsApp via Fonnte.",
          fonnte: waResult,
          text: result.text,
          warnings: result.warnings,
        },
        { status: 502 }
      );
    }
    return NextResponse.json({
      success: true,
      text: result.text,
      warnings: result.warnings,
      fonnte: waResult.body,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: `Data berhasil diproses tapi gagal mengirim ke WhatsApp: ${(e as Error).message}`,
        text: result.text,
        warnings: result.warnings,
      },
      { status: 500 }
    );
  }
}
