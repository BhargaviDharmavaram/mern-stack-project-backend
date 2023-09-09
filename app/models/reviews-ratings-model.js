const mongoose = require('mongoose')
const Schema = mongoose.Schema

const reviewSchema = new Schema({
    pgDetailsId: {
        type: Schema.Types.ObjectId,
        ref: 'PgDetails',
        required: true
    },
    residentId:{
        type: Schema.Types.ObjectId,
        ref: 'Residents',
        required: true
    },
    review: {
        type: String,
        required: true
    },
    rating: {
        food :{
            type: Number,
            min : 1,
            max :5,
            required:true,
        },
        facilities:{
            type: Number,
            min : 1,
            max :5,
            required:true
        },
        hygienic: {
            type: Number,
            min : 1,
            max :5,
            required:true
        },
        safety: {
            type: Number,
            min : 1,
            max :5,
            required:true,
        }
    }
}, { timestamps: true })

const ReviewsAndRatings = mongoose.model('ReviewsAndRatings', reviewSchema)

module.exports = ReviewsAndRatings