import { apiRequest } from "./api";

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

export type CreateVenueInput = {
  name: string;
  location: string;
};

export type CreateEventInput = {
  title: string;
  description: string;
  date: string;
  venueId: string;
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
