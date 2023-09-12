const express = require('express')
const cors = require('cors')


require('dotenv').config()
const configureDB = require('./config/db')
const app = express()
app.use(express.json())
app.use(cors())
configureDB()


// Import your routes
const usersRoutes = require('./app/routes/users-routes')
const pgDetailsRoutes = require('./app/routes/pg-details-routes')
const roomRoutes = require('./app/routes/room-routes')
const residentsRoutes = require('./app/routes/residents-routes')
const reviewsAndRatingsRoutes = require('./app/routes/reviews-ratings-routes')
const paymentsRoutes = require('./app/routes/payment-routes')

// Use the routes
app.use('/api/users', usersRoutes) // Route for user-related actions
app.use('/api/pgdetails', pgDetailsRoutes) // Route for PG details actions
app.use('/api/rooms', roomRoutes)
app.use('/api/residents', residentsRoutes)
app.use('/api/reviews-ratings', reviewsAndRatingsRoutes)
app.use('/api/payments', paymentsRoutes)

// Serve static files from the "public" directory
app.use(express.static('public'))

const port = 3800
app.listen(port, ()=>{
    console.log('server is connecting on the port ', port)
})