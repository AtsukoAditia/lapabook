import { NextResponse } from "next/server";
import { getDatabaseAdapter } from "@/lib/adapters";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPoolAdminRevenue?: Pool };
const pool = globalForPg.__pgPoolAdminRevenue ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPoolAdminRevenue) globalForPg.__pgPoolAdminRevenue = pool;

export async function GET() {
  try {
    if (process.env.DATABASE_PROVIDER === "postgres") {
      // ponytail: satu round-trip per kategori via SQL aggregate — adapter getBookings()
      //           full-scan ribuan rows ke memory hanya untuk COUNT/SUM.
      const sportColors = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
      const CONFIRMED = `booking_status IN ('confirmed','completed')`;

      const [byDate, byHour, byCourt, bySport, byDow, heatmap, monthly] = await Promise.all([
        pool.query(
          `WITH dates AS (
             SELECT generate_series((CURRENT_DATE - 29), CURRENT_DATE, interval '1 day')::date AS d
           )
           SELECT d::text AS date,
                  COALESCE(SUM(b.total_price), 0)::float AS revenue,
                  COUNT(b.id)::int AS bookings
           FROM dates x
           LEFT JOIN bookings b ON b.booking_date = x.d AND ${CONFIRMED}
           GROUP BY d ORDER BY d`),
        pool.query(
          `SELECT EXTRACT(HOUR FROM start_time)::int AS hour,
                  COALESCE(SUM(total_price), 0)::float AS revenue,
                  COUNT(*)::int AS bookings
           FROM bookings WHERE ${CONFIRMED}
           GROUP BY 1`),
        pool.query(
          `SELECT c.name, v.name AS venue,
                  COALESCE(SUM(b.total_price), 0)::float AS revenue,
                  COUNT(b.id)::int AS bookings
           FROM courts c
           JOIN venues v ON v.id = c.venue_id
           LEFT JOIN bookings b ON b.court_id = c.id AND ${CONFIRMED}
           GROUP BY c.id, c.name, v.name
           HAVING COUNT(b.id) > 0
           ORDER BY revenue DESC`),
        pool.query(
          `SELECT s.name,
                  COALESCE(SUM(b.total_price), 0)::float AS revenue,
                  COUNT(b.id)::int AS bookings
           FROM sports s
           LEFT JOIN bookings b ON b.sport_id = s.id AND ${CONFIRMED}
           GROUP BY s.id, s.name
           HAVING COUNT(b.id) > 0
           ORDER BY revenue DESC`),
        pool.query(
          `SELECT EXTRACT(DOW FROM booking_date)::int AS dow, COUNT(*)::int AS count
           FROM bookings WHERE ${CONFIRMED}
           GROUP BY 1`),
        pool.query(
          `SELECT EXTRACT(DOW FROM booking_date)::int AS dow,
                  EXTRACT(HOUR FROM start_time)::int AS hour,
                  COUNT(*)::int AS count
           FROM bookings WHERE ${CONFIRMED}
           GROUP BY 1, 2`),
        pool.query(
          `WITH months AS (
             SELECT generate_series(date_trunc('month', CURRENT_DATE) - interval '11 months',
                                    date_trunc('month', CURRENT_DATE),
                                    interval '1 month') AS m
           )
           SELECT to_char(m, 'Mon YY') AS month,
                  COALESCE(SUM(b.total_price), 0)::float AS revenue,
                  COUNT(b.id)::int AS bookings
           FROM months x
           LEFT JOIN bookings b ON date_trunc('month', b.booking_date) = x.m AND ${CONFIRMED}
           GROUP BY m ORDER BY m`),
      ]);

      // Summary (total + avg + this/last month + growth)
      const summaryRows = await pool.query(
        `SELECT COALESCE(SUM(total_price), 0)::float AS total_revenue, COUNT(*)::int AS total_bookings
         FROM bookings WHERE ${CONFIRMED}`);
      const totalRevenue = summaryRows.rows[0].total_revenue;
      const totalBookings = summaryRows.rows[0].total_bookings;
      const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

      const monthlyArr = monthly.rows.map((r) => ({ month: r.month, revenue: r.revenue, bookings: r.bookings }));
      const thisMonthRevenue = monthlyArr[monthlyArr.length - 1]?.revenue ?? 0;
      const lastMonthRevenue = monthlyArr[monthlyArr.length - 2]?.revenue ?? 0;
      const monthlyGrowth = lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

      // Revenue by hour: isi 0-23 penuh
      const hourMap = new Map(byHour.rows.map((r) => [r.hour, r]));
      const revenueByHour = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        revenue: hourMap.get(h)?.revenue ?? 0,
        bookings: hourMap.get(h)?.bookings ?? 0,
      }));

      // Day of week: JS getDay() 0=Sun → nama Indonesia
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      const dowMap = new Map(byDow.rows.map((r) => [r.dow, r.count]));
      const bookingsByDay = dayNames.map((name, i) => ({ name, count: dowMap.get(i) ?? 0 }));

      // Heatmap 7x24 (Mon=0..Sun=6, JS dow 0=Sun → konversi (dow+6)%7)
      const heatmapData: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      for (const r of heatmap.rows) {
        const dow = (r.dow + 6) % 7;
        heatmapData[dow][r.hour] = r.count;
      }

      // Sport colors assign berdasarkan revenue rank
      let colorIdx = 0;
      const revenueBySport = bySport.rows.map((r) => ({
        name: r.name,
        revenue: r.revenue,
        bookings: r.bookings,
        color: sportColors[colorIdx++ % sportColors.length],
      }));

      return NextResponse.json({
        summary: { totalRevenue, totalBookings, avgBookingValue, thisMonthRevenue, lastMonthRevenue, monthlyGrowth },
        revenueByDate: byDate.rows,
        revenueByHour,
        revenueByCourt: byCourt.rows,
        revenueBySport,
        bookingsByDay,
        heatmapData,
        monthlyTrend: monthlyArr,
      });
    }

    // Fallback mock/sheets — logic lama (bila data kecil)
    const adapter = getDatabaseAdapter();
    const [bookings, courts, venues, sports] = await Promise.all([
      adapter.getBookings(), adapter.getCourts(), adapter.getVenues(), adapter.getSports(),
    ]);
    const confirmed = bookings.filter((b) => b.bookingStatus === "confirmed" || b.bookingStatus === "completed");
    const sportColors = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
    const venueMap = new Map(venues.map((v) => [v.id, v]));

    const revenueByDate: Record<string, { revenue: number; bookings: number }> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      revenueByDate[d.toISOString().split("T")[0]] = { revenue: 0, bookings: 0 };
    }
    for (const b of confirmed) if (revenueByDate[b.bookingDate]) { revenueByDate[b.bookingDate].revenue += b.totalPrice; revenueByDate[b.bookingDate].bookings += 1; }

    const revenueByHour: Record<number, { revenue: number; bookings: number }> = {};
    for (let h = 0; h < 24; h++) revenueByHour[h] = { revenue: 0, bookings: 0 };
    for (const b of confirmed) { const h = parseInt(b.startTime.split(":")[0]); revenueByHour[h].revenue += b.totalPrice; revenueByHour[h].bookings += 1; }

    const revenueByCourt: Record<string, { name: string; venue: string; revenue: number; bookings: number }> = {};
    for (const c of courts) {
      revenueByCourt[c.id] = { name: c.name, venue: venueMap.get(c.venueId)?.name ?? "Unknown", revenue: 0, bookings: 0 };
    }
    for (const b of confirmed) if (revenueByCourt[b.courtId]) { revenueByCourt[b.courtId].revenue += b.totalPrice; revenueByCourt[b.courtId].bookings += 1; }

    const revenueBySport: Record<string, { name: string; revenue: number; bookings: number; color: string }> = {};
    for (const s of sports) revenueBySport[s.id] = { name: s.name, revenue: 0, bookings: 0, color: "" };
    for (const b of confirmed) if (revenueBySport[b.sportId]) { revenueBySport[b.sportId].revenue += b.totalPrice; revenueBySport[b.sportId].bookings += 1; }
    let colorIdx = 0;
    for (const k of Object.keys(revenueBySport)) if (revenueBySport[k].revenue > 0) revenueBySport[k].color = sportColors[colorIdx++ % sportColors.length];

    const totalRevenue = confirmed.reduce((s, b) => s + b.totalPrice, 0);
    const totalBookings = confirmed.length;
    const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const bookingsByDay = dayNames.map((name) => ({ name, count: 0 }));
    for (const b of confirmed) bookingsByDay[new Date(b.bookingDate).getDay()].count += 1;

    const heatmapData: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const b of confirmed) {
      const d = new Date(b.bookingDate);
      const dow = (d.getDay() + 6) % 7;
      heatmapData[dow][parseInt(b.startTime.split(":")[0])] += 1;
    }

    const monthlyTrend: { month: string; revenue: number; bookings: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mbs = confirmed.filter((b) => { const bd = new Date(b.bookingDate); return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear(); });
      monthlyTrend.push({ month: d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }), revenue: mbs.reduce((s, b) => s + b.totalPrice, 0), bookings: mbs.length });
    }
    const thisMonthRevenue = monthlyTrend[monthlyTrend.length - 1]?.revenue ?? 0;
    const lastMonthRevenue = monthlyTrend[monthlyTrend.length - 2]?.revenue ?? 0;
    const monthlyGrowth = lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

    return NextResponse.json({
      summary: { totalRevenue, totalBookings, avgBookingValue, thisMonthRevenue, lastMonthRevenue, monthlyGrowth },
      revenueByDate: Object.entries(revenueByDate).map(([date, d]) => ({ date, ...d })),
      revenueByHour: Object.entries(revenueByHour).map(([hour, d]) => ({ hour: parseInt(hour), ...d })),
      revenueByCourt: Object.values(revenueByCourt).filter((c) => c.revenue > 0).sort((a, b) => b.revenue - a.revenue),
      revenueBySport: Object.values(revenueBySport).filter((s) => s.revenue > 0).sort((a, b) => b.revenue - a.revenue),
      bookingsByDay,
      heatmapData,
      monthlyTrend,
    });
  } catch (error) {
    console.error("Revenue stats error:", error);
    return NextResponse.json({ error: "Gagal mengambil statistik revenue" }, { status: 500 });
  }
}
