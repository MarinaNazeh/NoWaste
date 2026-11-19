// C-27 Data Access: vendor and partner applications (SDD 4.2 "VendorProfile" and "PartnerProfile").
// The user and the profile are written in one transaction, so a failed profile leaves no user behind.
import type { PoolClient } from 'pg';
import { insertBranch, type NewBranch } from './branchRepository.js';
import type {
  FoodCategory,
  PartnerRole,
  Rejection,
  RejectionReason,
  ValidApplication,
  VendorType,
} from '@nowaste/shared';
import { getPool } from './db.js';
import { withTransaction } from './db.js';
import {
  insertUser,
  type AccountStatus,
  type NewUser,
  type Role,
  type UserRecord,
} from './userRepository.js';

export interface MapPin {
  address: string;
  latitude: number;
  longitude: number;
}

export interface NewVendorProfile extends MapPin {
  shopName: string;
  vendorType: VendorType;
  contact: string;
  description?: string | null;
  /** D-62: optional opening hours "HH:MM"; both or neither. */
  opensAt?: string | null;
  closesAt?: string | null;
  /** D-64: more branches besides the main shop. D-69: they carry the shop name. */
  branches?: Omit<NewBranch, 'name'>[];
}

export interface NewPartnerProfile extends MapPin {
  organisationName: string;
  partnerType: PartnerRole;
  acceptedFoodTypes: FoodCategory[];
  otherPartnerType?: string | null;
  otherFoodType?: string | null;
}

// ST_MakePoint takes longitude first.
const point = (lon: string, lat: string) => `ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography`;

async function insertVendorProfile(client: PoolClient, userId: string, p: NewVendorProfile): Promise<void> {
  await client.query(
    `INSERT INTO vendor_profiles (user_id, shop_name, vendor_type, address, location, contact, description,
       opens_at, closes_at)
     VALUES ($1, $2, $3, $4, ${point('$5', '$6')}, $7, $8, $9, $10)`,
    [
      userId,
      p.shopName,
      p.vendorType,
      p.address,
      p.longitude,
      p.latitude,
      p.contact,
      p.description ?? null,
      p.opensAt ?? null,
      p.closesAt ?? null,
    ],
  );
}

async function insertPartnerProfile(client: PoolClient, userId: string, p: NewPartnerProfile): Promise<void> {
  await client.query(
    `INSERT INTO partner_profiles (user_id, organisation_name, partner_type, accepted_food_types, address, location,
                                   other_partner_type, other_food_type)
     VALUES ($1, $2, $3, $4::food_category[], $5, ${point('$6', '$7')}, $8, $9)`,
    [
      userId,
      p.organisationName,
      p.partnerType,
      p.acceptedFoodTypes,
      p.address,
      p.longitude,
      p.latitude,
      p.otherPartnerType ?? null,
      p.otherFoodType ?? null,
    ],
  );
}

/** Throws DuplicateUserError (from insertUser) when the email or phone is taken. */
export function insertVendorApplication(user: NewUser, profile: NewVendorProfile): Promise<UserRecord> {
  return withTransaction(async (client) => {
    const created = await insertUser(user, client);
    await insertVendorProfile(client, created.id, profile);
    // D-64: the shop itself is the first branch, then the extra branches in the order given.
    await insertBranch(
      created.id,
      {
        name: profile.shopName,
        address: profile.address,
        latitude: profile.latitude,
        longitude: profile.longitude,
        opensAt: profile.opensAt ?? null,
        closesAt: profile.closesAt ?? null,
      },
      client,
    );
    for (const branch of profile.branches ?? []) {
      await insertBranch(created.id, { ...branch, name: profile.shopName }, client);
    }
    return created;
  });
}

/** Throws DuplicateUserError (from insertUser) when the email or phone is taken. */
export function insertPartnerApplication(user: NewUser, profile: NewPartnerProfile): Promise<UserRecord> {
  return withTransaction(async (client) => {
    const created = await insertUser(user, client);
    await insertPartnerProfile(client, created.id, profile);
    return created;
  });
}

export interface ApplicationRecord {
  userId: string;
  role: Role;
  status: AccountStatus;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  vendorProfile: (NewVendorProfile & { description: string | null }) | null;
  partnerProfile:
    | (Omit<NewPartnerProfile, 'partnerType'> & {
        otherPartnerType: string | null;
        otherFoodType: string | null;
      })
    | null;
  /** D-105: the newest rejection, or null when the application was never rejected. */
  lastRejection: LastRejection | null;
}

