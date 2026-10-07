"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Service = { id: string; name: string; price: number | string; durationMin: number };
type Business = { name: string; timezone: string; whatsappNumber?: string | null; services: Service[] };
type Slot = { time: string; staffId: string | null };
type BookingResult = { code: string; startAt: string; service: string };

function todayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export default function BookPage() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const query = useSearchParams();
  const [data, setData] = useState<Business | null>(null);
  const [serviceId, setServiceId] = useState(query.get("service") || "");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [done, setDone] = useState<BookingResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/business?slug=${encodeURIComponent(businessSlug)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load business.");
        if (!cancelled) setData(payload);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load booking page."));
    return () => { cancelled = true; };
  }, [businessSlug]);

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      setSlot(null);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSlot(null);
    setError("");
    fetch(`/api/public/availability?slug=${encodeURIComponent(businessSlug)}&serviceId=${serviceId}&date=${date}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not check availability.");
        if (!cancelled) setSlots(payload.slots || []);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not check availability."))
      .finally(() => !cancelled && setLoadingSlots(false));
    return () => { cancelled = true; };
  }, [businessSlug, serviceId, date]);

  const minimumDate = useMemo(() => (data ? todayInTimeZone(data.timezone) : ""), [data]);

  if (done) {
    return (
      <main className="auth">
        <div className="auth-card card">
          <div className="eyebrow">Booking request received</div>
          <h1>Your request is received.</h1>
          <p className="muted">Your booking code is <strong>{done.code}</strong>.</p>
          <p>{done.service} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: data?.timezone }).format(new Date(done.startAt))}</p>
          {data?.whatsappNumber && (
            <a className="btn btn-secondary" href={`https://wa.me/${data.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(`Habari ${data.name}, nimeomba booking ${done.code}.`)}`}>
              Chat on WhatsApp
            </a>
          )}
          <a className="btn btn-primary" href={`/${businessSlug}`}>Back to business</a>
        </div>
      </main>
    );
  }

  if (!data) {
    return <main className="container section"><div className="card">Loading booking page…</div></main>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slot) {
      setError("Choose an available time.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: businessSlug, serviceId, staffId: slot.staffId, date, time: slot.time, ...form }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Could not create booking.");
        return;
      }
      setDone(payload.booking);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card card" onSubmit={submit}>
        <div className="eyebrow">Book with BrellBook</div>
        <h1>{data.name}</h1>
        <p className="muted">No customer account required.</p>

        <div className="field">
          <label>1. Service</label>
          <select required value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
            <option value="">Choose service</option>
            {data.services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · TSh {Number(service.price).toLocaleString()} · {service.durationMin} min
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>2. Date</label>
          <input required type="date" min={minimumDate} value={date} onChange={(event) => setDate(event.target.value)} />
        </div>

        <div className="field">
          <label>3. Available time</label>
          {loadingSlots ? (
            <span className="muted">Checking available times…</span>
          ) : (
            <div className="slot-grid">
              {slots.length ? slots.map((item) => (
                <button
                  type="button"
                  key={`${item.time}-${item.staffId ?? "any"}`}
                  className={slot?.time === item.time ? "slot selected" : "slot"}
                  onClick={() => setSlot(item)}
                >
                  {item.time}
                </button>
              )) : (
                <span className="muted">{date ? "No available times for this date." : "Choose a service and date."}</span>
              )}
            </div>
          )}
        </div>

        <div className="field">
          <label>Your name</label>
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </div>
        <div className="field">
          <label>Phone / WhatsApp</label>
          <input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </div>
        <div className="field">
          <label>Email (optional)</label>
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </div>
        <div className="field">
          <label>Notes (optional)</label>
          <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </div>

        {error && <p className="error">{error}</p>}
        <button disabled={busy || loadingSlots || !slot} className="btn btn-primary" style={{ width: "100%" }}>
          {busy ? "Confirming…" : "Confirm booking"}
        </button>
      </form>
    </main>
  );
}
