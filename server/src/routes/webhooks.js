const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Payment, Charge } = require('../models');

const router = express.Router();

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const paymentId = session.metadata?.paymentId;

      if (paymentId) {
        const payment = await Payment.findByPk(paymentId);
        if (payment) {
          payment.status = 'success';
          payment.transactionId = session.payment_intent || session.id;
          payment.receiptUrl = session.payment_intent ? `https://dashboard.stripe.com/payments/${session.payment_intent}` : payment.receiptUrl;
          payment.paidAt = new Date();
          await payment.save();

          if (payment.chargeId) {
            const charge = await Charge.findByPk(payment.chargeId);
            if (charge) {
              charge.status = 'paid';
              await charge.save();
            }
          }
        }
      }
      break;
    }
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!', paymentIntent.id);
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      console.log('PaymentMethod was attached to a Customer!', paymentMethod.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
