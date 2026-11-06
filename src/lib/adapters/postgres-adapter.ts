import { Pool } from "pg";
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
  CustomerPublic,
  Customer,
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
  VenueOwnerStatus,
  Review,
  ReviewWithDetails,
  CourtPhoto,
  Holiday,
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
  GroupBookingStatus,
  GroupBookingParticipantStatus,
  Area,
} from "@/lib/types/domain";

// ── Singleton Pool ──
declare global {
  var __pgPool: Pool | undefined;
}

const pool = globalThis.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalThis.__pgPool) globalThis.__pgPool = pool;

// ── Helpers ──
function snakeToCamel(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

function mapRow<T>(row: Record<string, unknown>): T {
  return snakeToCamel(row) as T;
}

async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows.map((r) => mapRow<T>(r));
}

async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return "00:00";
  // pg returns "HH:MM:SS" or "HH:MM" — strip seconds
  const parts = t.split(":");
  return `${parts[0]}:${parts[1]}`;
}

function fmtDate(d: unknown): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function fmtTs(d: unknown): string {
  if (!d) return "";
  if (typeof d === "string") return d;
  if (d instanceof Date) return d.toISOString();
  return String(d);
}

function mapBooking(row: Record<string, unknown>): Booking {
  const r = snakeToCamel(row);
  return {
    id: r.id as string,
    bookingCode: r.bookingCode as string,
    customerName: r.customerName as string,
    customerPhone: r.customerPhone as string,
    customerEmail: (r.customerEmail as string) || undefined,
    venueId: r.venueId as string,
    courtId: r.courtId as string,
    sportId: r.sportId as string,
    bookingDate: fmtDate(r.bookingDate),
    startTime: formatTime(r.startTime as string),
    endTime: formatTime(r.endTime as string),
    durationMinutes: r.durationMinutes as number,
    totalPrice: r.totalPrice as number,
    bookingStatus: r.bookingStatus as Booking["bookingStatus"],
    paymentStatus: r.paymentStatus as Booking["paymentStatus"],
    paymentProofUrl: (r.paymentProofUrl as string) || undefined,
    paymentRejectionReason: (r.paymentRejectionReason as string) || undefined,
    refundReason: (r.refundReason as string) || undefined,
    refundRequestedAt: r.refundRequestedAt ? fmtTs(r.refundRequestedAt) : undefined,
    notes: (r.notes as string) || undefined,
    userId: (r.userId as string) || undefined,
    rescheduledFrom: (r.rescheduledFrom as Booking["rescheduledFrom"]) || undefined,
    rescheduleCount: (r.rescheduleCount as number) ?? 0,
    expiresAt: r.expiresAt ? fmtTs(r.expiresAt) : undefined,
    commissionAmount: (r.commissionAmount as number) || 0,
    ownerPayout: (r.ownerPayout as number) || 0,
    downPaymentAmount: (r.downPaymentAmount as number) || 0,
    paidAmount: (r.paidAmount as number) || 0,
    createdAt: fmtTs(r.createdAt),
    updatedAt: fmtTs(r.updatedAt),
  };
}

function mapCourt(row: Record<string, unknown>): Court {
  const r = snakeToCamel(row);
  return {
    id: r.id as string,
    venueId: r.venueId as string,
    sportId: r.sportId as string,
    name: r.name as string,
    slug: r.slug as string,
    surfaceType: r.surfaceType as string,
    indoorType: r.indoorType as Court["indoorType"],
    capacity: r.capacity as number,
    basePrice: r.basePrice as number,
    isActive: r.isActive as boolean,
  };
}

function mapPricing(row: Record<string, unknown>): PricingRule {
  const r = snakeToCamel(row);
  return {
    id: r.id as string,
    courtId: r.courtId as string,
    dayType: r.dayType as PricingRule["dayType"],
    startTime: formatTime(r.startTime as string),
    endTime: formatTime(r.endTime as string),
    pricePerHour: r.pricePerHour as number,
    priority: r.priority as number,
    isActive: r.isActive as boolean,
  };
}

// ── Adapter ──
export class PostgresAdapter implements DatabaseAdapter {
  // ── Sports ──
  async getSports(): Promise<Sport[]> {
    const rows = await query<Record<string, unknown>>("SELECT id, name, slug, is_active FROM sports WHERE is_active = true ORDER BY name");
    return rows.map((r) => ({ id: r.id as string, name: r.name as string, slug: r.slug as string, isActive: (r.isActive ?? r.is_active) as boolean }));
  }
  async getAllSports(): Promise<Sport[]> {
    const rows = await query<Record<string, unknown>>("SELECT id, name, slug, is_active FROM sports ORDER BY name");
    return rows.map((r) => ({ id: r.id as string, name: r.name as string, slug: r.slug as string, isActive: (r.isActive ?? r.is_active) as boolean }));
  }
  async createSport(input: { name: string; slug: string; isActive?: boolean }): Promise<Sport> {
    const id = `sport-${input.slug}`;
    const r = await queryOne<Record<string, unknown>>("INSERT INTO sports (id, name, slug, is_active) VALUES ($1,$2,$3,$4) RETURNING id, name, slug, is_active", [id, input.name, input.slug, input.isActive ?? true]);
    if (!r) throw new Error("Gagal membuat olahraga");
    return { id: r.id as string, name: r.name as string, slug: r.slug as string, isActive: (r.isActive ?? r.is_active) as boolean };
  }
  async updateSport(id: string, input: { name?: string; slug?: string; isActive?: boolean }): Promise<Sport> {
    const sets: string[] = []; const vals: unknown[] = []; let i = 1;
    if (input.name !== undefined) { sets.push(`name = $${i++}`); vals.push(input.name); }
    if (input.slug !== undefined) { sets.push(`slug = $${i++}`); vals.push(input.slug); }
    if (input.isActive !== undefined) { sets.push(`is_active = $${i++}`); vals.push(input.isActive); }
    if (!sets.length) throw new Error("No fields to update");
    sets.push(`updated_at = NOW()`); vals.push(id);
    const r = await queryOne<Record<string, unknown>>(`UPDATE sports SET ${sets.join(", ")} WHERE id = $${i} RETURNING id, name, slug, is_active`, vals);
    if (!r) throw new Error(`Sport not found: ${id}`);
    return { id: r.id as string, name: r.name as string, slug: r.slug as string, isActive: (r.isActive ?? r.is_active) as boolean };
  }
  async deleteSport(id: string): Promise<void> {
    const cnt = await queryOne<{ count: string }>("SELECT COUNT(*)::text as count FROM courts WHERE sport_id = $1", [id]);
    if (cnt && Number(cnt.count) > 0) throw new Error("Tidak bisa hapus: masih ada lapangan pakai olahraga ini");
    await query("DELETE FROM sports WHERE id = $1", [id]);
  }

  // ── Regions ──
  async getProvinces(): Promise<Province[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM provinces WHERE is_active = true ORDER BY name");
    return rows.map((r) => { const a = snakeToCamel(r); return { id: a.id as string, name: a.name as string, slug: a.slug as string, isActive: a.isActive as boolean, createdAt: fmtTs(a.createdAt), updatedAt: fmtTs(a.updatedAt) }; });
  }

  async getCities(provinceId: string): Promise<City[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM cities WHERE province_id = $1 AND is_active = true ORDER BY name", [provinceId]);
    return rows.map((r) => { const a = snakeToCamel(r); return { id: a.id as string, provinceId: a.provinceId as string, name: a.name as string, slug: a.slug as string, isActive: a.isActive as boolean, createdAt: fmtTs(a.createdAt), updatedAt: fmtTs(a.updatedAt) }; });
  }

  async getDistricts(cityId: string): Promise<District[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM districts WHERE city_id = $1 AND is_active = true ORDER BY name", [cityId]);
    return rows.map((r) => { const a = snakeToCamel(r); return { id: a.id as string, cityId: a.cityId as string, name: a.name as string, slug: a.slug as string, isActive: a.isActive as boolean, createdAt: fmtTs(a.createdAt), updatedAt: fmtTs(a.updatedAt) }; });
  }

  async getVillages(districtId: string): Promise<Village[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM villages WHERE district_id = $1 AND is_active = true ORDER BY name", [districtId]);
    return rows.map((r) => { const a = snakeToCamel(r); return { id: a.id as string, districtId: a.districtId as string, name: a.name as string, slug: a.slug as string, isActive: a.isActive as boolean, createdAt: fmtTs(a.createdAt), updatedAt: fmtTs(a.updatedAt) }; });
  }

  async getRegionOptions(): Promise<RegionOption[]> {
    const rows = await query<Record<string, unknown>>(`
      SELECT
        p.id AS province_id, p.name AS province_name,
        c.id AS city_id, c.name AS city_name,
        d.id AS district_id, d.name AS district_name
      FROM districts d
      JOIN cities c ON c.id = d.city_id
      JOIN provinces p ON p.id = c.province_id
      WHERE d.is_active = true AND c.is_active = true AND p.is_active = true
      ORDER BY p.name, c.name, d.name
    `);
    return rows.map((r) => ({
      provinceId: r.province_id as string,
      provinceName: r.province_name as string,
      cityId: r.city_id as string,
      cityName: r.city_name as string,
      districtId: r.district_id as string,
      districtName: r.district_name as string,
    }));
  }

  // ── Venue Owners ──
  async getVenueOwners(): Promise<VenueOwner[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM venue_owners");
    return rows.map((r) => { const o = snakeToCamel(r); return { id: o.id as string, adminId: (o.adminId as string) || "", businessName: o.businessName as string, picName: o.picName as string, phone: o.phone as string, email: o.email as string, status: o.status as VenueOwner["status"], createdAt: fmtTs(o.createdAt), updatedAt: fmtTs(o.updatedAt) }; });
  }

  async getVenueOwnerById(id: string): Promise<VenueOwner | null> {
    const r = await queryOne<Record<string, unknown>>("SELECT * FROM venue_owners WHERE id = $1", [id]);
    if (!r) return null;
    const o = snakeToCamel(r);
    return { id: o.id as string, adminId: (o.adminId as string) || "", businessName: o.businessName as string, picName: o.picName as string, phone: o.phone as string, email: o.email as string, status: o.status as VenueOwner["status"], createdAt: fmtTs(o.createdAt), updatedAt: fmtTs(o.updatedAt) };
  }

  async getVenueOwnerByAdminId(adminId: string): Promise<VenueOwner | null> {
    const r = await queryOne<Record<string, unknown>>("SELECT * FROM venue_owners WHERE admin_id = $1", [adminId]);
    if (!r) return null;
    const o = snakeToCamel(r);
    return { id: o.id as string, adminId: (o.adminId as string) || "", businessName: o.businessName as string, picName: o.picName as string, phone: o.phone as string, email: o.email as string, status: o.status as VenueOwner["status"], createdAt: fmtTs(o.createdAt), updatedAt: fmtTs(o.updatedAt) };
  }

  // ── Venues ──
  async getVenues(): Promise<Venue[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM venues WHERE is_active = true AND approval_status = 'active'");
    return rows.map((r) => mapRow<Venue>(r));
  }

  async getVenuesByDistrict(districtId: string): Promise<Venue[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM venues WHERE district_id = $1 AND is_active = true AND approval_status = 'active'", [districtId]);
    return rows.map((r) => mapRow<Venue>(r));
  }

  async getVenuesByOwner(ownerId: string): Promise<Venue[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM venues WHERE owner_id = $1", [ownerId]);
    return rows.map((r) => mapRow<Venue>(r));
  }

