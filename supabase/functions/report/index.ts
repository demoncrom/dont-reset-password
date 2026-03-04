import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_REPORTS_PER_HOUR = 5;
const AUTO_HIDE_THRESHOLD = 3;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rule_id, reason, fingerprint, details } = await req.json();

    if (!rule_id || typeof rule_id !== "string") {
      return error(400, "rule_id is required");
    }
    if (!reason || !["incorrect", "spam", "outdated"].includes(reason)) {
      return error(400, "reason must be 'incorrect', 'spam', or 'outdated'");
    }
    if (!fingerprint || typeof fingerprint !== "string" || fingerprint.length < 16) {
      return error(400, "valid fingerprint is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit check
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: recentCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("reporter_fingerprint", fingerprint)
      .gte("created_at", oneHourAgo);

    if ((recentCount ?? 0) >= MAX_REPORTS_PER_HOUR) {
      return error(429, "Rate limit exceeded");
    }

    // Insert report
    await supabase.from("reports").insert({
      rule_id,
      reporter_fingerprint: fingerprint,
      reason,
      details: details || null,
    });

    // Check if report count exceeds threshold — auto-hide
    const { count: totalReports } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("rule_id", rule_id);

    if ((totalReports ?? 0) >= AUTO_HIDE_THRESHOLD) {
      await supabase
        .from("password_rules")
        .update({ is_hidden: true })
        .eq("id", rule_id);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Report submitted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return error(500, err.message);
  }
});

function error(status: number, message: string) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
