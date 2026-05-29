import { dummyVerify, hashPassword, verifyPassword } from './password.util';

describe('password.util', () => {
  describe('hashPassword / verifyPassword', () => {
    it('verifies a correct password', async () => {
      const hash = await hashPassword('Correct1!');
      expect(await verifyPassword('Correct1!', hash)).toBe(true);
    });

    it('rejects a wrong password', async () => {
      const hash = await hashPassword('Correct1!');
      expect(await verifyPassword('Wrong1!', hash)).toBe(false);
    });
  });

  describe('dummyVerify', () => {
    it('always returns false', async () => {
      expect(await dummyVerify('Any1Pass!')).toBe(false);
    });

    it('takes a comparable amount of time to a real verifyPassword call', async () => {
      const hash = await hashPassword('Ref1Pass!');

      const t = async (fn: () => Promise<unknown>) => {
        const start = performance.now();
        await fn();
        return performance.now() - start;
      };

      const realMs = await t(() => verifyPassword('Ref1Pass!', hash));
      const dummyMs = await t(() => dummyVerify('Ref1Pass!'));

      // Both run a full scrypt derivation — should be within 3× of each other
      expect(dummyMs).toBeLessThan(realMs * 3 + 100);
      expect(realMs).toBeLessThan(dummyMs * 3 + 100);
    });
  });
});
