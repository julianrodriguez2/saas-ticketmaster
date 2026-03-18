"use client";

import { useState, type FormEvent } from "react";
import {
  checkInAdminTicket,
  lookupAdminTicketByCode,
  type AdminTicketLookup
} from "../../../lib/admin-api";

export function TicketLookupPanel() {
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState<AdminTicketLookup | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleLookup(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setError("Enter a ticket code.");
      return;
    }

    setIsSearching(true);

    try {
      const nextTicket = await lookupAdminTicketByCode(trimmedCode);
      setTicket(nextTicket);
    } catch (lookupError) {
      setTicket(null);
      setError(lookupError instanceof Error ? lookupError.message : "Ticket lookup failed.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleCheckIn(): Promise<void> {
    if (!ticket) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsCheckingIn(true);

    try {
      const checkedInTicket = await checkInAdminTicket(ticket.id);
      setTicket((currentTicket) =>
        currentTicket
          ? {
              ...currentTicket,
              checkInStatus: checkedInTicket.checkInStatus,
              checkedInAt: checkedInTicket.checkedInAt
            }
          : currentTicket
      );
      setSuccess("Ticket checked in successfully.");
    } catch (checkInError) {
      setError(checkInError instanceof Error ? checkInError.message : "Unable to check in ticket.");
    } finally {
      setIsCheckingIn(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Ticket Lookup</h2>
      <p className="mt-1 text-sm text-slate-600">
        Find a ticket by code and manually check in attendees.
      </p>

      <form onSubmit={handleLookup} className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="min-w-[260px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          placeholder="Enter ticket code"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSearching ? "Searching..." : "Lookup"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-600">{success}</p> : null}

      {ticket ? (
        <article className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ticket Code
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{ticket.code}</p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {ticket.status}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Event:</span> {ticket.event.title}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Date:</span>{" "}
              {new Date(ticket.event.date).toLocaleString()}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Customer:</span>{" "}
              {ticket.customerEmail ?? "Guest checkout"}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Attendee:</span>{" "}
              {ticket.attendeeName ?? "N/A"}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Seat/Tier:</span>{" "}
              {ticket.seat
                ? `${ticket.seat.section} - Row ${ticket.seat.row} Seat ${ticket.seat.seatNumber}`
                : ticket.ticketTier?.name ?? "General Admission"}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Check-In:</span>{" "}
              {ticket.checkInStatus}
              {ticket.checkedInAt
                ? ` (${new Date(ticket.checkedInAt).toLocaleString()})`
                : ""}
            </p>
          </div>

          <button
            type="button"
            disabled={
              isCheckingIn ||
              ticket.checkInStatus === "CHECKED_IN" ||
              ticket.status !== "ACTIVE"
            }
            onClick={() => void handleCheckIn()}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCheckingIn
              ? "Checking In..."
              : ticket.checkInStatus === "CHECKED_IN"
                ? "Already Checked In"
                : "Check In Ticket"}
          </button>
        </article>
      ) : null}
    </section>
  );
}
