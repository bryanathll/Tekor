/**
 * Modul bersama untuk memanggil Gemini dari Edge Function.
 * Semua fungsi (parse-expense, scan-receipt, monthly-insight, ask-query) memakai ini,
 * sehingga alamat model, cara kirim gambar, dan penanganan error ada di satu tempat.
 */

// Nama model bisa diganti lewat secret GEMINI_MODEL tanpa deploy ulang:
//   npx supabase secrets set GEMINI_MODEL=nama-model
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

function geminiUrl(): string {
  const model = Deno.env.get("GEMINI_MODEL")?.trim() || DEFAULT_MODEL;
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

export type GeminiSchema = Record<string, unknown>;

export type GeminiImage = {
  /** Data gambar dalam base64 tanpa awalan "data:...;base64," */
  data: string;
  mimeType: string;
};

type CallOptions = {
  apiKey: string;
  prompt: string;
  schema: GeminiSchema;
  image?: GeminiImage;
  temperature?: number;
};

/** Memanggil Gemini dan mengembalikan JSON hasil parse sesuai skema. Melempar error bila gagal. */
export async function callGemini<T>(options: CallOptions): Promise<T> {
  const parts: Array<Record<string, unknown>> = [{ text: options.prompt }];

  if (options.image) {
    parts.push({
      inline_data: { mime_type: options.image.mimeType, data: options.image.data },
    });
  }

  const response = await fetch(geminiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": options.apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: options.temperature ?? 0,
        responseMimeType: "application/json",
        responseSchema: options.schema,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "null";
  return JSON.parse(rawText) as T;
}

/** Mengambil API key dari secret. Melempar error bila belum diatur. */
export function requireApiKey(): string {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum diatur");
  }
  return apiKey;
}

const MAX_CATEGORIES = 50;
const MAX_CATEGORY_LENGTH = 40;

export const FALLBACK_CATEGORIES = [
  "Makan",
  "Transport",
  "Belanja",
  "Tagihan",
  "Hiburan",
  "Kesehatan",
  "Pemasukan",
  "Lainnya",
];

/** Menyaring daftar kategori kiriman aplikasi agar berupa teks pendek yang wajar. */
export function sanitizeCategories(input: unknown): string[] {
  if (!Array.isArray(input)) return FALLBACK_CATEGORIES;
  const cleaned = input
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item !== "" && item.length <= MAX_CATEGORY_LENGTH)
    .slice(0, MAX_CATEGORIES);
  return cleaned.length > 0 ? cleaned : FALLBACK_CATEGORIES;
}

/**
 * Mengubah error menjadi kalimat pendek yang aman ditampilkan ke pengguna
 * (dipotong 240 karakter, tanpa nilai yang menyerupai API key).
 */
export function describeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const safe = raw.replace(/AIza[0-9A-Za-z_-]{20,}/g, "[key]").replace(/\s+/g, " ").trim();
  return safe.length > 240 ? safe.slice(0, 240) + "…" : safe;
}

/** Balasan JSON dengan kode status. CORS ditangani oleh withSupabase. */
export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

/** Membaca body JSON; mengembalikan null bila bukan JSON. */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return typeof body === "object" && body !== null ? body : null;
  } catch {
    return null;
  }
}
