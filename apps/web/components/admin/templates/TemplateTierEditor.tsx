"use client";

export type TemplateTierDraft = {
  name: string;
  price: string;
  quantity: string;
};

type TemplateTierEditorProps = {
  tiers: TemplateTierDraft[];
  onChange: (tiers: TemplateTierDraft[]) => void;
  title?: string;
};

export function TemplateTierEditor({
  tiers,
  onChange,
  title = "Ticket Tier Presets"
}: TemplateTierEditorProps) {
  function updateTier(index: number, nextTier: TemplateTierDraft): void {
    onChange(
      tiers.map((tier, tierIndex) => (tierIndex === index ? nextTier : tier))
    );
  }

  function addTier(): void {
    onChange([
      ...tiers,
      {
        name: "",
        price: "",
        quantity: ""
      }
    ]);
  }

  function removeTier(index: number): void {
    onChange(tiers.filter((_tier, tierIndex) => tierIndex !== index));
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
        <button
          type="button"
          onClick={addTier}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-white"
        >
          Add Tier
        </button>
      </div>

      {tiers.length === 0 ? (
        <p className="text-sm text-slate-500">No tiers configured.</p>
      ) : (
        <div className="space-y-2">
          {tiers.map((tier, index) => (
            <div
              key={`template-tier-${index}`}
              className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1.5fr_1fr_1fr_auto]"
            >
              <input
                type="text"
                value={tier.name}
                onChange={(event) =>
                  updateTier(index, {
                    ...tier,
                    name: event.target.value
                  })
                }
                placeholder="Tier name"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={tier.price}
                onChange={(event) =>
                  updateTier(index, {
                    ...tier,
                    price: event.target.value
                  })
                }
                placeholder="Price"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="number"
                min="1"
                step="1"
                value={tier.quantity}
                onChange={(event) =>
                  updateTier(index, {
                    ...tier,
                    quantity: event.target.value
                  })
                }
                placeholder="Quantity"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              />
              <button
                type="button"
                onClick={() => removeTier(index)}
                className="rounded-md border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
