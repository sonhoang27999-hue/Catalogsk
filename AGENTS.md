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
