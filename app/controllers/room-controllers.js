const Room = require('../models/room-model')
const PgDetails = require('../models/pg-details-model')
const Residents = require('../models/resident-model')
const roomControllers = {}

roomControllers.listAllRooms = async(req,res)=>{
    try {
        const hostId = req.user.id
        const pgDetailsId = req.query.pgDetailsId
        const rooms= await Room.find({hostId : hostId, pgDetailsId : pgDetailsId})
        res.json(rooms)
    }
    catch(e){
        res.status(404).json(e.message)
    }
}

// Controller to get available rooms for a selected PG
roomControllers.listAvailableRoomsForPG = async (req, res) => {
    try {
        const hostId = req.user.id
        const pgDetailsId = req.query.pgDetailsId // Retrieve pgDetailsId from query parameters
        const availableRooms = await Room.find({ pgDetailsId: pgDetailsId, hostId : hostId, isAvailable: false })
        res.json(availableRooms)
    } catch (e) {
        res.status(404).json(e.message)
    }
}

// used to show the available rooms i.e when isAvailable is false to the resident 
roomControllers.listAvailableRoomsForResident = async (req, res) => {
    try {
        const pgDetailsId = req.params.pgDetailsId
        const availableRooms = await Room.find({ pgDetailsId : pgDetailsId, isAvailable: false })
        res.json(availableRooms)
    } catch (e) {
        res.status(404).json(e.message)
    }
}


// Controller to get unavailable rooms for a selected PG
roomControllers.listUnAvailableRoomsForPG = async (req, res) => {
    try {
        const hostId = req.user.id
        const pgDetailsId = req.query.pgDetailsId // Retrieve pgDetailsId from query parameters
        const availableRooms = await Room.find({ pgDetailsId: pgDetailsId, hostId : hostId, isAvailable: true })
        res.json(availableRooms)
    } catch (e) {
        res.status(404).json(e.message)
    }
}

roomControllers.singleRoomInParticularPg = async (req, res) => {
    try {
        const roomId = req.params.roomId
        const pgDetailsId = req.query.pgDetailsId
        const hostId = req.user.id
        const room = await Room.findOne({_id: roomId, pgDetailsId: pgDetailsId, hostId : hostId }).populate('pgDetailsId', 'name')
        
        if (!room) {
            return res.status(404).json({ message: 'Room not found' })
        }
        res.json(room)
    } catch (e) {
        res.status(404).json(e.message)
    }
}

roomControllers.create = async (req, res) => {
    try {
        const body = req.body
        const pgDetailsId = req.params.pgDetailsId
        const hostId = req.user.id

        // Check if the host owns the specified PG
        const pgDetails = await PgDetails.findOne({ _id: pgDetailsId, host: hostId })

        if (!pgDetails) {
        // Return an error if the host does not own the PG
        return res.json({ message: 'PG not found or unauthorized' })
        }

        // Create an array to store the newly created rooms
        const newRooms = []

        for (let i = 0 ;i < body.roomNumber.length ; i++) {
        // Create a new room
        const newRoom = new Room({
            sharing: body.sharing,
            roomNumber: body.roomNumber[i],
            floor: body.floor[i],
            pgDetailsId: pgDetailsId,
            hostId,
        })

        // Save the room to the database
        await newRoom.save()
        newRooms.push(newRoom)
        }

        res.status(201).json(newRooms)

    } catch (error) {
        console.error(error)
        res.status(404).json({ message: 'Bad Request' })
    }
}
  

roomControllers.destroy = async (req, res) => {
    try {
        const roomId = req.params.roomId
        const pgDetailsId = req.query.pgDetailsId
        const hostId = req.user.id
        console.log('roomId', roomId)
        console.log('pgDetailsId', pgDetailsId)

        // Check if the room with roomId exists and belongs to the specified pgDetailsId
        const room = await Room.findOne({ _id: roomId, pgDetailsId: pgDetailsId , hostId : hostId})

        if (!room) {
            return res.json({ message: 'Room not found or does not belong to the specified Pg Details.' })
        }

        // Check if there are residents in the room for the specified pgDetailsId
        const residentsInRoom = await Residents.findOne({
            roomId: roomId,
            pgDetailsId: pgDetailsId
        })

        console.log('residentsInRoom', residentsInRoom)
        if (residentsInRoom) {
            // If there are residents, send an error response
            return res.json({ message: 'Cannot delete room. Residents are occupying the room.' })
        }

        const response = await Room.findOneAndDelete({ _id: roomId })

        // Room deleted successfully, send a success response
        res.json(response)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

roomControllers.update = async(req,res)=>{
    try {
        const body = req.body
        const roomId = req.params.roomId
        const pgDetailsId = req.query.pgDetailsId
        const hostId = req.user.id 

        // Check if the room with roomId exists and belongs to the specified pgDetailsId
        const room = await Room.findOne({ _id: roomId, hostId : hostId, pgDetailsId: pgDetailsId })

        if (!room) {
            return res.status(404).json({ message: 'Room not found or does not belong to the specified Pg Details.' })
        }

        // Check if the pg_admin has permission to update the room based on their role or other criteria
        const pg = await PgDetails.findOne({ host : hostId, _id: pgDetailsId })

        if (!pg) {
            return res.status(403).json({ message: 'Unauthorized. You do not have permission to update this room.' })
        }

        // If the user is authorized, proceed to update the room
        const response = await Room.findOneAndUpdate({ _id: roomId }, body, { new: true, runValidators: true })

        // Room updated successfully, send a success response
        res.json(response)
    } catch (e) {
        console.error('Error:', e)
        res.status(500).json({ error: e.message })
    }
}


module.exports = roomControllers