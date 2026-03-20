import type { ImportValidationError } from "../../../lib/admin-api";

type ImportErrorListProps = {
  errors: ImportValidationError[];
};

export function ImportErrorList({ errors }: ImportErrorListProps) {
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
      <h2 className="text-xl font-semibold text-rose-700">Validation Errors</h2>

      {errors.length === 0 ? (
        <p className="mt-3 text-sm text-rose-600">No row-level errors.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm text-rose-700">
          {errors.map((error, index) => (
            <li key={`${error.rowNumber}-${error.fieldName}-${index}`}>
              Row {error.rowNumber}
              {error.fieldName ? ` (${error.fieldName})` : ""}: {error.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
