import type {
  DatabaseAdapter,
  CreateBookingInput,
  UpdateCourtInput,
  CreatePricingRuleInput,
  UpdatePricingRuleInput,
  CreateBlockedSlotInput,
  VoucherRow,
} from "./database-adapter";
import type {
  Area,
  Booking,
  BlockedSlot,
  Court,
  PricingRule,
  Sport,
  Venue,
  AuditLogEntry,
  PaymentMethod,
  NotificationLog,
  NotificationPayload,
  AdminUser,
  Customer,
  CustomerPublic,
  LoyaltyTransaction,
  LoyaltyTransactionType,
  Reward,
  RewardRedemption,
  Province,
  City,
  District,
  Village,
  RegionOption,
  VenueOwner,
  Review,
  ReviewWithDetails,
  CourtPhoto,
  ReviewPhoto,
  VenueOwnerStatus,
  PickupGame,
  PickupGameParticipant,
  PickupGameMessage,
  TeamWallet,
  TeamWalletMember,
  TeamWalletDeposit,
  TeamWalletTransaction,
  TeamWalletSplit,
  TeamWalletSplitMember,
  PlayerProfile,
  PlayerSkillRating,
  MatchRequest,
  Achievement,
  PlayerAchievement,
  PlayerStreak,
  FlashDeal,
  VenueCamera,
  VenueVerification,
  VenueVerificationPhoto,
  LoyaltyTier,
  GroupBooking,
  GroupBookingParticipant,
  GroupBookingTimeSlot,
  GroupBookingDetail,
} from "@/lib/types/domain";
import {
  mockSports,
  mockVenues,
  mockCourts,
  mockPricingRules,
  mockAreas,
  mockVenueOwners,
} from "@/lib/mock-data";
import { hashPassword, verifyPassword } from "@/lib/auth/jwt";

// Use globalThis for all stores to survive Next.js dev module reloading
const g = globalThis as unknown as {
  __lapabookBookings: Booking[];
  __lapabookPricingRules: PricingRule[];
  __lapabookBlockedSlots: BlockedSlot[];
  __lapabookAuditLog: AuditLogEntry[];
  __lapabookNotifications: NotificationLog[];
  __lapabookAdmins: AdminUser[];
  __lapabookCustomers: Customer[];
  __lapabookLoyalty: LoyaltyTransaction[];
  __lapabookRewards: Reward[];
  __lapabookRedemptions: RewardRedemption[];
  __lapabookPaymentMethods: PaymentMethod[];
  __lapabookAreas: Area[];
  __lapabookVenueOwners: VenueOwner[];
};

