// Keterangan tipe untuk API bawaan Supabase Edge Runtime (Deno.serve, Deno.env, dll).
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  callGemini,
  describeError,
  jsonResponse,
  readJson,
  requireApiKey,
  sanitizeCategories,
} from "../_shared/gemini.ts";

type ParsedItem = {
  amount: number;
  category: string;
  note: string;
};

function buildPrompt(text: string, categories: string[]): string {
  return [
    "Kamu membaca catatan keuangan pribadi dalam bahasa Indonesia.",
    "Ubah kalimat berikut menjadi daftar transaksi.",
    "Setiap item berisi: amount (angka rupiah bulat), category (salah satu dari: " +
      categories.join(", ") +
      "), note (keterangan singkat tanpa menyebut jumlah uang).",
    "Uang yang diterima (gaji, bonus, transfer masuk) masuk kategori Pemasukan bila kategori itu ada.",
    "Aturan satuan: rb, ribu, k berarti ribu. jt, juta berarti juta.",
    "Bila satu kalimat memuat beberapa transaksi, pisahkan menjadi beberapa item.",
    "Bila tidak ada jumlah uang yang jelas, kembalikan daftar kosong.",
    "",
    "Kalimat: " + text,
  ].join("\n");
}

export default {
  // auth: "user" -> hanya permintaan dengan token login yang sah yang diproses.
  fetch: withSupabase({ auth: "user" }, async (req, _ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Metode tidak didukung" }, 405);
    }

    const body = await readJson(req);
    if (!body) {
      return jsonResponse({ error: "Isi permintaan bukan JSON" }, 400);
    }

    const text = body.text;
    if (typeof text !== "string" || text.trim() === "") {
      return jsonResponse({ error: "Kalimat kosong" }, 400);
    }

    const categories = sanitizeCategories(body.categories);

    try {
      const items = await callGemini<ParsedItem[]>({
        apiKey: requireApiKey(),
        prompt: buildPrompt(text, categories),
        schema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              amount: { type: "NUMBER" },
              category: { type: "STRING", enum: categories },
              note: { type: "STRING" },
            },
            required: ["amount", "category", "note"],
          },
        },
      });

      // Saring hasil agar hanya item yang masuk akal yang diteruskan ke aplikasi.
      const cleaned = (Array.isArray(items) ? items : [])
        .filter((item) => Number.isFinite(item.amount) && item.amount > 0)
        .map((item) => ({
          amount: Math.round(item.amount),
          category: categories.includes(item.category) ? item.category : "Lainnya",
          note: (item.note ?? "").trim(),
        }));

      return jsonResponse({ items: cleaned });
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: "Gemini gagal: " + describeError(error) }, 502);
    }
  }),
};
