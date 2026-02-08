import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { CSSProperties } from "react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant: "blue" | "yellow" | "green" | "purple";
  className?: string;
  style?: CSSProperties;
}

export function StatCard({ title, value, icon: Icon, variant, className, style }: StatCardProps) {
  return (
    <div
      className={cn(
        "stat-card text-white",
        variant === "blue" && "stat-card-blue",
        variant === "yellow" && "stat-card-yellow text-black",
        variant === "green" && "stat-card-green",
        variant === "purple" && "stat-card-purple",
        className
      )}
      style={style}
    >
      <Icon className="absolute right-4 top-4 h-8 w-8 opacity-30" />
      <div className="relative z-10">
        <p className="text-4xl font-bold font-display mb-1">{value}</p>
        <p className="text-sm font-medium opacity-90">{title}</p>
      </div>
    </div>
  );
}
