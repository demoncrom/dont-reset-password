import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_VOTES_PER_HOUR = 30;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rule_id, vote, fingerprint } = await req.json();

    if (!rule_id || typeof rule_id !== "string") {
      return error(400, "rule_id is required");
    }
    if (!vote || !["up", "down"].includes(vote)) {
      return error(400, "vote must be 'up' or 'down'");
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
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("voter_fingerprint", fingerprint)
      .gte("created_at", oneHourAgo);

    if ((recentCount ?? 0) >= MAX_VOTES_PER_HOUR) {
      return error(429, "Rate limit exceeded");
    }

    // Upsert vote (one vote per user per rule)
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id, vote_type")
      .eq("rule_id", rule_id)
      .eq("voter_fingerprint", fingerprint)
      .single();

    const oldVoteType = existingVote?.vote_type;

    if (existingVote) {
      // Update existing vote
      await supabase
        .from("votes")
        .update({ vote_type: vote, created_at: new Date().toISOString() })
        .eq("id", existingVote.id);
    } else {
      // Insert new vote
      await supabase
        .from("votes")
        .insert({ rule_id, voter_fingerprint: fingerprint, vote_type: vote });
    }

    // Update vote counts on the rule
    // Calculate the delta
    let upDelta = 0;
    let downDelta = 0;

    if (oldVoteType === "up" && vote === "down") {
      upDelta = -1;
      downDelta = 1;
    } else if (oldVoteType === "down" && vote === "up") {
      upDelta = 1;
      downDelta = -1;
    } else if (!oldVoteType && vote === "up") {
      upDelta = 1;
    } else if (!oldVoteType && vote === "down") {
      downDelta = 1;
    }
    // If same vote type, no change

    if (upDelta !== 0 || downDelta !== 0) {
      const { data: rule } = await supabase
        .from("password_rules")
        .select("upvotes, downvotes")
        .eq("id", rule_id)
        .single();

      if (rule) {
        const newUpvotes = Math.max(0, (rule.upvotes || 0) + upDelta);
        const newDownvotes = Math.max(0, (rule.downvotes || 0) + downDelta);
        const isHidden = newUpvotes - newDownvotes < -5;

        await supabase
          .from("password_rules")
          .update({ upvotes: newUpvotes, downvotes: newDownvotes, is_hidden: isHidden })
          .eq("id", rule_id);
      }
    }

    // Return updated counts
    const { data: updatedRule } = await supabase
      .from("password_rules")
      .select("upvotes, downvotes")
      .eq("id", rule_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        upvotes: updatedRule?.upvotes || 0,
        downvotes: updatedRule?.downvotes || 0,
      }),
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
