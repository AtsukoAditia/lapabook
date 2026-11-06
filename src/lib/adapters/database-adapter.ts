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
  LoyaltyTransactionType,
  LoyaltyTransaction,
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
} from "@/lib/types/domain";

export interface CreateBookingInput {
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
  notes?: string;
  userId?: string;
  voucherCode?: string;
  downPaymentType?: "full" | "dp50";
}

export interface VoucherRow {
  id: string;
  code: string;
  label: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minBookingAmount: number;
  maxUses: number | null;
  usedCount: number;
  validUntil: string | null;
  isActive: boolean;
}

export interface UpdateCourtInput {
  name?: string;
  slug?: string;
  surfaceType?: string;
  indoorType?: string;
  capacity?: number;
  basePrice?: number;
  isActive?: boolean;
}

export interface CreatePricingRuleInput {
  courtId: string;
  dayType: "weekday" | "weekend" | "holiday" | "all";
  startTime: string;
  endTime: string;
  pricePerHour: number;
  priority: number;
  isActive?: boolean;
}

export interface UpdatePricingRuleInput {
  dayType?: "weekday" | "weekend" | "holiday" | "all";
  startTime?: string;
  endTime?: string;
  pricePerHour?: number;
  priority?: number;
  isActive?: boolean;
}

export interface CreateBlockedSlotInput {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface DatabaseAdapter {
  // Sports
  getSports(): Promise<Sport[]>;
  getAllSports(): Promise<Sport[]>;
  createSport(input: { name: string; slug: string; isActive?: boolean }): Promise<Sport>;
  updateSport(id: string, input: { name?: string; slug?: string; isActive?: boolean }): Promise<Sport>;
  deleteSport(id: string): Promise<void>;

  // Regions
  getProvinces(): Promise<Province[]>;
  getCities(provinceId: string): Promise<City[]>;
  getDistricts(cityId: string): Promise<District[]>;
  getVillages(districtId: string): Promise<Village[]>;
  getRegionOptions(): Promise<RegionOption[]>;

  // Venue Owners
  getVenueOwners(): Promise<VenueOwner[]>;
  getVenueOwnerByAdminId(adminId: string): Promise<VenueOwner | null>;
  getVenueOwnerById(id: string): Promise<VenueOwner | null>;

  // Venues
  getVenues(): Promise<Venue[]>;
  getVenuesByDistrict(districtId: string): Promise<Venue[]>;
  getVenuesByArea(areaId: string, sportId?: string): Promise<Venue[]>;
  getVenuesByOwner(ownerId: string): Promise<Venue[]>;
  getVenueById(id: string): Promise<Venue | null>;
  getVenueBySlug(slug: string): Promise<Venue | null>;

  // Courts
  getCourts(): Promise<Court[]>;
  getCourtsByVenue(venueId: string): Promise<Court[]>;

  // Areas
  getAreas(): Promise<Area[]>;
  getAreasBySport(sportId: string): Promise<Area[]>;

  // Holidays
  getHolidays(): Promise<Holiday[]>;
  getAllCourts(): Promise<Court[]>;
  getCourtById(id: string): Promise<Court | null>;
  updateCourt(id: string, input: UpdateCourtInput): Promise<Court>;

  // Bookings
  getBookings(): Promise<Booking[]>;
  getBookingById(id: string): Promise<Booking | null>;
  getBookingByCode(code: string): Promise<Booking | null>;
  getBookingsByCourtAndDate(courtId: string, date: string): Promise<Booking[]>;
  getBookingsByVenueIds(venueIds: string[]): Promise<Booking[]>;
  expireBookings(): Promise<number>;
  createBooking(input: CreateBookingInput): Promise<Booking>;
  updateBookingStatus(id: string, status: Booking["bookingStatus"], paymentStatus?: Booking["paymentStatus"]): Promise<Booking>;
  updateBookingMidtransOrderId(bookingId: string, orderId: string): Promise<void>;
  updateBookingMidtransTransactionId(bookingId: string, transactionId: string): Promise<void>;
  updateBookingPaymentMethod(bookingId: string, method: "manual" | "midtrans"): Promise<void>;

  // Pricing
  getPricingRules(courtId: string): Promise<PricingRule[]>;
  getAllPricingRules(): Promise<PricingRule[]>;
  createPricingRule(input: CreatePricingRuleInput): Promise<PricingRule>;
  updatePricingRule(
    id: string,
    input: UpdatePricingRuleInput,
  ): Promise<PricingRule>;
  deletePricingRule(id: string): Promise<void>;

