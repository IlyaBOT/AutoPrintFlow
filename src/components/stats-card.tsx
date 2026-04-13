import { Card, CardContent } from "@/components/ui/card";

type StatsCardProps = {
  label: string;
  value: number | string;
  helper?: string;
};

export function StatsCard({ label, value, helper }: StatsCardProps) {
  return (
    <Card className="rounded-[28px]">
      <CardContent className="space-y-2 p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/75">{label}</div>
        <div className="text-3xl font-semibold text-slate-950">{value}</div>
        {helper ? <p className="text-sm text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}
