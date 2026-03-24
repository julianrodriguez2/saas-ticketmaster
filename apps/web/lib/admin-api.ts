import { API_BASE_URL, ApiError, apiRequest, type ApiPaginationMeta } from "./api";

export type TicketingMode = "GA" | "RESERVED";
export type SeatStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";
export type OrderStatus = "PENDING" | "PAID" | "FAILED";
export type TicketStatus = "ACTIVE" | "USED" | "CANCELLED";
export type CheckInStatus = "NOT_CHECKED_IN" | "CHECKED_IN";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type NotificationSeverity = "INFO" | "WARNING" | "CRITICAL";
export type PresaleAccessType = "PUBLIC" | "CODE" | "LINK_ONLY";
export type PublishStatus = "DRAFT" | "PUBLISHED";
export type BulkImportJobStatus =
  | "PENDING"
  | "VALIDATED"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL";

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
  currency: string;
  salesStartAt: string | null;
  salesEndAt: string | null;
  publishStatus: PublishStatus;
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
  currency: string;
  salesStartAt: string | null;
  salesEndAt: string | null;
  publishStatus: PublishStatus;
  seatMapExists: boolean;
  activePresale: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    accessType: PresaleAccessType;
  } | null;
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
  currency?: string;
  salesStartAt?: string;
  salesEndAt?: string;
  publishStatus?: PublishStatus;
  ticketTiers: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
};

export type TemplateTicketTierInput = {
  name: string;
  price: number;
  quantity: number;
  sortOrder?: number;
};

export type TemplatePresaleInput = {
  name: string;
  startsAtOffsetHours?: number;
  endsAtOffsetHours?: number;
  accessType: PresaleAccessType;
  accessCode?: string;
  isActive?: boolean;
};

export type EventTemplate = {
  id: string;
  name: string;
  description: string | null;
  ticketingMode: TicketingMode;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
  venue: {
    id: string;
    name: string;
    location: string;
  } | null;
  ticketTiers: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    sortOrder: number;
  }>;
  templatePresales: Array<{
    id: string;
    name: string;
    startsAtOffsetHours: number | null;
    endsAtOffsetHours: number | null;
    accessType: PresaleAccessType;
    accessCode: string | null;
    isActive: boolean;
  }>;
};

export type EventTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  ticketingMode: TicketingMode;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
  venue: {
    id: string;
    name: string;
    location: string;
  } | null;
  tierCount: number;
  ticketTiers: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    sortOrder: number;
  }>;
  presaleCount: number;
};

export type EventTemplateInput = {
  name: string;
  description?: string;
  venueId?: string;
  ticketingMode: TicketingMode;
  defaultCurrency: string;
  ticketTiers: TemplateTicketTierInput[];
  templatePresales?: TemplatePresaleInput[];
};

export type ApplyTemplateInput = {
  title: string;
  description: string;
  date: string;
  venueId?: string;
  currency?: string;
  salesStartAt?: string;
  salesEndAt?: string;
  publishStatus?: PublishStatus;
  pricingOverrides?: TemplateTicketTierInput[];
};

export type PresaleRule = {
  id: string;
  eventId?: string;
  name: string;
  startsAt: string;
  endsAt: string;
  accessType: PresaleAccessType;
  accessCode: string | null;
  isActive: boolean;
  createdAt?: string;
};

export type PresaleRuleInput = {
  name: string;
  startsAt: string;
  endsAt: string;
  accessType: PresaleAccessType;
  accessCode?: string;
  isActive?: boolean;
};

export type ImportPreviewRow = {
  rowNumber: number;
  title: string;
  date: string;
  venue: string | null;
  ticketingMode: TicketingMode | null;
  currency: string;
  publishStatus: PublishStatus;
  templateId: string | null;
  warnings: string[];
  isValid: boolean;
};

export type ImportValidationError = {
  rowNumber: number;
  fieldName: string | null;
  message: string;
  rawRowJson: Record<string, unknown> | null;
};

