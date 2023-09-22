const ReviewsAndRatings = require('../models/reviews-ratings-model')
const Residents = require('../models/resident-model')
const PgDetails = require('../models/pg-details-model')
const User = require('../models/users-model')
const sendMail = require('../helpers/nodemailer')


const ratingsAndReviewsControllers = {}

ratingsAndReviewsControllers.addReview = async (req, res) => {
    try {
        const userId = req.user.id
        const body = req.body

        //console.log(body)

        // Fetch the resident based on the user ID
        const resident = await Residents.findOne({ userId: userId })

        if (!resident) {
            return res.status(404).json({ error: 'You are not a resident in this PG, so you are denied for writing a review' })
        }

        // Fetch the PG details where the resident is staying
        const pgDetails = await PgDetails.findById(resident.pgDetailsId)

        if (!pgDetails) {
            return res.status(404).json({ error: 'PG details not found' })
        }

        // Check if the selected PG matches the resident's PG
        if (body.pgDetailsId.toString() !== pgDetails._id.toString()) {
            return res.status(403).json({ error: 'You can only add a review for the PG where you are currently staying' })
        }

        // Check if the resident has already written 2 reviews
        const residentReviews = await ReviewsAndRatings.find({ residentId: resident._id })
        if (residentReviews.length >= 1) {
            return res.status(400).json({ error: 'You have already submitted the maximum allowed number of reviews.' })
        }

        // Create a new review
        const newReview = new ReviewsAndRatings({
            ...body,
            pgDetailsId: pgDetails._id,
            residentId: resident._id,
            residentName : resident.name
        })

        await newReview.save()

        // Add the review to PG details' reviews array
        pgDetails.reviews.push(newReview)
        await pgDetails.save()


        // Fetch the PG owner's host : _id that is ref to user model  from PgDetails and use it to fetch the owner's email from User model
        const pgOwnerId = pgDetails.host
        const pgOwner = await User.findById(pgOwnerId)
        console.log('pgOwner', pgOwner.email)

        if (pgOwner) {
            // Construct the email subject and text
            const subject = 'New Review Added'
            const text = `A new review has been added to your PG by a resident. Resident Name: ${resident.name}`

            // Send the email notification to the PG owner
            await sendMail(pgOwner.email, subject, text)
        }
        res.status(201).json(newReview)
    } catch (error) {
        console.log('error', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

ratingsAndReviewsControllers.averageRating = async (req, res) => {
    try {
        const hostId = req.user.id // hostId is obtained from the authenticated user's token
        const pgDetailsId = req.params.pgDetailsId
        // Fetch the PG details based on the host's ID
        const pgDetails = await PgDetails.findOne({ host : hostId , _id : pgDetailsId})
        console.log(pgDetails)
        if (!pgDetails) {
          return res.json({ error: 'No PG details found for the host.' })
        }
    
        // Fetch reviews for the specific PG
        const reviewsForPg = await ReviewsAndRatings.find({ pgDetailsId: pgDetails._id })
    
        if (reviewsForPg.length === 0) {
          return res.json({ error: 'No reviews found for the specified PG.' })
        }
    
        // Calculate total ratings using reduce
        const totalRatings = reviewsForPg.reduce(
          (prevValue, currValue) => {
            prevValue.food += currValue.rating.food
            prevValue.facilities += currValue.rating.facilities
            prevValue.hygienic += currValue.rating.hygienic
            prevValue.safety += currValue.rating.safety
            return prevValue
          },
          {
            food: 0,
            facilities: 0,
            hygienic: 0,
            safety: 0,
          }
        )
    
        const numberOfReviews = reviewsForPg.length
        const averageFoodRating = totalRatings.food / numberOfReviews
        const averageFacilitiesRating = totalRatings.facilities / numberOfReviews
        const averageHygienicRating = totalRatings.hygienic / numberOfReviews
        const averageSafetyRating = totalRatings.safety / numberOfReviews
    
        // Calculate overall average rating (replace with your calculations)
        const overallAverageRating =
          (averageFoodRating + averageFacilitiesRating + averageHygienicRating + averageSafetyRating) / 4
    
        return res.json({
          pgId: pgDetails._id,
          averageFoodRating,
          averageFacilitiesRating,
          averageHygienicRating,
          averageSafetyRating,
          overallAverageRating,
        })
    }catch (error) {
        console.error('Error calculating average rating:', error)
        res.status(404).json(error.message)
    }
}


ratingsAndReviewsControllers.listAllReviewsForPGAdmin = async (req, res) => {
    try{
        const hostId = req.user.id
        const pgDetailsId = req.params.pgDetailsId
        // fetch the pgDetails by using hostId from the token
        const pgDetails = await PgDetails.findOne({host : hostId, _id : pgDetailsId})
        console.log('pgDetails', pgDetails)
        if (!pgDetails) {
            return res.json({ error: 'No PG details found for the host.' })
        }

        //after getting pgDetails then find the reviews for that PG
        const allReviews = await ReviewsAndRatings.find({ pgDetailsId: pgDetails._id }).populate('residentId', 'name')
        res.json(allReviews)
    }catch(e){
        console.error('Error fetching reviews:', e)
        res.status(404).json(e.message)
    }
}

ratingsAndReviewsControllers.listAllReviewsForSelectedPg = async (req, res) => {
    try{
        const pgDetailsId = req.params.pgDetailsId
        console.log("pgDetailsId", pgDetailsId)
        const allReviews = await ReviewsAndRatings.find({ pgDetailsId: pgDetailsId }).populate('residentId', 'name')
        console.log('Retrieved reviews:', allReviews)

        res.json(allReviews)

    }catch(e){
        console.error('Error fetching reviews:', e)
        res.status(404).json(e.message)
    }
}


ratingsAndReviewsControllers.updateReview = async (req, res) => {
    try{
        const reviewId = req.params.reviewId
        const userId = req.user.id

        // Step 1: Find the userId in the Residents model to get the residentId
        const resident = await Residents.findOne({ userId: userId })

        if (!resident) {
            return res.status(403).json({ error: 'You are not authorized to update this review' })
        }

        // Step 2: Check if the reviewId is present in the ReviewsAndRatings model
        const existingReview = await ReviewsAndRatings.findById(reviewId)

        if (!existingReview) {
            return res.status(404).json({ error: 'Review not found' })
        }

        // Step 3: Compare the residentId associated with the review and the residentId obtained from Residents
        if (existingReview.residentId.toString() !== resident._id.toString()) {
            return res.status(403).json({ error: 'You are not authorized to update this review' })
        }

        // Step 4: Update the review if authorized
        const updatedReview = await ReviewsAndRatings.findOneAndUpdate(
            {_id : reviewId },
            req.body,
            { new: true, runValidators: true }
        )

        res.json(updatedReview)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Internal server error' })
    }
}

ratingsAndReviewsControllers.destroyReview = async (req, res) => {
    try{
        const reviewId = req.params.reviewId
        const userId = req.user.id
    
        // Step 1: Find the userId in the Residents model to get the residentId
        const resident = await Residents.findOne({ userId: userId })
    
        if (!resident) {
        return res.status(403).json({ error: 'You are not authorized to delete this review' })
        }
    
        // Step 2: Check if the reviewId is present in the ReviewsAndRatings model
        const reviewToDelete = await ReviewsAndRatings.findById(reviewId)
    
        if (!reviewToDelete) {
            return res.status(404).json({ error: 'Review not found' })
        }
    
        // Step 3: Compare the residentId associated with the review and the residentId obtained from Residents
        if (reviewToDelete.residentId.toString() !== resident._id.toString()) {
            return res.status(403).json({ error: 'You are not authorized to delete this review' })
        }
    
        // Step 4: Retrieve the pgDetailsId associated with the review
        const pgDetailsId = reviewToDelete.pgDetailsId
    
        // Step 5: Check if the pgDetailsId matches the pgDetailsId associated with the resident from Residents
        if (pgDetailsId.toString() !== resident.pgDetailsId.toString()) {
            return res.status(403).json({ error: 'You are not authorized to delete this review for this PG' })
        }
    
        // Step 6: Delete the review and update the references
        const destroyReview = await reviewToDelete.deleteOne()
    
        const pgDetails = await PgDetails.findById(pgDetailsId)
        if (pgDetails) {
            pgDetails.reviews.pull(reviewId)
            await pgDetails.save()
        } else {
            return res.status(404).json({ message: `PG Details not found ${pgDetailsId}.` })
        }
    
        res.json(destroyReview)
     
    }
    catch(e){
        res.status(404).json(e.message)
    }
}
/*
The pull method is used to remove a specific element from an array in a Mongoose document, it's used to remove the reference to the deleted review from the reviews array in the pgDetails document.
pgDetails.reviews.pull(reviewId)
This line of code removes the reviewId from the reviews array in the pgDetails document.

deleteOne() is a Mongoose method that is used to delete a document from the database based on a query. here it is using it to delete the review document with a specific ID.
await reviewToDelete.deleteOne()
This line of code deletes the document represented by the reviewToDelete Mongoose document from the database

The deleteOne() method in Mongoose doesn't take any arguments directly. It's invoked on a Mongoose document to delete that specific document from the database. You call deleteOne() on a document instance, and it doesn't require any additional arguments.

await reviewToDelete.deleteOne()
This line of code will delete the reviewToDelete document from the database.
*/

module.exports = ratingsAndReviewsControllers