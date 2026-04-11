const sgMail = require('@sendgrid/mail');

const fromEmail = process.env.EMAIL_FROM || 'no-reply@yourhoa.com';

class EmailDeliveryError extends Error {
  constructor(message = 'Email delivery failed') {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

function isEmailConfigured() {
  return Boolean(process.env.SENDGRID_API_KEY && fromEmail);
}

async function sendEmail({ to, subject, text, html }) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new EmailDeliveryError('Email provider is not configured');
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      to,
      from: fromEmail,
      subject,
      text,
      html: html || `<pre>${text}</pre>`
    });
  } catch (error) {
    throw new EmailDeliveryError(error?.response?.body?.errors?.[0]?.message || 'Email delivery failed');
  }
}

module.exports = {
  EmailDeliveryError,
  sendEmail,
  isEmailConfigured
};
