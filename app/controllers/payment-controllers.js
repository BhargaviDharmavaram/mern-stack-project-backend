const crypto = require('crypto')
const Payment = require('../models/payment-model')
const Residents = require('../models/resident-model')
const User = require('../models/users-model')
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
        const hostId = req.user.id

        // Fetch PG details using pgDetailsId
        const pgDetails = await PgDetails.findOne({_id : pgDetailsId, host : hostId})
        if (!pgDetails) {
            return res.status(404).json({ error: 'PG details not found or unauthorized access' })
        }

        // Fetch residents of the specific PG using pgDetailsId and populate the roomId field
        const residentsInPG = await Residents.find({ pgDetailsId }).populate('roomId')

        // Iterate through residents and send payment reminder emails
        for (const resident of residentsInPG) {
            try {
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

                // Construct the payment link using order ID (based on your front-end API)
                const paymentLink = `http://localhost:3000/payment/${order.id}`
                console.log(paymentLink)

                // Save payment data into the database
                const newPayment = new Payment({
                    pgDetailsId: pgDetails._id,
                    residentId: resident._id,
                    amount: paymentAmount,
                    paymentMethod: 'razorpay',
                    status: 'pending',
                    paymentDate: new Date(),
                    razorPayId: order.id
                })

                await newPayment.save()
                const emailSubject = 'Payment Reminder'
                const emailText = `Dear ${resident.name},\n\nThis is a friendly reminder to pay your monthly rent of ${paymentAmount}.\n\nYou can make the payment using the following link: ${paymentLink}\n\nPlease make the payment before the due date. Thank you!\n\nRegards,\nThe PG Team`

                // Send payment reminder email to resident
                const emailSent = await sendMail(resident.email, emailSubject, emailText)
                if (emailSent) {
                    console.log(`Email sent to ${resident.name}`)
                } else {
                    console.error(`Error sending email to ${resident.name}`)
                }
            } catch (emailError) {
                console.error(`Error sending email to ${resident.name}:`, emailError)
            }
        }
        res.status(200).json({ message: 'Payment reminders sent successfully.' })
    } catch (error) {
        console.error('Error sending payment reminders:', error)
        res.status(404).json({ error: 'Error sending payment reminders' })
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
        const residentEmailSubject = 'Payment Confirmation'
        const residentEmailText = `Dear ${payment.residentId.name},\n\nYour rent payment for ${paymentMonth.toUpperCase()} month has been successfully received. \n\nYour payment done on ${payment.paymentDate.toLocaleDateString()} for ${paymentMonth} month. \n\nThank you for your prompt payment!\n\nRegards,\nThe PG Team`

        // Send payment confirmation email to PG owner
        const pgDetails = await PgDetails.findById(payment.pgDetailsId)
        const pgOwnerId = pgDetails.host
        const pgOwner = await User.findById(pgOwnerId)

        if (!pgOwner) {
            console.error('PG owner not found')
        } else {
            const pgOwnerEmailSubject = 'Payment Received'
            const pgOwnerEmailText = `Dear ${pgOwner.username},\n\nA rent payment for ${paymentMonth.toUpperCase()} month has been received from ${payment.residentId.name}. \n\n Payment details:\n Resident Name: ${payment.residentId.name}\n Amount: ${payment.amount}\n Payment Date: ${payment.paymentDate.toLocaleDateString()}.`

            await sendMail(payment.residentId.email, residentEmailSubject, residentEmailText)
            await sendMail(pgOwner.email, pgOwnerEmailSubject, pgOwnerEmailText)

            console.log(`Payment confirmation emails sent to ${payment.residentId.name} and PG owner: ${pgOwner.username}`)
        }

        res.status(200).json({ message: 'Payment confirmed and status updated' })
    } catch (error) {
        console.error('Error confirming payment:', error)
        res.status(404).json({ error: error.message })
    }
}