  // Blocked Slots
  getBlockedSlots(courtId: string, date: string): Promise<BlockedSlot[]>;
  getAllBlockedSlots(): Promise<BlockedSlot[]>;
  createBlockedSlot(input: CreateBlockedSlotInput): Promise<BlockedSlot>;
  deleteBlockedSlot(id: string): Promise<void>;

  // Audit Log
  getAuditLogs(targetId?: string): Promise<AuditLogEntry[]>;
  createAuditLog(
    entry: Omit<AuditLogEntry, "id" | "timestamp">,
  ): Promise<AuditLogEntry>;

  // Payment Methods
  getPaymentMethods(): Promise<PaymentMethod[]>;
  getActivePaymentMethods(): Promise<PaymentMethod[]>;

  // Payment Proof
  submitPaymentProof(bookingId: string, proofUrl: string): Promise<Booking>;
  confirmPayment(bookingId: string, actorId?: string, amount?: number): Promise<Booking>;
  rejectPayment(bookingId: string, actorId?: string): Promise<Booking>;
  requestRefund(bookingId: string, reason?: string): Promise<Booking>;
  approveRefund(bookingId: string, actorId?: string): Promise<Booking>;
  rejectRefund(bookingId: string, actorId?: string): Promise<Booking>;

  // Notifications
  getNotificationLogs(bookingId?: string): Promise<NotificationLog[]>;
  createNotificationLog(payload: NotificationPayload, status: NotificationLog["status"], errorMessage?: string): Promise<NotificationLog>;
  markNotificationRead(id: string): Promise<NotificationLog>;

  // Auth - Admin
  authenticateAdmin(email: string, password: string): Promise<AdminUser | null>;
  getAdminById(id: string): Promise<AdminUser | null>;
  createAdmin(data: Omit<AdminUser, "createdAt" | "lastLoginAt">): Promise<AdminUser>;

  // Venue Owner Management
  createVenueOwner(data: Omit<VenueOwner, "createdAt" | "updatedAt">): Promise<VenueOwner>;
  updateVenueOwnerStatus(id: string, status: VenueOwner["status"]): Promise<VenueOwner>;
  getAllAdmins(): Promise<AdminUser[]>;

  // Auth - Customer
  registerCustomer(data: { name: string; email: string; phone: string; passwordHash: string }): Promise<CustomerPublic>;
  authenticateCustomer(email: string, password: string): Promise<CustomerPublic | null>;
  getCustomerById(id: string): Promise<CustomerPublic | null>;
  getCustomerByEmail(email: string): Promise<Customer | null>;

  // Loyalty
  getLoyaltyTransactions(customerId: string): Promise<LoyaltyTransaction[]>;
  addLoyaltyPoints(customerId: string, points: number, bookingId: string | undefined, description: string, type: LoyaltyTransactionType): Promise<LoyaltyTransaction>;
  redeemLoyaltyPoints(customerId: string, rewardId: string, bookingId?: string): Promise<RewardRedemption>;
  getRewards(): Promise<Reward[]>;
  getActiveRewards(): Promise<Reward[]>;
  getCustomerRedemptions(customerId: string): Promise<RewardRedemption[]>;
  updateCustomerSpent(customerId: string, amount: number): Promise<void>;

  // Reviews
  createReview(data: { bookingId: string; customerId: string; venueId: string; courtId?: string; rating: number; comment: string; photos?: string[] }): Promise<Review>;
  getReviewsByVenue(venueId: string): Promise<ReviewWithDetails[]>;
  getReviewsByCourt(courtId: string): Promise<ReviewWithDetails[]>;
  getReviewByBooking(bookingId: string): Promise<Review | null>;
  getVenueRating(venueId: string): Promise<{ avgRating: number; reviewCount: number }>;
  updateVenueRating(venueId: string): Promise<void>;
  updateVenueConfig(venueId: string, config: Record<string, unknown>): Promise<void>;

  // Reviews - Moderation
  getPendingReviews(): Promise<ReviewWithDetails[]>;
  moderateReview(id: string, isVisible: boolean): Promise<Review>;

  // Favorites
  getCustomerFavorites(customerId: string): Promise<Venue[]>;
  addFavorite(customerId: string, venueId: string): Promise<void>;
  removeFavorite(customerId: string, venueId: string): Promise<void>;
  getFavoriteVenueIds(customerId: string): Promise<string[]>;

