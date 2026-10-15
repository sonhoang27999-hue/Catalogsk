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
- Admin-toggleable light effects are driven by `--sk-fx-*` CSS variables plus generated "off" rules; animations stay transform/opacity or idle-heavy keyframes for mobile 60fps.
