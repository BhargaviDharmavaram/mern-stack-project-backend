const User = require('../models/users-model')
const pick = require('lodash/pick')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const validator = require('validator')
const sendMail = require('../helpers/nodemailer')


const usersControllers = {}

usersControllers.register = async (req,res) => {
    try{
        const body = pick(req.body, ['username', 'email', 'password','role'])
        if(!validator.isStrongPassword(body.password)){
            return res.json({
                errors : 'Password must be at leat 8 characters long and contain atleast one uppercase letter, one number, and one special character'
            })
        }
        const userRegister = new User(body)
        const salt = await bcrypt.genSalt()
        const hashedPassword = await bcrypt.hash(userRegister.password, salt)
        userRegister.password = hashedPassword
        const result = await userRegister.save()
        const emailSubject = `Thanking for registering with us.`
        const emailText = `Your login credentials are : \n\nusername :  ${body.username} , \n\nemail : ${body.email} , \n\npassword : ${body.password}.\n\nYou can login to your account by using email and password. \n\n Note : Don't share your credentials to anyone.`
        await sendMail(body.email, emailSubject, emailText)
        res.json(result)
    }catch(e){
        res.status(404).json(e.message)
    }
}

usersControllers.login = async (req,res) => {
    try{
        const body = pick(req.body,['email', 'password'])
        const user = await User.findOne({email : body.email})
        console.log('user', user)
        if(user){
            const match = await bcrypt.compare(body.password, user.password)
            console.log('compare', match)
            if(match){
                const tokenData = {
                    id : user._id,
                    role : user.role
                }
                
                console.log('tokendata-login', tokenData)
                const token = jwt.sign(tokenData , process.env.JWT_SECRET)
                res.json({
                    token : `Bearer ${token}`
                })
            }
            else{
                res.status(404).json({
                    errors : 'invalid email / password'
                })
            }
        }
        else{
            res.status(404).json({
                errors : 'invalid email / password'
            })
        }
        await sendMail(body.email, `You successfully login to your account`, `thank you for joining with us`)
    }catch(e){
        res.status(404).json(e.message)
    }
}

usersControllers.account = async (req,res) => {
    try{
        const user = await User.findById(req.user.id)
        res.json(pick(user, ['id', 'username','email', 'role']))
    }catch(e){
        res.status(404).json(e.message)
    }
}


// Edit/Update User Profile
usersControllers.editUser = async (req, res) => {
    try {
        const id = req.params.id
        const loggedInUserId = req.user.id // user ID from the token

        if (id !== loggedInUserId) {
            return res.status(403).json({
                errors: 'You are not authorized to update your account, provided valid token'
            })
        }

        const updates = pick(req.body, ['username', 'email', 'password']) // Allow users to update username, email, and password

        // Validate and hash password if provided
        if (updates.password && !validator.isStrongPassword(updates.password)) {
            return res.status(400).json({
                errors: 'Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character'
            })
        }

        // If a new password is provided, hash it
        if (updates.password) {
            const salt = await bcrypt.genSalt()
            const hashedPassword = await bcrypt.hash(updates.password, salt)
            updates.password = hashedPassword
        }

        const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
        res.json(updatedUser)
    } catch (e) {
        res.status(400).json(e.message)
    }
}


module.exports = usersControllers