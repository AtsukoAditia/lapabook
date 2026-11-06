// ── Domain Types for Lapabook ──

export interface Sport {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

// ── Regions (4-level hierarchy) ──

export interface Province {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: string;
  provinceId: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface District {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Village {
  id: string;
  districtId: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Areas ──
export interface Area {
  id: string;
  city: string;
  province: string;
  district?: string;
  village?: string;
  slug?: string;
  label?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Merged region payload for UI cascade (province + city + district selected = venue match)
export interface RegionOption {
  provinceId: string;
  provinceName: string;
  cityId: string;
  cityName: string;
  districtId: string;
  districtName: string;
  // optional: resolved label string for display
  label?: string;
}

export type VenueOwnerStatus = "pending_review" | "active" | "suspended" | "rejected";

export interface VenueOwner {
  id: string;
  adminId: string;
  businessName: string;
  picName: string;
  phone: string;
  email: string;
  status: VenueOwnerStatus;
  createdAt: string;
  updatedAt: string;
}

export type VenueApprovalStatus = "draft" | "pending_review" | "active" | "rejected" | "suspended";

export interface VenueRainConfig {
  enabled: boolean;
  levels?: {
    light: { discountPercent: number };
    moderate: { discountPercent: number };
    heavy: { discountPercent: number };
  };
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: "national" | "religious" | "joint_leave";
  description: string;
  isActive: boolean;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  address: string;
  mapsUrl: string;
  phone: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
  ownerId?: string;
  districtId?: string;
  villageId?: string;
  approvalStatus: VenueApprovalStatus;
  avgRating?: number;
  reviewCount?: number;
  rainDiscountConfig?: VenueRainConfig;
  commissionRate?: number;
  platformFeeType?: 'percentage' | 'fixed';
  platformFeeValue?: number;
  areaId?: string;
}

export interface Court {
  id: string;
  venueId: string;
  sportId: string;
  name: string;
  slug: string;
  surfaceType: string;
  indoorType: "indoor" | "outdoor" | "semi_outdoor";
  capacity: number;
  basePrice: number;
  isActive: boolean;
}

export interface Booking {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  venueId: string;
  courtId: string;
  sportId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  bookingStatus:
    | "pending"
    | "waiting_payment"
    | "waiting_verification"
    | "paid"
    | "confirmed"
    | "rejected"
    | "cancelled"
    | "expired"
    | "completed"
    | "no_show";
  downPaymentAmount?: number;
  paidAmount?: number;
  paymentStatus:
    | "unpaid"
    | "waiting_confirmation"
    | "dp_paid"
    | "paid"
    | "rejected"
    | "refunded"
    | "refund_requested";
  paymentProofUrl?: string;
  paymentRejectionReason?: string;
  refundReason?: string;
  refundRequestedAt?: string;
  paymentMethod?: "manual" | "midtrans";
  midtransOrderId?: string;
  midtransTransactionId?: string;
  notes?: string;
  userId?: string;
  rescheduledFrom?: { bookingDate: string; startTime: string; endTime: string } | null;
  rescheduleCount?: number;
  expiresAt?: string;
  commissionAmount?: number;
  ownerPayout?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlockedSlot {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface PricingRule {
  id: string;
  courtId: string;
  dayType: "weekday" | "weekend" | "holiday" | "all";
  startTime: string;
  endTime: string;
  pricePerHour: number;
  priority: number;
  isActive: boolean;
}

// ── Audit Log ──

export type AuditLogAction =
  | "booking_created"
  | "booking_status_changed"
  | "booking_confirmed"
  | "booking_rejected"
  | "booking_conflict_blocked"
  | "blocked_slot_created"
  | "blocked_slot_deleted"
  | "payment_proof_submitted"
  | "payment_confirmed"
  | "payment_rejected"
  | "refund_requested"
  | "refund_approved"
  | "refund_rejected";

export interface PaymentMethod {
  id: string;
  name: string;
  label: string;
  type: "bank_transfer" | "e_wallet" | "qris" | "cash";
  accountName: string;
  accountNumber?: string;
  provider: string;
  details: string;
  instructions: string;
  isActive: boolean;
}

export interface PaymentInstruction {
  method: PaymentMethod;
  amount: number;
  bookingCode: string;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditLogAction;
  targetType: "booking" | "blocked_slot";
  targetId: string;
  actorType: "customer" | "admin" | "system";
  actorId?: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

// ── Notification ──

export type NotificationChannel = "email" | "whatsapp" | "sms" | "web_push" | "in_app";
export type NotificationType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_rejected"
  | "booking_cancelled"
  | "payment_received"
  | "payment_confirmed"
  | "payment_rejected"
  | "reminder_before_booking"
  | "admin_new_booking"
  | "admin_payment_proof"
  | "refund_requested"
  | "refund_approved"
  | "refund_rejected";

export type NotificationStatus = "pending" | "sent" | "failed" | "read";

export interface NotificationLog {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  message: string;
  status: NotificationStatus;
  bookingId?: string;
  bookingCode?: string;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
  readAt?: string;
}

export interface NotificationPayload {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  message: string;
  bookingId?: string;
  bookingCode?: string;
}

export interface NotificationTemplate {
  type: NotificationType;
  channel: NotificationChannel;
  subjectTemplate: string;
  messageTemplate: string;
}

// ── Customer & Auth ──

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  loyaltyPoints: number;
  totalSpent: number;
  memberSince: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPublic {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  loyaltyPoints: number;
  loyaltyTier?: string;
  totalSpent: number;
  memberSince: string;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "super_admin" | "admin" | "staff";
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  userId: string;
  role: "admin" | "super_admin" | "staff" | "customer" | "owner";
  name: string;
  email: string;
  expiresAt: string;
  /** For owner sessions — which venue owner record */
  ownerId?: string;
  /** For admin sessions impersonating an owner */
  impersonating?: string;
}

// ── Loyalty Points ──

export type LoyaltyTransactionType =
  | "earned"
  | "redeemed"
  | "bonus"
  | "expired"
  | "adjusted";

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  bookingId?: string;
  bookingCode?: string;
  type: LoyaltyTransactionType;
  points: number;
  description: string;
  createdAt: string;
  expiresAt?: string;
}

export type RewardType =
  | "discount_percentage"
  | "discount_amount"
  | "free_hour"
  | "free_session";

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: RewardType;
  pointsCost: number;
  value: number;
  isActive: boolean;
  createdAt: string;
}

export interface RewardRedemption {
  id: string;
  customerId: string;
  rewardId: string;
  rewardName: string;
  pointsUsed: number;
  bookingId?: string;
  status: "pending" | "applied" | "expired";
  createdAt: string;
  usedAt?: string;
}

// ── Booking with Customer ──

export interface BookingWithCustomer extends Booking {
  customerId?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  discountAmount?: number;
}

// ── Review ──

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  venueId: string;
  courtId?: string;
  rating: number;
  comment: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewPhoto {
  id: string;
  reviewId: string;
  photoUrl: string;
  createdAt: string;
}

export interface CourtPhoto {
  id: string;
  courtId: string;
  url: string;
  caption: string;
  sortOrder: number;
  createdAt: string;
}

export interface ReviewWithDetails extends Review {
  customerName?: string;
  customerAvatar?: string;
  photos?: ReviewPhoto[];
}

// ── Pickup Game ──

export interface PickupGame {
  id: string;
  courtId?: string;
  hostCustomerId?: string;
  venueId?: string;
  title: string;
  sportType: string;
  scheduledAt: string;
  durationMinutes: number;
  maxPlayers: number;
  currentPlayers: number;
  pricePerPerson: number;
  totalPrice: number;
  status: "open" | "full" | "cancelled" | "completed";
  description?: string;
  skillLevel: "beginner" | "intermediate" | "advanced" | "all";
  isRecurring: boolean;
  recurringPattern?: string;
  recurringUntil?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PickupGameParticipant {
  id: string;
  pickupGameId: string;
  customerId: string;
  splitAmount: number;
  paymentStatus: "pending" | "paid" | "refunded";
  joinedAt: string;
  skillLevel?: string;
  position?: string;
  isHost: boolean;
}

export interface PickupGameMessage {
  id: string;
  pickupGameId: string;
  senderId?: string;
  message: string;
  createdAt: string;
}

// ── Player Profile (Sprint 12) ──

export interface PlayerProfile {
  customerId: string;
  preferredPosition?: string;
  preferredSport?: string;
  dominantFoot?: "left" | "right" | "both";
  playStyle?: "defensive" | "attacking" | "balanced" | "versatile";
  bio?: string;
  heightCm?: number;
  weightKg?: number;
  availability: string[];
  preferredPlayTime: string[];
  skillLevelOverall: "beginner" | "intermediate" | "advanced" | "pro";
  totalGamesPlayed: number;
  winRate: number;
  joinedTeams: number;
  avatarSportUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerSkillRating {
  id: string;
  customerId: string;
  ratedByCustomerId?: string;
  pickupGameId?: string;
  skillScore: number;
  attitudeScore: number;
  punctualityScore: number;
  reviewText?: string;
  createdAt: string;
}

export interface MatchRequest {
  id: string;
  requesterId: string;
  targetCustomerId: string;
  sportType?: string;
  proposedDate?: string;
  proposedLocation?: string;
  message?: string;
  status: "pending" | "accepted" | "declined" | "expired";
  pickupGameId?: string;
  respondedAt?: string;
  createdAt: string;
}

// ── Achievements (Sprint 12) ──

export interface Achievement {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  category: "loyalty" | "community" | "skill" | "streak" | "social";
  icon?: string;
  pointsReward: number;
  badgeTier?: "bronze" | "silver" | "gold" | "platinum";
  criteria: Record<string, unknown>;
  createdAt: string;
}

export interface PlayerAchievement {
  id: string;
  customerId: string;
  achievementId: string;
  progressCurrent: number;
  progressTarget: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  createdAt: string;
}

export interface PlayerStreak {
  id: string;
  customerId: string;
  streakType: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt?: string;
  streakData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Flash Deals (Sprint 13) ──

export interface FlashDeal {
  id: string;
  courtId?: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  originalPrice: number;
  dealPrice: number;
  discountPercent: number;
  minPlayers: number;
  maxPlayers?: number;
  status: "active" | "claimed" | "expired" | "cancelled";
  dealType: "last_minute" | "early_bird" | "off_peak" | "special";
  startsAt: string;
  expiresAt: string;
  claimedBy?: string;
  claimedAt?: string;
  createdAt: string;
}

export interface FlashDealNotification {
  id: string;
  customerId: string;
  flashDealId: string;
  sentAt: string;
  clicked: boolean;
  converted: boolean;
}

// ── Venue Cameras (Sprint 14) ──

export interface VenueCamera {
  id: string;
  venueId: string;
  courtId?: string;
  name: string;
  cameraUrl?: string;
  snapshotUrl?: string;
  cameraType: "snapshot" | "stream";
  isPublic: boolean;
  crowdLevel?: "empty" | "few" | "moderate" | "busy";
  lastUpdated?: string;
  status: "active" | "offline" | "pending_approval";
  createdAt: string;
}

export interface VenueVerification {
  id: string;
  venueId: string;
  requestedBy?: string;
  verifiedBy?: string;
  status: "pending" | "in_progress" | "approved" | "rejected";
  overallScore?: number;
  fieldConditionScore?: number;
  lightingScore?: number;
  cleanlinessScore?: number;
  parkingScore?: number;
  accessibilityScore?: number;
  amenitiesScore?: number;
  verifiedAt?: string;
  notes?: string;
  reportUrl?: string;
  createdAt: string;
}

export interface VenueVerificationPhoto {
  id: string;
  verificationId: string;
  category: string;
  photoUrl: string;
  caption?: string;
  createdAt: string;
}

// ── Loyalty Tiers (Sprint 15) ──

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  multiplier: number;
  benefits: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

// ── Team Wallet ──

export interface TeamWallet {
  id: string;
  ownerCustomerId: string;
  name: string;
  sportType?: string;
  avatarUrl?: string;
  balance: number;
  totalSpent: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamWalletMember {
  id: string;
  walletId: string;
  customerId: string;
  role: "owner" | "admin" | "member";
  balance: number;
  totalContributed: number;
  joinedAt: string;
}

export interface TeamWalletDeposit {
  id: string;
  walletId: string;
  fromCustomerId?: string;
  amount: number;
  paymentMethod?: string;
  paymentProofUrl?: string;
  status: "pending" | "confirmed";
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface TeamWalletTransaction {
  id: string;
  walletId: string;
  type: "deposit" | "booking_payment" | "split_refund" | "withdrawal";
  amount: number;
  description?: string;
  referenceId?: string;
  customerId?: string;
  createdAt: string;
}

export interface TeamWalletSplit {
  id: string;
  walletId: string;
  bookingId?: string;
  totalAmount: number;
  splitType: "equal" | "custom" | "single_payer";
  settledAt?: string;
  createdAt: string;
}

export interface TeamWalletSplitMember {
  id: string;
  splitId: string;
  customerId: string;
  amount: number;
  paid: boolean;
  paidAt?: string;
}

// ── Smart Group Booking (Sprint 16) ──

export type GroupBookingStatus =
  | "draft"
  | "voting"
  | "confirmed"
  | "cancelled"
  | "expired";

export type GroupBookingParticipantStatus =
  | "invited"
  | "accepted"
  | "declined"
  | "confirmed"
  | "no_show";

export interface GroupBooking {
  id: string;
  organizerId: string;
  venueId: string;
  courtId: string;
  sportId: string;
  title: string;
  description?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  minParticipants: number;
  maxParticipants: number;
  pricePerSlot: number;
  status: GroupBookingStatus;
  deadline?: string;
  finalBookingId?: string;
  createdAt: string;
  updatedAt: string;
  // Joins (read payloads)
  organizerName?: string;
  venueName?: string;
  courtName?: string;
  participantCount?: number;
}

export interface GroupBookingParticipant {
  id: string;
  groupBookingId: string;
  customerId: string;
  status: GroupBookingParticipantStatus;
  availabilityJson: string[];
  voteSlotId?: string;
  splitAmount: number;
  isOrganizer: boolean;
  joinedAt: string;
  confirmedAt?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface GroupBookingTimeSlot {
  id: string;
  groupBookingId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  voteCount: number;
  isWinner: boolean;
  createdAt: string;
}

export type GroupBookingDetail = GroupBooking & {
  participants: GroupBookingParticipant[];
  timeSlots: GroupBookingTimeSlot[];
};
