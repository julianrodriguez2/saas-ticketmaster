import { apiRequest } from "./api";

export type Venue = {
  id: string;
  name: string;
  location: string;
  createdAt: string;
};

export type TicketTier = {
  id: string;
  eventId: string;
  name: string;
  price: string;
  quantity: number;
};

export type EventRecord = {
  id: string;
  title: string;
  description: string;
  date: string;
  venueId: string;
  createdAt: string;
  venue: Venue;
  ticketTiers: TicketTier[];
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

export async function getEvents(): Promise<EventRecord[]> {
  const response = await apiRequest<{ events: EventRecord[] }>("/events");
  return response.events;
}

export async function createEvent(input: CreateEventInput): Promise<EventRecord> {
  const response = await apiRequest<{ event: EventRecord }>("/events", {
    method: "POST",
    body: input
  });

  return response.event;
}

export async function getEventById(eventId: string): Promise<EventRecord> {
  const response = await apiRequest<{ event: EventRecord }>(`/events/${eventId}`);
  return response.event;
}

