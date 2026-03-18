import { apiRequest } from "./api";

export type CreateCheckoutSessionInput =
  | {
      eventId: string;
      seatIds: string[];
    }
  | {
      eventId: string;
      ticketTierId: string;
      quantity: number;
    };

export type CheckoutSession = {
  clientSecret: string;
  orderId: string;
  totalAmount: number;
  currency: "usd";
};

export type OrderSummary = {
  id: string;
  status: "PENDING" | "PAID" | "FAILED";
  totalAmount: number;
  createdAt: string;
  event: {
    id: string;
    title: string;
    date: string;
    venue: {
      name: string;
      location: string;
    };
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    ticketTier: {
      id: string;
      name: string;
    } | null;
    seat: {
      id: string;
      section: string;
      row: string;
      seatNumber: string;
      label: string | null;
    } | null;
  }>;
  payment: {
    provider: "STRIPE";
    status: "PENDING" | "SUCCESS" | "FAILED";
    paymentIntentId: string;
  } | null;
};

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CheckoutSession> {
  const response = await apiRequest<{ session: CheckoutSession }>(
    "/checkout/create-session",
    {
      method: "POST",
      body: input
    }
  );

  return response.session;
}

export async function getOrderSummary(orderId: string): Promise<OrderSummary> {
  const response = await apiRequest<{ order: OrderSummary }>(`/orders/${orderId}`);
  return response.order;
}
