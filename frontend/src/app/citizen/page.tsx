import Link from "next/link";

import { CitizenDashboard } from "@/components/citizen/citizen-dashboard";

const citizenHighlights = [
  "Personalized active campaign discovery",
  "One-click engagement actions",
  "Communication preference updates",
];

export default function CitizenPage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8">
      <header className="rounded-3xl bg-[radial-gradient(circle_at_20%_10%,#ffedd5_0%,#f97316_25%,#7c2d12_100%)] p-8 text-orange-50 shadow-lg">
        <p className="text-xs uppercase tracking-[0.24em] text-orange-100/85">PreventHub / Citizen Portal</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Your Prevention Dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm text-orange-100/90 sm:text-base">
          This baseline page is ready to receive personalized campaign cards, engagement actions, and channel preferences.
        </p>
      </header>

      <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">MVP focus</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {citizenHighlights.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-orange-500" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <CitizenDashboard />

      <Link
        href="/"
        className="inline-flex w-fit items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        Back to portal switcher
      </Link>
    </section>
  );
}
