import { getDatabaseAdapter } from "@/lib/adapters";
import type { GroupBooking, GroupBookingParticipant, GroupBookingTimeSlot } from "@/lib/types/domain";

export class GroupBookingService {
  constructor() {
    this.adapter = getDatabaseAdapter();
  }
  private adapter: ReturnType<typeof getDatabaseAdapter>;

  async createGroupBooking(data: {
    organizerId: string;
    venueId: string;
    courtId: string;
    sportId: string;
    title: string;
    description?: string;
    minParticipants: number;
    maxParticipants: number;
    pricePerSlot: number;
    deadline?: string;
  }): Promise<GroupBooking> {
    // Validation
    const validation = validateCreateGroupBooking(data);
    if (!validation.success) {
      throw new Error(
        validation.errors?.join(', ') ?? 'Validation error'
      );
    }
    return this.adapter.createGroupBooking(data);
  }

  async getGroupBooking(id: string): Promise<GroupBooking | null> {
    return this.adapter.getGroupBookingById(id);
  }

  async getGroupBookingDetail(id: string): Promise<import("@/lib/types/domain").GroupBookingDetail | null> {
    return this.adapter.getGroupBookingDetail(id);
  }

  async getMyGroupBookings(organizerId: string): Promise<GroupBooking[]> {
    return this.adapter.getGroupBookingsByOrganizer(organizerId);
  }

  async setStatus(id: string, status: GroupBooking["status"], bookingId?: string): Promise<GroupBooking> {
    return this.adapter.updateGroupBookingStatus(id, status, bookingId);
  }

  async delete(id: string): Promise<void> {
    await this.adapter.deleteGroupBooking(id);
  }

  // Participants
  async addParticipant(groupBookingId: string, customerId: string, isOrganizer = false): Promise<GroupBookingParticipant> {
    return this.adapter.addGroupBookingParticipant(groupBookingId, customerId, isOrganizer);
  }
  async getParticipants(groupBookingId: string): Promise<GroupBookingParticipant[]> {
    return this.adapter.getGroupBookingParticipants(groupBookingId);
  }
  async getParticipant(groupBookingId: string, customerId: string): Promise<GroupBookingParticipant | null> {
    return this.adapter.getGroupBookingParticipant(groupBookingId, customerId);
  }
  async updateParticipantStatus(
    groupBookingId: string,
    customerId: string,
    status: GroupBookingParticipant["status"],
    availability?: string[]
  ): Promise<GroupBookingParticipant> {
    return this.adapter.updateGroupBookingParticipantStatus(groupBookingId, customerId, status, availability);
  }
  async getParticipantById(id: string): Promise<GroupBookingParticipant | null> {
    return this.adapter.getGroupBookingParticipantById(id);
  }

  // Time Slots
  async getTimeSlots(groupBookingId: string): Promise<GroupBookingTimeSlot[]> {
    return this.adapter.getGroupBookingTimeSlots(groupBookingId);
  }
  async addTimeSlot(data: { groupBookingId: string; slotDate: string; startTime: string; endTime: string }): Promise<GroupBookingTimeSlot> {
    return this.adapter.addGroupBookingTimeSlot(data);
  }
  async getTimeSlot(id: string): Promise<GroupBookingTimeSlot | null> {
    return this.adapter.getGroupBookingTimeSlotById(id);
  }
  async voteTimeSlot(timeSlotId: string, customerId: string): Promise<GroupBookingTimeSlot> {
    return this.adapter.voteGroupBookingTimeSlot(timeSlotId, customerId);
  }
  async markWinner(groupBookingId: string, timeSlotId: string): Promise<GroupBookingTimeSlot> {
    return this.adapter.markGroupBookingWinner(groupBookingId, timeSlotId);
  }
}

// Standalone validation
function validateCreateGroupBooking(input: {
  organizerId: string;
  venueId: string;
  courtId: string;
  sportId: string;
  title: string;
  description?: string;
  minParticipants: number;
  maxParticipants: number;
  pricePerSlot: number;
  deadline?: string;
}): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  if (!input.organizerId) errors.push("Organizer ID missing");
  if (!input.venueId) errors.push("Venue ID missing");
  if (!input.courtId) errors.push("Court ID missing");
  if (!input.sportId) errors.push("Sport ID missing");
  if (!input.title || input.title.trim().length < 3) errors.push("Title too short");
  if (input.minParticipants < 2) errors.push("Min participants < 2");
  if (input.maxParticipants < input.minParticipants) errors.push("Max < min");
  if (errors.length > 0) return { success: false, errors };
  return { success: true };
}
