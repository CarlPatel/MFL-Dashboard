import { Suspense } from "react";

import Dashboard from "../components/Dashboard";

export default function Home() {
  return (
    <Suspense fallback={<main className="shell"><p className="muted">Loading dashboard…</p></main>}>
      <Dashboard />
    </Suspense>
  );
}