export type ImportJobSummary = {
  id: string;
  fileName: string;
  status: BulkImportJobStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdAt: string;
  completedAt: string | null;
  createdBy: {
    id: string;
    email: string;
  };
};

export type ImportJobDetail = ImportJobSummary & {
  summaryJson: Record<string, unknown> | null;
  rowErrors: Array<{
    id: string;
    rowNumber: number;
    fieldName: string | null;
    message: string;
    rawRowJson: Record<string, unknown> | null;
    createdAt: string;
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
  riskLevel: RiskLevel;
  fraudFlags: string[];
  flaggedAt: string | null;
  reviewedAt: string | null;
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
  riskLevel: RiskLevel;
  fraudFlags: string[];
  flaggedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  customer: {
    userId: string | null;
    email: string | null;
  };
  review: {
    reviewedAt: string | null;
    reviewNotes: string | null;
    reviewedBy: {
      id: string;
      email: string;
    } | null;
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
    providerResponseCode: string | null;
    failureReason: string | null;
    createdAt: string;
  } | null;
  paymentAttempts: Array<{
    id: string;
    status: "STARTED" | "FAILED" | "SUCCEEDED" | "BLOCKED";
    reason: string | null;
    email: string | null;
    ipAddress: string | null;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    severity: NotificationSeverity;
    title: string;
    message: string;
    readAt: string | null;
    createdAt: string;
  }>;
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

export type AdminNotification = {
  id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  relatedOrderId: string | null;
  relatedEventId: string | null;
  relatedTicketId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type AdminNotificationListResponse = {
  notifications: AdminNotification[];
  pagination?: ApiPaginationMeta;
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
  const firstPageResponse = await apiRequest<
    | { events: AdminEventSummary[] }
    | { data: AdminEventSummary[]; meta: ApiPaginationMeta }
  >("/events?page=1&limit=100&sortBy=date&sortOrder=asc");

  if (!("data" in firstPageResponse)) {
    return firstPageResponse.events;
  }

  if (firstPageResponse.meta.totalPages <= 1) {
    return firstPageResponse.data;
  }

  const allEvents = [...firstPageResponse.data];

  for (let page = 2; page <= firstPageResponse.meta.totalPages; page += 1) {
    const pageResponse = await apiRequest<{ data: AdminEventSummary[]; meta: ApiPaginationMeta }>(
      `/events?page=${page}&limit=100&sortBy=date&sortOrder=asc`
    );
    allEvents.push(...pageResponse.data);
  }

  return allEvents;
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

export async function getEventTemplates(): Promise<EventTemplateSummary[]> {
  const response = await apiRequest<{ templates: EventTemplateSummary[] }>(
    "/admin/event-templates"
  );
  return response.templates;
}

export async function createEventTemplate(
  input: EventTemplateInput
): Promise<EventTemplate> {
  const response = await apiRequest<{ template: EventTemplate }>(
    "/admin/event-templates",
    {
      method: "POST",
      body: input
    }
  );

  return response.template;
}

export async function getEventTemplateById(templateId: string): Promise<EventTemplate> {
  const response = await apiRequest<{ template: EventTemplate }>(
    `/admin/event-templates/${templateId}`
  );

  return response.template;
}

export async function updateEventTemplate(
  templateId: string,
  input: EventTemplateInput
): Promise<EventTemplate> {
  const response = await apiRequest<{ template: EventTemplate }>(
    `/admin/event-templates/${templateId}`,
    {
      method: "PUT",
      body: input
    }
  );

  return response.template;
}

export async function deleteEventTemplate(templateId: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/admin/event-templates/${templateId}`, {
    method: "DELETE"
  });
}

export async function applyEventTemplate(
  templateId: string,
  input: ApplyTemplateInput
): Promise<AdminEventDetail> {
  const response = await apiRequest<{ event: AdminEventDetail }>(
    `/admin/event-templates/${templateId}/apply`,
    {
      method: "POST",
      body: input
    }
  );

  return response.event;
}

export async function getEventPresales(eventId: string): Promise<PresaleRule[]> {
  const response = await apiRequest<{ presales: PresaleRule[] }>(
    `/admin/events/${eventId}/presales`
  );

  return response.presales;
}

export async function createEventPresale(
  eventId: string,
  input: PresaleRuleInput
): Promise<PresaleRule> {
  const response = await apiRequest<{ presale: PresaleRule }>(
    `/admin/events/${eventId}/presales`,
    {
      method: "POST",
      body: input
    }
  );

  return response.presale;
}

export async function updatePresale(
  presaleId: string,
  input: PresaleRuleInput
): Promise<PresaleRule> {
  const response = await apiRequest<{ presale: PresaleRule }>(`/admin/presales/${presaleId}`, {
    method: "PUT",
    body: input
  });

  return response.presale;
}

export async function deletePresale(presaleId: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/admin/presales/${presaleId}`, {
    method: "DELETE"
  });
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
  sortBy?: "createdAt" | "totalAmount" | "flaggedAt";
  sortOrder?: "asc" | "desc";
};

export type AdminFlaggedOrdersQuery = AdminOrdersQuery & {
  riskLevel?: Extract<RiskLevel, "MEDIUM" | "HIGH">;
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

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const path = params.toString()
    ? `/admin/orders?${params.toString()}`
    : "/admin/orders";

  const response = await apiRequest<
    | AdminOrderListResponse
    | { data: AdminOrderListItem[]; meta: ApiPaginationMeta }
  >(path);

  if ("data" in response && "meta" in response) {
    return {
      orders: response.data,
      pagination: response.meta
    };
  }

  return response;
}

export async function getFlaggedAdminOrders(
  query: AdminFlaggedOrdersQuery = {}
): Promise<AdminOrderListResponse> {
  const params = new URLSearchParams();

  if (query.eventId) {
    params.set("eventId", query.eventId);
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.riskLevel) {
    params.set("riskLevel", query.riskLevel);
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

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const path = params.toString()
    ? `/admin/orders/flagged?${params.toString()}`
    : "/admin/orders/flagged";

  const response = await apiRequest<
    | AdminOrderListResponse
    | { data: AdminOrderListItem[]; meta: ApiPaginationMeta }
  >(path);

  if ("data" in response && "meta" in response) {
    return {
      orders: response.data,
      pagination: response.meta
    };
  }

  return response;
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
      throw new ApiError({
        statusCode: response.status,
        message: body.message ?? "Unable to export orders."
      });
    }

    const text = await response.text();
    throw new ApiError({
      statusCode: response.status,
      message: text || "Unable to export orders."
    });
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

export async function reviewAdminOrder(
  orderId: string,
  reviewNotes?: string
): Promise<{
  id: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  reviewedByUserId: string | null;
}> {
  const response = await apiRequest<{
    review: {
      id: string;
      reviewedAt: string | null;
      reviewNotes: string | null;
      reviewedByUserId: string | null;
    };
  }>(`/admin/orders/${orderId}/review`, {
    method: "POST",
    body: {
      reviewNotes
    }
  });

  return response.review;
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

  const response = await apiRequest<
    | AdminAttendeeListResponse
    | {
        event: {
          id: string;
          title: string;
        };
        data: AdminAttendee[];
        meta: ApiPaginationMeta;
      }
  >(path);

  if ("data" in response && "meta" in response) {
    return {
      event: response.event,
      attendees: response.data,
      pagination: response.meta
    };
  }

  return response;
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
      throw new ApiError({
        statusCode: response.status,
        message: body.message ?? "Unable to export attendees."
      });
    }

    const text = await response.text();
    throw new ApiError({
      statusCode: response.status,
      message: text || "Unable to export attendees."
    });
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

export async function getAdminNotifications(query?: {
  unreadOnly?: boolean;
  severity?: NotificationSeverity;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<AdminNotificationListResponse> {
  const params = new URLSearchParams();

  if (query?.unreadOnly) {
    params.set("unreadOnly", "true");
  }

  if (query?.severity) {
    params.set("severity", query.severity);
  }

  if (query?.type) {
    params.set("type", query.type);
  }

  if (query?.page) {
    params.set("page", String(query.page));
  }

  if (query?.limit) {
    params.set("limit", String(query.limit));
  }

  const path = params.toString()
    ? `/admin/notifications?${params.toString()}`
    : "/admin/notifications";

  const response = await apiRequest<
    | AdminNotificationListResponse
    | { data: AdminNotification[]; meta: ApiPaginationMeta }
  >(path);

  if ("data" in response && "meta" in response) {
    return {
      notifications: response.data,
      pagination: response.meta
    };
  }

  return response;
}

export async function markAdminNotificationRead(notificationId: string): Promise<{
  id: string;
  readAt: string | null;
}> {
  const response = await apiRequest<{
    notification: {
      id: string;
      readAt: string | null;
    };
  }>(`/admin/notifications/${notificationId}/read`, {
    method: "POST"
  });

  return response.notification;
}

export async function markAllAdminNotificationsRead(): Promise<{
  count: number;
}> {
  return apiRequest<{ count: number }>("/admin/notifications/read-all", {
    method: "POST"
  });
}

export async function validateEventImportCsv(file: File): Promise<{
  importJob: {
    id: string;
    fileName: string;
    status: BulkImportJobStatus;
    totalRows: number;
    successRows: number;
    failedRows: number;
    createdAt: string;
    completedAt: string | null;
  };
  previewRows: ImportPreviewRow[];
  validationErrors: ImportValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch(`${API_BASE_URL}/admin/imports/events/validate`, {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  if (!response.ok) {
    await throwApiErrorFromResponse(response, "Unable to validate CSV import.");
  }

  return (await response.json()) as {
    importJob: {
      id: string;
      fileName: string;
      status: BulkImportJobStatus;
      totalRows: number;
      successRows: number;
      failedRows: number;
      createdAt: string;
      completedAt: string | null;
    };
    previewRows: ImportPreviewRow[];
    validationErrors: ImportValidationError[];
    summary: {
      totalRows: number;
      validRows: number;
      invalidRows: number;
    };
  };
}

export async function commitEventImport(importJobId: string): Promise<{
  importJobId: string;
  successCount: number;
  failedCount: number;
  createdEventIds: string[];
  errorSummary: Array<{
    rowNumber: number;
    message: string;
    fieldName?: string;
  }>;
}> {
  return apiRequest<{
    importJobId: string;
    successCount: number;
    failedCount: number;
    createdEventIds: string[];
    errorSummary: Array<{
      rowNumber: number;
      message: string;
      fieldName?: string;
    }>;
  }>("/admin/imports/events/commit", {
    method: "POST",
    body: {
      importJobId
    }
  });
}

export async function getImportJobs(query?: {
  page?: number;
  limit?: number;
}): Promise<{
  jobs: ImportJobSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const params = new URLSearchParams();

  if (query?.page) {
    params.set("page", String(query.page));
  }

  if (query?.limit) {
    params.set("limit", String(query.limit));
  }

  const path = params.toString()
    ? `/admin/imports?${params.toString()}`
    : "/admin/imports";

  const response = await apiRequest<
    | {
        jobs: ImportJobSummary[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }
    | {
        data: ImportJobSummary[];
        meta: ApiPaginationMeta;
      }
  >(path);

  if ("data" in response && "meta" in response) {
    return {
      jobs: response.data,
      pagination: response.meta
    };
  }

  return response;
}

export async function getImportJobById(importJobId: string): Promise<ImportJobDetail> {
  const response = await apiRequest<{ job: ImportJobDetail }>(`/admin/imports/${importJobId}`);
  return response.job;
}

async function throwApiErrorFromResponse(
  response: Response,
  fallbackMessage: string
): Promise<never> {
  const responseType = response.headers.get("content-type") ?? "";

  if (responseType.includes("application/json")) {
    const body = (await response.json()) as {
      message?: string;
    };
    throw new ApiError({
      statusCode: response.status,
      message: body.message ?? fallbackMessage
    });
  }

  const text = await response.text();
  throw new ApiError({
    statusCode: response.status,
    message: text || fallbackMessage
  });
}
