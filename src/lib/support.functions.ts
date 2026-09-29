import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-side access to the support@witnessmovement.com mailbox through the
// Gmail connector. LOVABLE_API_KEY and GOOGLE_MAIL_API_KEY are server-only.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const BATCH_URL = "https://connector-gateway.lovable.dev/google_mail/batch/gmail/v1";
const SUPPORT_ADDRESS = "support@witnessmovement.com";

type Ctx = { supabase: any; userId: string };

async function requireAdmin({ supabase, userId }: Ctx) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

function gatewayHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovableKey || !connectionKey) throw new Error("The support mailbox is not connected yet.");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
    "Content-Type": "application/json",
  };
}

async function gmailGet(path: string) {
  const res = await fetch(`${GATEWAY_URL}${path}`, { headers: gatewayHeaders() });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Gmail read failed [${res.status}]: ${body}`);
    throw new Error(`Mailbox request failed [${res.status}]: ${body}`);
  }
  return res.json();
}

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), b => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

function b64urlDecode(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function headerValue(msg: any, name: string): string {
  const h = (msg?.payload?.headers ?? []).find(
    (x: any) => String(x.name).toLowerCase() === name.toLowerCase(),
  );
  return h?.value ?? "";
}

function plainBody(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) return b64urlDecode(payload.body.data);
  for (const part of payload.parts ?? []) {
    const found = plainBody(part);
    if (found) return found;
  }
  // Fall back to HTML stripped to text when no plain part exists.
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return b64urlDecode(payload.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .trim();
  }
  return "";
}

export interface InboxEmail {
  kind: "email";
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export interface InboxRequest {
  kind: "request";
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  status: string;
  body: string;
}

export type InboxItem = InboxEmail | InboxRequest;

/** One batch request for many thread metadata reads. */
async function batchThreads(ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const boundary = `batch_${crypto.randomUUID().replace(/-/g, "")}`;
  const inner = (id: string) =>
    `GET /gmail/v1/users/me/threads/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
  const body =
    ids
      .map(
        id =>
          `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <${id}>\r\n\r\n${inner(id)}\r\n`,
      )
      .join("") + `--${boundary}--`;
  const headers = gatewayHeaders();
  const res = await fetch(BATCH_URL, {
    method: "POST",
    headers: { ...headers, "Content-Type": `multipart/mixed; boundary=${boundary}` },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Gmail batch failed [${res.status}]: ${text}`);
    throw new Error(`Mailbox request failed [${res.status}]: ${text}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  const match = /boundary=([^;]+)/.exec(contentType);
  const text = await res.text();
  if (!match) throw new Error(`Mailbox batch reply was not multipart: ${text.slice(0, 200)}`);
  const out: any[] = [];
  const b = match[1].replace(/^"|"$/g, "");
  for (const part of text.split(`--${b}`)) {
    const statusLine = /HTTP\/\d(\.\d)? (\d{3})/.exec(part);
    if (!statusLine) continue;
    // The blank line that separates inner headers from the JSON body — the
    // first "\r\n\r\n" in a part comes BEFORE the status line, so search
    // after it.
    const jsonStart = part.indexOf("\r\n\r\n", statusLine.index);
    if (jsonStart === -1) continue;
    if (statusLine[2] !== "200") {
      console.error(`Gmail batch part failed [${statusLine[2]}]: ${part.slice(jsonStart + 4, jsonStart + 304)}`);
      continue;
    }
    try {
      out.push(JSON.parse(part.slice(jsonStart + 4).trim()));
    } catch {
      // Skip an unparseable part; the rest of the inbox still renders.
    }
  }
  if (out.length === 0 && ids.length > 0) {
    throw new Error(`Batch parsed 0 of ${ids.length} parts; ct=${contentType}; head=${JSON.stringify(text.slice(0, 300))}`);
  }
  return out;
}

export const supportInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: InboxItem[]; mailError?: string }> => {
    const ctx = context as unknown as Ctx;
    await requireAdmin(ctx);

    // In-app support requests, newest first.
    const { data: requests } = await ctx.supabase
      .from("support_requests")
      .select("id, email, subject, body, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const requestItems: InboxRequest[] = (requests ?? []).map((r: any) => ({
      kind: "request" as const,
      id: r.id,
      from: r.email,
      subject: r.subject,
      snippet: r.body.slice(0, 140),
      date: r.created_at,
      status: r.status,
      body: r.body,
    }));

    // Gmail threads in the support inbox.
    let emailItems: InboxEmail[] = [];
    let mailError: string | undefined;
    try {
      const list = await gmailGet(`/users/me/threads?maxResults=25&labelIds=INBOX`);
      const ids = (list.threads ?? []).map((t: any) => t.id as string);
      const threads = await batchThreads(ids);
      emailItems = threads.map(t => {
        const messages = t.messages ?? [];
        const last = messages[messages.length - 1] ?? {};
        return {
          kind: "email" as const,
          id: t.id,
          from: headerValue(last, "From"),
          subject: headerValue(last, "Subject") || "(no subject)",
          snippet: t.snippet ?? "",
          date: new Date(Number(last.internalDate ?? Date.now())).toISOString(),
          unread: messages.some((m: any) => (m.labelIds ?? []).includes("UNREAD")),
        };
      });
    } catch (e) {
      console.error("Gmail inbox read failed:", e);
      mailError = e instanceof Error ? e.message : String(e);
      // In-app requests still show even if the mailbox read fails.
    }

    const items = [...requestItems, ...emailItems].sort((a, b) => b.date.localeCompare(a.date));
    return { items, ...(mailError ? { mailError } : {}) };
  });

