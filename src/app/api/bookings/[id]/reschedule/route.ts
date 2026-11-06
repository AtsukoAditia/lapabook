import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

const ALLOWED_STATUSES = ["confirmed", "paid", "waiting_payment", "waiting_verification"];
const ACTIVE_BLOCKERS = ["pending", "waiting_payment", "waiting_verification", "paid", "confirmed"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await request.json().catch(() => null);
    const bookingDate = String(body?.bookingDate ?? "");
    const startTime = String(body?.startTime ?? "").slice(0, 5);
    const endTime = String(body?.endTime ?? "").slice(0, 5);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
      return NextResponse.json({ error: "Tanggal tidak valid (YYYY-MM-DD)." }, { status: 400 });
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) {
      return NextResponse.json({ error: "Jam mulai/selesai tidak valid." }, { status: 400 });
    }

    const { rows } = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
    }
    const b = rows[0];

    if (b.user_id !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!ALLOWED_STATUSES.includes(b.booking_status)) {
      return NextResponse.json({ error: "Status booking tidak bisa di-reschedule." }, { status: 400 });
    }
    if ((b.reschedule_count ?? 0) >= 1) {
      return NextResponse.json({ error: "Booking hanya bisa di-reschedule 1x." }, { status: 400 });
    }

    // H-3 dari jam main lama
    const oldStart = new Date(`${String(b.booking_date).slice(0, 10)}T${String(b.start_time).slice(0, 5)}:00`);
    if (Date.now() > oldStart.getTime() - 3 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Reschedule maksimal H-3 sebelum jam main." }, { status: 400 });
    }

    // Slot baru harus di masa depan
    const newStart = new Date(`${bookingDate}T${startTime}:00`);
    if (newStart.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Jadwal baru harus di masa depan." }, { status: 400 });
    }

    // Cek konflik booking lain (court + tanggal sama, kecuali diri sendiri)
    const { rows: clash } = await pool.query(
      `SELECT id FROM bookings WHERE court_id = $1 AND booking_date = $2 AND id <> $3
       AND booking_status = ANY($4) AND start_time < $5 AND end_time > $6 LIMIT 1`,
      [b.court_id, bookingDate, bookingId, ACTIVE_BLOCKERS, endTime, startTime],
    );
    if (clash.length > 0) {
      return NextResponse.json({ error: "Slot baru sudah terisi. Pilih jadwal lain." }, { status: 409 });
    }

    // Cek blocked slot
    const { rows: blocked } = await pool.query(
      `SELECT id FROM blocked_slots WHERE court_id = $1 AND date = $2 AND start_time < $3 AND end_time > $4 LIMIT 1`,
      [b.court_id, bookingDate, endTime, startTime],
    );
    if (blocked.length > 0) {
      return NextResponse.json({ error: "Slot baru sedang diblokir venue." }, { status: 409 });
    }

    const fromJson = JSON.stringify({
      bookingDate: String(b.booking_date).slice(0, 10),
      startTime: String(b.start_time).slice(0, 5),
      endTime: String(b.end_time).slice(0, 5),
    });
    const count = (b.reschedule_count ?? 0) + 1;

    try {
      const { rows: updated } = await pool.query(
        `UPDATE bookings SET booking_date = $1, start_time = $2, end_time = $3,
         rescheduled_from = $4::jsonb, reschedule_count = $5, updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [bookingDate, startTime, endTime, fromJson, count, bookingId],
      );
      return NextResponse.json({ success: true, data: updated[0] });
    } catch (e) {
      // Kolom reschedule_* belum ada (migrasi belum di-apply) → update jadwal saja
      if (e instanceof Error && "code" in e && (e as { code: string }).code === "42703") {
        const { rows: updated } = await pool.query(
          `UPDATE bookings SET booking_date = $1, start_time = $2, end_time = $3, updated_at = NOW()
           WHERE id = $4 RETURNING *`,
          [bookingDate, startTime, endTime, bookingId],
        );
        return NextResponse.json({ success: true, data: updated[0] });
      }
      throw e;
    }
  } catch (error) {
    console.error("Booking reschedule error:", error);
    return NextResponse.json({ error: "Gagal memindahkan jadwal." }, { status: 500 });
  }
}
