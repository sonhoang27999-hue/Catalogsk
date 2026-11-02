/** Inline accuracy warning: mandatory dictionary terms the translation did not use. */
export function MissingTerms({ terms }: { terms?: { src: string; dst: string }[] | undefined }) {
  if (!terms?.length) return null;
  return (
    <p role="status" className="mt-1.5 rounded-md bg-warning px-2 py-1 text-[12px] leading-snug text-warning-foreground">
      Thuật ngữ chưa được dùng: {terms.map((t) => `${t.src} → ${t.dst}`).join(", ")}
    </p>
  );
}
