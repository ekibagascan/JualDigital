-- Content moderation for App Store Guideline 1.2 and 3.2.2(vii).
-- Paste into the Supabase SQL editor. Safe to re-run. Does not unpublish existing rows.
-- A separate read-only review query lives in sql/list_social_manipulation_products.sql.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('product', 'review', 'post', 'user')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  source text NOT NULL DEFAULT 'report' CHECK (source IN ('report', 'block')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'actioned', 'dismissed')),
  admin_note text,
  action_taken text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_status_created_idx ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_target_idx ON public.reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports (reporter_id);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_user_id),
  CONSTRAINT user_blocks_pair_unique UNIQUE (blocker_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks (blocked_user_id);

CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT terms_acceptances_user_version_unique UNIQUE (user_id, version)
);

CREATE INDEX IF NOT EXISTS terms_acceptances_user_idx ON public.terms_acceptances (user_id);

DO $$
BEGIN
  IF to_regclass('public.membership_posts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'membership_posts'
         AND column_name = 'removed_at'
     ) THEN
    ALTER TABLE public.membership_posts ADD COLUMN removed_at timestamptz;
  END IF;
END $$;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_insert_own ON public.reports;
CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS reports_select_own_or_admin ON public.reports;
CREATE POLICY reports_select_own_or_admin ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS user_blocks_select_own_or_admin ON public.user_blocks;
CREATE POLICY user_blocks_select_own_or_admin ON public.user_blocks
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS user_blocks_insert_own ON public.user_blocks;
CREATE POLICY user_blocks_insert_own ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid() AND blocker_id <> blocked_user_id);

DROP POLICY IF EXISTS user_blocks_delete_own ON public.user_blocks;
CREATE POLICY user_blocks_delete_own ON public.user_blocks
  FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS terms_acceptances_insert_own ON public.terms_acceptances;
CREATE POLICY terms_acceptances_insert_own ON public.terms_acceptances
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS terms_acceptances_select_own_or_admin ON public.terms_acceptances;
CREATE POLICY terms_acceptances_select_own_or_admin ON public.terms_acceptances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT SELECT, INSERT ON public.terms_acceptances TO authenticated;

-- Reject new objectionable or social-boost content. Service role still fires triggers,
-- so unpublish/takedown updates are explicitly allowed.
CREATE OR REPLACE FUNCTION public.enforce_content_policy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  blob text := '';
  tags jsonb;
  social_pattern constant text := $policy$\mfollowers?\M|\msubscribers?\M|\msmm\M|\msmm[[:space:]-]*panel\M|\mpanel[[:space:]-]*smm\M|\mboost\M[[:space:]]+\makun\M|\mboost\M[[:space:]]+\maccounts?\M|\makun\M[[:space:]]+\mboost\M|\maccount\M[[:space:]]+\mboost(ing)?\M|\msuntik[[:space:]-]*(followers?|likes?|views?|subscribers?|subs?|follows?)\M|\msuntik(followers?|likes?|views?|subscribers?|subs?)\M|\m(buy|sell|jual|beli|tambah(in)?|naik(kan|in)?|boost|increase|gain|add)\M[[:space:]]+\m(followers?|likes?|views?|subscribers?)\M|\m(followers?|likes?|views?|subscribers?)\M[[:space:]]+\m(instagram|ig|tiktok|youtube|yt|facebook|fb|twitter|telegram)\M|\m(instagram|ig|tiktok|youtube|yt|facebook|fb|twitter|telegram)\M[[:space:]]+\m(followers?|likes?|views?|subscribers?)\M|\mjasa\M[[:space:]]+\m(followers?|likes?|views?|subscribers?|smm)\M|\mjasa\M[[:space:]]+\m(naik(kan|in)?|tambah(in)?)\M[[:space:]]+\m(followers?|likes?|views?|subscribers?|follows?|likes?|views?|subs?)\M|\mauto[[:space:]-]*(likes?|follows?|followers?|views?|subscribers?)\M|\mfake\M[[:space:]]+\m(followers?|likes?|views?|subscribers?|engagement)\M|\mreal\M[[:space:]]+\m(followers?|likes?)\M|\mlikers?\M|\m[0-9]{2,}\M[[:space:].-]*k?[[:space:]]*(followers?|likes?|views?|subscribers?)\M|\m[0-9]+\M[[:space:]]*k[[:space:]]*(followers?|likes?|views?|subscribers?)\M|\m[0-9]{1,3}([.[:space:]][0-9]{3})+[[:space:]]*(followers?|likes?|views?|subscribers?)\M$policy$;
  profanity_pattern constant text := $policy$\m(fuck|fucking|motherfucker|shit|bitch|asshole|bastard|cunt|dick|cock|pussy|slut|whore|nigger|nigga|faggot|fag|retard|porn|porno|pornography|pornografi|hentai|bokep|xxx|anjing|anjeng|bangsat|bajingan|kontol|memek|meki|pepek|ngentot|ngentod|brengsek|keparat|jancok|jancuk|asu|pukimak|kimak|kampret|goblok|tolol|bego|lonte|pelacur|pecun|tai)\M$policy$;
  row_json jsonb := to_jsonb(NEW);
  row_status text := coalesce(row_json->>'status', '');
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'products' AND row_status IN ('draft', 'inactive') THEN
      RETURN NEW;
    END IF;
    IF TG_TABLE_NAME = 'reviews' AND row_status IN ('removed', 'hidden', 'inactive') THEN
      RETURN NEW;
    END IF;
    IF TG_TABLE_NAME = 'membership_posts' AND (
      row_json->>'removed_at' IS NOT NULL OR row_json->>'published_at' IS NULL
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  blob := concat_ws(
    ' ',
    row_json->>'title',
    row_json->>'description',
    row_json->>'long_description',
    row_json->>'category',
    row_json->>'content',
    row_json->>'comment',
    row_json->>'body'
  );

  tags := row_json->'tags';
  IF jsonb_typeof(tags) = 'array' THEN
    SELECT blob || ' ' || coalesce(string_agg(value, ' '), '')
      INTO blob
      FROM jsonb_array_elements_text(tags) AS t(value);
  ELSIF jsonb_typeof(tags) = 'string' THEN
    blob := blob || ' ' || coalesce(tags #>> '{}', '');
  END IF;

  IF blob ~* profanity_pattern THEN
    RAISE EXCEPTION 'objectionable_content'
      USING ERRCODE = '23514',
            HINT = 'Remove profanity or objectionable content.';
  END IF;

  IF TG_TABLE_NAME = 'products' AND blob ~* social_pattern THEN
    RAISE EXCEPTION 'social_manipulation_prohibited'
      USING ERRCODE = '23514',
            HINT = 'Followers, likes, views, subscribers, SMM panels, and account boosting are not allowed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_content_policy ON public.products;
CREATE TRIGGER enforce_content_policy
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_content_policy();

DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS enforce_content_policy ON public.reviews;
    CREATE TRIGGER enforce_content_policy
      BEFORE INSERT OR UPDATE ON public.reviews
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_content_policy();
  END IF;

  IF to_regclass('public.membership_posts') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS enforce_content_policy ON public.membership_posts;
    CREATE TRIGGER enforce_content_policy
      BEFORE INSERT OR UPDATE ON public.membership_posts
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_content_policy();
  END IF;
END $$;