paymentsControllers.getCompletedPayments = async (req, res) => {
    try {
        const hostId = req.user.id
        console.log('hostId', hostId)
        const pgDetailsId = req.params.pgDetailsId // Get the selected PG's ID from the request parameters

        // Fetch PG details using pgDetailsId
        const pg = await PgDetails.findOne({_id : pgDetailsId , host : hostId})

        if (!pg) {
            return res.status(404).json({ error: 'PG details not found or unauthorized access' })
        }

        // Fetch completed payments for the selected PG, excluding payments for deleted residents
        const completedPayments = await Payment.find({ pgDetailsId: pgDetailsId, status: 'completed' })
        .populate({
            path: 'residentId',
            select: 'name email deleted',
            match: { deleted: false } // Exclude deleted residents
        })
        .populate('pgDetailsId', 'name')

        // Filter out payments where residentId is null (resident deleted) or deleted is true
        const filteredCompletedPayments = completedPayments.filter((ele) => {
            return ele.residentId && !ele.residentId.deleted
        })

        res.status(200).json(filteredCompletedPayments)
    } catch (error) {
        console.error('Error fetching completed payments:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

paymentsControllers.getPendingPayments = async (req, res) => {
    try {
        const hostId = req.user.id
        console.log('hostId', hostId)

        const pgDetailsId = req.params.pgDetailsId // Get the selected PG's ID from the request parameters

        // Fetch PG details using pgDetailsId
        const pg = await PgDetails.findOne({_id : pgDetailsId , host : hostId})

        if (!pg) {
            return res.status(404).json({ error: 'PG details not found or unauthorized access ' })
        }

        // Fetch completed payments for the selected PG, excluding payments for deleted residents
        const pendingPayments = await Payment.find({ pgDetailsId: pgDetailsId, status: 'pending' })
        .populate({
            path: 'residentId',
            select: 'name email deleted',
            match: { deleted: false } // Exclude deleted residents
        })
        .populate('pgDetailsId', 'name')


        // Filter out payments where residentId is null (resident deleted) or deleted is true
        const filteredPendingPayments = pendingPayments.filter((ele) => {
            return ele.residentId && !ele.residentId.deleted
        })

        res.status(200).json(filteredPendingPayments)
    } catch (error) {
        console.error('Error fetching completed payments:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

paymentsControllers.getCompletedPaymentsTotal = async (req, res) => {
    try {
        const hostId = req.user.id

        const pgDetailsId = req.params.pgDetailsId // Get the selected PG's ID from the request parameters

        // Fetch PG details using pgDetailsId
        const pg = await PgDetails.findOne({_id : pgDetailsId , host : hostId})

        if (!pg) {
            return res.status(404).json({ error: 'PG details not found or unauthorized access' })
        }

        // Fetch completed payments for the selected PG, excluding payments for deleted residents
        const completedPayments = await Payment.find({ pgDetailsId: pgDetailsId, status: 'completed' })
        .populate({
            path: 'residentId',
            select: 'name email deleted',
            match: { deleted: false } // Exclude deleted residents
        })
        .populate('pgDetailsId', 'name')

        // Calculate total amount for completed payments, excluding payments for deleted residents
        const totalCompletedAmount = completedPayments.reduce((total, payment) => {
            if (payment.residentId && !payment.residentId.deleted) {
                return total + payment.amount
            }
            return total
        }, 0)

        res.status(200).json(totalCompletedAmount)
    } catch (error) {
        console.error('Error fetching completed payments total:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

paymentsControllers.getPendingPaymentsTotal = async (req, res) => {
    try {
        const hostId = req.user.id

        const pgDetailsId = req.params.pgDetailsId // Get the selected PG's ID from the request parameters

        // Fetch PG details using pgDetailsId
        const pg = await PgDetails.findOne({_id : pgDetailsId , host : hostId})

        if (!pg) {
            return res.status(404).json({ error: 'PG details not found or unauthorized access ' })
        }

        // Fetch completed payments for the selected PG, excluding payments for deleted residents
        const pendingPayments = await Payment.find({ pgDetailsId: pgDetailsId, status: 'pending' })
        .populate({
            path: 'residentId',
            select: 'name email deleted',
            match: { deleted: false } // Exclude deleted residents
        })
        .populate('pgDetailsId', 'name')


       // Calculate total amount for completed payments, excluding payments for deleted residents
       const totalPendingAmount = pendingPayments.reduce((total, payment) => {
            if (payment.residentId && !payment.residentId.deleted) {
                return total + payment.amount
            }
            return total
        }, 0)

        res.status(200).json(totalPendingAmount)
    } catch (error) {
        console.error('Error fetching pending payments total:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}


module.exports = paymentsControllers
