class SmsDeliveryError extends Error {
  constructor(message = 'SMS delivery failed') {
    super(message);
    this.name = 'SmsDeliveryError';
  }
}

function isSmsConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

async function sendSms({ to, body }) {
  if (!isSmsConfigured()) {
    throw new SmsDeliveryError('SMS provider is not configured');
  }

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      To: to,
      From: process.env.TWILIO_FROM_NUMBER,
      Body: body
    }).toString()
  });

  if (!response.ok) {
    let message = 'SMS delivery failed';
    try {
      const payload = await response.json();
      message = payload.message || message;
    } catch (error) {
      // Ignore parsing failures and fall back to the generic message.
    }
    throw new SmsDeliveryError(message);
  }

  return response.json();
}

module.exports = {
  SmsDeliveryError,
  sendSms,
  isSmsConfigured
};
