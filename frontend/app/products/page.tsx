"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Product = { id: number; name: string; description: string; price: number };
type SortKey = keyof Product;
type ConnectionStatus = "checking" | "online" | "offline";
const API_URL = "http://127.0.0.1:8000";

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: "", description: "", price: "", editingId: null as number | null });
  const [ui, setUi] = useState({
    isModalOpen: false,
    actionMenuId: null as number | null,
    actionMenuPosition: null as { top: number; right: number } | null,
    loading: true,
    submitting: false,
    deletingId: null as number | null,
    sortKey: "id" as SortKey,
    sortAscending: true,
  });
  const [status, setStatus] = useState<{ connection: ConnectionStatus; error: string }>({ connection: "checking", error: "" });
  const actionButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  async function loadProducts(showLoading = false) {
    try {
      if (showLoading) setUi((current) => ({ ...current, loading: true }));
      const response = await fetch(`${API_URL}/products`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load products.");
      setProducts(await response.json());
      setStatus({ connection: "online", error: "" });
    } catch (err) {
      setStatus((current) => ({ ...current, connection: "offline", error: showLoading && err instanceof Error ? err.message : "Could not load products." }));
    } finally {
      setUi((current) => ({ ...current, loading: false }));
    }
  }

  useEffect(() => {
    void loadProducts(true);
    const refreshTimer = window.setInterval(() => void loadProducts(), 5000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    if (!ui.isModalOpen && ui.actionMenuId === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !ui.submitting) setUi((current) => ({ ...current, isModalOpen: false, actionMenuId: null, actionMenuPosition: null }));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ui.isModalOpen, ui.actionMenuId, ui.submitting]);

  useEffect(() => {
    if (!ui.actionMenuId) return;
    const updatePosition = () => {
      const button = actionButtonRefs.current[ui.actionMenuId!];
      if (!button) return;
      const bounds = button.getBoundingClientRect();
      const menuHeight = 88;
      setUi((current) => ({ ...current, actionMenuPosition: { top: bounds.bottom + 4 > window.innerHeight - menuHeight ? bounds.top - menuHeight - 4 : bounds.bottom + 4, right: window.innerWidth - bounds.right } }));
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [ui.actionMenuId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isEditing = form.editingId !== null;
    try {
      setUi((current) => ({ ...current, submitting: true }));
      setStatus({ connection: "online", error: "" });
      const response = await fetch(`${API_URL}/products${isEditing ? `/${form.editingId}` : ""}`, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim(), price: Number(form.price) }),
      });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.detail ?? `Could not ${isEditing ? "update" : "add"} product.`);
      }
      const saved = await response.json();
      setProducts((current) => isEditing ? current.map((product) => product.id === saved.id ? saved : product) : [...current, saved]);
      setForm({ name: "", description: "", price: "", editingId: null });
      setUi((current) => ({ ...current, isModalOpen: false }));
    } catch (err) {
      setStatus({ connection: "offline", error: err instanceof Error ? err.message : "Could not save product." });
    } finally {
      setUi((current) => ({ ...current, submitting: false }));
    }
  }

  async function handleDelete(id: number) {
    try {
      setUi((current) => ({ ...current, actionMenuId: null, actionMenuPosition: null, deletingId: id }));
      setStatus({ connection: "online", error: "" });
      const response = await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.detail ?? "Could not delete product.");
      }
      setProducts((current) => current.filter((product) => product.id !== id));
    } catch (err) {
      setStatus({ connection: "offline", error: err instanceof Error ? err.message : "Could not delete product." });
    } finally {
      setUi((current) => ({ ...current, deletingId: null }));
    }
  }

  const openAddProduct = () => {
    setForm({ name: "", description: "", price: "", editingId: null });
    setUi((current) => ({ ...current, isModalOpen: true, actionMenuId: null, actionMenuPosition: null }));
    setStatus({ connection: "online", error: "" });
  };
  const openEditProduct = (product: Product) => {
    setForm({ name: product.name, description: product.description, price: String(product.price), editingId: product.id });
    setUi((current) => ({ ...current, isModalOpen: true, actionMenuId: null, actionMenuPosition: null }));
    setStatus({ connection: "online", error: "" });
  };
  const handleSort = (key: SortKey) => setUi((current) => ({ ...current, sortKey: key, sortAscending: current.sortKey === key ? !current.sortAscending : true }));
  const sorted = [...products].sort((a, b) => {
    const aValue = a[ui.sortKey];
    const bValue = b[ui.sortKey];
    const comparison = typeof aValue === "string" ? aValue.localeCompare(String(bValue)) : Number(aValue) - Number(bValue);
    return ui.sortAscending ? comparison : -comparison;
  });
  const statusColors = { online: "border-emerald-200 text-emerald-800 bg-emerald-50", offline: "border-red-200 text-red-800 bg-red-50", checking: "border-slate-200 text-slate-600 bg-slate-50" };
  const dotColors = { online: "bg-emerald-600", offline: "bg-red-600", checking: "bg-slate-400" };
  const activeProduct = products.find((product) => product.id === ui.actionMenuId);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 font-sans text-slate-900 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <section className="mt-8 border border-slate-200 bg-white p-5 sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-6"><h2 className="text-2xl font-bold tracking-tight">Product list</h2><span className="text-sm text-slate-500">{products.length} {products.length === 1 ? "product" : "products"}</span></div>
          <div className={`flex items-center gap-2 border px-3 py-2 text-sm ${statusColors[status.connection]}`} role="status"><span className={`h-2 w-2 rounded-full ${dotColors[status.connection]}`} aria-hidden="true" /><span>{status.connection === "online" ? "online" : status.connection === "offline" ? "offline" : "Connecting..."}</span>{status.connection === "offline" && <button type="button" className="ml-auto font-bold underline" onClick={() => void loadProducts(true)}>Retry</button>}</div>
          {status.error && <p className="mt-4 text-sm text-red-700" role="alert">{status.error}</p>}
          {ui.loading ? <p className="mt-6 text-slate-500">Loading...</p> : products.length === 0 ? <p className="mt-6 text-slate-500">No products.</p> : <div className="mt-6 overflow-y-auto">
            <table className="w-full min-w-140 border-collapse text-left text-sm"><thead><tr className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              {(["id", "name", "description", "price"] as const).map((column) => <th key={column} className="px-3 py-3 font-bold first:pl-0"><button type="button" className="flex items-center gap-2 font-bold hover:text-emerald-700" onClick={() => handleSort(column)} aria-label={`${ui.sortKey === column ? (ui.sortAscending ? "Sorted ascending" : "Sorted descending") : "Sort"} by ${column}`}>{column}<span aria-hidden="true">{ui.sortKey === column ? (ui.sortAscending ? "↑" : "↓") : "↕"}</span></button></th>)}
              <th className="px-3 py-3 text-right last:pr-0">Actions</th></tr></thead><tbody>{sorted.map((product) => <tr key={product.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-4 font-mono text-slate-500 first:pl-0">{product.id}</td><td className="px-3 py-4 font-semibold">{product.name}</td><td className="max-w-xs px-3 py-4 text-slate-600">{product.description}</td><td className="px-3 py-4">${product.price.toFixed(2)}</td>
                <td className="px-3 py-4 text-right last:pr-0"><button type="button" ref={(button) => { actionButtonRefs.current[product.id] = button; }} className="inline-flex h-9 w-9 items-center justify-center border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900" onClick={() => setUi((current) => ({ ...current, actionMenuId: current.actionMenuId === product.id ? null : product.id, actionMenuPosition: current.actionMenuId === product.id ? null : current.actionMenuPosition }))} aria-expanded={ui.actionMenuId === product.id} aria-controls={`actions-${product.id}`}><span className="flex flex-col gap-1" aria-hidden="true">{[1, 2, 3].map((item) => <span key={item} className="h-1 w-1 rounded-full bg-current" />)}</span></button></td>
              </tr>)}</tbody></table>
          </div>}
        </section>
        {activeProduct && ui.actionMenuPosition && <div id={`actions-${activeProduct.id}`} className="fixed z-50 min-w-32 border border-slate-200 bg-white p-1 shadow-lg" style={ui.actionMenuPosition}>
          <button type="button" className="block w-full px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-700" onClick={() => openEditProduct(activeProduct)}>Edit</button>
          <button type="button" className="block w-full px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50 hover:text-red-900" onClick={() => void handleDelete(activeProduct.id)} disabled={ui.deletingId === activeProduct.id}>{ui.deletingId === activeProduct.id ? "Deleting..." : "Delete"}</button>
        </div>}
        <button type="button" className="mt-6 w-full bg-black px-5 py-3 font-bold text-white hover:bg-[#26a699] sm:w-auto" onClick={openAddProduct}>+ Add product</button>
        {ui.isModalOpen && <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/50 p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !ui.submitting) setUi((current) => ({ ...current, isModalOpen: false })); }}><section className="w-full max-w-md bg-white p-7 shadow-2xl" role="dialog" aria-modal="true">
          <div className="mb-7 flex items-center justify-between gap-6"><h2 className="text-2xl font-bold tracking-tight">{form.editingId === null ? "Add product" : "Edit product"}</h2><button type="button" className="p-1 text-2xl leading-none text-slate-400 hover:text-slate-700" onClick={() => setUi((current) => ({ ...current, isModalOpen: false }))} disabled={ui.submitting}>×</button></div>
          <form onSubmit={handleSubmit}><label className="mb-5 grid gap-2 text-sm font-bold"><span>Name</span><input className="border border-slate-200 bg-slate-50 px-3 py-3 font-normal outline-none focus:border-[#26a699] focus:ring-2 focus:ring-emerald-700/15" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" autoFocus required /></label><label className="mb-5 grid gap-2 text-sm font-bold"><span>Description</span><textarea className="min-h-24 border border-slate-200 bg-slate-50 px-3 py-3 font-normal outline-none focus:border-[#26a699] focus:ring-2 focus:ring-emerald-700/15" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" required /></label><label className="mb-5 grid gap-2 text-sm font-bold"><span>Price</span><input type="number" step="0.01" min="0" className="border border-slate-200 bg-slate-50 px-3 py-3 font-normal outline-none focus:border-[#26a699] focus:ring-2 focus:ring-emerald-700/15" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="0.00" required /></label>
            {status.error && <p className="mt-5 text-sm text-red-700" role="alert">{status.error}</p>}<div className="mt-7 flex justify-end gap-3"><button type="button" className="bg-slate-100 px-5 py-3 font-bold text-slate-900 hover:bg-slate-200" onClick={() => setUi((current) => ({ ...current, isModalOpen: false }))} disabled={ui.submitting}>Cancel</button><button type="submit" className="bg-black px-5 py-3 font-bold text-white hover:bg-[#26a699]" disabled={ui.submitting}>{ui.submitting ? (form.editingId === null ? "Adding..." : "Updating...") : form.editingId === null ? "Add product" : "Update product"}</button></div>
          </form></section></div>}
      </div>
    </main>
  );
}
