const sgMail = require('@sendgrid/mail');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const fromEmail = process.env.EMAIL_FROM || 'no-reply@yourhoa.com';
const emailProvider = String(process.env.EMAIL_PROVIDER || '').toLowerCase();

function getSesRegion() {
  return process.env.SES_AWS_REGION || process.env.AWS_REGION;
}

function getSesCredentials() {
  const accessKeyId = process.env.SES_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SES_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    return undefined;
  }
  return { accessKeyId, secretAccessKey };
}

class EmailDeliveryError extends Error {
  constructor(message = 'Email delivery failed') {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

function resolveEmailProvider() {
  if (emailProvider) {
    return emailProvider;
  }

  if (getSesCredentials()) {
    return 'ses';
  }

  if (process.env.SENDGRID_API_KEY) {
    return 'sendgrid';
  }

  return 'none';
}

function isEmailConfigured() {
  const provider = resolveEmailProvider();

  if (provider === 'ses') {
    return Boolean(fromEmail && getSesCredentials() && getSesRegion());
  }

  if (provider === 'sendgrid') {
    return Boolean(process.env.SENDGRID_API_KEY && fromEmail);
  }

  return false;
}

async function sendViaSes({ to, subject, text, html }) {
  const region = getSesRegion();
  if (!region) {
    throw new EmailDeliveryError('SES region is not configured');
  }

  const client = new SESClient({
    region,
    credentials: getSesCredentials()
  });

  try {
    await client.send(new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: html
          ? {
            Html: {
              Data: html,
              Charset: 'UTF-8'
            },
            Text: {
              Data: text,
              Charset: 'UTF-8'
            }
          }
          : {
            Text: {
              Data: text,
              Charset: 'UTF-8'
            }
          }
      }
    }));
  } catch (error) {
    throw new EmailDeliveryError(error?.message || 'Email delivery failed');
  }
}

async function sendViaSendGrid({ to, subject, text, html }) {
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

async function sendEmail({ to, subject, text, html }) {
  const provider = resolveEmailProvider();

  if (provider === 'ses') {
    return sendViaSes({ to, subject, text, html });
  }

  if (provider === 'sendgrid') {
    return sendViaSendGrid({ to, subject, text, html });
  }

  if (!provider || provider === 'none') {
    throw new EmailDeliveryError('Email provider is not configured');
  }

  throw new EmailDeliveryError(`Unsupported email provider: ${provider}`);
}

module.exports = {
  EmailDeliveryError,
  sendEmail,
  isEmailConfigured
};
