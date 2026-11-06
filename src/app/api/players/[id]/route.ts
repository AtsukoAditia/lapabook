import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, CUSTOMER_TOKEN_NAME } from "@/lib/auth/jwt";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForPg.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPg.__pgPool) globalForPg.__pgPool = pool;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.avatar, c.phone, c.email,
              pp.preferred_position, pp.preferred_sport, pp.dominant_foot,
              pp.play_style, pp.bio, pp.height_cm, pp.weight_kg,
              pp.availability, pp.preferred_play_time, pp.skill_level_overall,
              pp.total_games_played, pp.win_rate, pp.joined_teams,
              pp.avatar_sport_url, pp.is_public, pp.created_at
       FROM customers c
       LEFT JOIN player_profiles pp ON pp.customer_id = c.id
       WHERE c.id = $1`, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Player tidak ditemukan" }, { status: 404 });
    }

    // Get ratings
    const ratings = await pool.query(
      `SELECT AVG(skill_score) as avg_skill, AVG(attitude_score) as avg_attitude,
              AVG(punctuality_score) as avg_punctuality, COUNT(*) as total_ratings
       FROM player_skill_ratings WHERE customer_id = $1`, [id]);

    // Get achievements count
    const achCount = await pool.query(
      `SELECT COUNT(*) as count FROM player_achievements WHERE customer_id = $1 AND is_unlocked = true`, [id]);

    return NextResponse.json({
      success: true,
      data: {
        ...rows[0],
        ratings: ratings.rows[0],
        achievementsCount: parseInt(achCount.rows[0].count),
      }
    });
  } catch (error) {
    console.error("Player GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_TOKEN_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (id !== session.userId) {
      return NextResponse.json({ error: "Tidak boleh edit profile orang lain" }, { status: 403 });
    }

    const body = await request.json();
    const {
      preferredPosition, preferredSport, dominantFoot, playStyle,
      bio, heightCm, weightKg, availability, preferredPlayTime,
      skillLevelOverall, isPublic, avatarSportUrl,
    } = body;

    // Upsert player profile
    await pool.query(
      `INSERT INTO player_profiles (customer_id, preferred_position, preferred_sport, dominant_foot,
       play_style, bio, height_cm, weight_kg, availability, preferred_play_time,
       skill_level_overall, is_public, avatar_sport_url, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
       ON CONFLICT (customer_id) DO UPDATE SET
       preferred_position=COALESCE($2,player_profiles.preferred_position),
       preferred_sport=COALESCE($3,player_profiles.preferred_sport),
       dominant_foot=COALESCE($4,player_profiles.dominant_foot),
       play_style=COALESCE($5,player_profiles.play_style),
       bio=COALESCE($6,player_profiles.bio),
       height_cm=COALESCE($7,player_profiles.height_cm),
       weight_kg=COALESCE($8,player_profiles.weight_kg),
       availability=COALESCE($9,player_profiles.availability),
       preferred_play_time=COALESCE($10,player_profiles.preferred_play_time),
       skill_level_overall=COALESCE($11,player_profiles.skill_level_overall),
       is_public=COALESCE($12,player_profiles.is_public),
       avatar_sport_url=COALESCE($13,player_profiles.avatar_sport_url),
       updated_at=NOW()`,
      [id, preferredPosition, preferredSport, dominantFoot, playStyle,
       bio, heightCm, weightKg,
       availability ? JSON.stringify(availability) : null,
       preferredPlayTime ? JSON.stringify(preferredPlayTime) : null,
       skillLevelOverall, isPublic, avatarSportUrl]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Player PUT error:", error);
    return NextResponse.json({ error: "Gagal mengupdate profile" }, { status: 500 });
  }
}
