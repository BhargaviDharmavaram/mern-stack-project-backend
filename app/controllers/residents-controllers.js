const Residents = require('../models/resident-model')
const PgDetails = require('../models/pg-details-model')
const Payment = require('../models/payment-model')
const Room = require('../models/room-model')
const User = require('../models/users-model')
const sendMail = require('../helpers/nodemailer')
const updateRoomAvailability = require('../helpers/roomsAvailability')

const residentsControllers = {}

residentsControllers.getResidents = async (req, res) => {
    try {
        const hostId = req.user.id
        const pgDetailsId = req.params.pgDetailsId

        // Check if the provided pgDetailsId exists
        const pgDetailsExists = await PgDetails.exists({ _id: pgDetailsId, host: hostId })

        if (!pgDetailsExists) {
            return res.status(404).json({ message: 'Selected PG not found or unauthorized access.' })
        }

        const residents = await Residents.find({hostId : hostId, pgDetailsId : pgDetailsId})
            .populate('pgDetailsId', 'name')
            .populate('roomId', 'roomNumber')

        res.json(residents)
    } catch (e) {
        res.json(e.message)
    }
}


residentsControllers.getSingleResidentInPGByHost = async (req, res) => {
    try {
        const pgDetailsId = req.params.pgDetailsId 
        const residentId = req.params.residentId 

        // Find a resident in the database that matches the given _id, pgDetailsId, and hostId
        const resident = await Residents.findOne({
            _id: residentId,
            pgDetailsId: pgDetailsId,
            hostId: req.user.id // from the authentication req.user.id
        }).populate('pgDetailsId', 'name') // Populate the 'pgDetailsId' field with the 'name' property
        .populate('roomId', 'roomNumber sharing floor')

        // If resident is not found
        if (!resident) {
            return res.status(404).json({ message: 'Resident not found in the specified PG for the given host' })
        }

        // Fetch payment details for this resident
        const payments = await Payment.find({ residentId: resident._id })

        // Combine resident and payment data
        const residentWithPayments = {
            ...resident.toObject(),
            payments: payments
        }

        // Respond with the combined data
        res.json(residentWithPayments)
    } catch (e) {
        res.status(404).json(e.message)
    }
}

residentsControllers.create = async (req, res) => {
    try {
        const body = req.body
        const pgDetailsId = req.params.pgDetailsId

        // Check if the room's sharing capacity has been reached
        const room = await Room.findById(body.roomId)
        const residentCount = await Residents.countDocuments({ roomId: room._id })
        if (residentCount >= room.sharing) {
            return res.status(400).json({ message: 'Room is already fully occupied.' })
        }
        if (!req.files || !req.files.profileImage || !req.files.aadharCard) {
            return res.status(400).json({ message: 'Profile image and Aadhar card are required.' })
        }

        const profileImage = req.files.profileImage[0].location
        const aadharCard = req.files.aadharCard[0].location

        // Check if the specified pgDetailsId matches the host's pgDetailsId
        const hostPgDetails = await PgDetails.findOne({ host: req.user.id, _id: pgDetailsId })
        if (!hostPgDetails) {
            return res.status(403).json({ message: 'Unauthorized. You do not have permission to add residents to this PG.' })
        }
        // Check if the roomId belongs to the same PG as specified by pgDetailsId
        if (room.pgDetailsId.toString() !== pgDetailsId) {
            return res.status(400).json({ message: 'Invalid roomId. The room does not belong to the specified PG.' })
        }
        const data = new Residents({ ...body, profileImage, aadharCard, hostId : req.user.id, pgDetailsId : pgDetailsId })
        //console.log('data', data)
        //console.log('data._id', data._id)
        const pgResident = await data.save()

        // you have an email field in your Residents schema
        const residentEmail = data.email

        // Retrieve the PG details
        const populateResident = await Residents.findById(pgResident._id)
            .populate('pgDetailsId', 'name')
            .populate('roomId', 'sharing roomNumber floor ')
            .populate('hostId', 'username')
        
        if (!populateResident) {
            return res.status(404).json({ message: 'Resident not found' })
        }

        const pgName = populateResident.pgDetailsId.name
        const roomNumber = populateResident.roomId.roomNumber
        const sharing = populateResident.roomId.sharing
        const floor = populateResident.roomId.floor
        // you have roomId in the residents schema 
        //console.log(populateResident.roomId._id)
        // Update the room's isAvailable field to true
        await Room.findByIdAndUpdate(populateResident.roomId._id, { isAvailable: true })
        // For send email notification to client
        const emailSubject1 = 'Welcome to Our PG!'
        const emailText1 = `Hello ${data.name}, Welcome to our ${pgName}! We are glad to have you as a resident. 
        \n\n ROOM DETAILS :
        \n You have been allocated on Room Number :  ${roomNumber} which is ${sharing} sharing on the floor : ${floor}. \n\nRegards, 
        \n The PG team - ${pgName.toUpperCase()}.`
        sendMail(residentEmail,emailSubject1,emailText1)
        await updateRoomAvailability(populateResident.roomId._id)
        res.json(populateResident)
    } catch (e) {
        res.status(404).json(e.message)
    }
}

