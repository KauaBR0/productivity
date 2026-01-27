export const normalizePhone = (raw: string, defaultCountryCode = '55') => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  let normalized = digits;
  if (digits.length <= 11) {
    normalized = `${defaultCountryCode}${digits}`;
  }

  return `+${normalized}`;
};
