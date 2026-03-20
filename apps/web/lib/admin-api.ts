import { API_BASE_URL, ApiError, apiRequest } from "./api";

export type TicketingMode = "GA" | "RESERVED";
export type SeatStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";
export type OrderStatus = "PENDING" | "PAID" | "FAILED";
export type TicketStatus = "ACTIVE" | "USED" | "CANCELLED";
export type CheckInStatus = "NOT_CHECKED_IN" | "CHECKED_IN";

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

export type AdminAnalyticsOverview = {
  totalRevenue: number;
  totalPaidOrders: number;
  totalTicketsSold: number;
  totalUpcomingEvents: number;
  averageOrderValue: number;
  recentSalesCount: number;
};

export type AdminSalesVelocityPoint = {
  date: string;
  orderCount: number;
  revenue: number;
};

export type AdminSalesVelocity = {
  eventId: string | null;
  windowDays: number;
  series: AdminSalesVelocityPoint[];
  totalRevenue: number;
  totalOrders: number;
};

export type AdminEventPerformance = {
  eventId: string;
  title: string;
  date: string;
  ticketingMode: TicketingMode;
  venue: {
    name: string;
    location: string;
  };
  totalRevenue: number;
  ticketsSold: number;
  remainingInventory: number;
  occupancyPercentage: number;
  orderCount: number;
};

export type AdminEventAnalyticsDetail = {
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    ticketingMode: TicketingMode;
    venue: {
      name: string;
      location: string;
    };
  };
  metrics: {
    totalRevenue: number;
    paidOrders: number;
    ticketsSold: number;
    attendeeCount: number;
    averageOrderValue: number;
    remainingInventory: number;
    occupancyPercentage: number;
  };
  ticketBreakdownByTier: Array<{
    tierId: string;
    name: string;
    ticketsSold: number;
    revenue: number;
  }>;
  seatStatusBreakdown: {
    available: number;
    reserved: number;
    sold: number;
    blocked: number;
    total: number;
  };
  dailySalesSeries: AdminSalesVelocityPoint[];
  recentOrders: Array<{
    id: string;
    customerEmail: string | null;
    totalAmount: number;
    status: "PAID";
    createdAt: string;
    ticketCount: number;
  }>;
};

export type AdminOrderListItem = {
  id: string;
  customerEmail: string | null;
  event: {
    id: string;
    title: string;
    date: string;
  };
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  ticketCount: number;
};