  // Court Photos
  getCourtPhotos(courtId: string): Promise<CourtPhoto[]>;
  createCourtPhoto(photo: CourtPhoto): Promise<CourtPhoto>;
  deleteCourtPhoto(id: string): Promise<void>;

  // Pickup Games
  getPickupGames(filters?: { sport?: string; status?: string; date?: string }): Promise<PickupGame[]>;
  getPickupGameById(id: string): Promise<PickupGame | null>;
  createPickupGame(data: Omit<PickupGame, "id" | "createdAt" | "updatedAt" | "currentPlayers">): Promise<PickupGame>;
  updatePickupGame(id: string, data: Partial<PickupGame>): Promise<PickupGame>;
  deletePickupGame(id: string): Promise<void>;
  joinPickupGame(gameId: string, customerId: string, splitAmount: number, skillLevel?: string, position?: string): Promise<PickupGameParticipant>;
  leavePickupGame(gameId: string, customerId: string): Promise<void>;
  getPickupGameParticipants(gameId: string): Promise<PickupGameParticipant[]>;
  getPickupGamesByCustomer(customerId: string): Promise<PickupGame[]>;
  sendPickupGameMessage(gameId: string, senderId: string, message: string): Promise<PickupGameMessage>;
  getPickupGameMessages(gameId: string, since?: string): Promise<PickupGameMessage[]>;

  // Team Wallets
  getTeamWalletsByCustomer(customerId: string): Promise<TeamWallet[]>;
  getTeamWalletById(id: string): Promise<TeamWallet | null>;
  createTeamWallet(data: Omit<TeamWallet, "id" | "balance" | "totalSpent" | "memberCount" | "createdAt" | "updatedAt">): Promise<TeamWallet>;
  updateTeamWallet(id: string, data: Partial<TeamWallet>): Promise<TeamWallet>;
  deleteTeamWallet(id: string): Promise<void>;
  getTeamWalletMembers(walletId: string): Promise<TeamWalletMember[]>;
  addTeamWalletMember(walletId: string, customerId: string, role?: string): Promise<TeamWalletMember>;
  removeTeamWalletMember(walletId: string, customerId: string): Promise<void>;
  updateTeamWalletMemberRole(walletId: string, customerId: string, role: string): Promise<TeamWalletMember>;
  createTeamWalletDeposit(walletId: string, fromCustomerId: string, amount: number, paymentMethod?: string, notes?: string): Promise<TeamWalletDeposit>;
  confirmTeamWalletDeposit(depositId: string): Promise<TeamWalletDeposit>;
  getTeamWalletDeposits(walletId: string): Promise<TeamWalletDeposit[]>;
  getTeamWalletTransactions(walletId: string): Promise<TeamWalletTransaction[]>;
  createTeamWalletTransaction(data: Omit<TeamWalletTransaction, "id" | "createdAt">): Promise<TeamWalletTransaction>;
  payBookingFromWallet(walletId: string, bookingId: string, amount: number): Promise<TeamWalletTransaction>;
  createWalletSplit(walletId: string, bookingId: string, totalAmount: number, splitType: string, members: { customerId: string; amount: number }[]): Promise<TeamWalletSplit>;
  getWalletSplits(walletId: string): Promise<TeamWalletSplit[]>;
  getWalletSplitMembers(splitId: string): Promise<TeamWalletSplitMember[]>;

  // Player Profiles (Sprint 12)
  getPlayerProfile(customerId: string): Promise<PlayerProfile | null>;
  upsertPlayerProfile(data: Partial<PlayerProfile> & { customerId: string }): Promise<PlayerProfile>;
  searchPlayers(filters?: { sport?: string; skillLevel?: string; location?: string }): Promise<PlayerProfile[]>;
  createPlayerSkillRating(data: Omit<PlayerSkillRating, "id" | "createdAt">): Promise<PlayerSkillRating>;
  getPlayerSkillRatings(customerId: string): Promise<PlayerSkillRating[]>;

  // Match Requests (Sprint 12)
  createMatchRequest(data: Omit<MatchRequest, "id" | "status" | "respondedAt" | "createdAt">): Promise<MatchRequest>;
  getMatchRequests(customerId: string): Promise<MatchRequest[]>;
  updateMatchRequest(id: string, status: "accepted" | "declined"): Promise<MatchRequest>;

