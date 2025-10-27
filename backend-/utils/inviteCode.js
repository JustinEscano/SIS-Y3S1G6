const crypto = require('crypto');

const DEFAULT_LENGTH = parseInt(process.env.INVITE_CODE_LENGTH || '8', 10);
const DEFAULT_EXPIRY_MINUTES = parseInt(process.env.INVITE_CODE_EXPIRY_MINUTES || '30', 10);
const CODE_ALPHABET = process.env.INVITE_CODE_ALPHABET || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateInviteCode = (length = DEFAULT_LENGTH) => {
  if (length < 6 || length > 24) {
    length = DEFAULT_LENGTH;
  }

  const bytes = crypto.randomBytes(length);
  const chars = [];
  const alphabetLength = CODE_ALPHABET.length;

  for (let i = 0; i < length; i += 1) {
    const index = bytes[i] % alphabetLength;
    chars.push(CODE_ALPHABET[index]);
  }

  return chars.join('');
};

const resolveExpiryDate = (minutes = DEFAULT_EXPIRY_MINUTES) => {
  const mins = Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_EXPIRY_MINUTES;
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + mins);
  return expiresAt;
};

module.exports = {
  generateInviteCode,
  resolveExpiryDate,
  DEFAULT_EXPIRY_MINUTES,
};
