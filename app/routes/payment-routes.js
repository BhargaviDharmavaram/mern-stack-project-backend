const express = require('express')
const router = express.Router()

const authenticateUser = require('../middlewares/authentication')
const authorizeUser = require('../middlewares/authorization')
const paymentsControllers = require('../controllers/payment-controllers')

// Route to send payment reminders to residents of a specific PG
router.post('/sendPaymentReminders/:pgDetailsId', authenticateUser, (req, res, next) => {
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, paymentsControllers.sendPaymentReminders)

// Get payment details using Razorpay ID
router.get('/getPaymentDetails/:razorPayId', paymentsControllers.getRazorPayId)

// Confirm payment status
router.post('/payment/confirmation',  paymentsControllers.paymentConfirmation)

// Get completed and pending payments for PG owner
router.get('/getPgPayments/:pgDetailsId', authenticateUser, (req, res, next) => {
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, paymentsControllers.getPGPayments)

module.exports = router
