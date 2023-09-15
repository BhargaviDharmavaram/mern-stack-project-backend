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
router.get('/particularRoom/:roomId', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.singleRoomInParticularPg)

// Add a room by PG Admin
router.post('/addRoom/:pgDetailsId', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.create)

// Update a room by PG Admin
router.put('/updateRoom/:roomId', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.update)

// Destroy a room by PG Admin
router.delete('/destroyRoom/:roomId', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.destroy)

// List only available rooms (for PG Admin )
router.get('/availableRooms', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.listAvailableRoomsForPG)

router.get('/availableRoomsForResident/:pgDetailsId',authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_resident']
    next()
}, authorizeUser, roomControllers.listAvailableRoomsForResident )

// List only non-available rooms (for PG Admin)
router.get('/unAvailableRooms', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, roomControllers.listUnAvailableRoomsForPG)

module.exports = router
