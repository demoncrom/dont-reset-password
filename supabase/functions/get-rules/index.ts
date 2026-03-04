import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain || typeof domain !== "string") {
      return new Response(
        JSON.stringify({ found: false, error: "domain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedDomain = domain.toLowerCase().trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Query domain + rules
    const { data: domainRow } = await supabase
      .from("domains")
      .select("id, display_name")
      .eq("domain", normalizedDomain)
      .single();

    if (!domainRow) {
      return new Response(
        JSON.stringify({ found: false, rules: null, meta: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: ruleRow } = await supabase
      .from("password_rules")
      .select("*")
      .eq("domain_id", domainRow.id)
      .eq("is_hidden", false)
      .single();

    if (!ruleRow) {
      return new Response(
        JSON.stringify({ found: false, rules: null, meta: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Separate rules from metadata
    const rules = {
      min_length: ruleRow.min_length,
      max_length: ruleRow.max_length,
      require_uppercase: ruleRow.require_uppercase,
      require_lowercase: ruleRow.require_lowercase,
      require_number: ruleRow.require_number,
      require_special: ruleRow.require_special,
      allowed_special_chars: ruleRow.allowed_special_chars,
      disallowed_chars: ruleRow.disallowed_chars,
      no_spaces: ruleRow.no_spaces,
      notes: ruleRow.notes,
    };

    const meta = {
      rule_id: ruleRow.id,
      confidence_score: ruleRow.confidence_score,
      contributor_count: ruleRow.contributor_count,
      upvotes: ruleRow.upvotes,
      downvotes: ruleRow.downvotes,
      last_verified_at: ruleRow.last_verified_at,
      display_name: domainRow.display_name,
    };

    return new Response(
      JSON.stringify({ found: true, rules, meta }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ found: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
