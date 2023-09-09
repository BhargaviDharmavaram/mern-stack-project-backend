const express = require('express')
const router = express.Router()

const authenticateUser = require('../middlewares/authentication')
const authorizeUser = require('../middlewares/authorization')
const ratingsAndReviewsControllers = require('../controllers/reviews-ratings-controllers')

// Add a review for a particular PG
router.post('/addReview', authenticateUser, (req, res, next) => {
    req.permittedRoles = ['pg_resident']
    next()
}, authorizeUser, ratingsAndReviewsControllers.addReview)

// Calculate average rating for a particular PG
router.get('/averageRating', authenticateUser, (req, res, next) => {
    req.permittedRoles = ['pg_resident', 'pg_admin']
    next()
}, authorizeUser, ratingsAndReviewsControllers.averageRating)

// Get all reviews for a PG
router.get('/allReviews/:pgId', authenticateUser, (req, res, next) => {
    req.permittedRoles = ['pg_admin', 'pg_resident']
    next()
}, authorizeUser, ratingsAndReviewsControllers.listAllReviews)

// Update a review by ID by the resident
router.put('/updateReview/:reviewId', authenticateUser, (req, res, next) => {
    req.permittedRoles = ['pg_resident']
    next()
}, authorizeUser, ratingsAndReviewsControllers.updateReview)

// Delete a review by the resident
router.delete('/destroyReview/:reviewId', authenticateUser, (req, res, next) => {
    req.permittedRoles = ['pg_resident']
    next()
}, authorizeUser, ratingsAndReviewsControllers.destroyReview)

module.exports = router