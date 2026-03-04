import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_CONTRIBUTIONS_PER_HOUR = 10;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, rules, fingerprint } = await req.json();

    // Validate inputs
    if (!domain || typeof domain !== "string") {
      return error(400, "domain is required");
    }
    if (!rules || typeof rules !== "object") {
      return error(400, "rules is required");
    }
    if (!fingerprint || typeof fingerprint !== "string" || fingerprint.length < 16) {
      return error(400, "valid fingerprint is required");
    }

    // Validate rule values
    if (rules.min_length != null && (rules.min_length < 1 || rules.min_length > 200)) {
      return error(400, "min_length must be between 1 and 200");
    }
    if (rules.max_length != null && (rules.max_length < 1 || rules.max_length > 1000)) {
      return error(400, "max_length must be between 1 and 1000");
    }
    if (rules.min_length != null && rules.max_length != null && rules.min_length > rules.max_length) {
      return error(400, "min_length cannot exceed max_length");
    }
    if (rules.notes && rules.notes.length > 500) {
      return error(400, "notes must be 500 characters or fewer");
    }

    const normalizedDomain = domain.toLowerCase().trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit check
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: recentCount } = await supabase
      .from("rule_contributions")
      .select("*", { count: "exact", head: true })
      .eq("contributor_fingerprint", fingerprint)
      .gte("created_at", oneHourAgo);

    if ((recentCount ?? 0) >= MAX_CONTRIBUTIONS_PER_HOUR) {
      return error(429, "Rate limit exceeded. Please try again later.");
    }

    // Find or create domain
    let { data: domainRow } = await supabase
      .from("domains")
      .select("id")
      .eq("domain", normalizedDomain)
      .single();

    if (!domainRow) {
      const { data: newDomain, error: insertErr } = await supabase
        .from("domains")
        .insert({ domain: normalizedDomain })
        .select("id")
        .single();

      if (insertErr) {
        // Might be a race condition — try to read again
        const { data: retry } = await supabase
          .from("domains")
          .select("id")
          .eq("domain", normalizedDomain)
          .single();
        domainRow = retry;
      } else {
        domainRow = newDomain;
      }
    }

    if (!domainRow) {
      return error(500, "Failed to create domain record");
    }

    // Insert contribution
    await supabase.from("rule_contributions").insert({
      domain_id: domainRow.id,
      contributor_fingerprint: fingerprint,
      min_length: rules.min_length ?? null,
      max_length: rules.max_length ?? null,
      require_uppercase: rules.require_uppercase ?? null,
      require_lowercase: rules.require_lowercase ?? null,
      require_number: rules.require_number ?? null,
      require_special: rules.require_special ?? null,
      allowed_special_chars: rules.allowed_special_chars ?? null,
      disallowed_chars: rules.disallowed_chars ?? null,
      no_spaces: rules.no_spaces ?? null,
      notes: rules.notes ?? null,
    });

    // Check if canonical rules exist
    const { data: existingRule } = await supabase
      .from("password_rules")
      .select("id, contributor_count")
      .eq("domain_id", domainRow.id)
      .single();

    if (!existingRule) {
      // First contribution — create canonical rules
      const { data: newRule } = await supabase
        .from("password_rules")
        .insert({
          domain_id: domainRow.id,
          min_length: rules.min_length ?? null,
          max_length: rules.max_length ?? null,
          require_uppercase: rules.require_uppercase ?? null,
          require_lowercase: rules.require_lowercase ?? null,
          require_number: rules.require_number ?? null,
          require_special: rules.require_special ?? null,
          allowed_special_chars: rules.allowed_special_chars ?? null,
          disallowed_chars: rules.disallowed_chars ?? null,
          no_spaces: rules.no_spaces ?? null,
          notes: rules.notes ?? null,
          confidence_score: 0.5,
          contributor_count: 1,
        })
        .select("id")
        .single();

      return ok({ rule_id: newRule?.id, message: "Rule created" });
    }

    // Existing rules — run consensus algorithm
    await runConsensus(supabase, domainRow.id, existingRule.id);

    return ok({ rule_id: existingRule.id, message: "Contribution recorded" });
  } catch (err) {
    return error(500, err.message);
  }
});

/**
 * Consensus algorithm: update canonical rules based on all contributions.
 */
async function runConsensus(
  supabase: ReturnType<typeof createClient>,
  domainId: string,
  ruleId: string
) {
  const { data: contributions } = await supabase
    .from("rule_contributions")
    .select("*")
    .eq("domain_id", domainId);

  if (!contributions || contributions.length === 0) return;

  const total = contributions.length;

  // For each field, find the most common non-null value
  const fields = [
    "min_length", "max_length",
    "require_uppercase", "require_lowercase",
    "require_number", "require_special",
    "no_spaces",
  ] as const;

  const updates: Record<string, unknown> = {
    contributor_count: total,
    last_verified_at: new Date().toISOString(),
  };

  let agreementSum = 0;
  let fieldCount = 0;

  for (const field of fields) {
    const values = contributions
      .map((c) => c[field])
      .filter((v) => v != null);

    if (values.length === 0) continue;

    // Count occurrences
    const counts = new Map<unknown, number>();
    for (const v of values) {
      counts.set(v, (counts.get(v) || 0) + 1);
    }

    // Find the most common value
    let maxCount = 0;
    let bestValue: unknown = null;
    for (const [value, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        bestValue = value;
      }
    }

    updates[field] = bestValue;
    agreementSum += maxCount / values.length;
    fieldCount++;
  }

  // Handle string fields separately (take the most recent non-null)
  const stringFields = ["allowed_special_chars", "disallowed_chars", "notes"] as const;
  for (const field of stringFields) {
    const latest = contributions
      .filter((c) => c[field] != null && c[field] !== "")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (latest.length > 0) {
      updates[field] = latest[0][field];
    }
  }

  // Calculate confidence score (average agreement ratio)
  updates.confidence_score = fieldCount > 0 ? agreementSum / fieldCount : 0.5;

  await supabase.from("password_rules").update(updates).eq("id", ruleId);
}

function ok(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function error(status: number, message: string) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
