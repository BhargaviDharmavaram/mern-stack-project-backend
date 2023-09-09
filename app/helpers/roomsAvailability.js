const Room = require('../models/room-model')
const Residents = require('../models/resident-model')
const updateRoomAvailability = async (roomId) => {
    try {
        const room = await Room.findById(roomId)
        if (!room) {
            console.log('Room not found')
            return
        }
        //console.log('room', room)
        const residentCount = await Residents.countDocuments({ roomId: room._id })
        //console.log('resident count', residentCount)
        //console.log('room-sharing', room.sharing)
        if (residentCount === room.sharing) {
            // Room is now fully occupied, set isAvailable to true
            await Room.findByIdAndUpdate(room._id, { isAvailable: true })
            //console.log('Room is no longer available')
        } else if (residentCount < room.sharing) {
            // Room has vacant slots, set isAvailable to false
            await Room.findByIdAndUpdate(room._id, { isAvailable: false })
            //console.log('Room is available')
        }
    } catch (error) {
        console.error('Error updating room availability:', error.message)
    }
}
module.exports = updateRoomAvailability
