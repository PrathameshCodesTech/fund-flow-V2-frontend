import { motion } from "framer-motion";

interface BudgetHealthProps {
  score: number;
  delay?: number;
}

export function BudgetHealthScore({ score, delay = 0 }: BudgetHealthProps) {
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getColor = (s: number) => {
    if (s >= 80) return "hsl(var(--success))";
    if (s >= 60) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const getLabel = (s: number) => {
    if (s >= 80) return "Healthy";
    if (s >= 60) return "Moderate";
    return "At Risk";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className="widget-card flex flex-col items-center gap-4"
    >
      <span className="text-caption self-start">Budget Health Score</span>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="8"
          />
          <motion.circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={getColor(score)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, delay: delay + 0.3, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.6 }}
            className="text-financial"
          >
            {score}%
          </motion.span>
        </div>
      </div>
      <span
        className="status-pill"
        style={{ backgroundColor: `${getColor(score)}15`, color: getColor(score) }}
      >
        {getLabel(score)}
      </span>
    </motion.div>
  );
}
