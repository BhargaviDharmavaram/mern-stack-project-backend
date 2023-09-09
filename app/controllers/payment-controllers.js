
const crypto = require('crypto')
const Payment = require('../models/payment-model')
const Residents = require('../models/resident-model')
const PgDetails = require('../models/pg-details-model')
const Razorpay = require('razorpay')
const sendMail = require('../helpers/nodemailer')

const paymentsControllers = {}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY
})

paymentsControllers.sendPaymentReminders = async (req, res) => {
    try {
        const pgDetailsId = req.params.pgDetailsId

        // Fetch PG details using pgDetailsId
        const pgDetails = await PgDetails.findById(pgDetailsId)
        if (!pgDetails) {
            return res.status(404).json({ error: 'PG details not found' })
        }

        // Fetch residents of the specific PG using pgDetailsId and populate the roomId field
        const residentsInPG = await Residents.find({ pgDetailsId }).populate('roomId')

        // Iterate through residents and send payment reminder emails
        for (const resident of residentsInPG) {
            if (!resident.roomId) {
                console.error('roomId not populated for resident:', resident.name)
                continue
            }

            const sharingType = resident.roomId.sharing

            // Find the pricing based on resident's sharing type
            const pricing = pgDetails.pricing.find(item => item.share === sharingType)

            if (!pricing) {
                console.error('Pricing not found for sharing type:', sharingType)
                continue
            }

            const paymentAmount = pricing.amount

            // Create a Razorpay order
            const order = await razorpay.orders.create({
                amount: paymentAmount * 100, // Convert to paise
                currency: 'INR',
                receipt: `payment_${Date.now()}`
            })

            
            // Construct the payment link using  order ID and this is based on my front-end api 
            const paymentLink = `http://localhost:3000/payment/${order.id}`
            console.log(paymentLink)
            // Save payment data into the database
            const newPayment = new Payment({
                pgDetailsId: pgDetails._id,
                residentId: resident._id,
                amount: paymentAmount,
                paymentMethod: 'razorpay',
                status: 'pending',
                paymentDate: new Date() ,
                razorPayId : order.id
            })

            await newPayment.save()
            const emailSubject = 'Payment Reminder'
            const emailText = `Dear ${resident.name},\n\nThis is a friendly reminder to pay your monthly rent of ${paymentAmount}.\n\nYou can make the payment using the following link: ${paymentLink}\n\nPlease make the payment before the due date. Thank you!\n\nRegards,\nThe PG Team`

            // Send payment reminder email to resident
            sendMail(resident.email, emailSubject, emailText)
        }
        return res.status(200).json({ message: 'Payment reminders sent successfully.'})
    } catch (error) {
        console.error('Error sending payment reminders:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

paymentsControllers.getRazorPayId =  async (req, res) => {
    try {
        const razorPayId = req.params.razorPayId
        const payment = await Payment.findOne({ razorPayId })
        .populate('residentId' , 'name email phoneNumber') // Fetch payment details based on razorPayId
        .populate('pgDetailsId' , 'name')
        console.log(payment)
        if (!payment) {
            return res.status(404).json({ error: 'Payment details not found' })
        }

        // Construct the payment data you need to send to the client
        const paymentData = {
            amount: payment.amount,
            razorPayId: payment.razorPayId,
            name : payment.residentId.name,
            email : payment.residentId.email,
            phoneNumber : payment.residentId.phoneNumber,
            pgName : payment.pgDetailsId.name
        }

        res.status(200).json(paymentData)
    } catch (error) {
        console.error('Error fetching payment details:', error)
        res.status(404).json({ error: error.message})
    }
}

paymentsControllers.paymentConfirmation = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        // Verify the signature (security check)
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex')

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid signature' })
        }

        // Fetch the payment based on the order ID
        const payment = await Payment.findOne({ razorPayId: razorpay_order_id }).populate('residentId')

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' })
        }
        console.log('payment', payment)
        console.log(payment.residentId.email)
        // Update the payment status to "completed"
        payment.status = 'completed'
        await payment.save()
        console.log('Resident ID:', payment.residentId)

        // Send payment confirmation email to resident
        const paymentMonth = payment.paymentDate.toLocaleString('default', { month: 'long' })
        const emailSubject = 'Payment Confirmation'
        const emailText = `Dear ${payment.residentId.name},\n\nYour rent payment for ${paymentMonth.toUpperCase()} month has been successfully received. \n\n Your payment done on ${payment.paymentDate.toLocaleDateString()} for ${paymentMonth} month. \n\nThank you for your prompt payment!\n\nRegards,\nThe PG Team`
        sendMail(payment.residentId.email, emailSubject, emailText)

        res.status(200).json({ message: 'Payment confirmed and status updated' })
    } catch (error) {
        console.error('Error confirming payment:', error)
        res.status(404).json({ error: e.message })
    }
}

paymentsControllers.getPGPayments = async (req, res) => {
    try {
        const pgDetailsId = req.params.pgDetailsId

        // Fetch completed and pending payments for the PG
        const completedPayments = await Payment.find({ 'pgDetailsId': pgDetailsId, status: 'completed' })
            .populate('residentId', 'name email')
            .populate('pgDetailsId', 'name')
        const pendingPayments = await Payment.find({ 'pgDetailsId': pgDetailsId, status: 'pending' })
            .populate('residentId', 'name email')
            .populate('pgDetailsId', 'name')

        res.status(200).json({ completedPayments, pendingPayments })
    } catch (e) {
        console.error('Error fetching PG payments:', error)
        res.status(404).json({ error: e.message })
    }
}

module.exports = paymentsControllers
