const mongoose = require('mongoose')
const Schema = mongoose.Schema

const pgDetailsSchema = new Schema({
    name : {
        type : String,
        required : true
    },
    host : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    address : {
        type : String,
        required : true
    },
    geo : {
        lat: Number,
        lng: Number
    },
    contact : {
        type : Number,
        required : true
    },
    totalRooms : {
        type : Number,
        required : true
    },
    pricing : {
        type : [
            {share : Number , amount : Number},
        ],
        required : true
    },
    facilities : {
        type : [],
        required : true
    },
    pgType : {
        type : String,
        enum : ['Boys','Girls','Co-Living'],
        required : true
    },
    foodType : {
        type : String,
        enum : ['Veg', 'Veg&Non-Veg'],
        required : true
    },
    nearByPlaces : {
        type : [
            {name : String , distance : String}
        ],
        required : true
    },
    images:{
        type: []
    },
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'ReviewsAndRatings'
    }]
}, {timestamps : true})

const PgDetails = mongoose.model('PgDetails', pgDetailsSchema)

module.exports = PgDetails