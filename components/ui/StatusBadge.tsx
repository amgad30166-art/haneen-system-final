import { ORDER_STATUSES, FINANCIAL_STATUSES } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  type?: "order" | "financial";
}

export default function StatusBadge({ status, type = "order" }: StatusBadgeProps) {
  const statuses = type === "order" ? ORDER_STATUSES : FINANCIAL_STATUSES;
  const found = statuses.find((s) => s.value === status);

  if (!found) return <span className="text-gray-500 text-sm">{status}</span>;

  const colorMap: Record<string, string> = {
    selected: "bg-blue-100 text-blue-800",
    contracted: "bg-indigo-100 text-indigo-800",
    medical_exam: "bg-yellow-100 text-yellow-800",
    mol_approval: "bg-orange-100 text-orange-800",
    needs_agency: "bg-purple-100 text-purple-800",
    agency_done: "bg-purple-100 text-purple-800",
    embassy_submitted: "bg-cyan-100 text-cyan-800",
    visa_issued: "bg-teal-100 text-teal-800",
    ticket_booked: "bg-green-100 text-green-800",
    arrived: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
    under_masaned_hold: "bg-yellow-100 text-yellow-800",
    funds_received: "bg-blue-100 text-blue-800",
    cancelled_before_arrival: "bg-red-100 text-red-800",
    under_guarantee: "bg-orange-100 text-orange-800",
    refunded_during_guarantee: "bg-red-100 text-red-800",
    settled: "bg-emerald-100 text-emerald-800",
  };

  return (
    <span className={`status-badge ${colorMap[status] || "bg-gray-100 text-gray-800"}`}>
      {found.label}
    </span>
  );
}
