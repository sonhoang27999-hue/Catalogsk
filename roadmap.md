# Public catalog luxury upgrade
- [x] Add scoped visual tokens, lightweight ambient/reveal effects and reduced-motion support.
- [x] Upgrade public home, brand, series, node/product cards and image viewer with shared fallbacks.
- [x] Add fixed consultation navigation using existing store contact configuration.
- [x] Verify public flows, mobile/desktop layout, reduced motion and automatic TypeScript/build diagnostics.

# Full-width product photos
- [x] Remove permanent photo height limits and mobile product gutters; retain text padding and a single photo discount badge.
- [x] Verify real product photos and image zoom on mobile and desktop.

# Current error audit
- [x] Review theme editing and public catalog for reproducible defects.
- [x] Fix confirmed defects and run focused regression checks.
- [x] Verify signed-in editing, guest catalog and mobile layout.
- Live node-product search could not be exercised because no named node products were available; its relationship mapping is covered by a passing regression test.
- Theme save/reset persistence was not exercised to preserve the current shared theme.

# Dealer workflow improvements
- [x] Add private selection and public customer share links containing only selling prices.
- [x] Add confirmable duplicate, price and media warnings before product saves and Excel import.
- [x] Add admin/manager change history with guarded restoration of edits.
- [x] Add account favorites and remembered vehicle shortcuts.
- [x] Verify signed-in and guest flows, privacy rules and mobile layout.
- History begins at feature activation; restoration reverses updates only, not additions or cascading deletions.
- Browser checks passed for real sharing, favorite readback, recent vehicles, warning cancellation, restoration and stale-event rejection; 10 regression tests passed and latest automatic build is OK.

# Price panel cleanup
- [x] Remove the installation-cost line, its icon and its two props from the shared price panel; keep the single discount pill.
- [x] Verify the public series list on mobile; node and share pages use the same markup and were confirmed in source plus clean TypeScript/build.

# App installation
- [x] Replace the APK menu/page with a signed-in-only floating phone home-screen invitation; keep manifest/icons and retire the legacy app-shell worker.
- [x] Verify guest hiding, real signed-in Android/iOS instructions, dismissal/new visit, simulated native prompt and appinstalled events; 14 tests passed and automatic build is clean.
- Native installation on a physical phone remains unverified; the browser controls availability and the final installation confirmation.