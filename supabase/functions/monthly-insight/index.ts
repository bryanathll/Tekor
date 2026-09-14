import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { callGemini, jsonResponse, readJson, requireApiKey } from "../_shared/gemini.ts";

/**
 * Menerima ANGKA AGREGAT saja (bukan transaksi satu per satu), lalu meminta Gemini
 * menulis beberapa kalimat ringkasan. Data mentah tidak pernah dikirim.
 */
type CategoryLine = { category: string; total: number; count: number };
type DayLine = { date: string; total: number };

type InsightPayload = {
  monthLabel: string;
  daysElapsed: number;
  daysInMonth: number;
  total: number;
  count: number;
  averagePerDay: number;
  income: number;
  byCategory: CategoryLine[];
  topDays: DayLine[];
  highest: { amount: number; category: string; note: string; date: string } | null;
  previous: {
    monthLabel: string;
    total: number;
    count: number;
    byCategory: CategoryLine[];
  } | null;
};

type InsightResult = {
  headline: string;
  highlights: string[];
};

function isPayload(value: unknown): value is InsightPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.monthLabel === "string" && typeof v.total === "number" && Array.isArray(v.byCategory);
}

function buildPrompt(payload: InsightPayload): string {
  return [
    "Kamu asisten keuangan pribadi. Tulis ringkasan pengeluaran bulanan dalam bahasa Indonesia yang lugas dan sopan.",
    "Aturan:",
    "- headline: satu kalimat pendek berisi gambaran besar bulan ini.",
    "- highlights: 3 sampai 5 kalimat, masing-masing satu temuan konkret dari data (perbandingan dengan bulan lalu, kategori terbesar, hari terboros, transaksi terbesar, pola akhir pekan bila terlihat).",
    "- Sebutkan angka dalam rupiah dengan pemisah ribuan (contoh: Rp1.250.000) dan persentase dibulatkan.",
    "- Jangan memberi nasihat umum (seperti 'sebaiknya hemat'). Cukup fakta dari data.",
    "- Jangan mengarang data yang tidak ada. Bila bulan lalu kosong, jangan bandingkan.",
    "- Bila bulan ini belum selesai (daysElapsed < daysInMonth), sebut bahwa angkanya sampai hari ke-" + payload.daysElapsed + ".",
    "",
    "Data (JSON):",
    JSON.stringify(payload),
  ].join("\n");
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, _ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Metode tidak didukung" }, 405);
    }

    const body = await readJson(req);
    if (!body || !isPayload(body.payload)) {
      return jsonResponse({ error: "Data ringkasan tidak lengkap" }, 400);
    }

    try {
      const result = await callGemini<InsightResult>({
        apiKey: requireApiKey(),
        prompt: buildPrompt(body.payload),
        temperature: 0.3,
        schema: {
          type: "OBJECT",
          properties: {
            headline: { type: "STRING" },
            highlights: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["headline", "highlights"],
        },
      });

      return jsonResponse({
        headline: (result.headline ?? "").trim(),
        highlights: (Array.isArray(result.highlights) ? result.highlights : [])
          .map((line) => line.trim())
          .filter((line) => line !== "")
          .slice(0, 5),
      });
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: "Gemini tidak dapat dihubungi" }, 502);
    }
  }),
};
