import { validatePasswordStrength } from './password-strength.util';

describe('validatePasswordStrength', () => {
  it('accepts a strong password', () => {
    expect(validatePasswordStrength('Str0ng&Unique#Pass').valid).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = validatePasswordStrength('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/8 characters/);
  });

  it('rejects password missing uppercase', () => {
    expect(validatePasswordStrength('weakpass1!').valid).toBe(false);
  });

  it('rejects password missing lowercase', () => {
    expect(validatePasswordStrength('WEAKPASS1!').valid).toBe(false);
  });

  it('rejects password missing a digit', () => {
    expect(validatePasswordStrength('WeakPassword!').valid).toBe(false);
  });

  it('rejects password missing a special character', () => {
    expect(validatePasswordStrength('WeakPassword1').valid).toBe(false);
  });

  it.each([
    'Password1!', 'Password123!', 'Welcome123!', 'Admin1234!',
    'Letmein1!', 'Qwerty123!',
  ])('rejects common password "%s" that passes complexity', (pw) => {
    const result = validatePasswordStrength(pw);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/common/i);
  });
});
