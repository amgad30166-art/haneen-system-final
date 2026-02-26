interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "navy" | "green" | "red" | "orange" | "blue";
}

const colorMap = {
  navy: "bg-navy-50 text-navy-500 border-navy-200",
  green: "bg-emerald-50 text-emerald-600 border-emerald-200",
  red: "bg-red-50 text-red-600 border-red-200",
  orange: "bg-orange-50 text-orange-600 border-orange-200",
  blue: "bg-blue-50 text-blue-600 border-blue-200",
};

const iconBg = {
  navy: "bg-navy-100",
  green: "bg-emerald-100",
  red: "bg-red-100",
  orange: "bg-orange-100",
  blue: "bg-blue-100",
};

export default function StatCard({ title, value, subtitle, icon, color = "navy" }: StatCardProps) {
  return (
    <div className={`card border ${colorMap[color]} flex items-start gap-4`}>
      <div className={`w-12 h-12 rounded-xl ${iconBg[color]} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
