import Link from "next/link";

import { AdminDashboard } from "@/components/admin/admin-dashboard";

const adminCards = [
  {
    title: "Campaign Manager",
    description: "Create, review, and launch prevention campaigns with validated targeting rules.",
  },
  {
    title: "Audience Previewer",
    description: "Run segmentation previews and inspect matched audience size before launch.",
  },
  {
    title: "Impact Analytics Hub",
    description: "Track campaign ROI and regional coverage with decision-ready metrics.",
  },
];

export default function AdminPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8">
      <header className="rounded-3xl bg-[linear-gradient(130deg,#0b3d5b_0%,#1d6f8a_55%,#f2b705_100%)] p-8 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-100/80">PreventHub / Admin Portal</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Public Health Operations</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-100/90 sm:text-base">
          Phase A baseline is now active. This portal is wired around real backend contracts and ready for feature implementation.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {adminCards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
          </article>
        ))}
      </div>

      <AdminDashboard />

      <Link
        href="/"
        className="inline-flex w-fit items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        Back to portal switcher
      </Link>
    </section>
  );
}
