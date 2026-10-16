// NFR-10 / CLAUDE.md: never log a full phone number or email address.
export const maskPhone = (phone: string | null | undefined) =>
  phone ? `${phone.slice(0, 3)}****${phone.slice(-3)}` : '';

export const maskEmail = (email: string | null | undefined) => {
  if (!email) return '';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 1)}***@${domain ?? ''}`;
};