residentsControllers.sendConfirmationLink = async (req, res) =>{
    try{
        const email = req.body.email
        const residentId = req.params.residentId
        const hostId = req.user.id

        // Extract selectedPgDetailsId from either URL params or query params
        const pgDetailsId = req.query.pgDetailsId
        console.log(`pgDetailsId`, pgDetailsId)
        const linkedUser = await User.findOne({email : email})
        console.log('email', email)
        if(!linkedUser){
            return res.json({message : 'Provide a valid email, which is given by the user during registration process'})
        }

        // Check if the resident belongs to the selected PG hosted by req.user (the host)
        const resident = await Residents.findOne({ _id: residentId, hostId : hostId, pgDetailsId: pgDetailsId })

        if (!resident) {
            return res.status(400).json({ message: 'The resident does not belong to the selected PG.' })
        }

        // Create a confirmation link with user and resident IDs
        const confirmationLink = `http://localhost:3000/confirm?user=${linkedUser._id}&resident=${residentId}`

        // Define the email subject and text
        const emailSubject = 'Confirm Your Account';
        const emailText = `Click on the following link to confirm your account: ${confirmationLink}`;

        // Send the confirmation email
        await sendMail(email, emailSubject, emailText);

        res.json({ message: 'Confirmation link has been sent to your registered email.' });

    }catch(e){
        console.log(e.message)
    }
}

residentsControllers.confirmResident = async (req, res) => {
    try {
        const { residentId } = req.params
        const userId = req.query.user // Extract user ID from query parameter

        // Update the resident's fields
        const updatedResident = await Residents.findByIdAndUpdate(
            residentId,
            { isAccountLinked: true, userId: userId },
            { new: true, runValidators : true }
        );

        if (!updatedResident) {
            return res.status(404).json({ message: 'Resident not found' })
        }

        res.json({ message: 'Resident confirmed successfully' })
    } catch (e) {
        console.error(e.message);
        res.status(500).json({ message: e.message })
    }
}

residentsControllers.getResidentPgDetails = async (req, res) => {
    try {
        const { userId } = req.params

        // Find the resident based on the userId
        const resident = await Residents.findOne({ userId })
            .populate('pgDetailsId', 'name')
            .populate('roomId', 'roomNumber floor sharing')

        if (!resident) {
            return res.status(404).json({ message: 'Resident not found' })
        }

        res.json(resident)
    } catch (e) {
        console.error(e.message);
        res.status(500).json({ message: 'An error occurred' })
    }
}


