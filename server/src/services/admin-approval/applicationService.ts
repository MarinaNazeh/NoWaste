// D-105 (2026-11-17): the vendor or partner sees their own application, with the reason and the support contact when
// it was rejected (GET /users/me/application), and may fix every detail and send it again (POST
// /users/me/application), which makes it Pending again (Rejected -> Pending, by the applicant only, no limit). A
// vendor stays a vendor; a partner may change the kind of partner. The login details are not part of it.
import { PARTNER_ROLES, validateApplication } from '@nowaste/shared';
import { SrsError } from '../../domain/errors.js';
import { getSetting } from '../../data/settingsRepository.js';
import {
  findOwnApplication,
  resubmitApplication,
  type LastRejection,
  type OwnApplication,
} from '../../data/profileRepository.js';
import type { UserRecord } from '../../data/userRepository.js';
import { getMe, type Me } from '../account/accountService.js';

export interface MyApplication extends Omit<OwnApplication, 'lastRejection'> {
  /** The reason, only while the application is Rejected. */
  rejection: LastRejection | null;
  supportContact: { email: string };
}

/** The settings row SUPPORT-CONTACT. */
async function supportContact(): Promise<{ email: string }> {
  const value = (await getSetting('SUPPORT-CONTACT'))?.value as { email?: unknown } | null | undefined;
  if (typeof value?.email !== 'string') throw new Error('Settings row SUPPORT-CONTACT is missing');
  return { email: value.email };
}

/** GET /users/me/application. */
export async function getMyApplication(user: UserRecord): Promise<MyApplication> {
  const own = await findOwnApplication(user.id);
  if (own === undefined) throw new SrsError(404, { error: 'not_found' });
  const { lastRejection, ...application } = own;
  return {
    ...application,
    rejection: own.status === 'Rejected' ? lastRejection : null,
    supportContact: await supportContact(),
  };
}

/** POST /users/me/application {role?, vendorProfile | partnerProfile}: 400 E-ACC-02, 409 not_rejected. */
export async function sendApplicationAgain(user: UserRecord, body: Record<string, unknown>): Promise<Me> {
  if (user.status !== 'Rejected') throw new SrsError(409, { error: 'not_rejected', status: user.status });
  // A vendor stays a vendor; a partner keeps its kind unless it sends another partner kind.
  const isPartner = (PARTNER_ROLES as readonly string[]).includes(user.role);
  const role = body.role === undefined ? user.role : body.role;
  const allowed = isPartner ? (PARTNER_ROLES as readonly unknown[]).includes(role) : role === 'vendor';
  if (!allowed) throw new SrsError(400, { error: 'E-ACC-02', fields: ['role'] });
  const check = validateApplication({
    role,
    vendorProfile: body.vendorProfile,
    partnerProfile: body.partnerProfile,
  });
  if (!check.ok) throw new SrsError(400, { error: 'E-ACC-02', fields: check.fields });
  const updated = await resubmitApplication(user.id, check.value);
  if (updated === undefined) {
    // Decided by the administrator in the meantime.
    const now = await findOwnApplication(user.id);
    throw new SrsError(409, { error: 'not_rejected', status: now?.status ?? user.status });
  }
  return getMe(updated);
}
