# Product types migration (jasa / kursus / keanggotaan)

Apply this SQL on the **production** Supabase project (`vovqicbfzjgxeizmkxuf`) before relying on jasa/kursus/membership features:

```bash
# Via Supabase SQL editor, or:
psql "$DATABASE_URL" -f migrations/add_product_types_jasa_kursus_keanggotaan.sql
```

File: `migrations/add_product_types_jasa_kursus_keanggotaan.sql`

Mobile product list/detail APIs already fall back when `product_type` is missing, but packages, enrollments, and subscriptions require the new tables.
