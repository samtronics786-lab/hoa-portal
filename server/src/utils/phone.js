function normalizePhoneNumber(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (value.startsWith('+')) return value;
  return `+${digits}`;
}

function maskPhoneNumber(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 4) return value;
  return `***-***-${digits.slice(-4)}`;
}

module.exports = {
  normalizePhoneNumber,
  maskPhoneNumber
};
