import "server-only";

export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/userinfo.email"];

export function siteUrl(req?: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}

export function redirectUri(req?: Request) {
  return `${siteUrl(req)}/api/google/callback`;
}

export class GoogleAuthError extends Error {}

export async function exchangeCode(code: string, req: Request) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(req),
      grant_type: "authorization_code",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description ?? json.error ?? "Google token exchange failed");
  return json as { access_token: string; refresh_token?: string };
}

export async function accessTokenFromRefresh(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    if (json.error === "invalid_grant") throw new GoogleAuthError("Google Drive connection expired - reconnect it in Settings.");
    throw new Error(json.error_description ?? json.error ?? "Google token refresh failed");
  }
  return json.access_token as string;
}

const API = "https://www.googleapis.com/drive/v3";
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

async function drive<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Drive ${res.status}: ${text.slice(0, 200)}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

export async function folderUsable(token: string, id: string) {
  try {
    const f = await drive<{ trashed?: boolean }>(token, `${API}/files/${id}?fields=id,trashed`);
    return !f.trashed;
  } catch (e) {
    if ((e as { status?: number }).status === 404) return false;
    throw e;
  }
}

export async function findOrCreateFolder(token: string, name: string, parent: string | null) {
  const q = [`mimeType='application/vnd.google-apps.folder'`, `name='${esc(name)}'`, `trashed=false`, parent ? `'${parent}' in parents` : `'root' in parents`].join(" and ");
  const found = await drive<{ files: { id: string }[] }>(token, `${API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`);
  if (found.files[0]) return found.files[0].id;
  const created = await drive<{ id: string }>(token, `${API}/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parent ? { parents: [parent] } : {}) }),
  });
  return created.id;
}

export async function createFolder(token: string, name: string, parent: string) {
  const created = await drive<{ id: string }>(token, `${API}/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parent] }),
  });
  return created.id;
}

export async function renameFile(token: string, id: string, name: string) {
  await drive(token, `${API}/files/${id}?fields=id`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function findFileInFolder(token: string, folderId: string, name: string) {
  const q = `'${folderId}' in parents and name='${esc(name)}' and trashed=false`;
  const found = await drive<{ files: { id: string }[] }>(token, `${API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`);
  return found.files[0]?.id ?? null;
}

/** Create a file, or replace content (and name) of an existing one. */
export async function uploadFile(
  token: string,
  opts: { name: string; mime: string; body: Uint8Array; parent?: string; fileId?: string | null },
) {
  const boundary = "insole" + Math.random().toString(36).slice(2);
  const meta = opts.fileId ? { name: opts.name } : { name: opts.name, parents: [opts.parent] };
  const enc = new TextEncoder();
  const head = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${opts.mime}\r\n\r\n`);
  const tail = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + opts.body.length + tail.length);
  body.set(head, 0);
  body.set(opts.body, head.length);
  body.set(tail, head.length + opts.body.length);
  const url = opts.fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${opts.fileId}?uploadType=multipart&fields=id`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`;
  const res = await drive<{ id: string }>(token, url, {
    method: opts.fileId ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: body as unknown as BodyInit,
  });
  return res.id;
}
