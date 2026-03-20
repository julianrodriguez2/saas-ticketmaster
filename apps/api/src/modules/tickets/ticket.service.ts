import { customAlphabet } from "nanoid";
import {
  prisma,
  type CheckInStatus,
  type Prisma,
  type Role,
  type TicketStatus
} from "@ticketing/db";
import QRCode from "qrcode";
import { createAdminNotificationSafe } from "../admin-notifications/adminNotification.service";
import { recordSystemEvent, recordSystemEventSafe } from "../system-events/systemEvent.service";

const generateTicketCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 10);

type Requester = {
  userId: string;
  role: Role;
};

export class TicketServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function issueTicketsForOrder(orderId: string): Promise<{
  orderId: string;
  ticketCount: number;
  alreadyIssued: boolean;
  tickets: Array<{
    id: string;
    code: string;
    status: TicketStatus;
  }>;
}> {
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      where: {
        id: orderId
      },
      include: {
        items: {
          select: {
            id: true,
            seatId: true,
            ticketTierId: true,
            quantity: true
          }
        },
        tickets: {
          select: {
            id: true,
            code: true,
            status: true
          }
        }
      }
    });

    if (!order) {
      throw new TicketServiceError(404, "Order not found for ticket issuance.");
    }

    if (order.status !== "PAID") {
      throw new TicketServiceError(409, "Tickets can only be issued for paid orders.");
    }

    if (order.tickets.length > 0) {
      return {
        orderId,
        ticketCount: order.tickets.length,
        alreadyIssued: true,
        tickets: order.tickets
      };
    }

    const ticketDrafts: Array<{
      seatId: string | null;
      ticketTierId: string | null;
    }> = [];

    for (const item of order.items) {
      if (item.seatId) {
        ticketDrafts.push({
          seatId: item.seatId,
          ticketTierId: item.ticketTierId
        });
        continue;
      }

      if (!item.ticketTierId || item.quantity <= 0) {
        throw new TicketServiceError(500, "Order items cannot be converted into tickets.");
      }

      for (let count = 0; count < item.quantity; count += 1) {
        ticketDrafts.push({
          seatId: null,
          ticketTierId: item.ticketTierId
        });
      }
    }

    if (ticketDrafts.length === 0) {
      throw new TicketServiceError(500, "No ticket data found for issuance.");
    }

    for (const draft of ticketDrafts) {
      await createTicketWithUniqueCode(transaction, {
        orderId: order.id,
        eventId: order.eventId,
        userId: order.userId,
        seatId: draft.seatId,
        ticketTierId: draft.ticketTierId
      });
    }

    const issuedTickets = await transaction.ticket.findMany({
      where: {
        orderId: order.id
      },
      select: {
        id: true,
        code: true,
        status: true
      },
      orderBy: {
        issuedAt: "asc"
      }
    });

    await recordSystemEvent(
      {
        type: "TICKET_ISSUED",
        entityType: "ORDER",
        entityId: order.id,
        message: `Issued ${issuedTickets.length} ticket(s) for order ${order.id}.`,
        metadata: {
          ticketCount: issuedTickets.length
        }
      },
      transaction
    );

    return {
      orderId,
      ticketCount: issuedTickets.length,
      alreadyIssued: false,
      tickets: issuedTickets
    };
  });
}

