"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

type CsvUploadFormProps = {
  onValidate: (file: File) => Promise<void>;
  isLoading: boolean;
};

export function CsvUploadForm({ onValidate, isLoading }: CsvUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!selectedFile) {
      return;
    }

    await onValidate(selectedFile);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-slate-900">1. Validate CSV</h2>
      <p className="mt-2 text-sm text-slate-600">
        Upload an events CSV file to preview parsed rows and validation errors.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="block w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
        />
        <button
          type="submit"
          disabled={!selectedFile || isLoading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Validating..." : "Validate CSV"}
        </button>
      </div>
    </form>
  );
}
