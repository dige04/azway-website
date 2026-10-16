import { errors } from '@strapi/utils';

// NFR-07: admin passwords need at least 12 characters (Strapi's own minimum is 8).
export const ADMIN_PASSWORD_MIN_LENGTH = 12;
export const ADMIN_PASSWORD_TOO_SHORT_MESSAGE = `Mật khẩu quản trị phải có ít nhất ${ADMIN_PASSWORD_MIN_LENGTH} ký tự.`;

type Method = (...args: unknown[]) => unknown;
type Target = Record<string, Method>;
type PickPassword = (args: unknown[]) => unknown;

const passwordOf = (value: unknown) => (value as { password?: unknown } | undefined)?.password;

const assertLongEnough = (password: unknown) => {
  if (typeof password === 'string' && [...password].length < ADMIN_PASSWORD_MIN_LENGTH) {
    throw new errors.ValidationError(ADMIN_PASSWORD_TOO_SHORT_MESSAGE);
  }
};

// Mutates in place: Strapi caches these objects and its own modules hold the
// same reference, so every caller goes through the check.
const guard = (target: Target, label: string, picks: Record<string, PickPassword>) => {
  for (const [name, pickPassword] of Object.entries(picks)) {
    const original = target[name];
    if (typeof original !== 'function') {
      throw new Error(`${label}.${name} not found; re-check the password policy after upgrading Strapi`);
    }
    target[name] = async (...args: unknown[]) => {
      assertLongEnough(pickPassword(args));
      return original.apply(target, args);
    };
  }
};

export const enforceAdminPasswordPolicy = ({
  userService,
  profileController,
}: {
  userService: Target;
  profileController: Target;
}) => {
  // Every way to set an admin password (first admin, CLI create, invite
  // registration, reset by token, edit by super admin, CLI reset) ends in one
  // of these methods while the password is still plain text. DB lifecycles
  // only see the bcrypt hash.
  guard(userService, 'admin::user', {
    create: ([attributes]) => passwordOf(attributes),
    createFirstAdmin: ([attributes]) => passwordOf(attributes),
    updateById: ([, attributes]) => passwordOf(attributes),
    resetPasswordByEmail: ([, password]) => password,
  });
  // Changing your own password revokes your sessions before updateById runs;
  // check first so a rejected change does not log the user out.
  guard(profileController, 'admin::authenticated-user', {
    updateMe: ([ctx]) => passwordOf((ctx as { request?: { body?: unknown } } | undefined)?.request?.body),
  });
};
