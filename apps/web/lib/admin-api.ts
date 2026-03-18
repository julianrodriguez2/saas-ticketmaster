import { apiRequest } from "./api";

export type TicketingMode = "GA" | "RESERVED";
export type SeatStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";

export type Venue = {
  id: string;
  name: string;
  location: string;
  createdAt: string;
};

export type AdminEventSummary = {
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

export type AdminEventDetail = {
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

export type AdminSeatMap = {
  eventId: string;
  ticketingMode: TicketingMode;
  sections: Array<{
    id: string;
    name: string;
    color: string | null;
    rows: Array<{
      id: string;
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

export type AdminSeatMapPayload = {
  sections: Array<{
    name: string;
    color?: string;
    rows: Array<{
      label: string;
      sortOrder: number;
      seats: Array<{
        seatNumber: string;
        x: number;
        y: number;
        price: number;
      }>;
    }>;
  }>;
};

export type CreateVenueInput = {
  name: string;
  location: string;
};

export type CreateEventInput = {
  title: string;
  description: string;
  date: string;
  venueId: string;
  ticketingMode: TicketingMode;
  ticketTiers: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
};

export async function getVenues(): Promise<Venue[]> {
  const response = await apiRequest<{ venues: Venue[] }>("/venues");
  return response.venues;
}

export async function createVenue(input: CreateVenueInput): Promise<Venue> {
  const response = await apiRequest<{ venue: Venue }>("/venues", {
    method: "POST",
    body: input
  });

  return response.venue;
}

export async function getEvents(): Promise<AdminEventSummary[]> {
  const response = await apiRequest<{ events: AdminEventSummary[] }>("/events");
  return response.events;
}

export async function createEvent(input: CreateEventInput): Promise<AdminEventDetail> {
  const response = await apiRequest<{ event: AdminEventDetail }>("/events", {
    method: "POST",
    body: input
  });

  return response.event;
}

export async function getEventById(eventId: string): Promise<AdminEventDetail> {
  const response = await apiRequest<{ event: AdminEventDetail }>(`/events/${eventId}`);
  return response.event;
}

export async function getAdminSeatMap(eventId: string): Promise<AdminSeatMap> {
  const response = await apiRequest<{ seatMap: AdminSeatMap }>(
    `/admin/events/${eventId}/seat-map`
  );

  return response.seatMap;
}

export async function replaceAdminSeatMap(
  eventId: string,
  payload: AdminSeatMapPayload
): Promise<AdminSeatMap> {
  const response = await apiRequest<{ seatMap: AdminSeatMap }>(
    `/admin/events/${eventId}/seat-map`,
    {
      method: "POST",
      body: payload
    }
  );

  return response.seatMap;
}