/** D-105: a rejection as the administrator and the applicant see it. */
export interface LastRejection {
  reason: RejectionReason;
  note: string | null;
  rejectedAt: Date;
}

// D-105: the newest rejection of the user `u` (a lateral join), as JSON or null.
const LAST_REJECTION = `LEFT JOIN LATERAL (
       SELECT json_build_object('reason', r.reason, 'note', r.note, 'rejectedAt', r.rejected_at) AS "lastRejection"
       FROM application_rejections r WHERE r.user_id = u.id ORDER BY r.seq DESC LIMIT 1) last ON true`;

/** Vendor and partner applications in one status, oldest first (US-07), with the pin taken apart by PostGIS. */
export async function listApplications(status: AccountStatus): Promise<ApplicationRecord[]> {
  const result = await getPool().query<ApplicationRecord>(
    `SELECT u.id AS "userId", u.role, u.status, u.email, u.phone, u.created_at AS "createdAt",
       CASE WHEN v.user_id IS NULL THEN NULL ELSE json_build_object(
         'shopName', v.shop_name, 'vendorType', v.vendor_type, 'contact', v.contact, 'description', v.description,
         'address', v.address,
         'latitude', ST_Y(v.location::geometry), 'longitude', ST_X(v.location::geometry)) END AS "vendorProfile",
       CASE WHEN p.user_id IS NULL THEN NULL ELSE json_build_object(
         'organisationName', p.organisation_name, 'otherPartnerType', p.other_partner_type,
         'acceptedFoodTypes', p.accepted_food_types::text[], 'otherFoodType', p.other_food_type,
         'address', p.address,
         'latitude', ST_Y(p.location::geometry), 'longitude', ST_X(p.location::geometry)) END AS "partnerProfile",
       last."lastRejection"
     FROM users u
     LEFT JOIN vendor_profiles v ON v.user_id = u.id
     LEFT JOIN partner_profiles p ON p.user_id = u.id
     ${LAST_REJECTION}
     WHERE u.status = $1 AND u.role IN ('vendor', 'charity', 'composting', 'other')
     ORDER BY u.created_at, u.id`,
    [status],
  );
  return result.rows;
}

/**
 * D-105: Pending -> Rejected with the reason, in one transaction. Undefined when the user is not a Pending vendor or
 * partner (nothing is saved then).
 */
export function rejectApplication(
  userId: string,
  adminId: string,
  rejection: Rejection,
): Promise<{ id: string; status: AccountStatus } | undefined> {
  return withTransaction(async (client) => {
    const updated = await client.query<{ id: string; status: AccountStatus }>(
      `UPDATE users SET status = 'Rejected'
       WHERE id::text = $1 AND status = 'Pending' AND role IN ('vendor', 'charity', 'composting', 'other')
       RETURNING id, status`,
      [userId],
    );
    const row = updated.rows[0];
    if (row === undefined) return undefined;
    await client.query(
      `INSERT INTO application_rejections (user_id, reason, note, rejected_by) VALUES ($1, $2, $3, $4)`,
      [row.id, rejection.reason, rejection.note, adminId],
    );
    return row;
  });
}

/** D-105: the applicant's own application, as they sent it, with the newest rejection. */
export interface OwnApplication {
  role: Role;
  status: AccountStatus;
  vendorProfile:
    | (Omit<NewVendorProfile, 'branches'> & {
        description: string | null;
        opensAt: string | null;
        closesAt: string | null;
        branches: Omit<NewBranch, 'name'>[];
      })
    | null;
  partnerProfile:
    | (Omit<NewPartnerProfile, 'partnerType'> & {
        partnerType: PartnerRole;
        otherPartnerType: string | null;
        otherFoodType: string | null;
      })
    | null;
  lastRejection: LastRejection | null;
}

