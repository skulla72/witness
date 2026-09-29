import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export interface FoundChurch {
  placeId: string;
  name: string;
  address: string;
  city: string;
  region: string;
  website: string | null;
  phone: string | null;
}

const searchInput = z.object({
  query: z.string().min(2).max(120),
});

type PlaceRow = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
};

function pick(components: PlaceRow["addressComponents"], type: string, short = false): string {
  const hit = components?.find(c => c.types?.includes(type));
  return (short ? hit?.shortText : hit?.longText) ?? "";
}

function toChurch(place: PlaceRow): FoundChurch | null {
  if (!place.id || !place.displayName?.text) return null;
  return {
    placeId: place.id,
    name: place.displayName.text,
    address: place.formattedAddress ?? "",
    city:
      pick(place.addressComponents, "locality") ||
      pick(place.addressComponents, "sublocality") ||
      pick(place.addressComponents, "administrative_area_level_2"),
    region: pick(place.addressComponents, "administrative_area_level_1", true),
    website: place.websiteUri ?? null,
    phone: place.nationalPhoneNumber ?? null,
  };
}

function credentials() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) return null;
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    "Content-Type": "application/json",
  } as Record<string, string>;
}

/** Churches anywhere in the country, by name, city or state. Signed-in only. */
export const searchChurches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => searchInput.parse(data))
  .handler(async ({ data }): Promise<{ churches: FoundChurch[]; error?: string }> => {
    const headers = credentials();
    if (!headers) return { churches: [], error: "Map lookup is not configured yet." };

    const response = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        ...headers,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.websiteUri,places.nationalPhoneNumber",
      },
      body: JSON.stringify({
        textQuery: `church ${data.query}`,
        includedType: "church",
        pageSize: 15,
        regionCode: "US",
        languageCode: "en",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Places search failed [${response.status}]: ${body}`);
      return { churches: [], error: "Church lookup is unavailable right now." };
    }

    const json = (await response.json()) as { places?: PlaceRow[] };
    const churches = (json.places ?? []).flatMap(p => {
      const church = toChurch(p);
      return church ? [church] : [];
    });
    return { churches };
  });

const addInput = z.object({ placeId: z.string().min(5).max(200) });

/** Adds a church found on the map to the directory. Idempotent by place. */
export const addFoundChurch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addInput.parse(data))
  .handler(async ({ data }): Promise<{ slug: string } | { error: string }> => {
    const headers = credentials();
    if (!headers) return { error: "Map lookup is not configured yet." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const existing = await supabaseAdmin
      .from("organizations")
      .select("slug")
      .eq("google_place_id", data.placeId)
      .maybeSingle();
    if (existing.data?.slug) return { slug: existing.data.slug };

    const response = await fetch(`${GATEWAY_URL}/places/v1/places/${data.placeId}`, {
      headers: {
        ...headers,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,addressComponents,websiteUri,nationalPhoneNumber",
      },
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`Place details failed [${response.status}]: ${body}`);
      return { error: "That church could not be looked up right now." };
    }

    const church = toChurch((await response.json()) as PlaceRow);
    if (!church) return { error: "That church could not be looked up right now." };

    const { slugify } = await import("@/lib/community");
    const base = slugify(`${church.name} ${church.city}`) || slugify(church.name);
    let slug = base;
    for (let attempt = 2; attempt < 12; attempt += 1) {
      const taken = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!taken.data) break;
      slug = `${base}-${attempt}`;
    }

    const { error } = await supabaseAdmin.from("organizations").insert({
      slug,
      name: church.name,
      kind: "church",
      city: church.city,
      region: church.region,
      address: church.address,
      website: church.website,
      contact_phone: church.phone,
      description:
        "Listed from public map records. Not yet claimed — a leader from this church can claim the page and add service times.",
      verified: false,
      google_place_id: church.placeId,
    });
    if (error) {
      console.error(`Adding church failed: ${error.message}`);
      return { error: "That church could not be added." };
    }
    return { slug };
  });

/* ---------- Nonprofits & foundations, from public map records ---------- */

/** Nonprofits and foundations anywhere in the country. Signed-in only. */
export const searchNonprofits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => searchInput.parse(data))
  .handler(async ({ data }): Promise<{ orgs: FoundChurch[]; error?: string }> => {
    const headers = credentials();
    if (!headers) return { orgs: [], error: "Map lookup is not configured yet." };

    const response = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        ...headers,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.websiteUri,places.nationalPhoneNumber",
      },
      body: JSON.stringify({
        textQuery: `nonprofit charity foundation ${data.query}`,
        pageSize: 15,
        regionCode: "US",
        languageCode: "en",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Nonprofit search failed [${response.status}]: ${body}`);
      return { orgs: [], error: "Nonprofit lookup is unavailable right now." };
    }

    const json = (await response.json()) as { places?: PlaceRow[] };
    const orgs = (json.places ?? []).flatMap(p => {
      const org = toChurch(p);
      return org ? [org] : [];
    });
    return { orgs };
  });