  async getVenueById(id: string): Promise<Venue | null> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM venues WHERE id = $1", [id]);
    return rows[0] ? mapRow<Venue>(rows[0]) : null;
  }

  async getVenueBySlug(slug: string): Promise<Venue | null> {
    // ponytail: tanpa filter approval_status di sini — page-level memutuskan render
    const rows = await query<Record<string, unknown>>("SELECT * FROM venues WHERE slug = $1", [slug]);
    return rows[0] ? mapRow<Venue>(rows[0]) : null;
  }

  // ── Courts ──
  async getCourts(): Promise<Court[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM courts WHERE is_active = true");
    return rows.map(mapCourt);
  }

  async getCourtsByVenue(venueId: string): Promise<Court[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM courts WHERE venue_id = $1 AND is_active = true", [venueId]);
    return rows.map(mapCourt);
  }

  async getAllCourts(): Promise<Court[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM courts");
    return rows.map(mapCourt);
  }

  async getCourtById(id: string): Promise<Court | null> {
    const r = await queryOne<Record<string, unknown>>("SELECT * FROM courts WHERE id = $1", [id]);
    return r ? mapCourt(r) : null;
  }

  async updateCourt(id: string, input: UpdateCourtInput): Promise<Court> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (input.name !== undefined) { sets.push(`name = $${i++}`); vals.push(input.name); }
    if (input.slug !== undefined) { sets.push(`slug = $${i++}`); vals.push(input.slug); }
    if (input.surfaceType !== undefined) { sets.push(`surface_type = $${i++}`); vals.push(input.surfaceType); }
    if (input.indoorType !== undefined) { sets.push(`indoor_type = $${i++}`); vals.push(input.indoorType); }
    if (input.capacity !== undefined) { sets.push(`capacity = $${i++}`); vals.push(input.capacity); }
    if (input.basePrice !== undefined) { sets.push(`base_price = $${i++}`); vals.push(input.basePrice); }
    if (input.isActive !== undefined) { sets.push(`is_active = $${i++}`); vals.push(input.isActive); }
    if (sets.length === 0) throw new Error("No fields to update");
    sets.push(`updated_at = NOW()`);
    vals.push(id);
    const r = await queryOne<Record<string, unknown>>(`UPDATE courts SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, vals);
    if (!r) throw new Error(`Court not found: ${id}`);
    return mapCourt(r);
  }

  // ── Areas ──
  async getAreas(): Promise<Area[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM areas WHERE is_active = true ORDER BY label");
    return rows.map((r) => mapRow<Area>(r));
  }

  async getAreasBySport(sportId: string): Promise<Area[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT DISTINCT a.* FROM areas a
       JOIN venues v ON v.area_id = a.id
       JOIN courts c ON c.venue_id = v.id
       WHERE c.sport_id = $1 AND a.is_active = true AND v.is_active = true AND v.approval_status = 'active'`,
      [sportId]
    );
    return rows.map((r) => mapRow<Area>(r));
  }

  async getVenuesByArea(areaId: string, sportId?: string): Promise<Venue[]> {
    if (sportId) {
      const rows = await query<Record<string, unknown>>(
        `SELECT DISTINCT v.* FROM venues v
         JOIN courts c ON c.venue_id = v.id
         WHERE v.area_id = $1 AND c.sport_id = $2 AND v.is_active = true AND v.approval_status = 'active'`,
        [areaId, sportId]
      );
      return rows.map((r) => mapRow<Venue>(r));
    }
    const rows = await query<Record<string, unknown>>(
      "SELECT * FROM venues WHERE area_id = $1 AND is_active = true AND approval_status = 'active'",
      [areaId]
    );
    return rows.map((r) => mapRow<Venue>(r));
  }

  // ── Bookings ──
  async getBookings(): Promise<Booking[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM bookings ORDER BY created_at DESC");
    return rows.map(mapBooking);
  }

  async getBookingById(id: string): Promise<Booking | null> {
    const r = await queryOne<Record<string, unknown>>("SELECT * FROM bookings WHERE id = $1", [id]);
    return r ? mapBooking(r) : null;
  }

  async getBookingByCode(code: string): Promise<Booking | null> {
    const r = await queryOne<Record<string, unknown>>("SELECT * FROM bookings WHERE booking_code = $1", [code]);
    return r ? mapBooking(r) : null;
  }

  async getBookingsByCourtAndDate(courtId: string, date: string): Promise<Booking[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM bookings WHERE court_id = $1 AND booking_date = $2", [courtId, date]);
    return rows.map(mapBooking);
  }

  async getBookingsByVenueIds(venueIds: string[]): Promise<Booking[]> {
    if (venueIds.length === 0) return [];
    const rows = await query<Record<string, unknown>>("SELECT * FROM bookings WHERE venue_id = ANY($1) ORDER BY created_at DESC", [venueIds]);
    return rows.map(mapBooking);
  }

  async expireBookings(): Promise<number> {
    const { rowCount } = await pool.query("UPDATE bookings SET booking_status = 'expired', payment_status = 'unpaid', updated_at = NOW() WHERE booking_status = 'waiting_payment' AND expires_at < NOW()");
    return rowCount ?? 0;
  }

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    const id = `bk-${crypto.randomUUID().slice(0, 8)}`;
    const code = (() => {
      const now = new Date();
      const d = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
      const r = crypto.randomUUID().slice(0, 4).toUpperCase();
      return `BK-${d}-${r}`;
    })();

    // Calculate commission from venue settings
    const venue = await queryOne<Record<string, unknown>>(
      "SELECT commission_rate, platform_fee_type, platform_fee_value FROM venues WHERE id = $1",
      [input.venueId]
    );
    const rate = (venue?.commission_rate as number) ?? 10;
    const feeType = (venue?.platform_fee_type as string) ?? "percentage";
    const feeValue = (venue?.platform_fee_value as number) ?? 0;
    const commissionAmount = feeType === "fixed" ? feeValue : Math.round(input.totalPrice * (rate / 100));
    const ownerPayout = input.totalPrice - commissionAmount;

    // DP: dp50 → uang muka setengah total (ceil); full/legacy → 0 (flow lunas biasa).
    const downPaymentAmount = input.downPaymentType === "dp50" ? Math.ceil(input.totalPrice / 2) : 0;

    const { rows } = await pool.query(
      `INSERT INTO bookings (id, booking_code, customer_name, customer_phone, customer_email, user_id, venue_id, court_id, sport_id, booking_date, start_time, end_time, duration_minutes, total_price, booking_status, payment_status, notes, expires_at, commission_amount, owner_payout, voucher_code, down_payment_amount, paid_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'waiting_payment','unpaid',$15,(NOW() + INTERVAL '15 minutes'),$16,$17,$18,$19,0)
       RETURNING *`,
      [id, code, input.customerName, input.customerPhone, input.customerEmail || null, input.userId || null, input.venueId, input.courtId, input.sportId, input.bookingDate, input.startTime, input.endTime, input.durationMinutes, input.totalPrice, input.notes || null, commissionAmount, ownerPayout, input.voucherCode || null, downPaymentAmount],
    );
    return mapBooking(rows[0]);
  }

  // ── Vouchers ──
  async getVoucherByCode(code: string): Promise<VoucherRow | null> {
    const r = await queryOne<Record<string, unknown>>(
      "SELECT * FROM vouchers WHERE code = $1",
      [code.toUpperCase()],
    );
    if (!r) return null;
    return snakeToCamel(r) as unknown as VoucherRow;
  }

  async incrementVoucherUsage(code: string): Promise<boolean> {
    const r = await queryOne<{ id: string }>(
      "UPDATE vouchers SET used_count = used_count + 1 WHERE code = $1 AND is_active = true AND (max_uses IS NULL OR used_count < max_uses) RETURNING id",
      [code.toUpperCase()],
    );
    return Boolean(r);
  }

  async updateBookingStatus(id: string, status: Booking["bookingStatus"], paymentStatus?: Booking["paymentStatus"]): Promise<Booking> {
    if (paymentStatus) {
      const { rows } = await pool.query("UPDATE bookings SET booking_status = $1, payment_status = $2, updated_at = NOW() WHERE id = $3 RETURNING *", [status, paymentStatus, id]);
      if (!rows[0]) throw new Error(`Booking not found: ${id}`);
      return mapBooking(rows[0]);
    }
    const { rows } = await pool.query("UPDATE bookings SET booking_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [status, id]);
    if (!rows[0]) throw new Error(`Booking not found: ${id}`);
    return mapBooking(rows[0]);
  }

  async updateBookingMidtransOrderId(bookingId: string, orderId: string): Promise<void> {
    await pool.query("UPDATE bookings SET midtrans_order_id = $1, updated_at = NOW() WHERE id = $2", [orderId, bookingId]);
  }

  async updateBookingMidtransTransactionId(bookingId: string, transactionId: string): Promise<void> {
    await pool.query("UPDATE bookings SET midtrans_transaction_id = $1, updated_at = NOW() WHERE id = $2", [transactionId, bookingId]);
  }

  async updateBookingPaymentMethod(bookingId: string, method: "manual" | "midtrans"): Promise<void> {
    await pool.query("UPDATE bookings SET payment_method = $1, updated_at = NOW() WHERE id = $2", [method, bookingId]);
  }

  // ── Pricing Rules ──
  async getPricingRules(courtId: string): Promise<PricingRule[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM pricing_rules WHERE court_id = $1 AND is_active = true ORDER BY priority", [courtId]);
    return rows.map(mapPricing);
  }

  async getAllPricingRules(): Promise<PricingRule[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM pricing_rules ORDER BY court_id, priority");
    return rows.map(mapPricing);
  }

  async createPricingRule(input: CreatePricingRuleInput): Promise<PricingRule> {
    const id = `pr-${crypto.randomUUID().slice(0, 8)}`;
    const r = await queryOne<Record<string, unknown>>(
      "INSERT INTO pricing_rules (id, court_id, day_type, start_time, end_time, price_per_hour, priority, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [id, input.courtId, input.dayType, input.startTime, input.endTime, input.pricePerHour, input.priority, input.isActive ?? true],
    );
    return mapPricing(r!);
  }

  async updatePricingRule(id: string, input: UpdatePricingRuleInput): Promise<PricingRule> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (input.dayType !== undefined) { sets.push(`day_type = $${i++}`); vals.push(input.dayType); }
    if (input.startTime !== undefined) { sets.push(`start_time = $${i++}`); vals.push(input.startTime); }
    if (input.endTime !== undefined) { sets.push(`end_time = $${i++}`); vals.push(input.endTime); }
    if (input.pricePerHour !== undefined) { sets.push(`price_per_hour = $${i++}`); vals.push(input.pricePerHour); }
    if (input.priority !== undefined) { sets.push(`priority = $${i++}`); vals.push(input.priority); }
    if (input.isActive !== undefined) { sets.push(`is_active = $${i++}`); vals.push(input.isActive); }
    if (sets.length === 0) throw new Error("No fields to update");
    sets.push("updated_at = NOW()");
    vals.push(id);
    const r = await queryOne<Record<string, unknown>>(`UPDATE pricing_rules SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, vals);
    if (!r) throw new Error(`Pricing rule not found: ${id}`);
    return mapPricing(r);
  }

  async deletePricingRule(id: string): Promise<void> {
    await pool.query("DELETE FROM pricing_rules WHERE id = $1", [id]);
  }

  // ── Blocked Slots ──
  async getBlockedSlots(courtId: string, date: string): Promise<BlockedSlot[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM blocked_slots WHERE court_id = $1 AND date = $2", [courtId, date]);
    return rows.map((r) => { const b = snakeToCamel(r); return { id: b.id as string, courtId: b.courtId as string, date: fmtDate(b.date), startTime: formatTime(b.startTime as string), endTime: formatTime(b.endTime as string), reason: (b.reason as string) || undefined }; });
  }

  async getAllBlockedSlots(): Promise<BlockedSlot[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM blocked_slots ORDER BY date");
    return rows.map((r) => { const b = snakeToCamel(r); return { id: b.id as string, courtId: b.courtId as string, date: fmtDate(b.date), startTime: formatTime(b.startTime as string), endTime: formatTime(b.endTime as string), reason: (b.reason as string) || undefined }; });
  }

  async createBlockedSlot(input: CreateBlockedSlotInput): Promise<BlockedSlot> {
    const r = await queryOne<Record<string, unknown>>("INSERT INTO blocked_slots (court_id, date, start_time, end_time, reason) VALUES ($1,$2,$3,$4,$5) RETURNING *", [input.courtId, input.date, input.startTime, input.endTime, input.reason || null]);
    const b = snakeToCamel(r!);
    return { id: b.id as string, courtId: b.courtId as string, date: fmtDate(b.date), startTime: formatTime(b.startTime as string), endTime: formatTime(b.endTime as string), reason: (b.reason as string) || undefined };
  }

  async deleteBlockedSlot(id: string): Promise<void> {
    await pool.query("DELETE FROM blocked_slots WHERE id = $1", [id]);
  }

  // ── Audit Log ──
  async getAuditLogs(targetId?: string): Promise<AuditLogEntry[]> {
    if (targetId) {
      const rows = await query<Record<string, unknown>>("SELECT * FROM audit_logs WHERE target_id = $1 ORDER BY timestamp DESC", [targetId]);
      return rows.map(mapRow<AuditLogEntry>);
    }
    const rows = await query<Record<string, unknown>>("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100");
    return rows.map(mapRow<AuditLogEntry>);
  }

  async createAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<AuditLogEntry> {
    const r = await queryOne<Record<string, unknown>>(
      "INSERT INTO audit_logs (action, target_type, target_id, actor_type, actor_id, details, previous_value, new_value) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [entry.action, entry.targetType, entry.targetId, entry.actorType, entry.actorId || null, entry.details, entry.previousValue || null, entry.newValue || null],
    );
    return mapRow<AuditLogEntry>(r!);
  }

  // ── Payment Methods ──
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM payment_methods");
    return rows.map((r) => { const p = snakeToCamel(r); return { id: p.id as string, name: p.name as string, label: p.label as string, type: p.type as PaymentMethod["type"], accountName: p.accountName as string, accountNumber: (p.accountNumber as string) || undefined, provider: p.provider as string, details: p.details as string, instructions: p.instructions as string, isActive: p.isActive as boolean }; });
  }

  async getActivePaymentMethods(): Promise<PaymentMethod[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM payment_methods WHERE is_active = true");
    return rows.map((r) => { const p = snakeToCamel(r); return { id: p.id as string, name: p.name as string, label: p.label as string, type: p.type as PaymentMethod["type"], accountName: p.accountName as string, accountNumber: (p.accountNumber as string) || undefined, provider: p.provider as string, details: p.details as string, instructions: p.instructions as string, isActive: p.isActive as boolean }; });
  }

  // ── Payment Proof ──
  async submitPaymentProof(bookingId: string, proofUrl: string): Promise<Booking> {
    // DP-aware: pelunasan (confirmed/dp_paid) → slot tetap confirmed, hanya payment menunggu verifikasi.
    const current = await this.getBookingById(bookingId);
    if (!current) throw new Error(`Booking not found: ${bookingId}`);
    const isSettlement = current.bookingStatus === "confirmed" && current.paymentStatus === "dp_paid";
    const r = isSettlement
      ? await queryOne<Record<string, unknown>>("UPDATE bookings SET payment_proof_url = $1, payment_status = 'waiting_confirmation', payment_submitted_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *", [proofUrl, bookingId])
      : await queryOne<Record<string, unknown>>("UPDATE bookings SET payment_proof_url = $1, payment_status = 'waiting_confirmation', booking_status = 'waiting_verification', expires_at = NULL, payment_submitted_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *", [proofUrl, bookingId]);
    if (!r) throw new Error(`Booking not found: ${bookingId}`);
    return mapBooking(r);
  }

  async confirmPayment(bookingId: string, _actorId?: string, amount?: number): Promise<Booking> {
    // DP-aware: expected = DP (first verify) atau sisa (pelunasan). Legacy/full → total.
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error(`Booking not found: ${bookingId}`);
    const paid = booking.paidAmount ?? 0;
    const down = booking.downPaymentAmount ?? 0;
    const expected = amount ?? (down > 0 && paid === 0 ? down : booking.totalPrice - paid);
    if (expected <= 0) throw new Error("Tidak ada sisa tagihan.");
    const newPaid = Math.min(booking.totalPrice, paid + expected);
    const full = newPaid >= booking.totalPrice;
    const r = await queryOne<Record<string, unknown>>(
      "UPDATE bookings SET paid_amount = $2, payment_status = $3, booking_status = 'confirmed', payment_verified_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *",
      [bookingId, newPaid, full ? "paid" : "dp_paid"],
    );
    if (!r) throw new Error(`Booking not found: ${bookingId}`);
    return mapBooking(r);
  }

  async rejectPayment(bookingId: string, _actorId?: string): Promise<Booking> {
    const r = await queryOne<Record<string, unknown>>("UPDATE bookings SET payment_status = 'rejected', booking_status = 'rejected', payment_rejected_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *", [bookingId]);
    if (!r) throw new Error(`Booking not found: ${bookingId}`);
    return mapBooking(r);
  }

  async requestRefund(bookingId: string, reason?: string): Promise<Booking> {
    const current = await this.getBookingById(bookingId);
    if (!current) throw new Error(`Booking not found: ${bookingId}`);
    const st = current.paymentStatus as string;
    if (st !== "paid" && st !== "dp_paid") {
      throw new Error("Refund hanya untuk booking paid/dp_paid.");
    }
    const r = await queryOne<Record<string, unknown>>(
      "UPDATE bookings SET payment_status = 'refund_requested', refund_reason = $2, refund_requested_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *",
      [bookingId, reason || null],
    );
    if (!r) throw new Error(`Booking not found: ${bookingId}`);
    return mapBooking(r);
  }

  async approveRefund(bookingId: string, _actorId?: string): Promise<Booking> {
    const current = await this.getBookingById(bookingId);
    if (!current) throw new Error(`Booking not found: ${bookingId}`);
    if (current.paymentStatus !== "refund_requested") throw new Error("Tidak ada pengajuan refund.");
    const r = await queryOne<Record<string, unknown>>(
      "UPDATE bookings SET payment_status = 'refunded', booking_status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *",
      [bookingId],
    );
    if (!r) throw new Error(`Booking not found: ${bookingId}`);
    return mapBooking(r);
  }

  async rejectRefund(bookingId: string, _actorId?: string): Promise<Booking> {
    const current = await this.getBookingById(bookingId);
    if (!current) throw new Error(`Booking not found: ${bookingId}`);
    if (current.paymentStatus !== "refund_requested") throw new Error("Tidak ada pengajuan refund.");
    // Kembali ke status bayar sebelumnya — pakai paid_amount: lunas → paid, sebagian → dp_paid.
    const paid = current.paidAmount ?? 0;
    const back = paid >= current.totalPrice && paid > 0 ? "paid" : "dp_paid";
    const r = await queryOne<Record<string, unknown>>(
      "UPDATE bookings SET payment_status = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
      [bookingId, back],
    );
    if (!r) throw new Error(`Booking not found: ${bookingId}`);
    return mapBooking(r);
  }

  // ── Notifications ──
  async getNotificationLogs(bookingId?: string): Promise<NotificationLog[]> {
    if (bookingId) {
      const rows = await query<Record<string, unknown>>("SELECT * FROM notification_logs WHERE booking_id = $1 ORDER BY created_at DESC", [bookingId]);
      return rows.map(mapRow<NotificationLog>);
    }
    const rows = await query<Record<string, unknown>>("SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 100");
    return rows.map(mapRow<NotificationLog>);
  }

  async createNotificationLog(payload: NotificationPayload, status: NotificationLog["status"], errorMessage?: string): Promise<NotificationLog> {
    const r = await queryOne<Record<string, unknown>>(
      "INSERT INTO notification_logs (type, channel, recipient, subject, message, status, booking_id, booking_code, error_message, sent_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
      [payload.type, payload.channel, payload.recipient, payload.subject || null, payload.message, status, payload.bookingId || null, payload.bookingCode || null, errorMessage || null, status === "sent" ? "NOW()" : null],
    );
    return mapRow<NotificationLog>(r!);
  }

  async markNotificationRead(id: string): Promise<NotificationLog> {
    const r = await queryOne<Record<string, unknown>>("UPDATE notification_logs SET status = 'read', read_at = NOW() WHERE id = $1 RETURNING *", [id]);
    if (!r) throw new Error(`Notification not found: ${id}`);
    return mapRow<NotificationLog>(r);
  }

  // ── Auth - Admin ──
  async authenticateAdmin(email: string, _password: string): Promise<AdminUser | null> {
    // Password verification done in service layer with bcryptjs
    const r = await queryOne<Record<string, unknown>>("SELECT * FROM admins WHERE email = $1 AND is_active = true", [email]);
    if (!r) return null;
    const a = snakeToCamel(r);
    return { id: a.id as string, username: a.username as string, name: a.name as string, email: a.email as string, passwordHash: a.passwordHash as string, role: a.role as AdminUser["role"], isActive: a.isActive as boolean, createdAt: fmtTs(a.createdAt), lastLoginAt: a.lastLoginAt ? fmtTs(a.lastLoginAt) : undefined };
  }

  async getAdminById(id: string): Promise<AdminUser | null> {
    const r = await queryOne<Record<string, unknown>>("SELECT * FROM admins WHERE id = $1", [id]);
    if (!r) return null;
    const a = snakeToCamel(r);
    return { id: a.id as string, username: a.username as string, name: a.name as string, email: a.email as string, passwordHash: a.passwordHash as string, role: a.role as AdminUser["role"], isActive: a.isActive as boolean, createdAt: fmtTs(a.createdAt), lastLoginAt: a.lastLoginAt ? fmtTs(a.lastLoginAt) : undefined };
  }

  // ── Auth - Customer ──

  async createAdmin(data: Omit<AdminUser, "createdAt" | "lastLoginAt">): Promise<AdminUser> {
    const r = await queryOne<Record<string, unknown>>(
      "INSERT INTO admins (id, username, name, email, password_hash, role, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [data.id, data.username, data.name, data.email, data.passwordHash, data.role, data.isActive],
    );
    if (!r) throw new Error("Failed to create admin");
    const a = snakeToCamel(r);
    return { id: a.id as string, username: a.username as string, name: a.name as string, email: a.email as string, passwordHash: a.passwordHash as string, role: a.role as AdminUser["role"], isActive: a.isActive as boolean, createdAt: fmtTs(a.createdAt) };
  }

  async getAllAdmins(): Promise<AdminUser[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM admins");
    return rows.map(r => {
      const a = snakeToCamel(r);
      return { id: a.id as string, username: a.username as string, name: a.name as string, email: a.email as string, passwordHash: a.passwordHash as string, role: a.role as AdminUser["role"], isActive: a.isActive as boolean, createdAt: fmtTs(a.createdAt), lastLoginAt: a.lastLoginAt ? fmtTs(a.lastLoginAt) : undefined };
    });
  }

  async createVenueOwner(data: Omit<VenueOwner, "createdAt" | "updatedAt">): Promise<VenueOwner> {
    const r = await queryOne<Record<string, unknown>>(
      "INSERT INTO venue_owners (id, admin_id, business_name, pic_name, phone, email, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [data.id, data.adminId, data.businessName, data.picName, data.phone, data.email, data.status],
    );
    if (!r) throw new Error("Failed to create venue owner");
    const o = snakeToCamel(r);
    return { id: o.id as string, adminId: o.adminId as string, businessName: o.businessName as string, picName: o.picName as string, phone: o.phone as string, email: o.email as string, status: o.status as VenueOwner["status"], createdAt: fmtTs(o.createdAt), updatedAt: fmtTs(o.updatedAt) };
  }

  async updateVenueOwnerStatus(id: string, status: VenueOwnerStatus): Promise<VenueOwner> {
    const r = await queryOne<Record<string, unknown>>(
      "UPDATE venue_owners SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
      [id, status],
    );
    if (!r) throw new Error(`Venue owner not found: ${id}`);
    const o = snakeToCamel(r);
    return { id: o.id as string, adminId: o.adminId as string, businessName: o.businessName as string, picName: o.picName as string, phone: o.phone as string, email: o.email as string, status: o.status as VenueOwner["status"], createdAt: fmtTs(o.createdAt), updatedAt: fmtTs(o.updatedAt) };
  }

  // ── Auth - Customer ──
  async registerCustomer(data: { name: string; email: string; phone: string; passwordHash: string }): Promise<CustomerPublic> {
    const r = await queryOne<Record<string, unknown>>(
      "INSERT INTO customers (id, name, email, phone, password_hash) VALUES (gen_random_uuid(), $1,$2,$3,$4) RETURNING *",
      [data.name, data.email, data.phone, data.passwordHash],
    );
    const c = snakeToCamel(r!);
    return { id: c.id as string, name: c.name as string, email: c.email as string, phone: c.phone as string, loyaltyPoints: c.loyaltyPoints as number, totalSpent: c.totalSpent as number, memberSince: fmtTs(c.memberSince) };
  }

  async authenticateCustomer(email: string, _password: string): Promise<CustomerPublic | null> {
    const r = await queryOne<Record<string, unknown>>("SELECT * FROM customers WHERE email = $1 AND is_active = true", [email]);
    if (!r) return null;
    const c = snakeToCamel(r);
    return { id: c.id as string, name: c.name as string, email: c.email as string, phone: c.phone as string, loyaltyPoints: c.loyaltyPoints as number, totalSpent: c.totalSpent as number, memberSince: fmtTs(c.memberSince) };
  }

  async getCustomerById(id: string): Promise<CustomerPublic | null> {
    const r = await queryOne<Record<string, unknown>>("SELECT * FROM customers WHERE id = $1", [id]);
    if (!r) return null;
    const c = snakeToCamel(r);
    return { id: c.id as string, name: c.name as string, email: c.email as string, phone: c.phone as string, loyaltyPoints: c.loyaltyPoints as number, totalSpent: c.totalSpent as number, memberSince: fmtTs(c.memberSince) };
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    const r = await queryOne<Record<string, unknown>>("SELECT * FROM customers WHERE email = $1", [email]);
    if (!r) return null;
    const c = snakeToCamel(r);
    return { id: c.id as string, name: c.name as string, email: c.email as string, phone: c.phone as string, passwordHash: c.passwordHash as string, avatar: c.avatar as string | undefined, isVerified: c.isVerified as boolean, isActive: c.isActive as boolean, loyaltyPoints: c.loyaltyPoints as number, totalSpent: c.totalSpent as number, memberSince: fmtTs(c.memberSince), lastLoginAt: c.lastLoginAt ? fmtTs(c.lastLoginAt) : undefined, createdAt: fmtTs(c.createdAt), updatedAt: fmtTs(c.updatedAt) };
  }

  // ── Loyalty ──
  async getLoyaltyTransactions(customerId: string): Promise<LoyaltyTransaction[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM loyalty_transactions WHERE customer_id = $1 ORDER BY created_at DESC", [customerId]);
    return rows.map(mapRow<LoyaltyTransaction>);
  }

  async addLoyaltyPoints(customerId: string, points: number, bookingId: string | undefined, description: string, type: LoyaltyTransactionType): Promise<LoyaltyTransaction> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Idempotent for earned per booking — skip if already exists
      if (type === "earned" && bookingId) {
        const existing = await client.query("SELECT id FROM loyalty_transactions WHERE booking_id = $1 AND type = 'earned' LIMIT 1", [bookingId]);
        if (existing.rows.length > 0) {
          await client.query("ROLLBACK");
          const r = await queryOne<Record<string, unknown>>("SELECT * FROM loyalty_transactions WHERE booking_id = $1 AND type='earned' LIMIT 1", [bookingId]);
          return mapRow<LoyaltyTransaction>(r!);
        }
      }
      await client.query("UPDATE customers SET loyalty_points = loyalty_points + $1, updated_at = NOW() WHERE id = $2", [points, customerId]);
      const { rows } = await client.query("INSERT INTO loyalty_transactions (customer_id, booking_id, type, points, description) VALUES ($1,$2,$3,$4,$5) RETURNING *", [customerId, bookingId || null, type, points, description]);
      await client.query("COMMIT");
      return mapRow<LoyaltyTransaction>(rows[0]);
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally {
      client.release();
    }
  }

  async redeemLoyaltyPoints(customerId: string, rewardId: string, bookingId?: string): Promise<RewardRedemption> {
    const reward = await queryOne<Record<string, unknown>>("SELECT * FROM rewards WHERE id = $1 AND is_active = true", [rewardId]);
    if (!reward) throw new Error("Reward not found");
    const rc = snakeToCamel(reward);
    const pointsCost = rc.pointsCost as number;
    const name = rc.name as string;

    await pool.query("UPDATE customers SET loyalty_points = loyalty_points - $1, updated_at = NOW() WHERE id = $2", [pointsCost, customerId]);
    await pool.query("INSERT INTO loyalty_transactions (customer_id, type, points, description) VALUES ($1, 'redeemed', $2, $3)", [customerId, -pointsCost, `Tukar: ${name}`]);

    // ponytail: rewards table not in schema — skip redemption record until schema updated. add when rewards table added.
    const redemption = { id: `rdm-${crypto.randomUUID().slice(0, 8)}`, customerId, rewardId, rewardName: name, pointsUsed: pointsCost, bookingId, status: "applied" as const, createdAt: new Date().toISOString(), usedAt: new Date().toISOString() };
    return redemption;
  }

  async getRewards(): Promise<Reward[]> {
    // ponytail: rewards table not in schema — return empty. add when schema updated.
    return [];
  }

  async getActiveRewards(): Promise<Reward[]> {
    return [];
  }

  async getCustomerRedemptions(_customerId: string): Promise<RewardRedemption[]> {
    // ponytail: reward_redemptions table not in schema — return empty. add when schema updated.
    return [];
  }

  async updateCustomerSpent(customerId: string, amount: number): Promise<void> {
    await pool.query("UPDATE customers SET total_spent = total_spent + $1, updated_at = NOW() WHERE id = $2", [amount, customerId]);
  }

  // ── Reviews ──

  async createReview(data: {
    bookingId: string;
    customerId: string;
    venueId: string;
    courtId?: string;
    rating: number;
    comment: string;
    photos?: string[];
  }): Promise<Review> {
    const id = `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { rows } = await pool.query(
      `INSERT INTO reviews (id, booking_id, customer_id, venue_id, court_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, data.bookingId, data.customerId, data.venueId, data.courtId || null, data.rating, data.comment]
    );

    // Insert photos if provided
    if (data.photos && data.photos.length > 0) {
      for (const photoUrl of data.photos) {
        const photoId = `rphoto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await pool.query(
          `INSERT INTO review_photos (id, review_id, photo_url) VALUES ($1, $2, $3)`,
          [photoId, id, photoUrl]
        );
      }
    }

    // Update venue aggregate rating
    await this.updateVenueRating(data.venueId);

    return this.mapReview(rows[0]);
  }

  async getReviewsByVenue(venueId: string): Promise<ReviewWithDetails[]> {
    const { rows } = await pool.query(
      `SELECT r.*, c.name as customer_name, c.avatar as customer_avatar
       FROM reviews r
       LEFT JOIN customers c ON r.customer_id = c.id
       WHERE r.venue_id = $1 AND r.is_visible = true
       ORDER BY r.created_at DESC`,
      [venueId]
    );

    const reviews: ReviewWithDetails[] = [];
    for (const row of rows) {
      const review = this.mapReview(row) as ReviewWithDetails;
      review.customerName = row.customer_name;
      review.customerAvatar = row.customer_avatar;
      // Fetch photos
      const { rows: photoRows } = await pool.query(
        `SELECT * FROM review_photos WHERE review_id = $1 ORDER BY created_at`,
        [review.id]
      );
      review.photos = photoRows.map((p) => ({
        id: p.id,
        reviewId: p.review_id,
        photoUrl: p.photo_url,
        createdAt: p.created_at,
      }));
      reviews.push(review);
    }
    return reviews;
  }

  async getReviewsByCourt(courtId: string): Promise<ReviewWithDetails[]> {
    const { rows } = await pool.query(
      `SELECT r.*, c.name as customer_name, c.avatar as customer_avatar
       FROM reviews r
       LEFT JOIN customers c ON r.customer_id = c.id
       WHERE r.court_id = $1 AND r.is_visible = true
       ORDER BY r.created_at DESC`,
      [courtId]
    );

    const reviews: ReviewWithDetails[] = [];
    for (const row of rows) {
      const review = this.mapReview(row) as ReviewWithDetails;
      review.customerName = row.customer_name;
      review.customerAvatar = row.customer_avatar;
      const { rows: photoRows } = await pool.query(
        `SELECT * FROM review_photos WHERE review_id = $1 ORDER BY created_at`,
        [review.id]
      );
      review.photos = photoRows.map((p) => ({
        id: p.id,
        reviewId: p.review_id,
        photoUrl: p.photo_url,
        createdAt: p.created_at,
      }));
      reviews.push(review);
    }
    return reviews;
  }

  async getReviewByBooking(bookingId: string): Promise<Review | null> {
    const { rows } = await pool.query(
      `SELECT * FROM reviews WHERE booking_id = $1`,
      [bookingId]
    );
    return rows[0] ? this.mapReview(rows[0]) : null;
  }

  async getVenueRating(venueId: string): Promise<{ avgRating: number; reviewCount: number }> {
    const { rows } = await pool.query(
      `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as review_count
       FROM reviews WHERE venue_id = $1 AND is_visible = true`,
      [venueId]
    );
    return {
      avgRating: parseFloat(rows[0].avg_rating) || 0,
      reviewCount: parseInt(rows[0].review_count) || 0,
    };
  }

  async updateVenueRating(venueId: string): Promise<void> {
    const { avgRating, reviewCount } = await this.getVenueRating(venueId);
    await pool.query(
      `UPDATE venues SET avg_rating = $1, review_count = $2, updated_at = NOW() WHERE id = $3`,
      [avgRating, reviewCount, venueId]
    );
  }

  async updateVenueConfig(venueId: string, config: Record<string, unknown>): Promise<void> {
    const entries = Object.entries(config);
    if (entries.length === 0) return;
    // Merge with existing config
    const { rows } = await pool.query(`SELECT rain_discount_config FROM venues WHERE id = $1`, [venueId]);
    const existing = rows[0]?.rain_discount_config || {};
    const merged = { ...existing, ...config };
    await pool.query(
      `UPDATE venues SET rain_discount_config = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(merged), venueId]
    );
  }

  async getHolidays(): Promise<Holiday[]> {
    const rows = await query<Record<string, unknown>>("SELECT * FROM holidays WHERE is_active = true ORDER BY date");
    return rows.map((r) => ({
      id: r.id as string,
      date: r.date as string,
      name: r.name as string,
      type: r.type as Holiday["type"],
      description: (r.description as string) || "",
      isActive: r.is_active as boolean,
    }));
  }

  private mapReview(row: Record<string, unknown>): Review {
    return {
      id: row.id as string,
      bookingId: row.booking_id as string,
      customerId: row.customer_id as string,
      venueId: row.venue_id as string,
      courtId: row.court_id as string | undefined,
      rating: row.rating as number,
      comment: row.comment as string,
      isVisible: row.is_visible as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  // ── Reviews - Moderation ──
  async getPendingReviews(): Promise<ReviewWithDetails[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT r.*, c.name as customer_name, c.avatar as customer_avatar,
              v.name as venue_name
       FROM reviews r
       LEFT JOIN customers c ON c.id = r.customer_id
       LEFT JOIN venues v ON v.id = r.venue_id
       ORDER BY r.created_at DESC`
    );
    return rows.map((row) => {
      const review = this.mapReview(row) as ReviewWithDetails;
      review.customerName = row.customer_name as string;
      review.customerAvatar = row.customer_avatar as string | undefined;
      return review;
    });
  }

  async moderateReview(id: string, isVisible: boolean): Promise<Review> {
    const r = await queryOne<Record<string, unknown>>(
      "UPDATE reviews SET is_visible = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [isVisible, id]
    );
    return this.mapReview(r!);
  }

  // ── Favorites ──
  async getCustomerFavorites(customerId: string): Promise<Venue[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT v.* FROM venues v
       INNER JOIN customer_favorites f ON f.venue_id = v.id
       WHERE f.customer_id = $1
       ORDER BY f.created_at DESC`,
      [customerId]
    );
    return rows.map((r) => mapRow<Venue>(r));
  }

  async addFavorite(customerId: string, venueId: string): Promise<void> {
    const id = `fav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      "INSERT INTO customer_favorites (id, customer_id, venue_id) VALUES ($1, $2, $3) ON CONFLICT (customer_id, venue_id) DO NOTHING",
      [id, customerId, venueId]
    );
  }

  async removeFavorite(customerId: string, venueId: string): Promise<void> {
    await pool.query(
      "DELETE FROM customer_favorites WHERE customer_id = $1 AND venue_id = $2",
      [customerId, venueId]
    );
  }

  async getFavoriteVenueIds(customerId: string): Promise<string[]> {
    const rows = await query<Record<string, unknown>>(
      "SELECT venue_id FROM customer_favorites WHERE customer_id = $1",
      [customerId]
    );
    return rows.map((r) => r.venue_id as string);
  }

  // ── Court Photos ──
  async getCourtPhotos(courtId: string): Promise<CourtPhoto[]> {
    const rows = await query<Record<string, unknown>>(
      "SELECT * FROM court_photos WHERE court_id = $1 ORDER BY sort_order, created_at",
      [courtId]
    );
    return rows.map((r) => {
      const c = snakeToCamel(r);
      return {
        id: c.id as string,
        courtId: c.courtId as string,
        url: c.url as string,
        caption: (c.caption as string) || "",
        sortOrder: (c.sortOrder as number) ?? 0,
        createdAt: fmtTs(c.createdAt),
      };
    });
  }

  async createCourtPhoto(photo: CourtPhoto): Promise<CourtPhoto> {
    await pool.query(
      "INSERT INTO court_photos (id, court_id, url, caption, sort_order) VALUES ($1, $2, $3, $4, $5)",
      [photo.id, photo.courtId, photo.url, photo.caption, photo.sortOrder]
    );
    return { ...photo, createdAt: new Date().toISOString() };
  }

  async deleteCourtPhoto(id: string): Promise<void> {
    await pool.query("DELETE FROM court_photos WHERE id = $1", [id]);
  }

  // ── Pickup Games ──

  async getPickupGames(filters?: { sport?: string; status?: string; date?: string; skillLevel?: string }): Promise<PickupGame[]> {
    let sql = `SELECT pg.*, v.name as venue_name, c.name as court_name
      FROM pickup_games pg LEFT JOIN venues v ON v.id = pg.venue_id LEFT JOIN courts c ON c.id = pg.court_id WHERE 1=1`;
    const p: (string | number)[] = [];
    if (filters?.sport) { p.push(filters.sport); sql += ` AND pg.sport_type = $${p.length}`; }
    if (filters?.status) { p.push(filters.status); sql += ` AND pg.status = $${p.length}`; }
    if (filters?.date) { p.push(filters.date); sql += ` AND DATE(pg.scheduled_at) = $${p.length}`; }
    if (filters?.skillLevel) { p.push(filters.skillLevel); sql += ` AND pg.skill_level = $${p.length}`; }
    sql += " ORDER BY pg.scheduled_at ASC";
    const { rows } = await pool.query(sql, p);
    return rows.map((r) => this.mapPickupGame(r));
  }

  async getPickupGameById(id: string): Promise<PickupGame | null> {
    const { rows } = await pool.query(
      `SELECT pg.*, v.name as venue_name, c.name as court_name FROM pickup_games pg
       LEFT JOIN venues v ON v.id = pg.venue_id LEFT JOIN courts c ON c.id = pg.court_id WHERE pg.id = $1`, [id]);
    return rows[0] ? this.mapPickupGame(rows[0]) : null;
  }

  async createPickupGame(data: Omit<PickupGame, "id" | "createdAt" | "updatedAt" | "currentPlayers">): Promise<PickupGame> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO pickup_games (id, court_id, host_customer_id, venue_id, title, sport_type, scheduled_at,
       duration_minutes, max_players, current_players, price_per_person, total_price, status, description,
       skill_level, is_recurring, recurring_pattern, recurring_until, location_name, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [id, data.courtId, data.hostCustomerId, data.venueId, data.title, data.sportType,
       data.scheduledAt, data.durationMinutes, data.maxPlayers, 0, // currentPlayers = 0
       data.pricePerPerson, data.totalPrice, data.status, data.description, data.skillLevel,
       data.isRecurring, data.recurringPattern, data.recurringUntil, data.locationName,
       data.latitude, data.longitude]
    );
    return this.mapPickupGame(rows[0]);
  }

  async updatePickupGame(id: string, data: Partial<PickupGame>): Promise<PickupGame> {
    const fields: string[] = []; const p: unknown[] = [];
    if (data.title !== undefined) { p.push(data.title); fields.push(`title = $${p.length}`); }
    if (data.scheduledAt !== undefined) { p.push(data.scheduledAt); fields.push(`scheduled_at = $${p.length}`); }
    if (data.durationMinutes !== undefined) { p.push(data.durationMinutes); fields.push(`duration_minutes = $${p.length}`); }
    if (data.maxPlayers !== undefined) { p.push(data.maxPlayers); fields.push(`max_players = $${p.length}`); }
    if (data.pricePerPerson !== undefined) { p.push(data.pricePerPerson); fields.push(`price_per_person = $${p.length}`); }
    if (data.totalPrice !== undefined) { p.push(data.totalPrice); fields.push(`total_price = $${p.length}`); }
    if (data.status !== undefined) { p.push(data.status); fields.push(`status = $${p.length}`); }
    if (data.description !== undefined) { p.push(data.description); fields.push(`description = $${p.length}`); }
    if (data.skillLevel !== undefined) { p.push(data.skillLevel); fields.push(`skill_level = $${p.length}`); }
    if (fields.length === 0) return (await this.getPickupGameById(id))!;
    p.push(id);
    const { rows } = await pool.query(`UPDATE pickup_games SET ${fields.join(",")}, updated_at = NOW() WHERE id = $${p.length} RETURNING *`, p);
    return this.mapPickupGame(rows[0]);
  }

  async deletePickupGame(id: string): Promise<void> {
    await pool.query("UPDATE pickup_games SET status = 'cancelled' WHERE id = $1", [id]);
  }

  async joinPickupGame(pickupGameId: string, customerId: string, splitAmount: number, skillLevel?: string): Promise<PickupGameParticipant> {
    const { rows } = await pool.query(
      `INSERT INTO pickup_game_participants (id, pickup_game_id, customer_id, split_amount, skill_level, is_host)
       VALUES ($1,$2,$3,$4,$5,false) RETURNING *`,
      [crypto.randomUUID(), pickupGameId, customerId, splitAmount, skillLevel]
    );
    await pool.query("UPDATE pickup_games SET current_players = current_players + 1 WHERE id = $1", [pickupGameId]);
    return this.mapPickupParticipant(rows[0]);
  }

  async leavePickupGame(pickupGameId: string, customerId: string): Promise<void> {
    await pool.query("DELETE FROM pickup_game_participants WHERE pickup_game_id = $1 AND customer_id = $2", [pickupGameId, customerId]);
    await pool.query("UPDATE pickup_games SET current_players = current_players - 1 WHERE id = $1", [pickupGameId]);
  }

  async getPickupGameParticipants(pickupGameId: string): Promise<PickupGameParticipant[]> {
    const { rows } = await pool.query(
      `SELECT pp.*, cu.name as customer_name, cu.email as customer_email
       FROM pickup_game_participants pp LEFT JOIN customers cu ON cu.id = pp.customer_id
       WHERE pp.pickup_game_id = $1 ORDER BY pp.is_host DESC, pp.joined_at ASC`, [pickupGameId]);
    return rows.map((r) => this.mapPickupParticipant(r));
  }

  async getPickupGamesByCustomer(customerId: string): Promise<PickupGame[]> {
    const { rows } = await pool.query(
      `SELECT pg.*, v.name as venue_name FROM pickup_games pg
       LEFT JOIN venues v ON v.id = pg.venue_id
       WHERE pg.host_customer_id = $1 OR pg.id IN (
         SELECT pickup_game_id FROM pickup_game_participants WHERE customer_id = $1)
       ORDER BY pg.scheduled_at DESC`, [customerId]);
    return rows.map((r) => this.mapPickupGame(r));
  }

  async sendPickupGameMessage(pickupGameId: string, senderId: string, message: string): Promise<PickupGameMessage> {
    const { rows } = await pool.query(
      `INSERT INTO pickup_game_messages (id, pickup_game_id, sender_id, message) VALUES ($1,$2,$3,$4) RETURNING *`,
      [crypto.randomUUID(), pickupGameId, senderId, message]);
    return this.mapPickupMessage(rows[0]);
  }

  async getPickupGameMessages(pickupGameId: string): Promise<PickupGameMessage[]> {
    const { rows } = await pool.query(
      `SELECT pm.*, cu.name as sender_name FROM pickup_game_messages pm
       LEFT JOIN customers cu ON cu.id = pm.sender_id WHERE pm.pickup_game_id = $1 ORDER BY pm.created_at ASC`, [pickupGameId]);
    return rows.map((r) => this.mapPickupMessage(r));
  }

  // ── Team Wallets ──

  async getTeamWalletsByCustomer(customerId: string): Promise<TeamWallet[]> {
    const { rows } = await pool.query(
      `SELECT tw.* FROM team_wallets tw
       WHERE tw.owner_customer_id = $1 OR tw.id IN (
         SELECT wallet_id FROM team_wallet_members WHERE customer_id = $1) ORDER BY tw.created_at DESC`, [customerId]);
    return rows.map((r) => this.mapTeamWallet(r));
  }

  async getTeamWalletById(id: string): Promise<TeamWallet | null> {
    const { rows } = await pool.query("SELECT * FROM team_wallets WHERE id = $1", [id]);
    return rows[0] ? this.mapTeamWallet(rows[0]) : null;
  }

  async createTeamWallet(data: Omit<TeamWallet, "id" | "balance" | "totalSpent" | "memberCount" | "createdAt" | "updatedAt">): Promise<TeamWallet> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO team_wallets (id, owner_customer_id, name, sport_type, avatar_url)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, data.ownerCustomerId, data.name, data.sportType, data.avatarUrl]);
    return this.mapTeamWallet(rows[0]);
  }

  async updateTeamWallet(id: string, data: Partial<TeamWallet>): Promise<TeamWallet> {
    const fields: string[] = []; const p: unknown[] = [];
    if (data.name !== undefined) { p.push(data.name); fields.push(`name = $${p.length}`); }
    if (data.sportType !== undefined) { p.push(data.sportType); fields.push(`sport_type = $${p.length}`); }
    if (data.avatarUrl !== undefined) { p.push(data.avatarUrl); fields.push(`avatar_url = $${p.length}`); }
    if (data.balance !== undefined) { p.push(data.balance); fields.push(`balance = $${p.length}`); }
    if (data.totalSpent !== undefined) { p.push(data.totalSpent); fields.push(`total_spent = $${p.length}`); }
    if (fields.length === 0) return (await this.getTeamWalletById(id))!;
    p.push(id);
    const { rows } = await pool.query(`UPDATE team_wallets SET ${fields.join(",")}, updated_at = NOW() WHERE id = $${p.length} RETURNING *`, p);
    return this.mapTeamWallet(rows[0]);
  }

  async deleteTeamWallet(id: string): Promise<void> {
    await pool.query("DELETE FROM team_wallets WHERE id = $1", [id]);
  }

  async getTeamWalletMembers(walletId: string): Promise<TeamWalletMember[]> {
    const { rows } = await pool.query(
      `SELECT twm.*, cu.name as customer_name, cu.email as customer_email
       FROM team_wallet_members twm LEFT JOIN customers cu ON cu.id = twm.customer_id
       WHERE twm.wallet_id = $1 ORDER BY twm.joined_at ASC`, [walletId]);
    return rows.map((r) => this.mapTeamWalletMember(r));
  }

  async addTeamWalletMember(walletId: string, customerId: string, role = "member"): Promise<TeamWalletMember> {
    const { rows } = await pool.query(
      `INSERT INTO team_wallet_members (id, wallet_id, customer_id, role) VALUES ($1,$2,$3,$4) RETURNING *`,
      [crypto.randomUUID(), walletId, customerId, role]);
    await pool.query("UPDATE team_wallets SET member_count = member_count + 1 WHERE id = $1", [walletId]);
    return this.mapTeamWalletMember(rows[0]);
  }

  async removeTeamWalletMember(walletId: string, customerId: string): Promise<void> {
    await pool.query("DELETE FROM team_wallet_members WHERE wallet_id = $1 AND customer_id = $2", [walletId, customerId]);
    await pool.query("UPDATE team_wallets SET member_count = GREATEST(member_count - 1, 1) WHERE id = $1", [walletId]);
  }

  async updateTeamWalletMemberRole(walletId: string, customerId: string, role: string): Promise<TeamWalletMember> {
    const { rows } = await pool.query(
      `UPDATE team_wallet_members SET role = $1 WHERE wallet_id = $2 AND customer_id = $3 RETURNING *`,
      [role, walletId, customerId]);
    return this.mapTeamWalletMember(rows[0]);
  }

  async createTeamWalletDeposit(walletId: string, fromCustomerId: string, amount: number, paymentMethod?: string, notes?: string): Promise<TeamWalletDeposit> {
    const { rows } = await pool.query(
      `INSERT INTO team_wallet_deposits (id, wallet_id, from_customer_id, amount, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [crypto.randomUUID(), walletId, fromCustomerId, amount, paymentMethod, notes]);
    return this.mapTeamWalletDeposit(rows[0]);
  }

  async confirmTeamWalletDeposit(depositId: string): Promise<TeamWalletDeposit> {
    const { rows } = await pool.query(
      `UPDATE team_wallet_deposits SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1 RETURNING *`, [depositId]);
    const d = rows[0];
    await pool.query(
      `UPDATE team_wallets SET balance = balance + $1 WHERE id = $2;
       UPDATE team_wallet_members SET balance = balance + $1, total_contributed = total_contributed + $1
       WHERE wallet_id = $2 AND customer_id = $3`,
      [d.amount, d.wallet_id, d.from_customer_id]);
    return this.mapTeamWalletDeposit(rows[0]);
  }

  async getTeamWalletDeposits(walletId: string): Promise<TeamWalletDeposit[]> {
    const { rows } = await pool.query(
      `SELECT td.*, cu.name as customer_name FROM team_wallet_deposits td
       LEFT JOIN customers cu ON cu.id = td.from_customer_id WHERE td.wallet_id = $1 ORDER BY td.created_at DESC`, [walletId]);
    return rows.map((r) => this.mapTeamWalletDeposit(r));
  }

  async getTeamWalletTransactions(walletId: string): Promise<TeamWalletTransaction[]> {
    const { rows } = await pool.query(
      `SELECT * FROM team_wallet_transactions WHERE wallet_id = $1 ORDER BY created_at DESC`, [walletId]);
    return rows.map((r) => this.mapTeamWalletTransaction(r));
  }

  async createTeamWalletTransaction(data: Omit<TeamWalletTransaction, "id" | "createdAt">): Promise<TeamWalletTransaction> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO team_wallet_transactions (id, wallet_id, type, amount, description, reference_id, customer_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, data.walletId, data.type, data.amount, data.description, data.referenceId, data.customerId]);
    return this.mapTeamWalletTransaction(rows[0]);
  }

  async payBookingFromWallet(walletId: string, bookingId: string, amount: number): Promise<TeamWalletTransaction> {
    const tx = await this.createTeamWalletTransaction({
      walletId, type: "booking_payment", amount, description: "Booking payment",
      referenceId: bookingId, customerId: undefined,
    });
    await pool.query("UPDATE team_wallets SET balance = balance - $1, total_spent = total_spent + $1 WHERE id = $2", [amount, walletId]);
    return tx;
  }

  async createWalletSplit(walletId: string, bookingId: string, totalAmount: number, splitType: string, members: { customerId: string; amount: number }[]): Promise<TeamWalletSplit> {
    const splitId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO team_wallet_splits (id, wallet_id, booking_id, total_amount, split_type) VALUES ($1,$2,$3,$4,$5)`,
      [splitId, walletId, bookingId, totalAmount, splitType]);
    for (const m of members) {
      await pool.query(
        `INSERT INTO team_wallet_split_members (id, split_id, customer_id, amount) VALUES ($1,$2,$3,$4)`,
        [crypto.randomUUID(), splitId, m.customerId, m.amount]);
    }
    const { rows } = await pool.query("SELECT * FROM team_wallet_splits WHERE id = $1", [splitId]);
    return this.mapTeamWalletSplit(rows[0]);
  }

  async getWalletSplits(walletId: string): Promise<TeamWalletSplit[]> {
    const { rows } = await pool.query("SELECT * FROM team_wallet_splits WHERE wallet_id = $1 ORDER BY created_at DESC", [walletId]);
    return rows.map((r) => this.mapTeamWalletSplit(r));
  }

  async getWalletSplitMembers(splitId: string): Promise<TeamWalletSplitMember[]> {
    const { rows } = await pool.query(
      `SELECT sm.*, cu.name as customer_name FROM team_wallet_split_members sm
       LEFT JOIN customers cu ON cu.id = sm.customer_id WHERE sm.split_id = $1`, [splitId]);
    return rows.map((r) => this.mapTeamWalletSplitMember(r));
  }

  // ── Player Profiles (Sprint 12) ──

  async getPlayerProfile(customerId: string): Promise<PlayerProfile | null> {
    const { rows } = await pool.query("SELECT * FROM player_profiles WHERE customer_id = $1", [customerId]);
    return rows[0] ? this.mapPlayerProfile(rows[0]) : null;
  }

  async upsertPlayerProfile(data: Partial<PlayerProfile> & { customerId: string }): Promise<PlayerProfile> {
    const { rows } = await pool.query(
      `INSERT INTO player_profiles (customer_id, preferred_position, preferred_sport, dominant_foot, play_style,
       bio, height_cm, weight_kg, availability, preferred_play_time, skill_level_overall, total_games_played,
       win_rate, joined_teams, avatar_sport_url, is_public)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (customer_id) DO UPDATE SET
       preferred_position = EXCLUDED.preferred_position, preferred_sport = EXCLUDED.preferred_sport,
       dominant_foot = EXCLUDED.dominant_foot, play_style = EXCLUDED.play_style, bio = EXCLUDED.bio,
       height_cm = EXCLUDED.height_cm, weight_kg = EXCLUDED.weight_kg, availability = EXCLUDED.availability,
       preferred_play_time = EXCLUDED.preferred_play_time, skill_level_overall = EXCLUDED.skill_level_overall,
       total_games_played = EXCLUDED.total_games_played, win_rate = EXCLUDED.win_rate,
       joined_teams = EXCLUDED.joined_teams, avatar_sport_url = EXCLUDED.avatar_sport_url,
       is_public = EXCLUDED.is_public, updated_at = NOW() RETURNING *`,
      [data.customerId, data.preferredPosition, data.preferredSport, data.dominantFoot, data.playStyle,
       data.bio, data.heightCm, data.weightKg, JSON.stringify(data.availability ?? []),
       JSON.stringify(data.preferredPlayTime ?? []), data.skillLevelOverall, data.totalGamesPlayed ?? 0,
       data.winRate ?? 0, data.joinedTeams ?? 0, data.avatarSportUrl, data.isPublic ?? true]);
    return this.mapPlayerProfile(rows[0]);
  }

  async searchPlayers(filters?: { sport?: string; skillLevel?: string; location?: string }): Promise<PlayerProfile[]> {
    let sql = `SELECT pp.*, cu.name as customer_name FROM player_profiles pp
               LEFT JOIN customers cu ON cu.id = pp.customer_id WHERE pp.is_public = true`;
    const p: string[] = [];
    if (filters?.sport) { p.push(filters.sport); sql += ` AND pp.preferred_sport = $${p.length}`; }
    if (filters?.skillLevel) { p.push(filters.skillLevel); sql += ` AND pp.skill_level_overall = $${p.length}`; }
    const { rows } = await pool.query(sql + " ORDER BY pp.total_games_played DESC LIMIT 50", p);
    return rows.map((r) => this.mapPlayerProfile(r));
  }

  async createPlayerSkillRating(data: Omit<PlayerSkillRating, "id" | "createdAt">): Promise<PlayerSkillRating> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO player_skill_ratings (id, customer_id, rated_by_customer_id, pickup_game_id,
       skill_score, attitude_score, punctuality_score, review_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, data.customerId, data.ratedByCustomerId, data.pickupGameId,
       data.skillScore, data.attitudeScore, data.punctualityScore, data.reviewText]);
    return this.mapPlayerSkillRating(rows[0]);
  }

  async getPlayerSkillRatings(customerId: string): Promise<PlayerSkillRating[]> {
    const { rows } = await pool.query("SELECT * FROM player_skill_ratings WHERE customer_id = $1 ORDER BY created_at DESC", [customerId]);
    return rows.map((r) => this.mapPlayerSkillRating(r));
  }

  // ── Match Requests (Sprint 12) ──

  async createMatchRequest(data: Omit<MatchRequest, "id" | "status" | "respondedAt" | "createdAt">): Promise<MatchRequest> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO match_requests (id, requester_id, target_customer_id, sport_type, proposed_date,
       proposed_location, message, pickup_game_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, data.requesterId, data.targetCustomerId, data.sportType, data.proposedDate,
       data.proposedLocation, data.message, data.pickupGameId]);
    return this.mapMatchRequest(rows[0]);
  }

  async getMatchRequests(customerId: string): Promise<MatchRequest[]> {
    const { rows } = await pool.query(
      `SELECT mr.*, cu.name as requester_name, cu2.name as target_name FROM match_requests mr
       LEFT JOIN customers cu ON cu.id = mr.requester_id LEFT JOIN customers cu2 ON cu2.id = mr.target_customer_id
       WHERE mr.requester_id = $1 OR mr.target_customer_id = $1 ORDER BY mr.created_at DESC`, [customerId]);
    return rows.map((r) => this.mapMatchRequest(r));
  }

  async updateMatchRequest(id: string, status: "accepted" | "declined"): Promise<MatchRequest> {
    const { rows } = await pool.query(
      `UPDATE match_requests SET status = $1, responded_at = NOW() WHERE id = $2 RETURNING *`, [status, id]);
    return this.mapMatchRequest(rows[0]);
  }

  // ── Achievements (Sprint 12) ──

  async getAchievements(): Promise<Achievement[]> {
    const { rows } = await pool.query("SELECT * FROM achievements ORDER BY points_reward ASC");
    return rows.map((r) => this.mapAchievement(r));
  }

  async getPlayerAchievements(customerId: string): Promise<(PlayerAchievement & { achievement: Achievement })[]> {
    const { rows } = await pool.query(
      `SELECT pa.*, a.code, a.name, a.name_en, a.description, a.description_en, a.category,
       a.icon, a.points_reward, a.badge_tier, a.criteria FROM player_achievements pa
       JOIN achievements a ON a.id = pa.achievement_id WHERE pa.customer_id = $1 ORDER BY pa.is_unlocked DESC, a.points_reward DESC`,
      [customerId]);
    return rows.map((r) => ({ ...this.mapPlayerAchievement(r), achievement: this.mapAchievement(r) }));
  }

  async upsertPlayerAchievement(customerId: string, achievementId: string, progress: number): Promise<PlayerAchievement> {
    const { rows } = await pool.query(
      `INSERT INTO player_achievements (id, customer_id, achievement_id, progress_current, progress_target)
       VALUES ($1,$2,$3,$4, (SELECT criteria->>'target' FROM achievements WHERE id = $3)::int)
       ON CONFLICT (customer_id, achievement_id) DO UPDATE SET progress_current = $4,
       is_unlocked = CASE WHEN $4 >= player_achievements.progress_target THEN true ELSE is_unlocked END,
       unlocked_at = CASE WHEN $4 >= player_achievements.progress_target AND NOT player_achievements.is_unlocked THEN NOW() ELSE unlocked_at END
       RETURNING *`, [crypto.randomUUID(), customerId, achievementId, progress]);
    return this.mapPlayerAchievement(rows[0]);
  }

  async getLeaderboard(limit = 20): Promise<{ customerId: string; name: string; totalPoints: number; totalGames: number }[]> {
    const { rows } = await pool.query(
      `SELECT c.id as customer_id, c.name, COALESCE(SUM(lt.points), 0) as total_points,
       COUNT(DISTINCT CASE WHEN lt.type = 'earned' THEN lt.id END) as total_games
       FROM customers c LEFT JOIN loyalty_transactions lt ON lt.customer_id = c.id
       GROUP BY c.id ORDER BY total_points DESC LIMIT $1`, [limit]);
    return rows.map((r) => ({
      customerId: r.customer_id, name: r.name,
      totalPoints: parseInt(r.total_points) || 0, totalGames: parseInt(r.total_games) || 0,
    }));
  }

  // ── Streaks (Sprint 12) ──

  async getPlayerStreaks(customerId: string): Promise<PlayerStreak[]> {
    const { rows } = await pool.query("SELECT * FROM player_streaks WHERE customer_id = $1", [customerId]);
    return rows.map((r) => this.mapPlayerStreak(r));
  }

  async updatePlayerStreak(customerId: string, streakType: string): Promise<PlayerStreak> {
    const { rows } = await pool.query(
      `INSERT INTO player_streaks (id, customer_id, streak_type, current_streak, longest_streak, last_activity_at)
       VALUES ($1,$2,$3,1,1,NOW())
       ON CONFLICT (customer_id, streak_type) DO UPDATE SET
       current_streak = CASE WHEN player_streaks.last_activity_at >= NOW() - INTERVAL '1 day'
         THEN player_streaks.current_streak + 1 ELSE 1 END,
       longest_streak = GREATEST(player_streaks.longest_streak,
         CASE WHEN player_streaks.last_activity_at >= NOW() - INTERVAL '1 day' THEN player_streaks.current_streak + 1 ELSE 1 END),
       last_activity_at = NOW()
       RETURNING *`,
      [crypto.randomUUID(), customerId, streakType]);
    return this.mapPlayerStreak(rows[0]);
  }

  // ── Flash Deals (Sprint 13) ──

  async getFlashDeals(filters?: { status?: string; courtId?: string }): Promise<FlashDeal[]> {
    let sql = `SELECT fd.*, v.name as venue_name, c.name as court_name FROM flash_deals fd
               LEFT JOIN venues v ON v.id = (SELECT venue_id FROM courts WHERE id = fd.court_id)
               LEFT JOIN courts c ON c.id = fd.court_id WHERE 1=1`;
    const p: string[] = [];
    if (filters?.status) { p.push(filters.status); sql += ` AND fd.status = $${p.length}`; }
    if (filters?.courtId) { p.push(filters.courtId); sql += ` AND fd.court_id = $${p.length}`; }
    sql += " ORDER BY fd.expires_at ASC";
    const { rows } = await pool.query(sql, p);
    return rows.map((r) => this.mapFlashDeal(r));
  }

  async getFlashDealById(id: string): Promise<FlashDeal | null> {
    const { rows } = await pool.query(
      `SELECT fd.*, v.name as venue_name, c.name as court_name FROM flash_deals fd
       LEFT JOIN courts c ON c.id = fd.court_id LEFT JOIN venues v ON v.id = c.venue_id WHERE fd.id = $1`, [id]);
    return rows[0] ? this.mapFlashDeal(rows[0]) : null;
  }

  async createFlashDeal(data: Omit<FlashDeal, "id" | "claimedBy" | "claimedAt" | "createdAt">): Promise<FlashDeal> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO flash_deals (id, court_id, slot_date, start_time, end_time, original_price, deal_price,
       discount_percent, min_players, max_players, status, deal_type, starts_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [id, data.courtId, data.slotDate, data.startTime, data.endTime, data.originalPrice,
       data.dealPrice, data.discountPercent, data.minPlayers, data.maxPlayers, data.status,
       data.dealType, data.startsAt, data.expiresAt]);
    return this.mapFlashDeal(rows[0]);
  }

  async claimFlashDeal(id: string, customerId: string): Promise<FlashDeal> {
    const { rows } = await pool.query(
      `UPDATE flash_deals SET status = 'claimed', claimed_by = $1, claimed_at = NOW() WHERE id = $2 RETURNING *`,
      [customerId, id]);
    return this.mapFlashDeal(rows[0]);
  }

  // ── Venue Cameras (Sprint 14) ──

  async getVenueCameras(venueId: string): Promise<VenueCamera[]> {
    const { rows } = await pool.query("SELECT * FROM venue_cameras WHERE venue_id = $1 ORDER BY created_at ASC", [venueId]);
    return rows.map((r) => this.mapVenueCamera(r));
  }

  async createVenueCamera(data: Omit<VenueCamera, "id" | "lastUpdated" | "createdAt">): Promise<VenueCamera> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO venue_cameras (id, venue_id, court_id, name, camera_url, snapshot_url, camera_type, is_public, crowd_level, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, data.venueId, data.courtId, data.name, data.cameraUrl, data.snapshotUrl,
       data.cameraType, data.isPublic, data.crowdLevel, data.status]);
    return this.mapVenueCamera(rows[0]);
  }

  async updateVenueCamera(id: string, data: Partial<VenueCamera>): Promise<VenueCamera> {
    const fields: string[] = []; const p: unknown[] = [];
    if (data.name !== undefined) { p.push(data.name); fields.push(`name = $${p.length}`); }
    if (data.cameraUrl !== undefined) { p.push(data.cameraUrl); fields.push(`camera_url = $${p.length}`); }
    if (data.snapshotUrl !== undefined) { p.push(data.snapshotUrl); fields.push(`snapshot_url = $${p.length}`); }
    if (data.crowdLevel !== undefined) { p.push(data.crowdLevel); fields.push(`crowd_level = $${p.length}`); }
    if (data.status !== undefined) { p.push(data.status); fields.push(`status = $${p.length}`); }
    if (data.isPublic !== undefined) { p.push(data.isPublic); fields.push(`is_public = $${p.length}`); }
    if (fields.length === 0) {
      const { rows } = await pool.query("SELECT * FROM venue_cameras WHERE id = $1", [id]);
      return rows[0] ? this.mapVenueCamera(rows[0]) : null!;
    }
    p.push(id);
    const { rows } = await pool.query(
      `UPDATE venue_cameras SET ${fields.join(",")}, last_updated = NOW() WHERE id = $${p.length} RETURNING *`, p);
    return this.mapVenueCamera(rows[0]);
  }

  async deleteVenueCamera(id: string): Promise<void> {
    await pool.query("DELETE FROM venue_cameras WHERE id = $1", [id]);
  }

  // ── Venue Verification (Sprint 14) ──

  async getVenueVerification(venueId: string): Promise<VenueVerification | null> {
    const { rows } = await pool.query("SELECT * FROM venue_verifications WHERE venue_id = $1", [venueId]);
    return rows[0] ? this.mapVenueVerification(rows[0]) : null;
  }

  async createVenueVerification(data: Omit<VenueVerification, "id" | "overallScore" | "verifiedAt" | "createdAt">): Promise<VenueVerification> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO venue_verifications (id, venue_id, requested_by, status)
       VALUES ($1,$2,$3,'pending') RETURNING *`,
      [id, data.venueId, data.requestedBy]);
    return this.mapVenueVerification(rows[0]);
  }

  async updateVenueVerification(id: string, data: Partial<VenueVerification>): Promise<VenueVerification> {
    const fields: string[] = []; const p: unknown[] = [];
    if (data.status !== undefined) { p.push(data.status); fields.push(`status = $${p.length}`); }
    if (data.overallScore !== undefined) { p.push(data.overallScore); fields.push(`overall_score = $${p.length}`); }
    if (data.fieldConditionScore !== undefined) { p.push(data.fieldConditionScore); fields.push(`field_condition_score = $${p.length}`); }
    if (data.lightingScore !== undefined) { p.push(data.lightingScore); fields.push(`lighting_score = $${p.length}`); }
    if (data.cleanlinessScore !== undefined) { p.push(data.cleanlinessScore); fields.push(`cleanliness_score = $${p.length}`); }
    if (data.parkingScore !== undefined) { p.push(data.parkingScore); fields.push(`parking_score = $${p.length}`); }
    if (data.accessibilityScore !== undefined) { p.push(data.accessibilityScore); fields.push(`accessibility_score = $${p.length}`); }
    if (data.amenitiesScore !== undefined) { p.push(data.amenitiesScore); fields.push(`amenities_score = $${p.length}`); }
    if (data.notes !== undefined) { p.push(data.notes); fields.push(`notes = $${p.length}`); }
    if (data.verifiedBy !== undefined) { p.push(data.verifiedBy); fields.push(`verified_by = $${p.length}`); }
    if (data.status === "approved") { fields.push(`verified_at = NOW()`); }
    if (fields.length === 0) {
      const { rows } = await pool.query("SELECT * FROM venue_verifications WHERE id = $1", [id]);
      return rows[0] ? this.mapVenueVerification(rows[0]) : null!;
    }
    p.push(id);
    const { rows } = await pool.query(`UPDATE venue_verifications SET ${fields.join(",")} WHERE id = $${p.length} RETURNING *`, p);
    return this.mapVenueVerification(rows[0]);
  }

  async getVenueVerificationPhotos(verificationId: string): Promise<VenueVerificationPhoto[]> {
    const { rows } = await pool.query("SELECT * FROM venue_verification_photos WHERE verification_id = $1", [verificationId]);
    return rows.map((r) => this.mapVenueVerificationPhoto(r));
  }

  async createVenueVerificationPhoto(data: Omit<VenueVerificationPhoto, "id" | "createdAt">): Promise<VenueVerificationPhoto> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO venue_verification_photos (id, verification_id, category, photo_url, caption) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, data.verificationId, data.category, data.photoUrl, data.caption]);
    return this.mapVenueVerificationPhoto(rows[0]);
  }

  // ── Loyalty Tiers (Sprint 15) ──

  async getLoyaltyTiers(): Promise<LoyaltyTier[]> {
    const { rows } = await pool.query("SELECT * FROM loyalty_tiers WHERE is_active = true ORDER BY min_points ASC");
    return rows.map((r) => this.mapLoyaltyTier(r));
  }

  // ── Group Bookings (Sprint 16) ──

  async createGroupBooking(data: {
    organizerId: string; venueId: string; courtId: string; sportId: string;
    title: string; description?: string; minParticipants: number; maxParticipants: number;
    pricePerSlot: number; deadline?: string;
  }): Promise<GroupBooking> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO group_bookings (id, organizer_id, venue_id, court_id, sport_id, title, description, min_participants, max_participants, price_per_slot, status, deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11) RETURNING *`,
      [id, data.organizerId, data.venueId, data.courtId, data.sportId, data.title, data.description || "", data.minParticipants, data.maxParticipants, data.pricePerSlot || 0, data.deadline || null],
    );
    return this.mapGroupBooking(rows[0]);
  }

  async getGroupBookingById(id: string): Promise<GroupBooking | null> {
    const { rows } = await pool.query(`SELECT * FROM group_bookings WHERE id = $1`, [id]);
    return rows[0] ? this.mapGroupBooking(rows[0]) : null;
  }

  async getGroupBookingDetail(id: string): Promise<GroupBookingDetail | null> {
    const booking = await this.getGroupBookingById(id);
    if (!booking) return null;
    const [participants, timeSlots] = await Promise.all([
      this.getGroupBookingParticipants(id),
      this.getGroupBookingTimeSlots(id),
    ]);
    return { ...booking, participants, timeSlots };
  }

  async getGroupBookingsByOrganizer(organizerId: string): Promise<GroupBooking[]> {
    const { rows } = await pool.query(`SELECT * FROM group_bookings WHERE organizer_id = $1 ORDER BY created_at DESC`, [organizerId]);
    return rows.map((r) => this.mapGroupBooking(r));
  }

  async updateGroupBookingStatus(id: string, status: GroupBooking["status"], bookingId?: string): Promise<GroupBooking> {
    const fields: string[] = [`status = $1`, `updated_at = NOW()`]; const p: unknown[] = [status];
    if (bookingId) { p.push(bookingId); fields.push(`final_booking_id = $${p.length}`); }
    p.push(id);
    const { rows } = await pool.query(`UPDATE group_bookings SET ${fields.join(", ")} WHERE id = $${p.length} RETURNING *`, p);
    if (!rows[0]) throw new Error("Group booking not found");
    return this.mapGroupBooking(rows[0]);
  }

  async deleteGroupBooking(id: string): Promise<void> { await pool.query(`DELETE FROM group_bookings WHERE id = $1`, [id]); }

  async getGroupBookingParticipants(groupBookingId: string): Promise<GroupBookingParticipant[]> {
    const { rows } = await pool.query(
      `SELECT gbp.*, c.name as customer_name, c.phone as customer_phone FROM group_booking_participants gbp LEFT JOIN customers c ON c.id = gbp.customer_id WHERE gbp.group_booking_id = $1 ORDER BY gbp.joined_at`, [groupBookingId],
    );
    return rows.map((r) => this.mapGroupBookingParticipant(r));
  }

  async addGroupBookingParticipant(groupBookingId: string, customerId: string, isOrganizer = false): Promise<GroupBookingParticipant> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO group_booking_participants (id, group_booking_id, customer_id, is_organizer, status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (group_booking_id, customer_id) DO NOTHING RETURNING *`,
      [id, groupBookingId, customerId, isOrganizer, isOrganizer ? "accepted" : "invited"],
    );
    if (!rows[0]) { const existing = await this.getGroupBookingParticipant(groupBookingId, customerId); if (!existing) throw new Error("Failed to add participant"); return existing; }
    const enriched = await pool.query(`SELECT gbp.*, c.name as customer_name, c.phone as customer_phone FROM group_booking_participants gbp LEFT JOIN customers c ON c.id = gbp.customer_id WHERE gbp.id = $1`, [id]);
    return this.mapGroupBookingParticipant(enriched.rows[0] ?? rows[0]);
  }

  async getGroupBookingParticipant(groupBookingId: string, customerId: string): Promise<GroupBookingParticipant | null> {
    const { rows } = await pool.query(
      `SELECT gbp.*, c.name as customer_name, c.phone as customer_phone FROM group_booking_participants gbp LEFT JOIN customers c ON c.id = gbp.customer_id WHERE gbp.group_booking_id = $1 AND gbp.customer_id = $2`, [groupBookingId, customerId],
    );
    return rows[0] ? this.mapGroupBookingParticipant(rows[0]) : null;
  }

  async updateGroupBookingParticipantStatus(groupBookingId: string, customerId: string, status: GroupBookingParticipant["status"], availability?: string[]): Promise<GroupBookingParticipant> {
    const sets: string[] = ["status = $1"]; const p: unknown[] = [status];
    if (availability) { p.push(JSON.stringify(availability)); sets.push(`availability_json = $${p.length}`); }
    if (status === "accepted" || status === "confirmed") sets.push("confirmed_at = NOW()");
    p.push(groupBookingId, customerId);
    const { rows } = await pool.query(`UPDATE group_booking_participants SET ${sets.join(", ")} WHERE group_booking_id = $${p.length - 1} AND customer_id = $${p.length} RETURNING *`, p);
    if (!rows[0]) throw new Error("Participant not found");
    const enriched = await pool.query(`SELECT gbp.*, c.name as customer_name, c.phone as customer_phone FROM group_booking_participants gbp LEFT JOIN customers c ON c.id = gbp.customer_id WHERE gbp.id = $1`, [rows[0].id]);
    return this.mapGroupBookingParticipant(enriched.rows[0] ?? rows[0]);
  }

  async getGroupBookingParticipantById(id: string): Promise<GroupBookingParticipant | null> {
    const { rows } = await pool.query(`SELECT gbp.*, c.name as customer_name, c.phone as customer_phone FROM group_booking_participants gbp LEFT JOIN customers c ON c.id = gbp.customer_id WHERE gbp.id = $1`, [id]);
    return rows[0] ? this.mapGroupBookingParticipant(rows[0]) : null;
  }

  async getGroupBookingTimeSlots(groupBookingId: string): Promise<GroupBookingTimeSlot[]> {
    const { rows } = await pool.query(`SELECT * FROM group_booking_time_slots WHERE group_booking_id = $1 ORDER BY vote_count DESC, created_at`, [groupBookingId]);
    return rows.map((r) => this.mapGroupBookingTimeSlot(r));
  }

  async addGroupBookingTimeSlot(data: { groupBookingId: string; slotDate: string; startTime: string; endTime: string }): Promise<GroupBookingTimeSlot> {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(`INSERT INTO group_booking_time_slots (id, group_booking_id, slot_date, start_time, end_time) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [id, data.groupBookingId, data.slotDate, data.startTime, data.endTime]);
    return this.mapGroupBookingTimeSlot(rows[0]);
  }

  async getGroupBookingTimeSlotById(id: string): Promise<GroupBookingTimeSlot | null> {
    const { rows } = await pool.query(`SELECT * FROM group_booking_time_slots WHERE id = $1`, [id]);
    return rows[0] ? this.mapGroupBookingTimeSlot(rows[0]) : null;
  }

  async voteGroupBookingTimeSlot(timeSlotId: string, customerId: string): Promise<GroupBookingTimeSlot> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows: partRows } = await client.query(
        `SELECT gbp.id, gbp.vote_slot_id FROM group_booking_participants gbp JOIN group_booking_time_slots ts ON ts.group_booking_id = gbp.group_booking_id WHERE gbp.customer_id = $1 AND ts.id = $2 LIMIT 1`,
        [customerId, timeSlotId],
      );
      if (partRows[0]?.vote_slot_id && partRows[0].vote_slot_id !== timeSlotId) {
        await client.query(`UPDATE group_booking_time_slots SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = $1`, [partRows[0].vote_slot_id]);
      }
      if (partRows[0]) await client.query(`UPDATE group_booking_participants SET vote_slot_id = $1 WHERE id = $2`, [timeSlotId, partRows[0].id]);
      const { rows } = await client.query(`UPDATE group_booking_time_slots SET vote_count = vote_count + 1 WHERE id = $1 RETURNING *`, [timeSlotId]);
      await client.query("COMMIT");
      if (!rows[0]) throw new Error("Time slot not found");
      return this.mapGroupBookingTimeSlot(rows[0]);
    } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  }

  async markGroupBookingWinner(groupBookingId: string, timeSlotId: string): Promise<GroupBookingTimeSlot> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`UPDATE group_booking_time_slots SET is_winner = false WHERE group_booking_id = $1`, [groupBookingId]);
      const { rows } = await client.query(`UPDATE group_booking_time_slots SET is_winner = true WHERE id = $1 AND group_booking_id = $2 RETURNING *`, [timeSlotId, groupBookingId]);
      if (rows[0]) {
        await client.query(`UPDATE group_bookings SET booking_date = $1, start_time = $2, end_time = $3, updated_at = NOW() WHERE id = $4`, [rows[0].slot_date, rows[0].start_time, rows[0].end_time, groupBookingId]);
      }
      await client.query("COMMIT");
      if (!rows[0]) throw new Error("Time slot not found");
      return this.mapGroupBookingTimeSlot(rows[0]);
    } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  }


  // ── Mappers ──

  private mapPickupGame(r: Record<string, unknown>): PickupGame {
    return {
      id: r.id as string, courtId: r.court_id as string, hostCustomerId: r.host_customer_id as string,
      venueId: r.venue_id as string, title: r.title as string, sportType: r.sport_type as string,
      scheduledAt: (r.scheduled_at as string), durationMinutes: r.duration_minutes as number,
      maxPlayers: r.max_players as number, currentPlayers: r.current_players as number,
      pricePerPerson: parseFloat(String(r.price_per_person)),
      totalPrice: parseFloat(String(r.total_price)), status: r.status as PickupGame["status"],
      description: r.description as string, skillLevel: r.skill_level as PickupGame["skillLevel"],
      isRecurring: r.is_recurring as boolean, recurringPattern: r.recurring_pattern as string,
      recurringUntil: r.recurring_until as string, locationName: r.location_name as string,
      latitude: parseFloat(String(r.latitude ?? 0)), longitude: parseFloat(String(r.longitude ?? 0)),
      createdAt: (r.created_at as string), updatedAt: (r.updated_at as string),
    };
  }

  private mapPickupParticipant(r: Record<string, unknown>): PickupGameParticipant {
    return {
      id: r.id as string, pickupGameId: r.pickup_game_id as string, customerId: r.customer_id as string,
      splitAmount: parseFloat(String(r.split_amount)),
      paymentStatus: r.payment_status as PickupGameParticipant["paymentStatus"],
      joinedAt: (r.joined_at as string), skillLevel: r.skill_level as string | undefined,
      position: r.position as string | undefined, isHost: r.is_host as boolean,
    };
  }

  private mapPickupMessage(r: Record<string, unknown>): PickupGameMessage {
    return {
      id: r.id as string, pickupGameId: r.pickup_game_id as string, senderId: r.sender_id as string | undefined,
      message: r.message as string, createdAt: (r.created_at as string),
    };
  }

  private mapTeamWallet(r: Record<string, unknown>): TeamWallet {
    return {
      id: r.id as string, ownerCustomerId: r.owner_customer_id as string, name: r.name as string,
      sportType: r.sport_type as string, avatarUrl: r.avatar_url as string,
      balance: parseFloat(String(r.balance)), totalSpent: parseFloat(String(r.total_spent)),
      memberCount: r.member_count as number, createdAt: (r.created_at as string), updatedAt: (r.updated_at as string),
    };
  }

  private mapTeamWalletMember(r: Record<string, unknown>): TeamWalletMember {
    return {
      id: r.id as string, walletId: r.wallet_id as string, customerId: r.customer_id as string,
      role: r.role as TeamWalletMember["role"], balance: parseFloat(String(r.balance)),
      totalContributed: parseFloat(String(r.total_contributed)), joinedAt: (r.joined_at as string),
      };
  }

  private mapTeamWalletDeposit(r: Record<string, unknown>): TeamWalletDeposit {
    return {
      id: r.id as string, walletId: r.wallet_id as string, fromCustomerId: r.from_customer_id as string,
      amount: parseFloat(String(r.amount)), paymentMethod: r.payment_method as string,
      paymentProofUrl: r.payment_proof_url as string, status: r.status as TeamWalletDeposit["status"],
      notes: r.notes as string, createdAt: (r.created_at as string), confirmedAt: r.confirmed_at as string,
      };
  }

  private mapTeamWalletTransaction(r: Record<string, unknown>): TeamWalletTransaction {
    return {
      id: r.id as string, walletId: r.wallet_id as string, type: r.type as TeamWalletTransaction["type"],
      amount: parseFloat(String(r.amount)), description: r.description as string,
      referenceId: r.reference_id as string, customerId: r.customer_id as string,
      createdAt: (r.created_at as string),
    };
  }

  private mapTeamWalletSplit(r: Record<string, unknown>): TeamWalletSplit {
    return {
      id: r.id as string, walletId: r.wallet_id as string, bookingId: r.booking_id as string,
      totalAmount: parseFloat(String(r.total_amount)),
      splitType: r.split_type as TeamWalletSplit["splitType"], settledAt: r.settled_at as string,
      createdAt: (r.created_at as string),
    };
  }

  private mapTeamWalletSplitMember(r: Record<string, unknown>): TeamWalletSplitMember {
    return {
      id: r.id as string, splitId: r.split_id as string, customerId: r.customer_id as string,
      amount: parseFloat(String(r.amount)), paid: r.paid as boolean, paidAt: r.paid_at as string,
      };
  }

  private mapPlayerProfile(r: Record<string, unknown>): PlayerProfile {
    return {
      customerId: r.customer_id as string, preferredPosition: r.preferred_position as string,
      preferredSport: r.preferred_sport as string, dominantFoot: r.dominant_foot as PlayerProfile["dominantFoot"],
      playStyle: r.play_style as PlayerProfile["playStyle"], bio: r.bio as string,
      heightCm: r.height_cm as number, weightKg: r.weight_kg as number,
      availability: Array.isArray(r.availability) ? r.availability : [],
      preferredPlayTime: Array.isArray(r.preferred_play_time) ? r.preferred_play_time : [],
      skillLevelOverall: r.skill_level_overall as PlayerProfile["skillLevelOverall"],
      totalGamesPlayed: r.total_games_played as number, winRate: parseFloat(String(r.win_rate ?? 0)),
      joinedTeams: r.joined_teams as number, avatarSportUrl: r.avatar_sport_url as string,
      isPublic: r.is_public as boolean, createdAt: (r.created_at as string), updatedAt: (r.updated_at as string),
    };
  }

  private mapPlayerSkillRating(r: Record<string, unknown>): PlayerSkillRating {
    return {
      id: r.id as string, customerId: r.customer_id as string,
      ratedByCustomerId: r.rated_by_customer_id as string, pickupGameId: r.pickup_game_id as string,
      skillScore: r.skill_score as number, attitudeScore: r.attitude_score as number,
      punctualityScore: r.punctuality_score as number, reviewText: r.review_text as string,
      createdAt: (r.created_at as string),
    };
  }

  private mapMatchRequest(r: Record<string, unknown>): MatchRequest {
    return {
      id: r.id as string, requesterId: r.requester_id as string,
      targetCustomerId: r.target_customer_id as string, sportType: r.sport_type as string,
      proposedDate: r.proposed_date as string, proposedLocation: r.proposed_location as string,
      message: r.message as string, status: r.status as MatchRequest["status"],
      pickupGameId: r.pickup_game_id as string, respondedAt: r.responded_at as string,
      createdAt: (r.created_at as string),
    };
  }

  private mapAchievement(r: Record<string, unknown>): Achievement {
    return {
      id: r.id as string, code: r.code as string, name: r.name as string, nameEn: r.name_en as string,
      description: r.description as string, descriptionEn: r.description_en as string,
      category: r.category as Achievement["category"], icon: r.icon as string,
      pointsReward: r.points_reward as number, badgeTier: r.badge_tier as Achievement["badgeTier"],
      criteria: typeof r.criteria === "object" ? r.criteria as Record<string, unknown> : {},
      createdAt: (r.created_at as string),
    };
  }

  private mapPlayerAchievement(r: Record<string, unknown>): PlayerAchievement {
    return {
      id: r.id as string, customerId: r.customer_id as string, achievementId: r.achievement_id as string,
      progressCurrent: r.progress_current as number, progressTarget: r.progress_target as number,
      isUnlocked: r.is_unlocked as boolean, unlockedAt: r.unlocked_at as string,
      createdAt: (r.created_at as string),
    };
  }

  private mapPlayerStreak(r: Record<string, unknown>): PlayerStreak {
    return {
      id: r.id as string, customerId: r.customer_id as string, streakType: r.streak_type as string,
      currentStreak: r.current_streak as number, longestStreak: r.longest_streak as number,
      lastActivityAt: r.last_activity_at as string,
      streakData: typeof r.streak_data === "object" ? r.streak_data as Record<string, unknown> : {},
      createdAt: (r.created_at as string), updatedAt: (r.updated_at as string),
    };
  }

  private mapFlashDeal(r: Record<string, unknown>): FlashDeal {
    return {
      id: r.id as string, courtId: r.court_id as string, slotDate: r.slot_date as string,
      startTime: r.start_time as string, endTime: r.end_time as string,
      originalPrice: parseFloat(String(r.original_price)),
      dealPrice: parseFloat(String(r.deal_price)),
      discountPercent: r.discount_percent as number, minPlayers: r.min_players as number,
      maxPlayers: r.max_players as number,
      status: r.status as FlashDeal["status"], dealType: r.deal_type as FlashDeal["dealType"],
      startsAt: (r.starts_at as string), expiresAt: (r.expires_at as string),
      claimedBy: r.claimed_by as string, claimedAt: r.claimed_at as string,
      createdAt: (r.created_at as string),
    };
  }

  private mapVenueCamera(r: Record<string, unknown>): VenueCamera {
    return {
      id: r.id as string, venueId: r.venue_id as string, courtId: r.court_id as string,
      name: r.name as string, cameraUrl: r.camera_url as string, snapshotUrl: r.snapshot_url as string,
      cameraType: r.camera_type as VenueCamera["cameraType"], isPublic: r.is_public as boolean,
      crowdLevel: r.crowd_level as VenueCamera["crowdLevel"],
      lastUpdated: r.last_updated as string, status: r.status as VenueCamera["status"],
      createdAt: (r.created_at as string),
    };
  }

  private mapVenueVerification(r: Record<string, unknown>): VenueVerification {
    return {
      id: r.id as string, venueId: r.venue_id as string, requestedBy: r.requested_by as string,
      verifiedBy: r.verified_by as string, status: r.status as VenueVerification["status"],
      overallScore: parseFloat(String(r.overall_score ?? 0)),
      fieldConditionScore: parseFloat(String(r.field_condition_score ?? 0)),
      lightingScore: parseFloat(String(r.lighting_score ?? 0)),
      cleanlinessScore: parseFloat(String(r.cleanliness_score ?? 0)),
      parkingScore: parseFloat(String(r.parking_score ?? 0)),
      accessibilityScore: parseFloat(String(r.accessibility_score ?? 0)),
      amenitiesScore: parseFloat(String(r.amenities_score ?? 0)),
      verifiedAt: r.verified_at as string, notes: r.notes as string, reportUrl: r.report_url as string,
      createdAt: (r.created_at as string),
    };
  }

  private mapVenueVerificationPhoto(r: Record<string, unknown>): VenueVerificationPhoto {
    return {
      id: r.id as string, verificationId: r.verification_id as string, category: r.category as string,
      photoUrl: r.photo_url as string, caption: r.caption as string, createdAt: (r.created_at as string),
    };
  }

  private mapLoyaltyTier(r: Record<string, unknown>): LoyaltyTier {
    return {
      id: r.id as string, name: r.name as string, minPoints: r.min_points as number,
      multiplier: parseFloat(String(r.multiplier)),
      benefits: typeof r.benefits === "object" ? r.benefits as Record<string, unknown> : {},
      isActive: r.is_active as boolean, createdAt: (r.created_at as string),
    };
  }

  private mapGroupBooking(r: Record<string, unknown>): GroupBooking {
    const fmtDate = (d: unknown): string | undefined => {
      if (!d) return undefined;
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      if (typeof d === "string") {
        const m = d.match(/^\d{4}-\d{2}-\d{2}/);
        return m ? m[0] : new Date(d).toISOString().slice(0, 10);
      }
      return String(d).slice(0, 10);
    };
    return {
      id: r.id as string, organizerId: r.organizer_id as string, venueId: r.venue_id as string, courtId: r.court_id as string,
      sportId: r.sport_id as string, title: r.title as string, description: (r.description as string) || undefined,
      bookingDate: fmtDate(r.booking_date),
      startTime: r.start_time ? String(r.start_time).slice(0, 5) : undefined,
      endTime: r.end_time ? String(r.end_time).slice(0, 5) : undefined,
      durationMinutes: (r.duration_minutes as number) ?? 60,
      minParticipants: r.min_participants as number, maxParticipants: r.max_participants as number,
      pricePerSlot: parseFloat(String(r.price_per_slot ?? 0)),
      status: r.status as GroupBookingStatus, deadline: r.deadline as string || undefined,
      finalBookingId: r.final_booking_id as string || undefined,
      createdAt: r.created_at as string, updatedAt: r.updated_at as string,
    };
  }

  private mapGroupBookingParticipant(r: Record<string, unknown>): GroupBookingParticipant {
    const avail: string[] = Array.isArray(r.availability_json) ? r.availability_json as string[] : (typeof r.availability_json === "string" ? JSON.parse(r.availability_json as string) : []);
    return {
      id: r.id as string, groupBookingId: r.group_booking_id as string, customerId: r.customer_id as string,
      status: r.status as GroupBookingParticipantStatus, availabilityJson: avail,
      voteSlotId: r.vote_slot_id as string || undefined,
      splitAmount: parseFloat(String(r.split_amount ?? 0)), isOrganizer: (r.is_organizer as boolean) ?? false,
      joinedAt: r.joined_at as string, confirmedAt: r.confirmed_at as string || undefined,
      customerName: r.customer_name as string || undefined, customerPhone: r.customer_phone as string || undefined,
    };
  }

  private mapGroupBookingTimeSlot(r: Record<string, unknown>): GroupBookingTimeSlot {
    const sd = r.slot_date as unknown;
    let slotDateStr: string;
    if (sd instanceof Date) slotDateStr = sd.toISOString().slice(0, 10);
    else if (typeof sd === "string") {
      // Handles "2026-09-10", "2026-09-10T00:00:00.000Z", or "Thu Sep 10 2026"
      const iso = sd.match(/^\d{4}-\d{2}-\d{2}/);
      slotDateStr = iso ? iso[0] : new Date(sd).toISOString().slice(0, 10);
    } else slotDateStr = String(sd).slice(0, 10);
    return {
      id: r.id as string, groupBookingId: r.group_booking_id as string,
      slotDate: slotDateStr,
      startTime: String(r.start_time).slice(0, 5), endTime: String(r.end_time).slice(0, 5),
      voteCount: (r.vote_count as number) ?? 0, isWinner: (r.is_winner as boolean) ?? false,
      createdAt: r.created_at as string,
    };
  }
}