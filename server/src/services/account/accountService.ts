// C-03 Account Service: consumer registration (US-01, FR-ACC-01, E-ACC-01, E-ACC-02, NFR-09b).
import bcrypt from 'bcryptjs';
import { validateRegistration } from '@nowaste/shared';
import { SrsError } from '../../domain/errors.js';
import { DuplicateUserError, insertUser } from '../../data/userRepository.js';
import { BCRYPT_COST } from '../../config/security.js';

export interface RegisteredConsumer {
  id: string;
  role: 'consumer';
  status: 'Active';
}

export interface RegisterConsumerInput {
  email?: unknown;
  phone?: unknown;
  password?: unknown;
  language?: unknown;
}

export async function registerConsumer(input: RegisterConsumerInput): Promise<RegisteredConsumer> {
  const validation = validateRegistration(input);
  if (!validation.ok) {
    // E-ACC-02: identify every invalid field and create nothing.
    throw new SrsError(400, { error: 'E-ACC-02', fields: validation.fields });
  }

  const { email, phone, password, language } = validation.value;
  // NFR-09b: bcrypt adds a random salt to every hash.
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    const user = await insertUser({
      email,
      phone,
      passwordHash,
      role: 'consumer',
      status: 'Active',
      language,
    });
    return { id: user.id, role: 'consumer', status: 'Active' };
  } catch (error) {
    if (error instanceof DuplicateUserError) {
      // E-ACC-01: the app then offers Log in and Reset password.
      throw new SrsError(409, { error: 'E-ACC-01', field: error.field });
    }
    throw error;
  }
}
