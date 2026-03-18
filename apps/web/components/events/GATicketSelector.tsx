import { useEffect, useMemo, useState } from "react";
import type { EventDetail } from "../../lib/events-api";

type GATicketSelectorProps = {
  ticketTiers: EventDetail["ticketTiers"];
  isSubmitting: boolean;
  onContinue: (input: { tierId: string; quantity: number }) => Promise<void>;
};

export function GATicketSelector({ ticketTiers, isSubmitting, onContinue }: GATicketSelectorProps) {
  const [selectedTierId, setSelectedTierId] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!selectedTierId && ticketTiers.length > 0) {
      setSelectedTierId(ticketTiers[0].id);
    }
  }, [selectedTierId, ticketTiers]);

  const selectedTier = useMemo(
    () => ticketTiers.find((tier) => tier.id === selectedTierId) ?? null,
    [selectedTierId, ticketTiers]
  );

  const subtotal = selectedTier ? selectedTier.price * quantity : 0;
  const maxQuantity = selectedTier ? Math.min(selectedTier.quantityRemaining, 20) : 1;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">General Admission</h2>

      {ticketTiers.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No GA ticket tiers available for this event.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="ga-tier">
              Ticket Tier
            </label>
            <select
              id="ga-tier"
              value={selectedTierId}
              onChange={(event) => {
                setSelectedTierId(event.target.value);
                setQuantity(1);
              }}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            >
              {ticketTiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name} (${tier.price.toFixed(2)}) - {tier.quantityRemaining} available
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="ga-quantity">
              Quantity
            </label>
            <input
              id="ga-quantity"
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(event) => {
                const nextQuantity = Number(event.target.value);
                if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
                  setQuantity(1);
                  return;
                }

                setQuantity(Math.min(nextQuantity, maxQuantity));
              }}
              className="mt-2 w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <p className="text-sm font-semibold text-slate-900">Subtotal: ${subtotal.toFixed(2)}</p>

          <button
            type="button"
            onClick={() => {
              if (!selectedTier) {
                return;
              }

              void onContinue({
                tierId: selectedTier.id,
                quantity
              });
            }}
            disabled={isSubmitting || !selectedTier || selectedTier.quantityRemaining === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Validating..." : "Continue to Checkout"}
          </button>
        </div>
      )}
    </section>
  );
}