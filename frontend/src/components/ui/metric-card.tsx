export function MetricCard({
  title,
  value,
  testId,
}: {
  title: string;
  value: string | number;
  testId?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 shadow-inner">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p data-testid={testId} className="mt-2 text-3xl font-semibold text-slate-900">
        {value}
      </p>
    </article>
  );
}