function getBookings(): Booking[] {
  if (!g.__lapabookBookings) g.__lapabookBookings = [];
  return g.__lapabookBookings;
}
function getPricingRules(): PricingRule[] {
  if (!g.__lapabookPricingRules) g.__lapabookPricingRules = [...mockPricingRules];
  return g.__lapabookPricingRules;
}
function getBlockedSlots(): BlockedSlot[] {
  if (!g.__lapabookBlockedSlots) g.__lapabookBlockedSlots = [];
  return g.__lapabookBlockedSlots;
}
function getAuditLog(): AuditLogEntry[] {
  if (!g.__lapabookAuditLog) g.__lapabookAuditLog = [];
  return g.__lapabookAuditLog;
}
function getNotifications(): NotificationLog[] {
  if (!g.__lapabookNotifications) g.__lapabookNotifications = [];
  return g.__lapabookNotifications;
}
function getAdmins(): AdminUser[] {
  if (!g.__lapabookAdmins) {
    g.__lapabookAdmins = [
      {
        id: "admin-1",
        username: "superadmin",
        name: "Super Admin",
        email: "admin@lapabook.id",
        passwordHash: hashPassword("Admin123!@#"),
        role: "super_admin",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "owner-1",
        username: "venueowner",
        name: "Venue Owner",
        email: "owner@lapabook.id",
        passwordHash: hashPassword("Owner123!@#"),
        role: "admin",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return g.__lapabookAdmins;
}
function getCustomers(): Customer[] {
  if (!g.__lapabookCustomers) g.__lapabookCustomers = [];
  return g.__lapabookCustomers;
}
function getLoyalty(): LoyaltyTransaction[] {
  if (!g.__lapabookLoyalty) g.__lapabookLoyalty = [];
  return g.__lapabookLoyalty;
}
function getRewards(): Reward[] {
  if (!g.__lapabookRewards) {
    g.__lapabookRewards = [
      {
        id: "reward-1",
        name: "Diskon 10%",
        description: "Potongan harga 10% untuk booking berikutnya",
        type: "discount_percentage",
        pointsCost: 500,
        value: 10,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "reward-2",
        name: "Diskon Rp 25.000",
        description: "Potongan harga Rp 25.000 untuk booking berikutnya",
        type: "discount_amount",
        pointsCost: 750,
        value: 25000,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "reward-3",
        name: "Bonus 1 Jam",
        description: "Gratis 1 jam tambahan untuk booking berikutnya",
        type: "free_hour",
        pointsCost: 1000,
        value: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "reward-4",
        name: "Gratis 1 Sesi (2 Jam)",
        description: "Gratis booking 1 sesi penuh (2 jam)",
        type: "free_session",
        pointsCost: 2500,
        value: 2,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return g.__lapabookRewards;
}
function getRedemptions(): RewardRedemption[] {
  if (!g.__lapabookRedemptions) g.__lapabookRedemptions = [];
  return g.__lapabookRedemptions;
}
function getAreas(): Area[] {
  if (!g.__lapabookAreas) g.__lapabookAreas = mockAreas.map((a: Area) => ({ ...a }));
  return g.__lapabookAreas;
}
function getVenueOwners(): VenueOwner[] {
  if (!g.__lapabookVenueOwners) g.__lapabookVenueOwners = mockVenueOwners.map(o => ({ ...o }));
  return g.__lapabookVenueOwners;
}
function getPaymentMethods(): PaymentMethod[] {
  if (!g.__lapabookPaymentMethods) {
    g.__lapabookPaymentMethods = [
      {
        id: "pm-1",
        name: "BCA Transfer",
        label: "BCA Transfer",
        type: "bank_transfer",
        accountName: "PT Lapabook Indonesia",
        accountNumber: "1234567890",
        provider: "BCA",
        details: "BCA 1234567890 a/n PT Lapabook Indonesia",
        instructions: "Transfer ke rekening BCA di atas, lalu upload bukti transfer.",
        isActive: true,
      },
      {
        id: "pm-2",
        name: "Mandiri Transfer",
        label: "Mandiri Transfer",
        type: "bank_transfer",
        accountName: "PT Lapabook Indonesia",
        accountNumber: "0987654321",
        provider: "Mandiri",
        details: "Mandiri 0987654321 a/n PT Lapabook Indonesia",
        instructions: "Transfer ke rekening Mandiri di atas, lalu upload bukti transfer.",
        isActive: true,
      },
      {
        id: "pm-3",
        name: "GoPay",
        label: "GoPay",
        type: "e_wallet",
        accountName: "Lapabook Official",
        accountNumber: "081234567890",
        provider: "GoPay",
        details: "GoPay: 081234567890 a/n Lapabook Official",
        instructions: "Kirim ke GoPay number di atas, lalu upload bukti transfer.",
        isActive: true,
      },
      {
        id: "pm-4",
        name: "OVO",
        label: "OVO",
        type: "e_wallet",
        accountName: "Lapabook Official",
        accountNumber: "081234567890",
        provider: "OVO",
        details: "OVO: 081234567890 a/n Lapabook Official",
        instructions: "Kirim ke OVO number di atas, lalu upload bukti transfer.",
        isActive: true,
      },
      {
        id: "pm-5",
        name: "QRIS",
        label: "QRIS",
        type: "qris",
        accountName: "Lapabook",
        provider: "QRIS",
        details: "Scan QRIS yang tersedia di lokasi",
        instructions: "Scan QRIS yang tersedia di lokasi, lalu upload bukti transfer.",
        isActive: true,
      },
    ];
  }
  return g.__lapabookPaymentMethods;
}

function generateBookingCode(): string {
  const now = new Date();
  const datePart =
    String(now.getFullYear()).slice(2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK-${datePart}-${rand}`;
}

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export class MockAdapter implements DatabaseAdapter {
  // ── Sports ──
  async getSports(): Promise<Sport[]> {
    return mockSports.filter((s) => s.isActive);
  }
  async getAllSports(): Promise<Sport[]> { return [...mockSports]; }
  async createSport(input: { name: string; slug: string; isActive?: boolean }): Promise<Sport> {
    const s: Sport = { id: `sport-${input.slug}`, name: input.name, slug: input.slug, isActive: input.isActive ?? true };
    mockSports.push(s); return s;
  }
  async updateSport(id: string, input: { name?: string; slug?: string; isActive?: boolean }): Promise<Sport> {
    const s = mockSports.find(x => x.id === id); if (!s) throw new Error(`Sport not found: ${id}`);
    if (input.name !== undefined) s.name = input.name;
    if (input.slug !== undefined) s.slug = input.slug;
    if (input.isActive !== undefined) s.isActive = input.isActive;
    return s;
  }
  async deleteSport(id: string): Promise<void> {
    const idx = mockSports.findIndex(x => x.id === id); if (idx === -1) throw new Error(`Sport not found: ${id}`);
    mockSports.splice(idx, 1);
  }

  // ── Regions ──
  async getProvinces(): Promise<Province[]> { return this._getProvinces(); }
  async getCities(provinceId: string): Promise<City[]> { return this._getCities().filter((c: City) => c.provinceId === provinceId); }
  async getDistricts(cityId: string): Promise<District[]> { return this._getDistricts().filter((d: District) => d.cityId === cityId); }
  async getVillages(districtId: string): Promise<Village[]> { return this._getVillages().filter((v: Village) => v.districtId === districtId); }
  async getRegionOptions(): Promise<RegionOption[]> { return this._getRegionOptions(); }
  private _getProvinces(): Province[] { return []; }
  private _getCities(): City[] { return []; }
  private _getDistricts(): District[] { return []; }
  private _getVillages(): Village[] { return []; }
  private _getRegionOptions(): RegionOption[] { return []; }

  // ── Areas ──
  async getAreas(): Promise<Area[]> {
    return [...getAreas()];
  }

  async getAreasBySport(sportId: string): Promise<Area[]> {
    const venueIds = new Set(
      mockCourts.filter((c) => c.sportId === sportId && c.isActive).map((c) => c.venueId)
    );
    const areaIds = new Set(
      mockVenues.filter((v) => venueIds.has(v.id) && v.isActive && v.approvalStatus === "active").map((v) => v.areaId)
    );
    return getAreas().filter((a) => areaIds.has(a.id));
  }

  // ── Venue Owners ──
  async getVenueOwners(): Promise<VenueOwner[]> {
    return [...getVenueOwners()];
  }

  async getVenueOwnerById(id: string): Promise<VenueOwner | null> {
    return getVenueOwners().find(o => o.id === id) ?? null;
  }

  async getVenueOwnerByAdminId(adminId: string): Promise<VenueOwner | null> {
    return getVenueOwners().find(o => o.adminId === adminId) ?? null;
  }

  // ── Venues ──
  async getVenues(): Promise<Venue[]> {
    return mockVenues.filter((v) => v.isActive && v.approvalStatus === "active");
  }

  async getVenuesByDistrict(districtId: string): Promise<Venue[]> {
    return mockVenues.filter((v) => v.districtId === districtId && v.isActive && v.approvalStatus === "active");
  }

  async getVenuesByArea(areaId: string, sportId?: string): Promise<Venue[]> {
    let venues = mockVenues.filter((v) => v.areaId === areaId && v.isActive && v.approvalStatus === "active");
    if (sportId) {
      const venueIds = new Set(mockCourts.filter((c) => c.sportId === sportId && c.isActive).map((c) => c.venueId));
      venues = venues.filter((v) => venueIds.has(v.id));
    }
    return venues;
  }

  async getVenueById(id: string): Promise<Venue | null> {
    return mockVenues.find((v) => v.id === id) ?? null;
  }

  async getVenueBySlug(slug: string): Promise<Venue | null> {
    return mockVenues.find((v) => v.slug === slug) ?? null;
  }

  async getVenuesByOwner(ownerId: string): Promise<Venue[]> {
    return mockVenues.filter((v) => v.ownerId === ownerId);
  }

  // ── Courts ──
  async getCourts(): Promise<Court[]> {
    return mockCourts.filter((c) => c.isActive);
  }

  async getCourtsByVenue(venueId: string): Promise<Court[]> {
    return mockCourts.filter((c) => c.venueId === venueId);
  }

  async getAllCourts(): Promise<Court[]> {
    return [...mockCourts];
  }

  async getCourtById(id: string): Promise<Court | null> {
    return mockCourts.find((c) => c.id === id) ?? null;
  }

  async updateCourt(id: string, input: UpdateCourtInput): Promise<Court> {
    const index = mockCourts.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Court not found: ${id}`);
    const updated = { ...mockCourts[index], ...input };
    mockCourts[index] = { ...updated, indoorType: updated.indoorType as Court["indoorType"] };
    return { ...mockCourts[index] };
  }

  // ── Bookings ──
  async getBookings(): Promise<Booking[]> {
    return [...getBookings()];
  }

  async getBookingById(id: string): Promise<Booking | null> {
    return getBookings().find((b) => b.id === id) ?? null;
  }

  async getBookingByCode(code: string): Promise<Booking | null> {
    return getBookings().find((b) => b.bookingCode === code) ?? null;
  }

  async expireBookings(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const b of getBookings()) {
      if (
        b.bookingStatus === "waiting_payment" &&
        b.expiresAt &&
        new Date(b.expiresAt) < now
      ) {
        b.bookingStatus = "expired";
        b.paymentStatus = "unpaid";
        b.updatedAt = now.toISOString();
        count++;
      }
    }
    return count;
  }

  async getBookingsByCourtAndDate(courtId: string, date: string): Promise<Booking[]> {
    return getBookings().filter((b) => b.courtId === courtId && b.bookingDate === date);
  }

  async getBookingsByVenueIds(venueIds: string[]): Promise<Booking[]> {
    const set = new Set(venueIds);
    return getBookings().filter((b) => set.has(b.venueId));
  }

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const booking: Booking = {
      id: crypto.randomUUID(),
      bookingCode: generateBookingCode(),
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      venueId: input.venueId,
      courtId: input.courtId,
      sportId: input.sportId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: input.durationMinutes,
      totalPrice: input.totalPrice,
      bookingStatus: "waiting_payment",
      paymentStatus: "unpaid",
      notes: input.notes,
      userId: input.userId,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    getBookings().push(booking);
    return { ...booking };
  }

  async updateBookingStatus(id: string, status: Booking["bookingStatus"], paymentStatus?: Booking["paymentStatus"]): Promise<Booking> {
    const store = getBookings();
    const index = store.findIndex((b) => b.id === id);
    if (index === -1) throw new Error(`Booking not found: ${id}`);
    const update: Partial<Booking> = { bookingStatus: status, updatedAt: new Date().toISOString() };
    if (paymentStatus) update.paymentStatus = paymentStatus;
    store[index] = { ...store[index], ...update };
    return { ...store[index] };
  }

  async updateBookingMidtransOrderId(_bookingId: string, _orderId: string): Promise<void> {}
  async updateBookingMidtransTransactionId(_bookingId: string, _transactionId: string): Promise<void> {}
  async updateBookingPaymentMethod(_bookingId: string, _method: "manual" | "midtrans"): Promise<void> {}

  // ── Pricing Rules ──
  async getPricingRules(courtId: string): Promise<PricingRule[]> {
    return getPricingRules().filter((p) => p.courtId === courtId && p.isActive);
  }

  async getAllPricingRules(): Promise<PricingRule[]> {
    return [...getPricingRules()];
  }

  async createPricingRule(input: CreatePricingRuleInput): Promise<PricingRule> {
    const rule: PricingRule = { id: generateId("pr"), courtId: input.courtId, dayType: input.dayType, startTime: input.startTime, endTime: input.endTime, pricePerHour: input.pricePerHour, priority: input.priority, isActive: input.isActive ?? true };
    getPricingRules().push(rule);
    return { ...rule };
  }

  async updatePricingRule(id: string, input: UpdatePricingRuleInput): Promise<PricingRule> {
    const store = getPricingRules();
    const index = store.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Pricing rule not found: ${id}`);
    store[index] = { ...store[index], ...input };
    return { ...store[index] };
  }

  async deletePricingRule(id: string): Promise<void> {
    const store = getPricingRules();
    const index = store.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Pricing rule not found: ${id}`);
    store.splice(index, 1);
  }

  // ── Blocked Slots ──
  async getBlockedSlots(courtId: string, date: string): Promise<BlockedSlot[]> {
    return getBlockedSlots().filter((s) => s.courtId === courtId && s.date === date);
  }

  async getAllBlockedSlots(): Promise<BlockedSlot[]> {
    return [...getBlockedSlots()];
  }

  async createBlockedSlot(input: CreateBlockedSlotInput): Promise<BlockedSlot> {
    const slot: BlockedSlot = { id: generateId("bs"), courtId: input.courtId, date: input.date, startTime: input.startTime, endTime: input.endTime, reason: input.reason };
    getBlockedSlots().push(slot);
    return { ...slot };
  }

  async deleteBlockedSlot(id: string): Promise<void> {
    const store = getBlockedSlots();
    const index = store.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Blocked slot not found: ${id}`);
    store.splice(index, 1);
  }

  // ── Payment Methods ──
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return [...getPaymentMethods()];
  }

  async getActivePaymentMethods(): Promise<PaymentMethod[]> {
    return getPaymentMethods().filter((m) => m.isActive);
  }

  // ── Payment Proof ──
  async submitPaymentProof(bookingId: string, proofUrl: string): Promise<Booking> {
    const store = getBookings();
    const index = store.findIndex((b) => b.id === bookingId);
    if (index === -1) throw new Error(`Booking not found: ${bookingId}`);
    store[index] = { ...store[index], paymentProofUrl: proofUrl, paymentStatus: "waiting_confirmation", bookingStatus: "waiting_verification", expiresAt: undefined, updatedAt: new Date().toISOString() };
    return { ...store[index] };
  }

  async confirmPayment(bookingId: string, _actorId?: string): Promise<Booking> {
    const store = getBookings();
    const index = store.findIndex((b) => b.id === bookingId);
    if (index === -1) throw new Error(`Booking not found: ${bookingId}`);
    store[index] = { ...store[index], paymentStatus: "paid", bookingStatus: "confirmed", updatedAt: new Date().toISOString() };
    return { ...store[index] };
  }

  async rejectPayment(bookingId: string, _actorId?: string): Promise<Booking> {
    const store = getBookings();
    const index = store.findIndex((b) => b.id === bookingId);
    if (index === -1) throw new Error(`Booking not found: ${bookingId}`);
    store[index] = { ...store[index], paymentStatus: "rejected", bookingStatus: "rejected", updatedAt: new Date().toISOString() };
    return { ...store[index] };
  }

  async requestRefund(bookingId: string, reason?: string): Promise<Booking> {
    const store = getBookings();
    const index = store.findIndex((b) => b.id === bookingId);
    if (index === -1) throw new Error(`Booking not found: ${bookingId}`);
    store[index] = { ...store[index], paymentStatus: "refund_requested", refundReason: reason, refundRequestedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return { ...store[index] };
  }

  async approveRefund(bookingId: string, _actorId?: string): Promise<Booking> {
    const store = getBookings();
    const index = store.findIndex((b) => b.id === bookingId);
    if (index === -1) throw new Error(`Booking not found: ${bookingId}`);
    store[index] = { ...store[index], paymentStatus: "refunded", bookingStatus: "cancelled", updatedAt: new Date().toISOString() };
    return { ...store[index] };
  }

  async rejectRefund(bookingId: string, _actorId?: string): Promise<Booking> {
    const store = getBookings();
    const index = store.findIndex((b) => b.id === bookingId);
    if (index === -1) throw new Error(`Booking not found: ${bookingId}`);
    const paid = store[index].paidAmount ?? 0;
    const back = paid >= store[index].totalPrice && paid > 0 ? "paid" : "dp_paid";
    store[index] = { ...store[index], paymentStatus: back, updatedAt: new Date().toISOString() };
    return { ...store[index] };
  }

  // ── Notifications ──
  async getNotificationLogs(bookingId?: string): Promise<NotificationLog[]> {
    if (bookingId) return getNotifications().filter((n) => n.bookingId === bookingId);
    return [...getNotifications()];
  }

  async createNotificationLog(payload: NotificationPayload, status: NotificationLog["status"], errorMessage?: string): Promise<NotificationLog> {
    const log: NotificationLog = { id: generateId("notif"), type: payload.type, channel: payload.channel, recipient: payload.recipient, subject: payload.subject, message: payload.message, status, bookingId: payload.bookingId, bookingCode: payload.bookingCode, errorMessage, sentAt: status === "sent" ? new Date().toISOString() : undefined, createdAt: new Date().toISOString() };
    getNotifications().push(log);
    return { ...log };
  }

  async markNotificationRead(id: string): Promise<NotificationLog> {
    const store = getNotifications();
    const index = store.findIndex((n) => n.id === id);
    if (index === -1) throw new Error(`Notification not found: ${id}`);
    store[index] = { ...store[index], status: "read", readAt: new Date().toISOString() };
    return { ...store[index] };
  }

  // ── Audit Log ──
  async getAuditLogs(targetId?: string): Promise<AuditLogEntry[]> {
    if (targetId) return getAuditLog().filter((entry) => entry.targetId === targetId);
    return [...getAuditLog()];
  }

  async createAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<AuditLogEntry> {
    const logEntry: AuditLogEntry = { id: generateId("audit"), timestamp: new Date().toISOString(), ...entry };
    getAuditLog().push(logEntry);
    return { ...logEntry };
  }

  // ── Auth - Admin ──
  async authenticateAdmin(email: string, password: string): Promise<AdminUser | null> {
    const admin = getAdmins().find((a) => a.email === email && a.isActive);
    if (!admin) return null;
    if (!verifyPassword(password, admin.passwordHash)) return null;
    admin.lastLoginAt = new Date().toISOString();
    return { ...admin };
  }

  async getAdminById(id: string): Promise<AdminUser | null> {
    return getAdmins().find((a) => a.id === id) ?? null;
  }

  async createAdmin(data: Omit<AdminUser, "createdAt" | "lastLoginAt">): Promise<AdminUser> {
    const admin: AdminUser = { ...data, createdAt: new Date().toISOString() };
    getAdmins().push(admin);
    return { ...admin };
  }

  async getAllAdmins(): Promise<AdminUser[]> {
    return getAdmins().map(a => ({ ...a }));
  }

  // ── Venue Owner Management ──
  async createVenueOwner(data: Omit<VenueOwner, "createdAt" | "updatedAt">): Promise<VenueOwner> {
    const owner: VenueOwner = { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    getVenueOwners().push(owner);
    return { ...owner };
  }

  async updateVenueOwnerStatus(id: string, status: VenueOwnerStatus): Promise<VenueOwner> {
    const owners = getVenueOwners();
    const idx = owners.findIndex(o => o.id === id);
    if (idx === -1) throw new Error(`Venue owner not found: ${id}`);
    owners[idx] = { ...owners[idx], status, updatedAt: new Date().toISOString() };
    return { ...owners[idx] };
  }

  // ── Auth - Customer ──
  async registerCustomer(data: { name: string; email: string; phone: string; passwordHash: string }): Promise<CustomerPublic> {
    const existing = getCustomers().find((c) => c.email === data.email);
    if (existing) throw new Error("Email sudah terdaftar");
    const now = new Date().toISOString();
    const customer: Customer = {
      id: generateId("cust"),
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: data.passwordHash,
      isVerified: true,
      isActive: true,
      loyaltyPoints: 100,
      totalSpent: 0,
      memberSince: now,
      createdAt: now,
      updatedAt: now,
    };
    getCustomers().push(customer);
    // Welcome bonus
    getLoyalty().push({
      id: generateId("loy"),
      customerId: customer.id,
      type: "bonus",
      points: 100,
      description: "Bonus selamat datang member baru Lapabook!",
      createdAt: now,
    });
    return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, loyaltyPoints: customer.loyaltyPoints, totalSpent: customer.totalSpent, memberSince: customer.memberSince };
  }

  async authenticateCustomer(email: string, password: string): Promise<CustomerPublic | null> {
    const customer = getCustomers().find((c) => c.email === email && c.isActive);
    if (!customer) return null;
    if (!verifyPassword(password, customer.passwordHash)) return null;
    customer.lastLoginAt = new Date().toISOString();
    return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, loyaltyPoints: customer.loyaltyPoints, totalSpent: customer.totalSpent, memberSince: customer.memberSince };
  }

  async getCustomerById(id: string): Promise<CustomerPublic | null> {
    const customer = getCustomers().find((c) => c.id === id);
    if (!customer) return null;
    return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, loyaltyPoints: customer.loyaltyPoints, totalSpent: customer.totalSpent, memberSince: customer.memberSince };
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    return getCustomers().find((c) => c.email === email) ?? null;
  }

  // ── Loyalty ──
  async getLoyaltyTransactions(customerId: string): Promise<LoyaltyTransaction[]> {
    return getLoyalty().filter((t) => t.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addLoyaltyPoints(customerId: string, points: number, bookingId: string | undefined, description: string, type: LoyaltyTransactionType): Promise<LoyaltyTransaction> {
    const customer = getCustomers().find((c) => c.id === customerId);
    if (!customer) throw new Error("Customer not found");
    const now = new Date().toISOString();
    const tx: LoyaltyTransaction = { id: generateId("loy"), customerId, bookingId, type, points, description, createdAt: now };
    getLoyalty().push(tx);
    customer.loyaltyPoints += points;
    customer.updatedAt = now;
    return { ...tx };
  }

  async redeemLoyaltyPoints(customerId: string, rewardId: string, bookingId?: string): Promise<RewardRedemption> {
    const customer = getCustomers().find((c) => c.id === customerId);
    if (!customer) throw new Error("Customer not found");
    const reward = getRewards().find((r) => r.id === rewardId && r.isActive);
    if (!reward) throw new Error("Reward not found");
    if (customer.loyaltyPoints < reward.pointsCost) throw new Error("Poin tidak mencukupi");
    const now = new Date().toISOString();
    customer.loyaltyPoints -= reward.pointsCost;
    customer.updatedAt = now;
    // Log transaction
    getLoyalty().push({ id: generateId("loy"), customerId, type: "redeemed", points: -reward.pointsCost, description: `Tukar: ${reward.name}`, createdAt: now });
    const redemption: RewardRedemption = { id: generateId("rdm"), customerId, rewardId, rewardName: reward.name, pointsUsed: reward.pointsCost, bookingId, status: "applied", createdAt: now, usedAt: now };
    getRedemptions().push(redemption);
    return { ...redemption };
  }

  async getRewards(): Promise<Reward[]> {
    return [...getRewards()];
  }

  async getActiveRewards(): Promise<Reward[]> {
    return getRewards().filter((r) => r.isActive);
  }

  async getCustomerRedemptions(customerId: string): Promise<RewardRedemption[]> {
    return getRedemptions().filter((r) => r.customerId === customerId);
  }

  async updateCustomerSpent(customerId: string, amount: number): Promise<void> {
    const customer = getCustomers().find((c) => c.id === customerId);
    if (customer) {
      customer.totalSpent += amount;
      customer.updatedAt = new Date().toISOString();
    }
  }

  // ── Reviews ──
  private reviewStore: Review[] = [];
  private reviewPhotoStore: ReviewPhoto[] = [];

  async createReview(data: { bookingId: string; customerId: string; venueId: string; courtId?: string; rating: number; comment: string; photos?: string[] }): Promise<Review> {
    const review: Review = {
      id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      bookingId: data.bookingId,
      customerId: data.customerId,
      venueId: data.venueId,
      courtId: data.courtId,
      rating: data.rating,
      comment: data.comment,
      isVisible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.reviewStore.push(review);

    if (data.photos) {
      for (const url of data.photos) {
        this.reviewPhotoStore.push({
          id: `rphoto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          reviewId: review.id,
          photoUrl: url,
          createdAt: new Date().toISOString(),
        });
      }
    }
    return review;
  }

  async getReviewsByVenue(venueId: string): Promise<ReviewWithDetails[]> {
    const customers = getCustomers();
    return this.reviewStore
      .filter((r) => r.venueId === venueId && r.isVisible)
      .map((r) => {
        const customer = customers.find((c) => c.id === r.customerId);
        return {
          ...r,
          customerName: customer?.name,
          customerAvatar: customer?.avatar,
          photos: this.reviewPhotoStore.filter((p) => p.reviewId === r.id),
        };
      });
  }

  async getReviewsByCourt(courtId: string): Promise<ReviewWithDetails[]> {
    const customers = getCustomers();
    return this.reviewStore
      .filter((r) => r.courtId === courtId && r.isVisible)
      .map((r) => {
        const customer = customers.find((c) => c.id === r.customerId);
        return {
          ...r,
          customerName: customer?.name,
          customerAvatar: customer?.avatar,
          photos: this.reviewPhotoStore.filter((p) => p.reviewId === r.id),
        };
      });
  }

  async getReviewByBooking(bookingId: string): Promise<Review | null> {
    return this.reviewStore.find((r) => r.bookingId === bookingId) || null;
  }

  async getVenueRating(venueId: string): Promise<{ avgRating: number; reviewCount: number }> {
    const reviews = this.reviewStore.filter((r) => r.venueId === venueId && r.isVisible);
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    return { avgRating: Math.round(avgRating * 100) / 100, reviewCount: reviews.length };
  }

  async updateVenueRating(_venueId: string): Promise<void> {
    // No-op for mock — ratings are computed on the fly
  }

  async updateVenueConfig(venueId: string, config: Record<string, unknown>): Promise<void> {
    const venue = mockVenues.find((v) => v.id === venueId);
    if (!venue) return;
    (venue as unknown as Record<string, unknown>).rainDiscountConfig = {
      ...((venue as unknown as Record<string, unknown>).rainDiscountConfig as Record<string, unknown> || {}),
      ...config,
    };
  }

  async getHolidays(): Promise<never[]> {
    return []; // Mock — holidays come from DB seed
  }

  // ── Reviews - Moderation ──
  async getPendingReviews(): Promise<ReviewWithDetails[]> {
    const customers = getCustomers();
    return this.reviewStore.map((r) => {
      const customer = customers.find((c) => c.id === r.customerId);
      const venue = mockVenues.find((v) => v.id === r.venueId);
      return {
        ...r,
        customerName: customer?.name,
        customerAvatar: customer?.avatar,
        photos: this.reviewPhotoStore.filter((p) => p.reviewId === r.id),
        venueName: venue?.name,
      };
    });
  }

  async moderateReview(id: string, isVisible: boolean): Promise<Review> {
    const review = this.reviewStore.find((r) => r.id === id);
    if (!review) throw new Error(`Review not found: ${id}`);
    review.isVisible = isVisible;
    review.updatedAt = new Date().toISOString();
    return { ...review };
  }

  // ── Favorites ──
  private favoriteStore: Array<{ customerId: string; venueId: string }> = [];

  async getCustomerFavorites(customerId: string): Promise<Venue[]> {
    const venueIds = this.favoriteStore.filter((f) => f.customerId === customerId).map((f) => f.venueId);
    return mockVenues.filter((v) => venueIds.includes(v.id));
  }

  async addFavorite(customerId: string, venueId: string): Promise<void> {
    if (!this.favoriteStore.find((f) => f.customerId === customerId && f.venueId === venueId)) {
      this.favoriteStore.push({ customerId, venueId });
    }
  }

  async removeFavorite(customerId: string, venueId: string): Promise<void> {
    this.favoriteStore = this.favoriteStore.filter(
      (f) => !(f.customerId === customerId && f.venueId === venueId)
    );
  }

  async getFavoriteVenueIds(customerId: string): Promise<string[]> {
    return this.favoriteStore.filter((f) => f.customerId === customerId).map((f) => f.venueId);
  }

  // ── Court Photos ──
  async getCourtPhotos(_courtId: string): Promise<CourtPhoto[]> { return []; }
  async createCourtPhoto(photo: CourtPhoto): Promise<CourtPhoto> { return photo; }
  async deleteCourtPhoto(_id: string): Promise<void> {}

  // Sprint 12-15 stubs
  async getPickupGames(): Promise<PickupGame[]> { throw new Error('Not implemented in MockAdapter'); }
  async getPickupGameById(): Promise<PickupGame | null> { throw new Error('Not implemented in MockAdapter'); }
  async createPickupGame(): Promise<PickupGame> { throw new Error('Not implemented in MockAdapter'); }
  async updatePickupGame(): Promise<PickupGame> { throw new Error('Not implemented in MockAdapter'); }
  async deletePickupGame(): Promise<void> { throw new Error('Not implemented in MockAdapter'); }
  async joinPickupGame(): Promise<PickupGameParticipant> { throw new Error('Not implemented in MockAdapter'); }
  async leavePickupGame(): Promise<void> { throw new Error('Not implemented in MockAdapter'); }
  async getPickupGameParticipants(): Promise<PickupGameParticipant[]> { throw new Error('Not implemented in MockAdapter'); }
  async getPickupGamesByCustomer(): Promise<PickupGame[]> { throw new Error('Not implemented in MockAdapter'); }
  async sendPickupGameMessage(): Promise<PickupGameMessage> { throw new Error('Not implemented in MockAdapter'); }
  async getPickupGameMessages(): Promise<PickupGameMessage[]> { throw new Error('Not implemented in MockAdapter'); }
  async getTeamWalletsByCustomer(): Promise<TeamWallet[]> { throw new Error('Not implemented in MockAdapter'); }
  async getTeamWalletById(): Promise<TeamWallet | null> { throw new Error('Not implemented in MockAdapter'); }
  async createTeamWallet(): Promise<TeamWallet> { throw new Error('Not implemented in MockAdapter'); }
  async updateTeamWallet(): Promise<TeamWallet> { throw new Error('Not implemented in MockAdapter'); }
  async deleteTeamWallet(): Promise<void> { throw new Error('Not implemented in MockAdapter'); }
  async getTeamWalletMembers(): Promise<TeamWalletMember[]> { throw new Error('Not implemented in MockAdapter'); }
  async addTeamWalletMember(): Promise<TeamWalletMember> { throw new Error('Not implemented in MockAdapter'); }
  async removeTeamWalletMember(): Promise<void> { throw new Error('Not implemented in MockAdapter'); }
  async updateTeamWalletMemberRole(): Promise<TeamWalletMember> { throw new Error('Not implemented in MockAdapter'); }
  async createTeamWalletDeposit(): Promise<TeamWalletDeposit> { throw new Error('Not implemented in MockAdapter'); }
  async confirmTeamWalletDeposit(): Promise<TeamWalletDeposit> { throw new Error('Not implemented in MockAdapter'); }
  async getTeamWalletDeposits(): Promise<TeamWalletDeposit[]> { throw new Error('Not implemented in MockAdapter'); }
  async getTeamWalletTransactions(): Promise<TeamWalletTransaction[]> { throw new Error('Not implemented in MockAdapter'); }
  async createTeamWalletTransaction(): Promise<TeamWalletTransaction> { throw new Error('Not implemented in MockAdapter'); }
  async payBookingFromWallet(): Promise<TeamWalletTransaction> { throw new Error('Not implemented in MockAdapter'); }
  async createWalletSplit(): Promise<TeamWalletSplit> { throw new Error('Not implemented in MockAdapter'); }
  async getWalletSplits(): Promise<TeamWalletSplit[]> { throw new Error('Not implemented in MockAdapter'); }
  async getWalletSplitMembers(): Promise<TeamWalletSplitMember[]> { throw new Error('Not implemented in MockAdapter'); }
  async getPlayerProfile(): Promise<PlayerProfile | null> { throw new Error('Not implemented in MockAdapter'); }
  async upsertPlayerProfile(): Promise<PlayerProfile> { throw new Error('Not implemented in MockAdapter'); }
  async searchPlayers(): Promise<PlayerProfile[]> { throw new Error('Not implemented in MockAdapter'); }
  async createPlayerSkillRating(): Promise<PlayerSkillRating> { throw new Error('Not implemented in MockAdapter'); }
  async getPlayerSkillRatings(): Promise<PlayerSkillRating[]> { throw new Error('Not implemented in MockAdapter'); }
  async createMatchRequest(): Promise<MatchRequest> { throw new Error('Not implemented in MockAdapter'); }
  async getMatchRequests(): Promise<MatchRequest[]> { throw new Error('Not implemented in MockAdapter'); }
  async updateMatchRequest(): Promise<MatchRequest> { throw new Error('Not implemented in MockAdapter'); }
  async getAchievements(): Promise<Achievement[]> { throw new Error('Not implemented in MockAdapter'); }
  async getPlayerAchievements(): Promise<(PlayerAchievement & { achievement: Achievement })[]> { throw new Error('Not implemented in MockAdapter'); }
  async upsertPlayerAchievement(): Promise<PlayerAchievement> { throw new Error('Not implemented in MockAdapter'); }
  async getLeaderboard(): Promise<{ customerId: string; name: string; totalPoints: number; totalGames: number }[]> { throw new Error('Not implemented in MockAdapter'); }
  async getPlayerStreaks(): Promise<PlayerStreak[]> { throw new Error('Not implemented in MockAdapter'); }
  async updatePlayerStreak(): Promise<PlayerStreak> { throw new Error('Not implemented in MockAdapter'); }
  async getFlashDeals(): Promise<FlashDeal[]> { throw new Error('Not implemented in MockAdapter'); }
  async getFlashDealById(): Promise<FlashDeal | null> { throw new Error('Not implemented in MockAdapter'); }
  async createFlashDeal(): Promise<FlashDeal> { throw new Error('Not implemented in MockAdapter'); }
  async claimFlashDeal(): Promise<FlashDeal> { throw new Error('Not implemented in MockAdapter'); }
  async getVenueCameras(): Promise<VenueCamera[]> { throw new Error('Not implemented in MockAdapter'); }
  async createVenueCamera(): Promise<VenueCamera> { throw new Error('Not implemented in MockAdapter'); }
  async updateVenueCamera(): Promise<VenueCamera> { throw new Error('Not implemented in MockAdapter'); }
  async deleteVenueCamera(): Promise<void> { throw new Error('Not implemented in MockAdapter'); }
  async getVenueVerification(): Promise<VenueVerification | null> { throw new Error('Not implemented in MockAdapter'); }
  async createVenueVerification(): Promise<VenueVerification> { throw new Error('Not implemented in MockAdapter'); }
  async updateVenueVerification(): Promise<VenueVerification> { throw new Error('Not implemented in MockAdapter'); }
  async getVenueVerificationPhotos(): Promise<VenueVerificationPhoto[]> { throw new Error('Not implemented in MockAdapter'); }
  async createVenueVerificationPhoto(): Promise<VenueVerificationPhoto> { throw new Error('Not implemented in MockAdapter'); }
  async getLoyaltyTiers(): Promise<LoyaltyTier[]> { throw new Error('Not implemented in MockAdapter'); }
  async createGroupBooking(): Promise<GroupBooking> { throw new Error('Not implemented in MockAdapter'); }
  async getGroupBookingById(): Promise<GroupBooking | null> { throw new Error('Not implemented in MockAdapter'); }
  async getGroupBookingDetail(): Promise<GroupBookingDetail | null> { throw new Error('Not implemented in MockAdapter'); }
  async getGroupBookingsByOrganizer(): Promise<GroupBooking[]> { throw new Error('Not implemented in MockAdapter'); }
  async updateGroupBookingStatus(): Promise<GroupBooking> { throw new Error('Not implemented in MockAdapter'); }
  async deleteGroupBooking(): Promise<void> { throw new Error('Not implemented in MockAdapter'); }
  async getGroupBookingParticipants(): Promise<GroupBookingParticipant[]> { throw new Error('Not implemented in MockAdapter'); }
  async addGroupBookingParticipant(): Promise<GroupBookingParticipant> { throw new Error('Not implemented in MockAdapter'); }
  async getGroupBookingParticipant(): Promise<GroupBookingParticipant | null> { throw new Error('Not implemented in MockAdapter'); }
  async updateGroupBookingParticipantStatus(): Promise<GroupBookingParticipant> { throw new Error('Not implemented in MockAdapter'); }
  async getGroupBookingParticipantById(): Promise<GroupBookingParticipant | null> { throw new Error('Not implemented in MockAdapter'); }
  async getGroupBookingTimeSlots(): Promise<GroupBookingTimeSlot[]> { throw new Error('Not implemented in MockAdapter'); }
  async addGroupBookingTimeSlot(): Promise<GroupBookingTimeSlot> { throw new Error('Not implemented in MockAdapter'); }
  async getGroupBookingTimeSlotById(): Promise<GroupBookingTimeSlot | null> { throw new Error('Not implemented in MockAdapter'); }
  async voteGroupBookingTimeSlot(): Promise<GroupBookingTimeSlot> { throw new Error('Not implemented in MockAdapter'); }
  async markGroupBookingWinner(): Promise<GroupBookingTimeSlot> { throw new Error('Not implemented in MockAdapter'); }
  async getVoucherByCode(_code: string): Promise<VoucherRow | null> { return null; }
  async incrementVoucherUsage(_code: string): Promise<boolean> { return false; }
}