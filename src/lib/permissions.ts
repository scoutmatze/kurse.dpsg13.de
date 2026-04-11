import { query } from "./db";

export type GlobalRole = "tenant_admin" | "admin" | "user";
export type KursRecht = "kurs_admin" | "kursleitung" | "mitglied" | "kueche_only";

export interface UserPermissions {
  isTenantAdmin: boolean;
  isAdmin: boolean;
  kursRecht: KursRecht | null;
  canEditKurs: boolean;
  canManageTeam: boolean;
  canViewAnmeldungen: boolean;
  canViewFullAnmeldungen: boolean; // vs. nur Ernährung
  canEditProgramm: boolean;
  canEditKalkulation: boolean;
  canEditAufgaben: boolean;
  canUploadDateien: boolean;
}

export async function getKursPermissions(userId: number, kursId: number | string): Promise<UserPermissions> {
  // Global role
  const userResult = await query("SELECT role FROM users WHERE id = $1", [userId]);
  const globalRole = (userResult.rows[0]?.role || "user") as GlobalRole;
  const isTenantAdmin = globalRole === "tenant_admin";
  const isAdmin = isTenantAdmin || globalRole === "admin";

  // Per-kurs role
  const teamResult = await query(
    "SELECT rechte, rolle FROM kurs_team WHERE kurs_id = $1 AND user_id = $2 LIMIT 1",
    [kursId, userId]
  );
  const kursRecht = (teamResult.rows[0]?.rechte || null) as KursRecht | null;

  // Kurs-Creator?
  const creatorResult = await query("SELECT created_by FROM kurse WHERE id = $1", [kursId]);
  const isCreator = creatorResult.rows[0]?.created_by === userId;

  // Effective permission level
  const effectiveAdmin = isTenantAdmin || isAdmin || isCreator || kursRecht === "kurs_admin";
  const effectiveKursleitung = effectiveAdmin || kursRecht === "kursleitung";
  const effectiveMitglied = effectiveKursleitung || kursRecht === "mitglied";
  const isKuecheOnly = !effectiveMitglied && kursRecht === "kueche_only";

  return {
    isTenantAdmin,
    isAdmin,
    kursRecht,
    canEditKurs: effectiveAdmin,
    canManageTeam: effectiveAdmin,
    canViewAnmeldungen: effectiveKursleitung || isKuecheOnly,
    canViewFullAnmeldungen: effectiveKursleitung, // Küche sieht nur Ernährung
    canEditProgramm: effectiveKursleitung,
    canEditKalkulation: effectiveAdmin,
    canEditAufgaben: effectiveMitglied,
    canUploadDateien: effectiveMitglied,
  };
}

// Helper: Tenant Admin check
export async function isTenantAdmin(userId: number): Promise<boolean> {
  const result = await query("SELECT role FROM users WHERE id = $1", [userId]);
  return result.rows[0]?.role === "tenant_admin";
}
