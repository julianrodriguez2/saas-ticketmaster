import { apiRequest } from "./api";

export type CreateCheckoutSessionInput =
  | {
      eventId: string;
      seatIds: string[];
      email?: string;
      presaleCode?: string;
      presaleLinkAccess?: boolean;
    }
  | {
      eventId: string;
      ticketTierId: string;
      quantity: number;
      email?: string;
      presaleCode?: string;
      presaleLinkAccess?: boolean;
    };

export type CheckoutSession = {
  clientSecret: string;
  orderId: string;
  totalAmount: number;
  currency: "usd";
};

export type OrderListItem = {
  id: string;
  status: "PENDING" | "PAID" | "FAILED";
  totalAmount: number;
  createdAt: string;
  event: {
    id: string;
    title: string;
  };
  ticketCount: number;
};

export type OrderDetail = {
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
  tickets: Array<{
    id: string;
    code: string;
    status: "ACTIVE" | "USED" | "CANCELLED";
    issuedAt: string;
    seat: {
      section: string;
      row: string;
      seatNumber: string;
      label: string | null;
    } | null;
    ticketTier: {
      id: string;
      name: string;
    } | null;
  }>;
  payment: {
    provider: "STRIPE";
    status: "PENDING" | "SUCCESS" | "FAILED";
    paymentIntentId: string;
    amount: number;
  } | null;
};

export type TicketDetail = {
  id: string;
  code: string;
  status: "ACTIVE" | "USED" | "CANCELLED";
  issuedAt: string;
  attendeeName: string | null;
  event: {
    id: string;
    title: string;
    date: string;
    venue: {
      name: string;
      location: string;
    };
  };
  seat: {
    id: string;
    section: string;
    row: string;
    seatNumber: string;
    label: string | null;
  } | null;
  ticketTier: {
    id: string;
    name: string;
  } | null;
  qrCodeImage: string;
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

export async function getOrders(): Promise<OrderListItem[]> {
  const response = await apiRequest<{ orders: OrderListItem[] }>("/orders");
  return response.orders;
}

export async function getOrderById(orderId: string): Promise<OrderDetail> {
  const response = await apiRequest<{ order: OrderDetail }>(`/orders/${orderId}`);
  return response.order;
}

export async function getTicketById(ticketId: string): Promise<TicketDetail> {
  const response = await apiRequest<{ ticket: TicketDetail }>(`/tickets/${ticketId}`);
  return response.ticket;
}