residentsControllers.update = async (req, res) => {
    try {
        const body = req.body
        const residentId = req.params.residentId
        const hostId = req.user.id // host's _id is stored in req.user.id
        const pgDetailsId = req.query.pgDetailsId // the host selects a PG

        // Check if residentId is valid
        if (!residentId) {
            return res.status(400).json({ message: 'Invalid residentId.' })
        }

        
        if (!req.files) {
            return res.status(400).json({ message: 'Profile image and Aadhar card are required.' })
        }

        const updateFields = {} // Fields to update

        // Check and update the profileImage field
        if (req.files.profileImage) {
            const profileImage = req.files.profileImage[0].location
            updateFields.profileImage = profileImage
        }

        // Check and update the aadharCard field
        if (req.files.aadharCard) {
            const aadharCard = req.files.aadharCard[0].location
            updateFields.aadharCard = aadharCard
        }

        // Merge updates from body with file updates
        const mergedUpdate = { ...body, ...updateFields }

        // Find the original resident data before update
        const originalResident = await Residents.findOne({ _id: residentId, hostId : hostId, pgDetailsId: pgDetailsId })
            .populate('roomId', 'isAvailable sharing roomNumber floor');

        if (!originalResident) {
            return res.status(404).json({ message: 'Resident not found or unauthorized access.' });
        }

        // Update the resident if it belongs to the selected PG
        const updateResident = await Residents.findOneAndUpdate(
            {_id : residentId , hostId : hostId, pgDetailsId: pgDetailsId },
            mergedUpdate,
            { new: true, runValidators: true }
        ).populate('pgDetailsId', 'name contact')
        .populate('roomId' , 'sharing roomNumber floor')

        // Check if the room assignment has changed
        if (originalResident.roomId && updateResident.roomId && originalResident.roomId.toString() !== updateResident.roomId.toString()) {
            // Mark the old room as available
            await Room.findByIdAndUpdate(originalResident.roomId, { isAvailable: true })
            // Mark the new room as unavailable
            await Room.findByIdAndUpdate(updateResident.roomId, { isAvailable: false })
            
            // Update availability for both rooms
            await updateRoomAvailability(originalResident.roomId)
            await updateRoomAvailability(updateResident.roomId)
        }
        const emailSubject = 'Account Updated'
        const emailText = `Hello ${updateResident.name}, Your account in ${updateResident.pgDetailsId.name} has been updated. \n\nRegards,\nThe PG team - ${updateResident.pgDetailsId.name.toUpperCase()}. \n If you have any queries please contact us... ${updateResident.pgDetailsId.contact} `

        sendMail(updateResident.email, emailSubject, emailText)
        await updateRoomAvailability(updateResident.roomId)
        res.json(updateResident)
    } catch (e) {
        res.status(404).json(e.message)
    }
}


residentsControllers.destroy = async (req, res) => {
    try {
        const residentId = req.params.residentId
        const hostId = req.user.id
        const pgDetailsId = req.query.pgDetailsId
        
        // Find the resident and ensure it belongs to the selected PG by hostId and pgDetailsId
        const resident = await Residents.findOne({ _id: residentId, hostId, pgDetailsId: pgDetailsId })
            .populate('pgDetailsId', 'name contact')
            .populate('roomId', 'roomNumber floor')

        if (!resident) {
            return res.status(404).json({ message: 'Resident not found or unauthorized access.' })
        }

        // Soft delete the resident
        await resident.delete()
        // Update the room's isAvailable field to false
        await Room.findByIdAndUpdate(resident.roomId, { isAvailable: false })
        // send an email notification for the soft deletion
        const residentEmail = resident.email
        console.log('resident-email', residentEmail)
        console.log('pg-name', resident.pgDetailsId.name)
        const emailSubject = 'Account Deactivation'
        const emailText = `Hello ${resident.name}, Your account in ${resident.pgDetailsId.name} has been deactivated. Please contact support for more details ${resident.pgDetailsId.contact}. \n\nRegards 
        The PG Team ${resident.pgDetailsId.name.toUpperCase()}.`

        sendMail(residentEmail, emailSubject, emailText)
        await updateRoomAvailability(resident.roomId)
        res.json(resident)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// for getting the deleted residents to the admin in the particular pg
residentsControllers.getDeletedResidents = async(req, res) => {
    try {
        const hostId = req.user.id
        console.log('hostId', hostId)
        const pgDetailsId = req.query.pgDetailsId

        // Ensure that both pgDetailsId and hostId match before fetching deleted residents
        const matchingPG = await PgDetails.findOne({ host: hostId, _id: pgDetailsId })

        if (!matchingPG) {
            return res.status(403).json({ message: 'Unauthorized. Invalid PG selection.' })
        }
        
        // Fetch deleted residents associated with the PG and populate the pgDetailsId field
        const deletedResidents = await Residents.findDeleted({
            hostId : hostId,
            pgDetailsId : pgDetailsId,
            deleted: true
        }).populate('pgDetailsId', 'name')
        
        if (deletedResidents.length > 0) {
            res.json(deletedResidents)
        } else {
            res.json({ message: 'No vacated residents found' })
        }
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

module.exports = residentsControllers