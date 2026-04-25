import Link from "next/link";

const checkpoints = [
  "Typed API client aligned with gateway routes",
  "Admin and citizen portal route skeletons",
  "Frontend tracker file for build and test progress",
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-8">
      <section className="rounded-3xl bg-[linear-gradient(140deg,#0b3d5b_0%,#1d6f8a_45%,#f59e0b_100%)] p-8 text-white shadow-xl sm:p-10">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-100/80">PreventHub</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
          Frontend foundation for prevention campaign orchestration
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-slate-100/90 sm:text-base">
          The project is ready to start vertical feature slices from a documented and verified backend contract.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Admin Portal</h2>
          <p className="mt-2 text-sm text-slate-600">
            Build campaign lifecycle workflows, audience previews, and impact analytics dashboards.
          </p>
          <Link
            href="/admin"
            className="mt-5 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Open admin baseline
          </Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Citizen Portal</h2>
          <p className="mt-2 text-sm text-slate-600">
            Build personalized active campaign views, engagement actions, and communication preferences.
          </p>
          <Link
            href="/citizen"
            className="mt-5 inline-flex rounded-full bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-500"
          >
            Open citizen baseline
          </Link>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Phase A checkpoints</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {checkpoints.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
