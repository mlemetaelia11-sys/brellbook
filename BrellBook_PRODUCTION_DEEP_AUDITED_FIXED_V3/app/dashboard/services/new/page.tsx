"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";

type ServiceForm = {
  name: string;
  description: string;
  price: string;
  durationMin: string;
  category: string;
};

type ServiceRow = ServiceForm & {
  id: string;
  active: boolean;
};

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  price: "",
  durationMin: "30",
  category: "",
};

export default function NewService() {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(true);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("edit");
    setEditId(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingEdit(true);
      setError("");
      try {
        const businessRes = await fetch("/api/me/business", { cache: "no-store" });
        const businessData = await businessRes.json();
        if (!businessRes.ok || !businessData.business?.id) {
          throw new Error(businessData.error || "Business not found.");
        }

        if (!editId) {
          if (!cancelled) setLoadingEdit(false);
          return;
        }

        const servicesRes = await fetch(
          `/api/services?businessId=${encodeURIComponent(businessData.business.id)}`,
          { cache: "no-store" },
        );
        const servicesData = await servicesRes.json();
        if (!servicesRes.ok) {
          throw new Error(servicesData.error || "Could not load services.");
        }

        const service = (servicesData.services || []).find(
          (item: ServiceRow) => item.id === editId,
        );
        if (!service) {
          throw new Error("Service not found.");
        }

        if (!cancelled) {
          setForm({
            name: service.name || "",
            description: service.description || "",
            price: String(service.price ?? ""),
            durationMin: String(service.durationMin ?? 30),
            category: service.category || "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load service.");
        }
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const businessRes = await fetch("/api/me/business", { cache: "no-store" });
      const businessData = await businessRes.json();
      if (!businessRes.ok || !businessData.business?.id) {
        throw new Error(businessData.error || "Business not found.");
      }

      const payload = {
        businessId: businessData.business.id,
        ...(editId ? { id: editId } : {}),
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        durationMin: Number(form.durationMin),
        category: form.category.trim(),
      };

      const response = await fetch("/api/services", {
        method: editId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save service.");
      }

      router.push("/dashboard/services");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save service.");
    } finally {
      setLoading(false);
    }
  }

  const title = editId ? "Edit service" : "Add service";

  return (
    <DashboardShell title={title}>
      <form className="card panel" onSubmit={save}>
        <h1>{title}</h1>
        {loadingEdit && editId ? (
          <p className="muted">Loading service…</p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <div className="grid2">
              <div className="field">
                <label htmlFor="price">Price (TSh)</label>
                <input
                  id="price"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                />
              </div>

              <div className="field">
                <label htmlFor="duration">Duration</label>
                <input
                  id="duration"
                  required
                  type="number"
                  min="5"
                  max="1440"
                  step="5"
                  value={form.durationMin}
                  onChange={(event) => setForm({ ...form, durationMin: event.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="category">Category</label>
              <input
                id="category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              />
            </div>
          </>
        )}

        {error && <p className="error">{error}</p>}

        {!loadingEdit && (
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Saving…" : "Save service"}
          </button>
        )}
      </form>
    </DashboardShell>
  );
}
