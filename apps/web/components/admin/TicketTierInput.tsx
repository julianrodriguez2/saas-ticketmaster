"use client";

export type TicketTierDraft = {
  name: string;
  price: string;
  quantity: string;
};

type TicketTierInputProps = {
  index: number;
  value: TicketTierDraft;
  canRemove: boolean;
  onChange: (nextValue: TicketTierDraft) => void;
  onRemove: () => void;
};

export function TicketTierInput({
  index,
  value,
  canRemove,
  onChange,
  onRemove
}: TicketTierInputProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">Ticket Tier {index + 1}</p>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-medium text-rose-600 hover:text-rose-700"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-700" htmlFor={`tier-name-${index}`}>
            Name
          </label>
          <input
            id={`tier-name-${index}`}
            type="text"
            required
            value={value.name}
            onChange={(event) =>
              onChange({
                ...value,
                name: event.target.value
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            placeholder="VIP"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700" htmlFor={`tier-price-${index}`}>
            Price (USD)
          </label>
          <input
            id={`tier-price-${index}`}
            type="number"
            required
            min="0.01"
            step="0.01"
            value={value.price}
            onChange={(event) =>
              onChange({
                ...value,
                price: event.target.value
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            placeholder="99.00"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700" htmlFor={`tier-quantity-${index}`}>
            Quantity
          </label>
          <input
            id={`tier-quantity-${index}`}
            type="number"
            required
            min="1"
            step="1"
            value={value.quantity}
            onChange={(event) =>
              onChange({
                ...value,
                quantity: event.target.value
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            placeholder="100"
          />
        </div>
      </div>
    </div>
  );
}

