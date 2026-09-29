import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PassageInput = z.object({
  reference: z.string().min(2),
  translation: z.string().min(2).default("kjv"),
});

export interface PassageVerse {
  verse: number;
  text: string;
}

export interface Passage {
  reference: string;
  translation: string;
  verses: PassageVerse[];
  error?: string;
}

async function loadPassage(reference: string, translation: string): Promise<Passage> {
  try {
    const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=${encodeURIComponent(translation)}`;
    const res = await fetch(url);
    if (!res.ok) return { reference, translation, verses: [], error: "Passage not found." };
    const json = (await res.json()) as {
      reference?: string;
      verses?: Array<{ verse: number; text: string }>;
      text?: string;
    };
    const verses = (json.verses ?? []).map(v => ({ verse: v.verse, text: v.text.trim() }));
    if (!verses.length && json.text) verses.push({ verse: 1, text: json.text.trim() });
    return { reference: json.reference ?? reference, translation, verses };
  } catch {
    return { reference, translation, verses: [], error: "Could not reach the scripture library." };
  }
}

/** Read any passage: "John 3", "Psalm 23:1-6", "Romans 8:28". */
export const getPassage = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => PassageInput.parse(input))
  .handler(async ({ data }) => loadPassage(data.reference, data.translation));

const SuggestInput = z.object({
  situation: z.string().min(3),
  category: z.string().optional(),
  translation: z.string().default("kjv"),
});

export interface VerseSuggestion {
  reference: string;
  why: string;
  text: string;
}

/** AI-picked verses that speak to a specific prayer or answer, with real text attached. */
export const suggestVerses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SuggestInput.parse(input))
  .handler(async ({ data }): Promise<{ verses: VerseSuggestion[]; error?: string }> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { verses: [], error: "Scripture suggestions are not configured yet." };

    const { generateText, Output, NoObjectGeneratedError } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const schema = z.object({
      verses: z.array(z.object({ reference: z.string(), why: z.string() })),
    });

    let picks: Array<{ reference: string; why: string }> = [];
    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3.7-flash"),
        output: Output.object({ schema }),
        system:
          "You are a gentle, pastoral scripture guide. Given someone's situation, choose 5 Bible passages that meet them where they are. " +
          "Use standard English references only (e.g. 'Psalm 34:18', 'Romans 8:28-30'), no apocrypha. " +
          "For each, write one warm sentence (under 140 characters) explaining how it speaks to this exact moment. " +
          "Never moralize, never diagnose, never promise outcomes.",
        prompt: [
          data.category ? `Category: ${data.category}` : null,
          `Situation: ${data.situation}`,
        ].filter(Boolean).join("\n"),
      });
      picks = output.verses ?? [];
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          picks = schema.parse(JSON.parse(error.text ?? "{}")).verses;
        } catch {
          return { verses: [], error: "Couldn't gather verses just now. Try again in a moment." };
        }
      } else {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 402) return { verses: [], error: "AI credits are used up for this workspace." };
        if (status === 429) return { verses: [], error: "A lot of people are searching right now — try again shortly." };
        return { verses: [], error: "Couldn't gather verses just now. Try again in a moment." };
      }
    }

    const trimmed = picks.slice(0, 5);
    const passages = await Promise.all(
      trimmed.map(p => loadPassage(p.reference, data.translation)),
    );

    const verses: VerseSuggestion[] = trimmed.map((p, i) => {
      const passage = passages[i];
      const text = (passage?.verses ?? []).map(v => v.text).join(" ").replace(/\s+/g, " ").trim();
      return {
        reference: passage?.reference || p.reference,
        why: p.why.slice(0, 200),
        text,
      };
    }).filter(v => v.text.length > 0);

    if (!verses.length) return { verses: [], error: "Couldn't gather verses just now. Try again in a moment." };
    return { verses };
  });
