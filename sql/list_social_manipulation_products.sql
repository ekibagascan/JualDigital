-- READ ONLY. One result set of products and categories that look like social-media
-- manipulation (followers, likes, views, subscribers, SMM panel, suntik/tambah/naikkan,
-- boost akun). Does not UPDATE or DELETE anything.
--
-- Run in the Supabase SQL editor. If a column in the SELECT list does not exist yet
-- (for example long_description), remove that column from concat_ws.

WITH pattern AS (
  SELECT $policy$\mfollowers?\M|\msubscribers?\M|\msmm\M|\msmm[[:space:]-]*panel\M|\mpanel[[:space:]-]*smm\M|\mboost\M[[:space:]]+\makun\M|\mboost\M[[:space:]]+\maccounts?\M|\makun\M[[:space:]]+\mboost\M|\maccount\M[[:space:]]+\mboost(ing)?\M|\msuntik[[:space:]-]*(followers?|likes?|views?|subscribers?|subs?|follows?)\M|\msuntik(followers?|likes?|views?|subscribers?|subs?)\M|\m(buy|sell|jual|beli|tambah(in)?|naik(kan|in)?|boost|increase|gain|add)\M[[:space:]]+\m(followers?|likes?|views?|subscribers?)\M|\m(followers?|likes?|views?|subscribers?)\M[[:space:]]+\m(instagram|ig|tiktok|youtube|yt|facebook|fb|twitter|telegram)\M|\m(instagram|ig|tiktok|youtube|yt|facebook|fb|twitter|telegram)\M[[:space:]]+\m(followers?|likes?|views?|subscribers?)\M|\mjasa\M[[:space:]]+\m(followers?|likes?|views?|subscribers?|smm)\M|\mjasa\M[[:space:]]+\m(naik(kan|in)?|tambah(in)?)\M[[:space:]]+\m(followers?|likes?|views?|subscribers?|follows?|likes?|views?|subs?)\M|\mauto[[:space:]-]*(likes?|follows?|followers?|views?|subscribers?)\M|\mfake\M[[:space:]]+\m(followers?|likes?|views?|subscribers?|engagement)\M|\mreal\M[[:space:]]+\m(followers?|likes?)\M|\mlikers?\M|\m[0-9]{2,}\M[[:space:].-]*k?[[:space:]]*(followers?|likes?|views?|subscribers?)\M|\m[0-9]+\M[[:space:]]*k[[:space:]]*(followers?|likes?|views?|subscribers?)\M|\m[0-9]{1,3}([.[:space:]][0-9]{3})+[[:space:]]*(followers?|likes?|views?|subscribers?)\M$policy$ AS re
),
flagged_products AS (
  SELECT
    'product'::text AS kind,
    p.id,
    p.title AS label,
    p.category AS detail,
    p.status,
    p.seller_id,
    p.created_at
  FROM public.products p
  CROSS JOIN pattern
  WHERE concat_ws(
      ' ',
      p.title,
      p.description,
      p.long_description,
      p.category,
      p.tags::text
    ) ~* pattern.re
),
flagged_categories AS (
  SELECT
    'category'::text AS kind,
    c.id,
    c.name AS label,
    c.slug AS detail,
    NULL::text AS status,
    NULL::uuid AS seller_id,
    c.created_at
  FROM public.categories c
  CROSS JOIN pattern
  WHERE concat_ws(
      ' ',
      c.name,
      replace(replace(coalesce(c.slug, ''), '-', ' '), '_', ' '),
      c.description
    ) ~* pattern.re
)
SELECT * FROM flagged_products
UNION ALL
SELECT * FROM flagged_categories
ORDER BY kind, created_at DESC NULLS LAST;
