const u = process.env.SUPABASE_URL;
const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!u || !k) {
  console.error("missing env");
  process.exit(1);
}

async function once(i) {
  try {
    const res = await fetch(`${u}/rest/v1/categories?select=id&limit=1`, {
      headers: { apikey: k, Authorization: `Bearer ${k}` },
    });
    console.log("try", i, res.status);
  } catch (e) {
    console.log("try", i, "err", e?.name, e?.message);
  }
}

for (let i = 0; i < 8; i++) {
  // eslint-disable-next-line no-await-in-loop
  await once(i);
  // eslint-disable-next-line no-await-in-loop
  await new Promise((r) => setTimeout(r, 400));
}

