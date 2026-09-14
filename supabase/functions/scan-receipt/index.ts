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

/** Hasil pembacaan struk. Tanggal boleh kosong bila tidak terbaca. */
type ReceiptResult = {
  merchant: string;
  date: string;
  total: number;
  category: string;
  note: string;
  items: Array<{ name: string; amount: number }>;
};

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
// Batas ukuran base64 (~2,7 MB gambar). Aplikasi sudah mengecilkan gambar sebelum kirim.
const MAX_BASE64_LENGTH = 3_600_000;

function buildPrompt(categories: string[], today: string): string {
  return [
    "Kamu membaca foto struk belanja atau bukti pembayaran dari Indonesia.",
    "Ambil informasi berikut:",
    "- merchant: nama toko/penjual (singkat).",
    "- date: tanggal transaksi dalam bentuk YYYY-MM-DD. Bila tidak terbaca, isi string kosong.",
    "- total: total yang dibayar, angka rupiah bulat tanpa titik.",
    "- category: salah satu dari: " + categories.join(", ") + ".",
    "- note: keterangan singkat, misalnya nama toko dan jenis belanjaan, tanpa menyebut jumlah uang.",
    "- items: daftar barang dengan harga bila terbaca (maksimal 20). Bila tidak ada, daftar kosong.",
    "Tanggal hari ini: " + today + ". Tanggal struk tidak mungkin melewati hari ini.",
    "Bila gambar bukan struk atau total tidak terbaca, isi total dengan 0.",
  ].join("\n");
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, _ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Metode tidak didukung" }, 405);
    }

    const body = await readJson(req);
    if (!body) {
      return jsonResponse({ error: "Isi permintaan bukan JSON" }, 400);
    }

    const image = body.image;
    const mimeType = body.mimeType;
    if (typeof image !== "string" || image === "" || image.length > MAX_BASE64_LENGTH) {
      return jsonResponse({ error: "Gambar kosong atau terlalu besar" }, 400);
    }
    if (typeof mimeType !== "string" || !ALLOWED_MIME.includes(mimeType)) {
      return jsonResponse({ error: "Jenis gambar tidak didukung" }, 400);
    }

    const categories = sanitizeCategories(body.categories);
    const today = typeof body.today === "string" ? body.today : new Date().toISOString().slice(0, 10);

    try {
      const result = await callGemini<ReceiptResult>({
        apiKey: requireApiKey(),
        prompt: buildPrompt(categories, today),
        image: { data: image, mimeType },
        schema: {
          type: "OBJECT",
          properties: {
            merchant: { type: "STRING" },
            date: { type: "STRING" },
            total: { type: "NUMBER" },
            category: { type: "STRING", enum: categories },
            note: { type: "STRING" },
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  amount: { type: "NUMBER" },
                },
                required: ["name", "amount"],
              },
            },
          },
          required: ["merchant", "date", "total", "category", "note", "items"],
        },
      });

      const total = Number.isFinite(result.total) ? Math.round(result.total) : 0;
      if (total <= 0) {
        return jsonResponse({ error: "Total tidak terbaca dari gambar" }, 422);
      }

      const date = /^\d{4}-\d{2}-\d{2}$/.test(result.date) && result.date <= today ? result.date : "";

      return jsonResponse({
        receipt: {
          merchant: (result.merchant ?? "").trim(),
          date,
          total,
          category: categories.includes(result.category) ? result.category : "Lainnya",
          note: (result.note ?? "").trim() || (result.merchant ?? "").trim(),
          items: (Array.isArray(result.items) ? result.items : [])
            .filter((item) => item && typeof item.name === "string" && Number.isFinite(item.amount))
            .slice(0, 20)
            .map((item) => ({ name: item.name.trim(), amount: Math.round(item.amount) })),
        },
      });
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: "Gemini gagal: " + describeError(error) }, 502);
    }
  }),
};
