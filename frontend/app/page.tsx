export default async function Home() {
  // Fetching data from the FastAPI backend
  const res = await fetch("http://127.0.0.1:8000/api/message", { cache: "no-store" });
  const data = await res.json();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      <div className="p-8 border border-zinc-800 rounded-xl bg-zinc-900 shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-emerald-400">Next.js + FastAPI</h1>
        <p className="text-zinc-400">Backend says: <span className="text-white font-mono">{data.message}</span></p>
      </div>
    </main>
  );
}