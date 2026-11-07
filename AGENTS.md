<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Public catalog visual effects are scoped under `.sk-catalog`; administration dialogs render outside that scope to preserve their UI.
- HomeSearch owns only public suggestion/keyboard/recent-search presentation; index retains database query timing, so interaction changes cannot alter catalog search reads.
- Public loading sweeps sit behind media and derive visibility from existing data-loaded attributes; SmartImage loading and clarity behavior stays untouched.
- ExpandableText measures actual overflow after hydration and resize, reserves the SSR control row only for likely-long descriptions until measurement, and animates only transform/opacity rather than layout height to protect low-end phones.
- Public scroll direction is governed by pure publicScroll rules and useHideOnScroll with passive/rAF scheduling and protected focus/menu/search states; headers retain sticky layout while moving by transform only.
- Only the header instance writes the catalog's data-header-hidden attribute; secondary sticky bars transform with it, while consultation instances cannot overwrite header state.
- VehiclePicker consumes loaded brands and fetches only the selected category; pure picker helpers govern tree steps without extra storage or preloading.
- NodeLevel's guest product jump nav observes all product wrappers with one IntersectionObserver; active-chip visibility scrolls only its own nav, not the page.
- NodeLevel filters are keyed per category/node and use a pure public-field projection; draft confirmation alone changes the visible list, while admin and dealer-price queries retain the full list.
- Slider renders one thumb per controlled/default value with optional labels; single-value callers stay unchanged, enabling accessible public price ranges without another library.
- Public lightbox gestures operate on a wrapper without changing SmartImage; native multi-touch stays unblocked, single-touch downward dismissal only starts at scroll top, and imperative rAF transforms reset on unmount.
- ConsultationBar reports its actual height to the public shell; BackToTop writes progress directly without per-scroll React state and sits left/above fixed admin actions to avoid contact and install controls.
- Public product previews share ProductMedia and ProductPlaceholder; keep SmartImage fallbacks opt-in so admin previews and data resolution remain unchanged.
- ProductMedia uses SmartImage's data-loaded state for loading-only height reservation; mobile full-bleed rules target product wrappers rather than entire lists to preserve neighboring controls and videos.
- Use existing CONTACT values for the public consultation bar; contact configuration remains the single source of truth.
- PublicCatalogShell owns one IntersectionObserver for scroll reveals and honors reduced motion, avoiding per-card observers and animation dependencies.
- Theme CSS is produced only by `buildThemeCss` in src/lib/themeEngine.ts, used by both ThemeApplier (SSR) and the admin live preview, so saved and previewed themes never diverge.
- Theme preview merges raw saved settings with the draft and saves only allowlisted draft edits; full versioned imports replace all theme keys to prevent stale settings and unintended palette writes.
- Admin-toggleable light effects are driven by `--sk-fx-*` CSS variables plus generated "off" rules; animations stay transform/opacity or idle-heavy keyframes for mobile 60fps.

- Catalog selection and account preferences are shared through WorkflowProvider; preferences use owner-scoped RLS to keep favorites private across devices.
- Customer share reads use read_catalog_share with an explicit public-field projection and no dealer-price joins; shared cards never load dealer prices even for staff.
- Catalog history is captured by append-only database triggers for every catalog write path; restoration only reverses updates after a locked equality check against the saved after-state, to avoid overwriting newer edits or cascading deletions.
- Product warnings are confirmable at add/edit and Excel review boundaries; they never change entered prices or silently block valid exceptions.
- Catalog installation is manifest-only with an account-gated HomeScreenInvite using WorkflowProvider identity; native browser prompts and platform instructions replace APK downloads without new auth subscriptions or offline caches.
- Immersive media (360°/3D/photos/video/compare) lives in immersive_scenes keyed by series/node with optional product; drafts stay in the private immersive-drafts bucket and publishing copies files to immersive-media (read via signed URLs, since public buckets are blocked), so drafts never leak and published files are immutable copies.
- Immersive viewers (Marzipano, three.js) and the admin manager are lazy chunks loaded only after viewport proximity plus explicit user activation; scenes without media are hidden from guests, and LED recolouring, zones, effects and saved presets are offered only for GLB materials the admin configured; 360° LED colour chips switch between real tagged photos, never simulated ones.
- GLB loading attaches self-hosted Draco decoders (/public/draco, copied from three) and three's MeshoptDecoder inside the lazy ModelViewer chunk; KTX2 is not supported yet. Why: no third-party CDN at runtime.
- Unit tests run with `bun run test` (bun test over src, `bun:test` imports); vitest is not used for these files.
- Panorama viewer keeps only the current and one previous Marzipano scene (planSceneRetention) to bound GPU/RAM on mobile.
- Vercel/`VITE_IMMERSIVE_DEMO=off` builds delete `demo/` from build output via a Vite closeBundle plugin, so demo assets never ship to production.
- Route files must not share non-exported helpers between loader and component; put shared queryOptions in src/data/* (TanStack route splitting breaks otherwise).
