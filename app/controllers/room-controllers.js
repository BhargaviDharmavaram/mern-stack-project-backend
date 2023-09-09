const Room = require('../models/room-model')
const Residents = require('../models/resident-model')
const roomControllers = {}

roomControllers.listAllRooms = async(req,res)=>{
    try {
        const hostId = req.user.id
        const rooms= await Room.find({hostId : hostId})
        res.json(rooms)
    }
    catch(e){
        res.status(404).json(e.message)
    }
}
// used to show the available rooms i.e when isAvailable is false to the resident and admin 
roomControllers.listAvailableRooms = async (req, res) => {
    try {
        const hostId = req.user.id
        const availableRooms = await Room.find({ hostId : hostId, isAvailable: false })
        res.json(availableRooms)
    } catch (e) {
        res.status(404).json(e.message)
    }
}


// used to show the nonavailable rooms i.e when isAvailable is true to the admin i.e filled rooms
roomControllers.listNonAvailableRooms = async (req, res) => {
    try {
        const hostId = req.user.id

        const nonAvailableRooms = await Room.find({ hostId : hostId, isAvailable: true })
        res.json(nonAvailableRooms)
    } catch (e) {
        res.status(404).json(e.message)
    }
}

roomControllers.singleRoomParticularPg = async (req, res) => {
    try {
        const id = req.params.id
        const pgDetailsId = req.query.pgDetailsId
        const room = await Room.findOne({_id: id, pgDetailsId: pgDetailsId }).populate('pgDetailsId', 'name')
        
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
        //console.log('pgId', pgId)
        const hostId = req.user.id
    
        // Create an array to store the newly created rooms
        const newRooms = []
    
        for (let i = 0; i < body.roomNumber.length; i++) {
            console.log('Creating room:', body.roomNumber[i], body.floor[i])
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
            // console.log('Room created:', newRoom)
        }
        //   console.log('Sending response with newRooms:', newRooms)
    
    
        res.status(201).json({ message: 'Rooms added successfully', rooms: newRooms })
    } catch (error) {
        //console.error(error)
        res.status(500).json({ message: 'Internal Server Error' })
    }
}
  

roomControllers.destroy = async (req, res) => {
    try {
        const id = req.params.id

        // Check if there are residents in the room
        const residentsInRoom = await Residents.findOne({ roomId : id , hostId : req.user.id})
        console.log('residents', residentsInRoom)
        if (residentsInRoom) {
            return res.status(400).json({ message: 'Cannot delete room. Residents are occupying the room.' })
        }

        // No residents in the room, delete the room
        const response = await Room.findOneAndDelete({ _id: id })

        res.json(response)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}


roomControllers.update = async(req,res)=>{
    try{
        const body = req.body
        const id = req.params.id
        const response = await Room.findOneAndUpdate({_id : id},body,{new:true,runValidators:true})
        const updateRoom = response
        res.json(updateRoom)
    }
    catch(e){
        res.status(404).json(e.message)
    }
}


module.exports = roomControllers