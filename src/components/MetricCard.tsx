interface Props {
  label: string;
  value: string | number;
  sub?: string;
}

export default function MetricCard({ label, value, sub }: Props) {
  return (
    <div className="border rounded p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub !== undefined && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