export async function getTicketById(
  ticketId: string,
  requester: Requester
): Promise<{
  id: string;
  code: string;
  status: TicketStatus;
  checkInStatus: CheckInStatus;
  checkedInAt: Date | null;
  issuedAt: Date;
  attendeeName: string | null;
  event: {
    id: string;
    title: string;
    date: Date;
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
}> {
  const ticket = await prisma.ticket.findUnique({
    where: {
      id: ticketId
    },
    include: {
      order: {
        select: {
          userId: true
        }
      },
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          venue: {
            select: {
              name: true,
              location: true
            }
          }
        }
      },
      seat: {
        select: {
          id: true,
          seatNumber: true,
          label: true,
          row: {
            select: {
              label: true,
              section: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      },
      ticketTier: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!ticket) {
    throw new TicketServiceError(404, "Ticket not found.");
  }

  const ownerUserId = ticket.userId ?? ticket.order.userId;

  if (requester.role !== "ADMIN") {
    if (!ownerUserId || ownerUserId !== requester.userId) {
      throw new TicketServiceError(403, "You are not authorized to view this ticket.");
    }
  }

  const qrPayload = ticket.qrCodeData ?? JSON.stringify({
    ticketCode: ticket.code,
    eventId: ticket.eventId,
    orderId: ticket.orderId
  });

  const qrCodeImage = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 360
  });

  return {
    id: ticket.id,
    code: ticket.code,
    status: ticket.status,
    checkInStatus: ticket.checkInStatus,
    checkedInAt: ticket.checkedInAt,
    issuedAt: ticket.issuedAt,
    attendeeName: ticket.attendeeName,
    event: {
      id: ticket.event.id,
      title: ticket.event.title,
      date: ticket.event.date,
      venue: {
        name: ticket.event.venue.name,
        location: ticket.event.venue.location
      }
    },
    seat: ticket.seat
      ? {
          id: ticket.seat.id,
          section: ticket.seat.row.section.name,
          row: ticket.seat.row.label,
          seatNumber: ticket.seat.seatNumber,
          label: ticket.seat.label
        }
      : null,
    ticketTier: ticket.ticketTier,
    qrCodeImage
  };
}

export async function getTicketByCode(code: string): Promise<{
  id: string;
  code: string;
  status: TicketStatus;
  checkInStatus: CheckInStatus;
  checkedInAt: Date | null;
  orderId: string;
  eventId: string;
  seatId: string | null;
  ticketTierId: string | null;
}> {
  const ticket = await prisma.ticket.findUnique({
    where: {
      code
    },
    select: {
      id: true,
      code: true,
      status: true,
      checkInStatus: true,
      checkedInAt: true,
      orderId: true,
      eventId: true,
      seatId: true,
      ticketTierId: true
    }
  });

  if (!ticket) {
    throw new TicketServiceError(404, "Ticket code not found.");
  }

  return ticket;
}

export async function lookupTicketForAdmin(code: string): Promise<{
  id: string;
  code: string;
  status: TicketStatus;
  checkInStatus: CheckInStatus;
  checkedInAt: Date | null;
  attendeeName: string | null;
  customerEmail: string | null;
  event: {
    id: string;
    title: string;
    date: Date;
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
}> {
  const ticket = await prisma.ticket.findUnique({
    where: {
      code
    },
    include: {
      order: {
        select: {
          email: true,
          user: {
            select: {
              email: true
            }
          }
        }
      },
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          venue: {
            select: {
              name: true,
              location: true
            }
          }
        }
      },
      seat: {
        select: {
          seatNumber: true,
          label: true,
          row: {
            select: {
              label: true,
              section: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      },
      ticketTier: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!ticket) {
    throw new TicketServiceError(404, "Ticket code not found.");
  }

  return {
    id: ticket.id,
    code: ticket.code,
    status: ticket.status,
    checkInStatus: ticket.checkInStatus,
    checkedInAt: ticket.checkedInAt,
    attendeeName: ticket.attendeeName,
    customerEmail: ticket.order.email ?? ticket.order.user?.email ?? null,
    event: {
      id: ticket.event.id,
      title: ticket.event.title,
      date: ticket.event.date,
      venue: {
        name: ticket.event.venue.name,
        location: ticket.event.venue.location
      }
    },
    seat: ticket.seat
      ? {
          section: ticket.seat.row.section.name,
          row: ticket.seat.row.label,
          seatNumber: ticket.seat.seatNumber,
          label: ticket.seat.label
        }
      : null,
    ticketTier: ticket.ticketTier
  };
}

export async function checkInTicket(ticketId: string): Promise<{
  id: string;
  code: string;
  status: TicketStatus;
  checkInStatus: CheckInStatus;
  checkedInAt: Date | null;
}> {
  const ticket = await prisma.ticket.findUnique({
    where: {
      id: ticketId
    },
    select: {
      id: true,
      code: true,
      status: true,
      checkInStatus: true,
      checkedInAt: true,
      eventId: true
    }
  });

  if (!ticket) {
    throw new TicketServiceError(404, "Ticket not found.");
  }

  if (ticket.status !== "ACTIVE") {
    await createAdminNotificationSafe({
      type: "CHECKIN_BLOCKED_INVALID_STATUS",
      severity: "WARNING",
      title: "Ticket check-in blocked",
      message: `Ticket ${ticket.code} cannot be checked in because status is ${ticket.status}.`,
      relatedTicketId: ticket.id,
      relatedEventId: ticket.eventId,
      dedupeKey: `checkin-invalid-status:${ticket.id}:${new Date().toISOString().slice(0, 13)}`
    });

    await recordSystemEventSafe({
      type: "CHECKIN_BLOCKED_INVALID_STATUS",
      entityType: "TICKET",
      entityId: ticket.id,
      message: "Check-in blocked because ticket status is not ACTIVE.",
      metadata: {
        status: ticket.status
      }
    });
    throw new TicketServiceError(409, "Only active tickets can be checked in.");
  }

  if (ticket.checkInStatus === "CHECKED_IN") {
    await createAdminNotificationSafe({
      type: "DOUBLE_CHECKIN_BLOCKED",
      severity: "WARNING",
      title: "Duplicate check-in blocked",
      message: `Ticket ${ticket.code} was already checked in.`,
      relatedTicketId: ticket.id,
      relatedEventId: ticket.eventId,
      dedupeKey: `double-checkin:${ticket.id}:${new Date().toISOString().slice(0, 13)}`
    });

    await recordSystemEventSafe({
      type: "DOUBLE_CHECKIN_BLOCKED",
      entityType: "TICKET",
      entityId: ticket.id,
      message: `Duplicate check-in blocked for ticket ${ticket.code}.`
    });

    throw new TicketServiceError(409, "Ticket has already been checked in.");
  }

  const checkedInAt = new Date();
  const updateResult = await prisma.ticket.updateMany({
    where: {
      id: ticket.id,
      status: "ACTIVE",
      checkInStatus: "NOT_CHECKED_IN"
    },
    data: {
      checkInStatus: "CHECKED_IN",
      checkedInAt
    }
  });

  if (updateResult.count !== 1) {
    await createAdminNotificationSafe({
      type: "DOUBLE_CHECKIN_BLOCKED",
      severity: "WARNING",
      title: "Duplicate check-in blocked",
      message: `Ticket ${ticket.code} could not be checked in due to a concurrent update.`,
      relatedTicketId: ticket.id,
      relatedEventId: ticket.eventId,
      dedupeKey: `double-checkin-race:${ticket.id}:${new Date().toISOString().slice(0, 13)}`
    });

    await recordSystemEventSafe({
      type: "DOUBLE_CHECKIN_BLOCKED",
      entityType: "TICKET",
      entityId: ticket.id,
      message: `Check-in race prevented duplicate check-in for ticket ${ticket.code}.`
    });

    throw new TicketServiceError(409, "Ticket has already been checked in.");
  }

  const updatedTicket = await prisma.ticket.findUnique({
    where: {
      id: ticket.id
    },
    select: {
      id: true,
      code: true,
      status: true,
      checkInStatus: true,
      checkedInAt: true
    }
  });

  if (!updatedTicket) {
    throw new TicketServiceError(404, "Ticket not found after check-in.");
  }

  await recordSystemEventSafe({
    type: "TICKET_CHECKED_IN",
    entityType: "TICKET",
    entityId: updatedTicket.id,
    message: `Ticket ${updatedTicket.code} checked in successfully.`
  });

  return updatedTicket;
}

async function createTicketWithUniqueCode(
  transaction: Prisma.TransactionClient,
  input: {
    orderId: string;
    eventId: string;
    userId: string | null;
    seatId: string | null;
    ticketTierId: string | null;
  }
): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateTicketCode();
    const qrCodeData = JSON.stringify({
      ticketCode: code,
      eventId: input.eventId,
      orderId: input.orderId
    });

    try {
      await transaction.ticket.create({
        data: {
          orderId: input.orderId,
          eventId: input.eventId,
          userId: input.userId,
          seatId: input.seatId,
          ticketTierId: input.ticketTierId,
          code,
          qrCodeData,
          status: "ACTIVE",
          checkInStatus: "NOT_CHECKED_IN"
        }
      });

      return;
    } catch (error) {
      if (isUniqueCodeError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new TicketServiceError(500, "Unable to generate a unique ticket code.");
}

function isUniqueCodeError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
  );
}
