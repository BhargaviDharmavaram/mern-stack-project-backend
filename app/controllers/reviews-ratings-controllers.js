const ReviewsAndRatings = require('../models/reviews-ratings-model')
const Residents = require('../models/resident-model')
const PgDetails = require('../models/pg-details-model')


const ratingsAndReviewsControllers = {}

ratingsAndReviewsControllers.addReview = async (req, res) => {
    try {
        const userId = req.user.id
        const body = req.body
    
        // Fetch the resident based on the user ID
        const resident = await Residents.findOne({ userId: userId })
        console.log('resident', resident)
        if (!resident) {
          return res.status(404).json({ error: 'Resident not found' })
        }
    
        // Fetch the PG details where the resident is staying
        const pgDetails = await PgDetails.findById(resident.pgDetailsId)
        console.log('pgDetails', pgDetails)
        if (!pgDetails) {
          return res.status(404).json({ error: 'PG details not found' })
        }
    
        // Create a new review
        const newReview = new ReviewsAndRatings({
            ...body,
            pgDetailsId: pgDetails._id,
            residentId: resident._id,
        })
    
        await newReview.save()
    
        // Add the review to PG details' reviews array
        pgDetails.reviews.push(newReview)
        await pgDetails.save()
    
        res.status(201).json({
          message: 'Review added successfully',
          review: {
            ...newReview.toObject(),
            residentName: resident.name,
          },
        })
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
      }
}


ratingsAndReviewsControllers.averageRating = async (req, res) => {
    try {
        const hostId = req.user.id // hostId is obtained from the authenticated user's token
    
        // Fetch the PG details based on the host's ID
        const pgDetails = await PgDetails.findOne({ host : hostId })
    
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


ratingsAndReviewsControllers.listAllReviews = async (req, res) => {
  try {
    const pgId = req.params.pgId
    console.log('Requested pgId:', pgId)

    const allReviews = await ReviewsAndRatings.find({ pgDetailsId: pgId })
    console.log('Retrieved reviews:', allReviews)

    if (!allReviews || allReviews.length === 0) {
      return res.status(404).json({ message: 'No reviews found for this PG' })
    }
    res.json(allReviews)
  } catch (e) {
    console.error('Error fetching reviews:', e)
    res.status(404).json(e.message)
  }
}

ratingsAndReviewsControllers.updateReview = async (req, res) => {
    try {
        const reviewId  = req.params.reviewId 
        const body = req.body
  
        if (!reviewId) {
            return res.status(404).json({ error: 'Review not found' })
        }
  
        const updatedReview = await ReviewsAndRatings.findByIdAndUpdate(reviewId,body, {new : true, runValidators :   true})
  
        res.json({ message: 'Review updated successfully', updatedReview: updatedReview})
    } 
    catch (e) 
    {
        res.status(404).json(e.message)
    }
}

ratingsAndReviewsControllers.destroyReview = async (req, res) => {
    try{
        const reviewId = req.params.reviewId

        // Find the review by ID and get its associated pgDetailsId
        const reviewToDelete = await ReviewsAndRatings.findById(reviewId)
        if (!reviewToDelete) {
            return res.status(404).json({ error: 'Review not found' })
        }
        const pgDetailsId = reviewToDelete.pgDetailsId

        // Delete the review
        const destroyReview = await reviewToDelete.deleteOne()

        // Remove the reference to the deleted review from pgDetails
        const pgDetails = await PgDetails.findById(pgDetailsId)
        if (pgDetails) {
            pgDetails.reviews.pull(reviewId)
            await pgDetails.save()
        }else{
            return res.status(404).json({ message: `PG Details not found ${pgDetailsId}.` })
        }
        res.json({ message: 'Review deleted successfully' , destroyReview : destroyReview})
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