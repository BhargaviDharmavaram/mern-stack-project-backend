const express = require('express')
const router = express.Router()
const residentsControllers = require('../controllers/residents-controllers')
const authenticateUser = require('../middlewares/authentication')
const authorizeUser = require('../middlewares/authorization')
const upload = require('../middlewares/multer')

// Get all residents in a particular PG (for PG Admin)
router.get('/getResidents/:pgDetailsId', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, residentsControllers.getResidents)

// Add a resident to a PG (for PG Admin)
router.post('/addResident/:pgDetailsId', upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'aadharCard', maxCount: 1 }
]), authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, residentsControllers.create)

router.post('/sendConfirmationLink/:residentId',authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, residentsControllers.sendConfirmationLink)

// Route to confirm a resident's account
router.put('/confirmResident/:residentId', residentsControllers.confirmResident)

// Route to fetch PG details of the resident's current stay
router.get('/pgDetails/:userId', residentsControllers.getResidentPgDetails)   

// Get details of a particular resident in a PG (for PG Admin)
router.get('/pg/:pgDetailsId/resident/:residentId', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, residentsControllers.getSingleResidentInPGByHost)

// Update a resident's details (for PG Admin)
router.put('/updateResident/:residentId', upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'aadharCard', maxCount: 1 }
]), authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, residentsControllers.update)

// Delete a resident from a PG (for PG Admin)
router.delete('/destroyResident/:residentId', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, residentsControllers.destroy)

// Get deleted residents associated with a PG (for PG Admin)
router.get('/admin/softDeletedResidents', authenticateUser, (req, res, next)=>{
    req.permittedRoles = ['pg_admin']
    next()
}, authorizeUser, residentsControllers.getDeletedResidents)

module.exports = router
