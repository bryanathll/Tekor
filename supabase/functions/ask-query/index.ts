import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  callGemini,
  jsonResponse,
  readJson,
  requireApiKey,
  sanitizeCategories,
} from "../_shared/gemini.ts";

/**
 * Gemini TIDAK diberi data transaksi. Gemini hanya menerjemahkan pertanyaan
 * menjadi filter terstruktur; aplikasi yang menghitung jawabannya dari database.
 */
type QueryFilter = {
  type: "expense" | "income" | "all";
  categories: string[];
  keywords: string[];
  date_from: string;
  date_to: string;
  metric: "total" | "count" | "average" | "max" | "list";
  understood: boolean;
};

function buildPrompt(question: string, categories: string[], today: string): string {
  return [
    "Kamu menerjemahkan pertanyaan tentang catatan keuangan pribadi menjadi filter pencarian.",
    "Tanggal hari ini: " + today + " (format YYYY-MM-DD).",
    "Kategori yang tersedia: " + categories.join(", ") + ".",
    "Isi filter:",
    "- type: 'expense' untuk pengeluaran, 'income' untuk pemasukan, 'all' bila tidak jelas.",
    "- categories: kategori yang dimaksud, hanya dari daftar di atas. Kosong bila semua kategori.",
    "- keywords: kata untuk mencari di catatan transaksi (huruf kecil), misalnya nama barang atau tempat. Kosong bila tidak ada.",
    "- date_from dan date_to: rentang tanggal YYYY-MM-DD. 'bulan ini' = tanggal 1 bulan ini sampai hari ini. 'minggu ini' = Senin terakhir sampai hari ini. 'bulan lalu' = bulan penuh sebelumnya. Bila tidak disebut, pakai bulan ini.",
    "- metric: 'total' untuk jumlah uang, 'count' untuk berapa kali, 'average' untuk rata-rata per transaksi, 'max' untuk yang terbesar, 'list' bila meminta daftar.",
    "- understood: false bila pertanyaan tidak berkaitan dengan catatan keuangan.",
    "",
    "Pertanyaan: " + question,
  ].join("\n");
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default {
  fetch: withSupabase({ auth: "user" }, async (req, _ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Metode tidak didukung" }, 405);
    }

    const body = await readJson(req);
    if (!body) {
      return jsonResponse({ error: "Isi permintaan bukan JSON" }, 400);
    }

    const question = body.question;
    if (typeof question !== "string" || question.trim() === "" || question.length > 300) {
      return jsonResponse({ error: "Pertanyaan kosong atau terlalu panjang" }, 400);
    }

    const categories = sanitizeCategories(body.categories);
    const today = typeof body.today === "string" && DATE_PATTERN.test(body.today)
      ? body.today
      : new Date().toISOString().slice(0, 10);

    try {
      const filter = await callGemini<QueryFilter>({
        apiKey: requireApiKey(),
        prompt: buildPrompt(question, categories, today),
        schema: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["expense", "income", "all"] },
            categories: { type: "ARRAY", items: { type: "STRING", enum: categories } },
            keywords: { type: "ARRAY", items: { type: "STRING" } },
            date_from: { type: "STRING" },
            date_to: { type: "STRING" },
            metric: { type: "STRING", enum: ["total", "count", "average", "max", "list"] },
            understood: { type: "BOOLEAN" },
          },
          required: ["type", "categories", "keywords", "date_from", "date_to", "metric", "understood"],
        },
      });

      if (!filter.understood) {
        return jsonResponse({ error: "Pertanyaan tidak berkaitan dengan catatan keuangan" }, 422);
      }

      const monthStart = today.slice(0, 8) + "01";

      return jsonResponse({
        filter: {
          type: filter.type,
          categories: (filter.categories ?? []).filter((name) => categories.includes(name)),
          keywords: (filter.keywords ?? [])
            .map((word) => word.trim().toLowerCase())
            .filter((word) => word !== "")
            .slice(0, 5),
          date_from: DATE_PATTERN.test(filter.date_from) ? filter.date_from : monthStart,
          date_to: DATE_PATTERN.test(filter.date_to) ? filter.date_to : today,
          metric: filter.metric,
        },
      });
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: "Gemini tidak dapat dihubungi" }, 502);
    }
  }),
};
