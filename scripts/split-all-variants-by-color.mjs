import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function cleanColors(colors) {
  if (!Array.isArray(colors)) return [];
  return colors.map((c) => String(c || "").trim()).filter(Boolean);
}

async function main() {
  const sb = createClient(must("SUPABASE_URL"), must("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: variants, error } = await sb.from("product_variants").select("id,product_id,storage_gb,sim_type,colors,price,sku,in_stock");
  if (error) throw new Error(error.message);

  const toSplit = (variants || []).filter((v) => cleanColors(v.colors).length > 1);
  let created = 0;
  let deleted = 0;

  for (const v of toSplit) {
    const colors = cleanColors(v.colors);
    // Create one row per color
    const rows = colors.map((c) => ({
      id: crypto.randomUUID(),
      product_id: v.product_id,
      storage_gb: v.storage_gb,
      sim_type: v.sim_type,
      colors: [c],
      price: v.price,
      sku: null,
      in_stock: v.in_stock,
    }));

    const ins = await sb.from("product_variants").insert(rows);
    if (ins.error) throw new Error(ins.error.message);
    created += rows.length;

    const del = await sb.from("product_variants").delete().eq("id", v.id);
    if (del.error) throw new Error(del.error.message);
    deleted += 1;
  }

  console.log(`Split ${toSplit.length} grouped variants. Created ${created}, deleted ${deleted}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