export interface ThreadMessage {
  id: string;
  from: string;
  date: string;
  body: string;
  mine: boolean;
}

export const readSupportThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ threadId: z.string().min(1).max(64) }).parse(data))
  .handler(async ({ data, context }): Promise<{ messages: ThreadMessage[]; subject: string; replyTo: string }> => {
    const ctx = context as unknown as Ctx;
    await requireAdmin(ctx);
    const thread = await gmailGet(`/users/me/threads/${encodeURIComponent(data.threadId)}?format=full`);
    const messages: ThreadMessage[] = (thread.messages ?? []).map((m: any) => {
      const from = headerValue(m, "From");
      return {
        id: m.id,
        from,
        date: new Date(Number(m.internalDate ?? Date.now())).toISOString(),
        body: plainBody(m.payload) || (m.snippet ?? ""),
        mine: from.toLowerCase().includes(SUPPORT_ADDRESS),
      };
    });
    const first = thread.messages?.[0];
    const subject = headerValue(first, "Subject") || "(no subject)";
    const lastFromSomeoneElse = [...(thread.messages ?? [])]
      .reverse()
      .find((m: any) => !headerValue(m, "From").toLowerCase().includes(SUPPORT_ADDRESS));
    return { messages, subject, replyTo: headerValue(lastFromSomeoneElse ?? first, "From") };
  });

export const replySupportThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ threadId: z.string().min(1).max(64), body: z.string().min(1).max(10000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await requireAdmin(ctx);

    // Thread the reply under the last message from the other person.
    const thread = await gmailGet(
      `/users/me/threads/${encodeURIComponent(data.threadId)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID`,
    );
    const theirs = [...(thread.messages ?? [])]
      .reverse()
      .find((m: any) => !headerValue(m, "From").toLowerCase().includes(SUPPORT_ADDRESS));
    const fallback = thread.messages?.[thread.messages.length - 1];
    const anchor = theirs ?? fallback;
    if (!anchor) throw new Error("That conversation has no message to reply to.");
    const to = headerValue(anchor, "From");
    const subject = headerValue(anchor, "Subject") || "(no subject)";
    const messageId = headerValue(anchor, "Message-ID");

    const raw = [
      `To: ${to}`,
      `Subject: ${header(/^re:/i.test(subject) ? subject : `Re: ${subject}`)}`,
      ...(messageId ? [`In-Reply-To: ${messageId}`, `References: ${messageId}`] : []),
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      data.body,
    ].join("\r\n");
    const encoded = b64(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: gatewayHeaders(),
      body: JSON.stringify({ raw: encoded, threadId: data.threadId }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Gmail send failed [${res.status}]: ${text}`);
      throw new Error(`Reply could not be sent [${res.status}]: ${text}`);
    }
    return { sent: true as const };
  });

export const answerSupportRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), reply: z.string().min(1).max(10000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await requireAdmin(ctx);

    const { data: request, error } = await ctx.supabase
      .from("support_requests")
      .select("id, email, subject, status")
      .eq("id", data.id)
      .single();
    if (error || !request) throw new Error("That request is gone.");

    const raw = [
      `To: ${request.email}`,
      `Subject: ${header(/^re:/i.test(request.subject) ? request.subject : `Re: ${request.subject}`)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      data.reply,
    ].join("\r\n");
    const encoded = b64(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: gatewayHeaders(),
      body: JSON.stringify({ raw: encoded }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Gmail send failed [${res.status}]: ${text}`);
      throw new Error(`Reply could not be sent [${res.status}]: ${text}`);
    }

    const { error: updateError } = await ctx.supabase
      .from("support_requests")
      .update({ status: "answered", answered_at: new Date().toISOString() })
      .eq("id", data.id);
    if (updateError) throw new Error(updateError.message);
    return { sent: true as const };
  });
