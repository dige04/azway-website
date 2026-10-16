import { describe, expect, it, vi } from 'vitest';
import { ADMIN_PASSWORD_TOO_SHORT_MESSAGE, enforceAdminPasswordPolicy } from './admin-password-policy';

describe('enforceAdminPasswordPolicy', () => {
  it('rejects passwords under 12 characters at every entry point before Strapi acts on them', async () => {
    const short = 'Abcdefgh123'; // 11
    const ok = 'Abcdefgh1234'; // 12
    const userCalls = {
      create: (password: string) => [{ email: 'a@b.c', password }],
      createFirstAdmin: (password: string) => [{ email: 'a@b.c', password }],
      updateById: (password: string) => [1, { password }],
      resetPasswordByEmail: (password: string) => ['a@b.c', password],
    };
    const profileCalls = {
      updateMe: (password: string) => [{ request: { body: { currentPassword: 'x', password } } }],
    };
    const fake = (calls: object) =>
      Object.fromEntries(Object.keys(calls).map((name) => [name, vi.fn().mockResolvedValue('done')]));
    const userService = fake(userCalls);
    const profileController = fake(profileCalls);
    const originals = { ...userService, ...profileController };
    enforceAdminPasswordPolicy({ userService, profileController });

    const targets = [
      [userService, userCalls],
      [profileController, profileCalls],
    ] as const;
    for (const [target, calls] of targets) {
      for (const [name, args] of Object.entries(calls)) {
        await expect(target[name](...args(short))).rejects.toThrow(ADMIN_PASSWORD_TOO_SHORT_MESSAGE);
        expect(originals[name]).not.toHaveBeenCalled();
        await expect(target[name](...args(ok))).resolves.toBe('done');
      }
    }
    // Updates that do not touch the password pass through.
    await expect(userService.updateById(1, { firstname: 'X' })).resolves.toBe('done');
  });
});
