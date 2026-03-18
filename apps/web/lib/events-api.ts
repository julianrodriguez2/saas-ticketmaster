import { apiRequest } from "./api";

export type EventSummary = {
  id: string;
  title: string;
  date: string;
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
