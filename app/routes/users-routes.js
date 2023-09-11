const express = require('express')
const router = express.Router()
const usersControllers = require('../controllers/users-controllers')
const authenticateUser = require('../middlewares/authentication')

// Register a new user
router.post('/register', usersControllers.register)

// Login user
router.post('/login', usersControllers.login)


// Get user account details
router.get('/account', authenticateUser, usersControllers.account)


// Update user profile
router.put('/update/:id', authenticateUser, usersControllers.editUser)


module.exports = router