const addNonprofitInput = z.object({
  placeId: z.string().min(5).max(200),
  lane: z.string().max(40).optional(),
});

/**
 * Adds a nonprofit found on the map to the directory, in one giving channel.
 * Idempotent by place: the same nonprofit is never listed twice.
 */
export const addFoundNonprofit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addNonprofitInput.parse(data))
  .handler(async ({ data, context }): Promise<{ orgId: string; slug: string } | { error: string }> => {
    const headers = credentials();
    if (!headers) return { error: "Map lookup is not configured yet." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const existing = await supabaseAdmin
      .from("organizations")
      .select("id, slug")
      .eq("google_place_id", data.placeId)
      .maybeSingle();

    let orgId = existing.data?.id ?? null;
    let slug = existing.data?.slug ?? null;

    if (!orgId) {
      const response = await fetch(`${GATEWAY_URL}/places/v1/places/${data.placeId}`, {
        headers: {
          ...headers,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,addressComponents,websiteUri,nationalPhoneNumber",
        },
      });
      if (!response.ok) {
        const body = await response.text();
        console.error(`Place details failed [${response.status}]: ${body}`);
        return { error: "That organization could not be looked up right now." };
      }

      const org = toChurch((await response.json()) as PlaceRow);
      if (!org) return { error: "That organization could not be looked up right now." };

      const { slugify } = await import("@/lib/community");
      const base = slugify(`${org.name} ${org.city}`) || slugify(org.name);
      slug = base;
      for (let attempt = 2; attempt < 12; attempt += 1) {
        const taken = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!taken.data) break;
        slug = `${base}-${attempt}`;
      }

      const inserted = await supabaseAdmin
        .from("organizations")
        .insert({
          slug,
          name: org.name,
          kind: "nonprofit",
          city: org.city,
          region: org.region,
          address: org.address,
          website: org.website,
          contact_phone: org.phone,
          description:
            "Listed from public map records. Not yet claimed — someone from this organization can claim the page. Gifts open once it is claimed and vetted.",
          verified: false,
          google_place_id: org.placeId,
        })
        .select("id, slug")
        .single();
      if (inserted.error || !inserted.data) {
        console.error(`Adding nonprofit failed: ${inserted.error?.message}`);
        return { error: "That organization could not be added." };
      }
      orgId = inserted.data.id;
      slug = inserted.data.slug;
    }

    if (data.lane) {
      const tagged = await supabaseAdmin
        .from("nonprofit_lane_tags")
        .upsert({ org_id: orgId, lane: data.lane, added_by: context.userId }, { onConflict: "org_id,lane" });
      if (tagged.error) console.error(`Tagging nonprofit failed: ${tagged.error.message}`);
    }

    return { orgId, slug: slug! };
  });