  // Achievements (Sprint 12)
  getAchievements(): Promise<Achievement[]>;
  getPlayerAchievements(customerId: string): Promise<(PlayerAchievement & { achievement: Achievement })[]>;
  upsertPlayerAchievement(customerId: string, achievementId: string, progress: number): Promise<PlayerAchievement>;
  getLeaderboard(limit?: number): Promise<{ customerId: string; name: string; totalPoints: number; totalGames: number }[]>;

  // Streaks (Sprint 12)
  getPlayerStreaks(customerId: string): Promise<PlayerStreak[]>;
  updatePlayerStreak(customerId: string, streakType: string): Promise<PlayerStreak>;

  // Flash Deals (Sprint 13)
  getFlashDeals(filters?: { status?: string; courtId?: string }): Promise<FlashDeal[]>;
  getFlashDealById(id: string): Promise<FlashDeal | null>;
  createFlashDeal(data: Omit<FlashDeal, "id" | "claimedBy" | "claimedAt" | "createdAt">): Promise<FlashDeal>;
  claimFlashDeal(id: string, customerId: string): Promise<FlashDeal>;

  // Venue Cameras (Sprint 14)
  getVenueCameras(venueId: string): Promise<VenueCamera[]>;
  createVenueCamera(data: Omit<VenueCamera, "id" | "lastUpdated" | "createdAt">): Promise<VenueCamera>;
  updateVenueCamera(id: string, data: Partial<VenueCamera>): Promise<VenueCamera>;
  deleteVenueCamera(id: string): Promise<void>;

  // Venue Verification (Sprint 14)
  getVenueVerification(venueId: string): Promise<VenueVerification | null>;
  createVenueVerification(data: Omit<VenueVerification, "id" | "overallScore" | "verifiedAt" | "createdAt">): Promise<VenueVerification>;
  updateVenueVerification(id: string, data: Partial<VenueVerification>): Promise<VenueVerification>;
  getVenueVerificationPhotos(verificationId: string): Promise<VenueVerificationPhoto[]>;
  createVenueVerificationPhoto(data: Omit<VenueVerificationPhoto, "id" | "createdAt">): Promise<VenueVerificationPhoto>;

  // Loyalty Tiers (Sprint 15)
  getLoyaltyTiers(): Promise<LoyaltyTier[]>;

  // Group Bookings (Sprint 16)
  createGroupBooking(data: {
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
  }): Promise<GroupBooking>;
  getGroupBookingById(id: string): Promise<GroupBooking | null>;
  getGroupBookingDetail(id: string): Promise<GroupBookingDetail | null>;
  getGroupBookingsByOrganizer(organizerId: string): Promise<GroupBooking[]>;
  updateGroupBookingStatus(
    id: string,
    status: GroupBooking["status"],
    bookingId?: string,
  ): Promise<GroupBooking>;
  deleteGroupBooking(id: string): Promise<void>;

  // Group Booking Participants
  getGroupBookingParticipants(
    groupBookingId: string,
  ): Promise<GroupBookingParticipant[]>;
  addGroupBookingParticipant(
    groupBookingId: string,
    customerId: string,
    isOrganizer?: boolean,
  ): Promise<GroupBookingParticipant>;
  getGroupBookingParticipant(
    groupBookingId: string,
    customerId: string,
  ): Promise<GroupBookingParticipant | null>;
  updateGroupBookingParticipantStatus(
    groupBookingId: string,
    customerId: string,
    status: GroupBookingParticipant["status"],
    availability?: string[],
  ): Promise<GroupBookingParticipant>;
  getGroupBookingParticipantById(id: string): Promise<GroupBookingParticipant | null>;

  // Group Booking Time Slots
  getGroupBookingTimeSlots(
    groupBookingId: string,
  ): Promise<GroupBookingTimeSlot[]>;
  addGroupBookingTimeSlot(data: {
    groupBookingId: string;
    slotDate: string;
    startTime: string;
    endTime: string;
  }): Promise<GroupBookingTimeSlot>;
  getGroupBookingTimeSlotById(id: string): Promise<GroupBookingTimeSlot | null>;
  voteGroupBookingTimeSlot(
    timeSlotId: string,
    customerId: string,
  ): Promise<GroupBookingTimeSlot>;
  markGroupBookingWinner(
    groupBookingId: string,
    timeSlotId: string,
  ): Promise<GroupBookingTimeSlot>;

  // Vouchers
  getVoucherByCode(code: string): Promise<VoucherRow | null>;
  incrementVoucherUsage(code: string): Promise<boolean>;
}
