---
name: CLUBSA feature storage
description: Storage boundary for CLUBSA invitations, squads, profiles, referrals, and wallet features
---

Clerk is the account identity provider. A new Clerk account must create a CLUBSA profile before using profile-dependent features; existing browser-local passwords and accounts cannot be transferred automatically. Friend search, requests, friend lists, and private messages use the authenticated API and PostgreSQL. Other legacy flows—including invitations, squads, referral credits, wallet display, and player builds—still use browser-local storage and have not been migrated.

**Why:** The user chose a unified Clerk sign-in, and friends/private messaging need shared cross-session storage. Migrating unrelated legacy flows together avoids presenting local-only state as globally synchronized.

**How to apply:** Use Clerk same-site session cookies for authenticated API calls, not bearer tokens. Do not claim old browser accounts can be imported. Keep remaining local features clearly separate; when migrating them, move each complete flow (reads, writes, auth/profile loading, and UI) to the API together.