const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const Schema = mongoose.Schema
const usersSchema = new Schema({
    username : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true,
        unique : true
    },
    password : {
        type : String,
        required : true,
        minlength : 8,
        maxlength : 128
    },
    role : {
        type : String,
        enum : ['pg_admin', 'pg_resident'],
        required : true
    }
}, {timestamps : true})
usersSchema.plugin(uniqueValidator)

const User = mongoose.model('User', usersSchema)

module.exports = User