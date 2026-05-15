import { readFileSync } from "fs";

const API_KEY = process.env.HUDU_API_KEY;
const BASE_URL = (process.env.HUDU_BASE_URL ?? "").replace(/\/$/, "");

if (!API_KEY) { console.error("HUDU_API_KEY is required"); process.exit(1); }
if (!BASE_URL) { console.error("HUDU_BASE_URL is required"); process.exit(1); }

type Params = Record<string, string | number | boolean | undefined | null>;
type Body = Record<string, unknown> | unknown[];

export async function api(
  method: string,
  path: string,
  body: Body | null = null,
  params: Params | null = null
): Promise<unknown> {
  const url = new URL(BASE_URL + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = {
    "x-api-key": API_KEY!,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  const opts: RequestInit = { method, headers };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(url.toString(), opts);
  if (res.status === 204) return { success: true };
  const text = await res.text();
  if (!text) return { success: true };
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

export async function apiForm(
  method: string,
  path: string,
  formFields: Record<string, unknown>
): Promise<unknown> {
  const url = new URL(BASE_URL + path);
  const form = new FormData();
  for (const [k, v] of Object.entries(formFields)) {
    if (v === undefined || v === null) continue;
    if (k === "file" || k === "photo") {
      const data = readFileSync(v as string);
      const filename = (v as string).split(/[/\\]/).pop()!;
      form.append(k, new Blob([data]), filename);
    } else {
      form.append(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method,
    headers: { "x-api-key": API_KEY!, "Accept": "application/json" },
    body: form,
  });
  if (res.status === 204) return { success: true };
  const text = await res.text();
  if (!text) return { success: true };
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data;
}
