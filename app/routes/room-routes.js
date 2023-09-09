const express = require('express')
const router = express.Router()
const roomControllers = require('../controllers/room-controllers')
const authenticateUser = require('../middlewares/authentication')
const authorizeUser = require('../middlewares/authorization')

// List all rooms in a particular PG
router.get('/allRooms', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.listAllRooms)

// Get details of a particular room in a PG
router.get('/particularRoom/:id', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.singleRoomParticularPg)

// Add a room by PG Admin
router.post('/addRoom/:pgDetailsId', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.create)

// Update a room by PG Admin
router.put('/updateRoom/:id', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.update)

// Destroy a room by PG Admin
router.delete('/destroyRoom/:id', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.destroy)

// List only available rooms (for PG Admin and PG Residents)
router.get('/availableRooms', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin', 'pg_resident']
    next()
}, authorizeUser, roomControllers.listAvailableRooms)

// List only non-available rooms (for PG Admin)
router.get('/unAvailableRooms', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.listNonAvailableRooms)

module.exports = router