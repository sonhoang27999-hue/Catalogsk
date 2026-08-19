import { Car, Package, Speaker, Sparkles, type LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  car: Car,
  package: Package,
  speaker: Speaker,
  sparkles: Sparkles,
};

/** Icon dạng khối đặc (solid): tô nền bằng currentColor cho cảm giác chắc, chuyên nghiệp. */
export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Car;
  return (
    <Icon
      className={className}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinejoin="round"
    />
  );
}
