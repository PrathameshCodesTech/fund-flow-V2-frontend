import { motion } from "framer-motion";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  delay?: number;
}

export function MetricCard({ title, value, change, changeType = "neutral", icon, delay = 0 }: MetricCardProps) {
  const changeColors = {
    positive: "metric-badge-success",
    negative: "metric-badge-destructive",
    neutral: "metric-badge bg-secondary text-muted-foreground",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className="widget-card flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-caption">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-financial">{value}</p>
        {change && (
          <span className={changeColors[changeType]}>
            {changeType === "positive" ? "↑" : changeType === "negative" ? "↓" : ""} {change}
          </span>
        )}
      </div>
    </motion.div>
  );
}
