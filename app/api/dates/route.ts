import { NextRequest, NextResponse } from "next/server";
import { listAvailableDates } from "@/lib/cico";

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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const dates = listAvailableDates(buffer);
    if (dates.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada tanggal yang bisa dibaca dari file ini." },
        { status: 422 }
      );
    }
    return NextResponse.json({ dates });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
