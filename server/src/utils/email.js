const sgMail = require('@sendgrid/mail');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

function cleanEnv(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '');
}

const fromEmail = cleanEnv(process.env.EMAIL_FROM) || 'no-reply@yourhoa.com';
const emailProvider = cleanEnv(process.env.EMAIL_PROVIDER).toLowerCase();

function getSesRegion() {
  return cleanEnv(process.env.SES_AWS_REGION) || cleanEnv(process.env.AWS_REGION);
}

function getSesCredentials() {
  const accessKeyId = cleanEnv(process.env.SES_AWS_ACCESS_KEY_ID) || cleanEnv(process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = cleanEnv(process.env.SES_AWS_SECRET_ACCESS_KEY) || cleanEnv(process.env.AWS_SECRET_ACCESS_KEY);
  const sessionToken = cleanEnv(process.env.SES_AWS_SESSION_TOKEN) || cleanEnv(process.env.AWS_SESSION_TOKEN);
  if (!accessKeyId || !secretAccessKey) {
    return undefined;
  }
  return sessionToken ? { accessKeyId, secretAccessKey, sessionToken } : { accessKeyId, secretAccessKey };
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
  const credentials = getSesCredentials();
  if (!region) {
    throw new EmailDeliveryError('SES region is not configured');
  }
  if (!credentials) {
    throw new EmailDeliveryError('SES access key and secret key are not configured');
  }

  const client = new SESClient({
    region,
    credentials
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