export type AdminOrderListResponse = {
  orders: AdminOrderListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminOrderDetail = {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  email: string | null;
  customer: {
    userId: string | null;
    email: string | null;
  };
  event: {
    id: string;
    title: string;
    date: string;
    venue: {
      name: string;
      location: string;
    };
  };
  payment: {
    provider: "STRIPE";
    status: "PENDING" | "SUCCESS" | "FAILED";
    paymentIntentId: string;
    amount: number;
    createdAt: string;
  } | null;
  tickets: Array<{
    id: string;
    code: string;
    status: TicketStatus;
    checkInStatus: CheckInStatus;
    checkedInAt: string | null;
    attendeeName: string | null;
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
  items: Array<{
    id: string;
    quantity: number;
    price: number;
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
};

export type AdminAttendee = {
  ticketId: string;
  attendeeName: string | null;
  customerEmail: string | null;
  ticketCode: string;
  ticketStatus: TicketStatus;
  checkInStatus: CheckInStatus;
  checkedInAt: string | null;
  seat: {
    section: string;
    row: string;
    seatNumber: string;
    label: string | null;
  } | null;
  tier: {
    id: string;
    name: string;
  } | null;
  orderId: string;
  orderStatus: OrderStatus;
  purchaseDate: string;
};

export type AdminAttendeeListResponse = {
  event: {
    id: string;
    title: string;
  };
  attendees: AdminAttendee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminTicketLookup = {
  id: string;
  code: string;
  status: TicketStatus;
  checkInStatus: CheckInStatus;
  checkedInAt: string | null;
  attendeeName: string | null;
  customerEmail: string | null;
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
    section: string;
    row: string;
    seatNumber: string;
    label: string | null;
  } | null;
  ticketTier: {
    id: string;
    name: string;
  } | null;
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

export async function getAdminAnalyticsOverview(): Promise<AdminAnalyticsOverview> {
  const response = await apiRequest<{ overview: AdminAnalyticsOverview }>(
    "/admin/analytics/overview"
  );
  return response.overview;
}

export async function getAdminEventPerformance(): Promise<AdminEventPerformance[]> {
  const response = await apiRequest<{ events: AdminEventPerformance[] }>(
    "/admin/analytics/events"
  );
  return response.events;
}

export async function getAdminEventAnalytics(
  eventId: string
): Promise<AdminEventAnalyticsDetail> {
  const response = await apiRequest<{ analytics: AdminEventAnalyticsDetail }>(
    `/admin/analytics/events/${eventId}`
  );
  return response.analytics;
}

export async function getAdminSalesVelocity(eventId?: string): Promise<AdminSalesVelocity> {
  const params = new URLSearchParams();

  if (eventId) {
    params.set("eventId", eventId);
  }

  const path = params.toString()
    ? `/admin/analytics/sales-velocity?${params.toString()}`
    : "/admin/analytics/sales-velocity";
  const response = await apiRequest<{ velocity: AdminSalesVelocity }>(path);

  return response.velocity;
}

export type AdminOrdersQuery = {
  eventId?: string;
  status?: OrderStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export async function getAdminOrders(
  query: AdminOrdersQuery = {}
): Promise<AdminOrderListResponse> {
  const params = new URLSearchParams();

  if (query.eventId) {
    params.set("eventId", query.eventId);
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.search && query.search.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.page) {
    params.set("page", String(query.page));
  }

  if (query.limit) {
    params.set("limit", String(query.limit));
  }

  const path = params.toString()
    ? `/admin/orders?${params.toString()}`
    : "/admin/orders";

  return apiRequest<AdminOrderListResponse>(path);
}

export async function exportAdminOrdersCsv(
  query: AdminOrdersQuery = {}
): Promise<{
  filename: string;
  blob: Blob;
}> {
  const params = new URLSearchParams();

  if (query.eventId) {
    params.set("eventId", query.eventId);
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.search && query.search.trim()) {
    params.set("search", query.search.trim());
  }

  const path = params.toString()
    ? `/admin/orders/export?${params.toString()}`
    : "/admin/orders/export";

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include"
  });

  if (!response.ok) {
    const responseType = response.headers.get("content-type") ?? "";

    if (responseType.includes("application/json")) {
      const body = (await response.json()) as {
        message?: string;
      };
      throw new ApiError(response.status, body.message ?? "Unable to export orders.");
    }

    const text = await response.text();
    throw new ApiError(response.status, text || "Unable to export orders.");
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const matchedFilename = disposition.match(/filename=\"?([^"]+)\"?/i)?.[1];

  return {
    filename: matchedFilename ?? "orders.csv",
    blob: await response.blob()
  };
}

export async function getAdminOrderById(orderId: string): Promise<AdminOrderDetail> {
  const response = await apiRequest<{ order: AdminOrderDetail }>(
    `/admin/orders/${orderId}`
  );

  return response.order;
}

type AdminAttendeesQuery = {
  search?: string;
  status?: TicketStatus;
  page?: number;
  limit?: number;
};

export async function getAdminEventAttendees(
  eventId: string,
  query: AdminAttendeesQuery = {}
): Promise<AdminAttendeeListResponse> {
  const params = new URLSearchParams();

  if (query.search && query.search.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.page) {
    params.set("page", String(query.page));
  }

  if (query.limit) {
    params.set("limit", String(query.limit));
  }

  const path = params.toString()
    ? `/admin/events/${eventId}/attendees?${params.toString()}`
    : `/admin/events/${eventId}/attendees`;

  return apiRequest<AdminAttendeeListResponse>(path);
}

export async function exportAdminEventAttendeesCsv(
  eventId: string,
  query: AdminAttendeesQuery = {}
): Promise<{
  filename: string;
  blob: Blob;
}> {
  const params = new URLSearchParams();

  if (query.search && query.search.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.page) {
    params.set("page", String(query.page));
  }

  if (query.limit) {
    params.set("limit", String(query.limit));
  }

  const path = params.toString()
    ? `/admin/events/${eventId}/attendees/export?${params.toString()}`
    : `/admin/events/${eventId}/attendees/export`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include"
  });

  if (!response.ok) {
    const responseType = response.headers.get("content-type") ?? "";

    if (responseType.includes("application/json")) {
      const body = (await response.json()) as {
        message?: string;
      };
      throw new ApiError(response.status, body.message ?? "Unable to export attendees.");
    }

    const text = await response.text();
    throw new ApiError(response.status, text || "Unable to export attendees.");
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const matchedFilename = disposition.match(/filename=\"?([^"]+)\"?/i)?.[1];

  return {
    filename: matchedFilename ?? `event-${eventId}-attendees.csv`,
    blob: await response.blob()
  };
}

export async function lookupAdminTicketByCode(code: string): Promise<AdminTicketLookup> {
  const response = await apiRequest<{ ticket: AdminTicketLookup }>(
    `/admin/tickets/lookup?code=${encodeURIComponent(code)}`
  );
  return response.ticket;
}

export async function checkInAdminTicket(ticketId: string): Promise<{
  id: string;
  code: string;
  status: TicketStatus;
  checkInStatus: CheckInStatus;
  checkedInAt: string | null;
}> {
  const response = await apiRequest<{
    ticket: {
      id: string;
      code: string;
      status: TicketStatus;
      checkInStatus: CheckInStatus;
      checkedInAt: string | null;
    };
  }>(`/admin/tickets/${ticketId}/check-in`, {
    method: "POST"
  });

  return response.ticket;
}
