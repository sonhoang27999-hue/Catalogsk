# Public catalog luxury upgrade
- [x] Gói 3: public-only NodeLevel filter facets, draft drawer/live counts and filtered jump navigation.
- [x] Gói 3: pure-rule tests and 390px isolated verification; preserve catalog/admin/prices.
- Gói 3 verification: public read found zero nodes with ≥6 products, so real qualifying-node flow remains unavailable; no catalog data was written. Eight-product isolated NodeLevel fixture verified draft cancel/reopen, immediate counts, range dragging, individual-chip removal/reset, 3-result nav hiding/5-result nav rebuild, zero-result disabled button, changed-price empty state, node reset, apply scroll to 112px and reduced-motion 0s transitions. No runtime errors or dealer-price requests. 64 tests pass; automatic TypeScript/build clean. Physical iPhone/old Android remains unverified.
- [x] Gói 2: fix FAB fallback and transform-sync secondary sticky bars.
- [x] Gói 2: selected-brand vehicle drawer, non-staff product jump chips and public lightbox gestures.
- [x] Gói 2: pure-rule tests, automatic diagnostics and 390px checks with available data plus isolated fixtures.
- [ ] Gói 2 real nested-tree/node ≥5 product verification: blocked by shared catalog having no nested tree content or qualifying product node; no data was added for testing.
- Verified real classic Lexus selection and tree Tesssss destination, drawer Escape/focus reset, Toyota secondary bar at 0px hidden/56px visible, reduced motion; seven-card isolated fixture confirms active chip/internal scrolling, 2.5× touch zoom, swipe dismissal and reopen reset. 53 tests pass; automatic TypeScript/build clean. Physical iPhone/old Android, native pinch and real long-photo scrolling remain unverified. No publishing, database or admin/price changes.
- [x] Fix persistent home grid, touch search selection, short-description spacing and themed fade.
- [x] Add public progress back-to-top, protected auto-hide headers and compact consultation bar.
- [x] Verify scroll rules, full unit suite and mobile home/brand/product flows.
- Follow-up verified at 390px on home, Lexus brand and its seven-product list: touch selection after null-target blur, Tab/Escape, focus/menu protection, scroll direction, contact compaction, progress and return-to-top; reduced motion stays full/visible. Fade and short spacing verified in isolated fixtures; 46 tests pass, automatic TypeScript/build clean. Physical iPhone/old Android and signed-in floating-control placement remain unverified; unchanged FAB/install positions were inspected and reserved.
- [x] Upgrade home search suggestions, highlighting, keyboard controls and empty state without changing database search.
- [x] Add loading-only placeholder shimmer without changing SmartImage behavior.
- [x] Add shared measured expandable product descriptions and verify tests, diagnostics and mobile public flows.
- Verified real Lexus search/navigation, mobile and desktop panels, recent searches and Zalo; 41 unit tests pass. Expand/collapse verified in an isolated browser fixture because visited live products had no descriptions; physical old Android remains unverified.
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