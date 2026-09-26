---
name: CLUBSA feature storage
description: Storage boundary for CLUBSA invitations, squads, profiles, referrals, and wallet features
---

The current CLUBSA screens use the existing browser-persistent store as their working source of truth for the core feature flows. The protected API and Drizzle schema are separate infrastructure until the app is explicitly migrated to API-backed reads and writes.

**Why:** The existing app was already structured around local persistence, while the database began empty. Keeping the feature UI on one consistent store avoided a split-brain experience during the core feature pass.

**How to apply:** When moving these features to server persistence, migrate the whole flow together—auth/profile loading, invitations, squad assignments, referral credits, and wallet display—rather than mixing local reads with server writes.