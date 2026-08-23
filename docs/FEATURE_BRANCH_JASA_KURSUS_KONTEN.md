# Feature branch deploy notes

Branch: `feature/jasa-kursus-konten`

1. Apply `migrations/add_product_types_jasa_kursus_keanggotaan.sql` on **staging** Supabase first (additive / backward compatible).
2. Point Vercel **Preview** env at staging Supabase keys — keep Production on `main` + prod DB.
3. Do not merge to `main` until preview QA passes (digital download still works; jasa/kursus/keanggotaan smoke-tested).
4. iOS TestFlight should target the preview API base URL until production merge.

PII dumps (`all-emails.txt`, `users.sql`, etc.) were removed from the working tree on this branch; rotate any leaked credentials and consider `git filter-repo` history purge on a separate security PR.
