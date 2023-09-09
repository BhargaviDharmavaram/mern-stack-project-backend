const mongoose = require('mongoose')
const Schema = mongoose.Schema

const paymentSchema = new Schema({
    pgDetailsId: {
        type: Schema.Types.ObjectId,
        ref: 'PgDetails',
        required: true
    },
    residentId: {
        type: Schema.Types.ObjectId,
        ref: 'Residents',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'debit_card', 'paypal', 'cash','upi', 'razorpay'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
        required: true
    },
    razorPayId : {
        type : String
    },
    paymentDate:{
        type : Date,
        default : new Date
    }
}, { timestamps: true })

const Payment = mongoose.model('Payment', paymentSchema)

module.exports = Payment