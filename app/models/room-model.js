const mongoose = require('mongoose')
const Schema = mongoose.Schema

const roomSchema = new Schema({
    sharing:{
        type:Number,
        required:true
    },
    roomNumber:{
        type:Number,
        required:true
    },
    floor:{
        type:Number,
        required:true
    },
    pgDetailsId : {
        type : Schema.Types.ObjectId,
        ref:'PgDetails',
        required:true
    },
    hostId :{
        type : Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    isAvailable:{
        type:Boolean,
        default:false
    }
},{timestamps:true})

const Room = mongoose.model('Room', roomSchema)

module.exports = Room