"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

type PaymentFormProps = {
  clientSecret: string;
  orderId: string;
  cancelRedirectPath: string;
};

export function PaymentForm({ clientSecret, orderId, cancelRedirectPath }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isDisabled = useMemo(
    () => isProcessing || !stripe || !elements,
    [isProcessing, stripe, elements]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const card = elements.getElement(CardElement);

    if (!card) {
      setError("Card input is unavailable. Please refresh and try again.");
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const result = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card
          }
        },
        {
          redirect: "if_required"
        }
      );

      if (result.error) {
        setError(result.error.message ?? "Payment could not be completed.");
        router.push(`${cancelRedirectPath}${cancelRedirectPath.includes("?") ? "&" : "?"}orderId=${orderId}`);
        return;
      }

      if (result.paymentIntent?.status === "succeeded") {
        router.push(`/checkout/success?orderId=${orderId}`);
        return;
      }

      setError("Payment is still pending confirmation. Please wait and refresh.");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to process payment."
      );
      router.push(`${cancelRedirectPath}${cancelRedirectPath.includes("?") ? "&" : "?"}orderId=${orderId}`);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Payment</h2>
      <p className="mt-2 text-sm text-slate-600">Secure payment powered by Stripe.</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-lg border border-slate-300 p-3">
          <CardElement
            options={{
              hidePostalCode: true,
              style: {
                base: {
                  fontSize: "16px",
                  color: "#0f172a",
                  "::placeholder": {
                    color: "#64748b"
                  }
                }
              }
            }}
          />
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isDisabled}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isProcessing ? "Processing Payment..." : "Pay Now"}
        </button>
      </form>
    </section>
  );
}