export async function findOwnApplication(userId: string): Promise<OwnApplication | undefined> {
  const result = await getPool().query<OwnApplication>(
    `SELECT u.role, u.status,
       CASE WHEN v.user_id IS NULL THEN NULL ELSE json_build_object(
         'shopName', v.shop_name, 'vendorType', v.vendor_type, 'contact', v.contact, 'description', v.description,
         'address', v.address,
         'latitude', ST_Y(v.location::geometry), 'longitude', ST_X(v.location::geometry),
         'opensAt', to_char(v.opens_at, 'HH24:MI'), 'closesAt', to_char(v.closes_at, 'HH24:MI'),
         -- D-64: the extra branches, in order, without the main shop (the first branch).
         'branches', COALESCE((
           SELECT json_agg(json_build_object('address', b.address,
             'latitude', ST_Y(b.location::geometry), 'longitude', ST_X(b.location::geometry),
             'opensAt', to_char(b.opens_at, 'HH24:MI'), 'closesAt', to_char(b.closes_at, 'HH24:MI'))
             ORDER BY b.created_at, b.id)
           FROM vendor_branches b
           WHERE b.vendor_id = u.id AND b.id <> (
             SELECT m.id FROM vendor_branches m WHERE m.vendor_id = u.id ORDER BY m.created_at, m.id LIMIT 1)),
           '[]'::json)) END AS "vendorProfile",
       CASE WHEN p.user_id IS NULL THEN NULL ELSE json_build_object(
         'organisationName', p.organisation_name, 'partnerType', p.partner_type,
         'otherPartnerType', p.other_partner_type,
         'acceptedFoodTypes', p.accepted_food_types::text[], 'otherFoodType', p.other_food_type,
         'address', p.address,
         'latitude', ST_Y(p.location::geometry), 'longitude', ST_X(p.location::geometry)) END AS "partnerProfile",
       last."lastRejection"
     FROM users u
     LEFT JOIN vendor_profiles v ON v.user_id = u.id
     LEFT JOIN partner_profiles p ON p.user_id = u.id
     ${LAST_REJECTION}
     WHERE u.id = $1`,
    [userId],
  );
  return result.rows[0];
}

/**
 * D-105: a Rejected applicant's fixed application, sent again: every detail is replaced and the account is Pending
 * again (a partner may change the kind of partner). The main branch keeps its id (listings point at branches); the
 * extra branches are replaced. Undefined when the account is not Rejected (nothing is saved then).
 */
export function resubmitApplication(
  userId: string,
  application: ValidApplication,
): Promise<UserRecord | undefined> {
  return withTransaction(async (client) => {
    const updated = await client.query<UserRecord>(
      `UPDATE users SET status = 'Pending', role = $2
       WHERE id = $1 AND status = 'Rejected' AND role IN ('vendor', 'charity', 'composting', 'other')
       RETURNING id, email, phone, password_hash AS "passwordHash", role, status, language,
                 created_at AS "createdAt"`,
      [userId, application.role],
    );
    const user = updated.rows[0];
    if (user === undefined) return undefined;
    const vendor = application.vendorProfile;
    const partner = application.partnerProfile;
    if (vendor !== null) {
      await client.query(
        `UPDATE vendor_profiles SET shop_name = $2, vendor_type = $3, address = $4, location = ${point('$5', '$6')},
           contact = $7, description = $8, opens_at = $9, closes_at = $10
         WHERE user_id = $1`,
        [
          userId,
          vendor.shopName,
          vendor.vendorType,
          vendor.address,
          vendor.longitude,
          vendor.latitude,
          vendor.contact,
          vendor.description ?? null,
          vendor.opensAt,
          vendor.closesAt,
        ],
      );
      const main = await client.query<{ id: string }>(
        `SELECT id FROM vendor_branches WHERE vendor_id = $1 ORDER BY created_at, id LIMIT 1`,
        [userId],
      );
      const mainId = main.rows[0]?.id;
      if (mainId === undefined) throw new Error('No main branch for this vendor');
      await client.query(
        `UPDATE vendor_branches SET name = $2, address = $3, location = ${point('$4', '$5')}, opens_at = $6,
           closes_at = $7
         WHERE id = $1`,
        [
          mainId,
          vendor.shopName,
          vendor.address,
          vendor.longitude,
          vendor.latitude,
          vendor.opensAt,
          vendor.closesAt,
        ],
      );
      await client.query(`DELETE FROM vendor_branches WHERE vendor_id = $1 AND id <> $2`, [userId, mainId]);
      for (const branch of vendor.branches ?? []) {
        await insertBranch(userId, { ...branch, name: vendor.shopName }, client);
      }
    }
    if (partner !== null) {
      await client.query(
        `UPDATE partner_profiles SET organisation_name = $2, partner_type = $3,
           accepted_food_types = $4::food_category[], address = $5, location = ${point('$6', '$7')},
           other_partner_type = $8, other_food_type = $9
         WHERE user_id = $1`,
        [
          userId,
          partner.organisationName,
          application.role,
          partner.acceptedFoodTypes,
          partner.address,
          partner.longitude,
          partner.latitude,
          partner.otherPartnerType,
          partner.otherFoodType,
        ],
      );
    }
    return user;
  });
}
