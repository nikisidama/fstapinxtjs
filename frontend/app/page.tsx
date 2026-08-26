"use client";

import { FormEvent, useEffect, useState } from "react";

type Student = { id: number; name: string; score: number };
type SortKey = keyof Student;
type ConnectionStatus = "checking" | "online" | "offline";
const API_URL = "http://127.0.0.1:8000";

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("checking");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortAscending, setSortAscending] = useState(true);

  async function loadStudents(showLoading = false) {
    try {
      if (showLoading) setLoading(true);
      const response = await fetch(`${API_URL}/students`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load students.");
      setStudents(await response.json());
      setConnectionStatus("online");
      setError("");
    } catch (requestError) {
      setConnectionStatus("offline");
      if (showLoading) {
        setError(requestError instanceof Error ? requestError.message : "Could not load students.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents(true);
    const refreshTimer = window.setInterval(() => void loadStudents(), 5000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) setIsModalOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, submitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextId = students.length ? Math.max(...students.map((student) => student.id)) + 1 : 1;
    try {
      setSubmitting(true);
      setError("");
      const response = await fetch(`${API_URL}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: nextId, name: name.trim(), score: Number(score) }),
      });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.detail ?? "Could not add student.");
      }
      const newStudent: Student = await response.json();
      setConnectionStatus("online");
      setStudents((currentStudents) => [...currentStudents, newStudent]);
      setName("");
      setScore("");
      setIsModalOpen(false);
    } catch (requestError) {
      setConnectionStatus("offline");
      setError(requestError instanceof Error ? requestError.message : "Could not add student.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      setDeletingId(id);
      setError("");
      const response = await fetch(`${API_URL}/students/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.detail ?? "Could not delete student.");
      }
      setConnectionStatus("online");
      setStudents((currentStudents) => currentStudents.filter((student) => student.id !== id));
    } catch (requestError) {
      setConnectionStatus("offline");
      setError(requestError instanceof Error ? requestError.message : "Could not delete student.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortAscending((currentDirection) => !currentDirection);
    } else {
      setSortKey(nextSortKey);
      setSortAscending(true);
    }
  }

  const sortedStudents = [...students].sort((firstStudent, secondStudent) => {
    const firstValue = firstStudent[sortKey];
    const secondValue = secondStudent[sortKey];
    const comparison = typeof firstValue === "string" && typeof secondValue === "string"
      ? firstValue.localeCompare(secondValue)
      : Number(firstValue) - Number(secondValue);
    return sortAscending ? comparison : -comparison;
  });

  function sortLabel(column: SortKey) {
    if (sortKey !== column) return "Sort";
    return sortAscending ? "Sorted ascending" : "Sorted descending";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 font-sans text-slate-900 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <section className="mt-8 border border-slate-200 bg-white p-5 sm:p-7" aria-labelledby="student-list-heading">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h2 id="student-list-heading" className="text-2xl font-bold tracking-tight">Student list</h2>
            </div>
            <span className="text-sm text-slate-500">{students.length} {students.length === 1 ? "student" : "students"}</span>
          </div>
          <div className={`mt-6 flex items-center gap-2 border px-3 py-2 text-sm ${connectionStatus === "online" ? "border-emerald-200 text-emerald-800" : connectionStatus === "offline" ? "border-red-200 text-red-800" : "border-slate-200 bg-slate-50 text-slate-600"}`} role="status">
            <span className={`h-2 w-2 rounded-full ${connectionStatus === "online" ? "bg-emerald-600" : connectionStatus === "offline" ? "bg-red-600" : "bg-slate-400"}`} aria-hidden="true" />
            {connectionStatus === "online" ? "online" : connectionStatus === "offline" ? "offline" : "Connecting..."}
            {connectionStatus === "offline" && <button type="button" className="ml-auto font-bold underline" onClick={() => void loadStudents(true)}>Retry</button>}
          </div>
          {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
          {loading ? <p className="mt-6 text-slate-500">Loading...</p> : students.length === 0 ? <p className="mt-6 text-slate-500">No students.</p> : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-140 border-collapse text-left text-sm">
                <thead>
                  <tr className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    {(["id", "name", "score"] as SortKey[]).map((column) => (
                      <th key={column} className="px-3 py-3 font-bold first:pl-0" scope="col">
                        <button type="button" className="flex items-center gap-2 font-bold hover:text-emerald-700" onClick={() => handleSort(column)} aria-label={`${sortLabel(column)} by ${column}`}>
                          {column}<span aria-hidden="true">{sortKey === column ? (sortAscending ? "↑" : "↓") : "↕"}</span>
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right last:pr-0" scope="col">
                      <button>Actions</button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((student) => (
                    <tr key={student.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-4 font-mono text-slate-500 first:pl-0">{student.id}</td>
                      <td className="px-3 py-4 font-semibold">{student.name}</td>
                      <td className="px-3 py-4">{student.score}</td>
                      <td className="px-3 py-4 text-right last:pr-0">
                        <button type="button" className="text-sm font-bold text-red-700 hover:text-red-900 disabled:cursor-wait cursor-pointer" onClick={() => void handleDelete(student.id)} disabled={deletingId === student.id}>
                          {deletingId === student.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <button type="button" className="w-full bg-[#ccff66] px-5 py-3 font-bold text-black hover:bg-[#b3e65c] disabled:cursor-wait cursor-pointer sm:w-auto" onClick={() => { setError(""); setIsModalOpen(true); }}>
          <span aria-hidden="true" className="mr-1 text-xl leading-none">+</span> Add student
        </button>
        {isModalOpen && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/50 p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setIsModalOpen(false); }}>
            <section className="w-full max-w-md bg-white p-7 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="add-student-heading">
              <div className="flex items-center justify-between gap-6">
                <div>
                  <h2 id="add-student-heading" className="text-2xl font-bold tracking-tight">Add student</h2>
                </div>
                <button type="button" className="p-1 text-2xl leading-none text-slate-400 hover:text-slate-700 disabled:cursor-wait" aria-label="Close dialog" onClick={() => setIsModalOpen(false)} disabled={submitting}>×</button>
              </div>
              <form className="mt-7" onSubmit={handleSubmit}>
                <label className="mb-5 grid gap-2 text-sm font-bold">
                  <span>Name</span>
                  <input className="border border-slate-200 bg-slate-50 px-3 py-3 font-normal outline-none focus:border-[#ccff66] focus:ring-2 focus:ring-emerald-700/15" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Alex Johnson" required autoFocus />
                </label>
                <label className="mb-5 grid gap-2 text-sm font-bold">
                  <span>Score</span>
                  <input className="border border-slate-200 bg-slate-50 px-3 py-3 font-normal outline-none focus:border-[#ccff66] focus:ring-2 focus:ring-emerald-700/15" type="number" min="0" max="100" value={score} onChange={(event) => setScore(event.target.value)} placeholder="0 - 100" required />
                </label>
                {error && <p className="mt-5 text-sm text-red-700" role="alert">{error}</p>}
                <div className="mt-7 flex justify-end gap-3">
                  <button type="button" className="bg-slate-100 px-5 py-3 font-bold text-slate-900 hover:bg-slate-200 disabled:cursor-wait cursor-pointer" onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="bg-[#ccff66] px-5 py-3 font-bold text-black hover:bg-[#b3e65c] disabled:cursor-wait cursor-pointer" disabled={submitting}>{submitting ? "Adding..." : "Add student"}</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}