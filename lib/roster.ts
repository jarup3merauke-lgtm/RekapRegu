export type PoskoKey =
  | "POSKO ULP MERAUKE KOTA"
  | "POSKO ULP KUPRIK"
  | "POSKO ULP KURIK"
  | "POSKO ULP TANAH MERAH"
  | "POSKO ULP KEPI";

export const ULP_ORDER: { key: PoskoKey; emoji: string; label: string; regu: string[] }[] = [
  {
    key: "POSKO ULP MERAUKE KOTA",
    emoji: "1️⃣",
    label: "ULP MERAUKE KOTA",
    regu: ["MARO26", "MARO27", "MERAUKE21", "MARO29", "MERAUKE13"],
  },
  {
    key: "POSKO ULP KUPRIK",
    emoji: "2️⃣",
    label: "ULP KUPRIK",
    regu: ["KUPRIK11", "KUPRIK12", "KUPRIK21", "KUPRIK22"],
  },
  {
    key: "POSKO ULP KURIK",
    emoji: "3️⃣",
    label: "ULP KURIK",
    regu: ["KURIK11", "KURIK21", "KURIK22"],
  },
  {
    key: "POSKO ULP TANAH MERAH",
    emoji: "4️⃣",
    label: "ULP TANAH MERAH",
    regu: ["TANMER11", "TANMER21"],
  },
  {
    key: "POSKO ULP KEPI",
    emoji: "5️⃣",
    label: "ULP KEPI",
    regu: ["KEPI11"],
  },
];

export function normRegu(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, "").trim().toUpperCase();
}
