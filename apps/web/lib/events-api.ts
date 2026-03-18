import { apiRequest } from "./api";

export type TicketingMode = "GA" | "RESERVED";
export type SeatStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";

export type EventSummary = {
  id: string;
  title: string;
  date: string;
  ticketingMode: TicketingMode;
  venue: {
    name: string;
    location: string;
  };
  lowestTicketPrice: number | null;
};

export type EventDetail = {
  id: string;
  title: string;
  description: string;
  date: string;
  ticketingMode: TicketingMode;
  seatMapExists: boolean;
  venue: {
    id: string;
    name: string;
    location: string;
  };
  ticketTiers: Array<{
    id: string;
    name: string;
    price: number;
    quantityRemaining: number;
  }>;
};

export type PublicSeatMap = {
  eventId: string;
  ticketingMode: TicketingMode;
  sections: Array<{
    name: string;
    color: string | null;
    rows: Array<{
      label: string;
      sortOrder: number;
      seats: Array<{
        id: string;
        seatNumber: string;
        label: string | null;
        x: number;
        y: number;
        price: number;
        status: SeatStatus;
      }>;
    }>;
  }>;
};

export type AvailabilitySummary = {
  eventId: string;
  ticketingMode: TicketingMode;
  availableSeats: number;
  soldSeats: number;
  reservedSeats: number;
  blockedSeats: number;
};

export type ReservedSelectionValidation = {
  valid: boolean;
  mode: "RESERVED";
  selectedSeats: Array<{
    id: string;
    section: string;
    row: string;
    seatNumber: string;
    label: string | null;
    price: number;
  }>;
  invalidSeatIds: string[];
  totalPrice: number;
};

export type GASelectionValidation = {
  valid: boolean;
  mode: "GA";
  quantity: number;
  totalPrice: number;
  availableQuantity?: number;
  message?: string;
  tier?: {
    id: string;
    name: string;
    price: number;
  };
};

type GetEventsQuery = {
  search?: string;
  date?: string;
};

export async function getEvents(query: GetEventsQuery = {}): Promise<EventSummary[]> {
  const params = new URLSearchParams();

  if (query.search && query.search.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.date && query.date.trim()) {
    params.set("date", query.date.trim());
  }

  const path = params.toString() ? `/events?${params.toString()}` : "/events";
  const response = await apiRequest<{ events: EventSummary[] }>(path);

  return response.events;
}

export async function getRecommendedEvents(): Promise<EventSummary[]> {
  const response = await apiRequest<{ events: EventSummary[] }>("/events/recommended");
  return response.events;
}

export async function getEventById(eventId: string): Promise<EventDetail> {
  const response = await apiRequest<{ event: EventDetail }>(`/events/${eventId}`);
  return response.event;
}

export async function getSeatMap(eventId: string): Promise<PublicSeatMap> {
  const response = await apiRequest<{ seatMap: PublicSeatMap }>(
    `/events/${eventId}/seat-map`
  );

  return response.seatMap;
}

export async function getAvailability(eventId: string): Promise<AvailabilitySummary> {
  const response = await apiRequest<{ availability: AvailabilitySummary }>(
    `/events/${eventId}/availability`
  );

  return response.availability;
}

export async function validateReservedSelection(
  eventId: string,
  seatIds: string[]
): Promise<ReservedSelectionValidation> {
  const response = await apiRequest<{ validation: ReservedSelectionValidation }>(
    `/events/${eventId}/validate-selection`,
    {
      method: "POST",
      body: { seatIds }
    }
  );

  return response.validation;
}

export async function validateGASelection(
  eventId: string,
  tierId: string,
  quantity: number
): Promise<GASelectionValidation> {
  const response = await apiRequest<{ validation: GASelectionValidation }>(
    `/events/${eventId}/validate-selection`,
    {
      method: "POST",
      body: { tierId, quantity }
    }
  );

  return response.validation;
}