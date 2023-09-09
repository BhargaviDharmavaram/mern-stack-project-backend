const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')
const Schema = mongoose.Schema

const residentSchema = new Schema({
    pgDetailsId:{
        type: Schema.Types.ObjectId,
        ref : 'PgDetails',
        required:true
    },
    hostId : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    userId : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    name : {
        type : String,
        required : true
    },
    profileImage : {
        type : String,
        required : true
    },
    phoneNumber : {
        type : Number,
        required : true
    },
    email : {
        type : String,
        required : true
    },
    guardianName : {
        type : String,
        required : true
    },
    guardianNumber : {
        type : Number,
        required : true
    },
    address : {
        type : String,
        required : true
    },
    aadharCard : {
        type : String,
        required : true
    },
    roomId:{
        type: Schema.Types.ObjectId,
        ref:'Room',
        required : true
    },
    dateOfJoining : {
        type : Date,
        default : Date.now,
        required:true
    },
    isAccountLinked : {
        type : Boolean,
        default : false
    }
}, {timestamps : true})

//Apply the mongoose-delete plugin
residentSchema.plugin(mongooseDelete, { overrideMethods: true, deletedAt: true })


const Residents = mongoose.model('Residents', residentSchema)
module.exports = Residents