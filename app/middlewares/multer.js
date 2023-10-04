// const multer = require('multer')
// const path = require('path')
// const {v4 : uuidv4} = require('uuid')

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//       cb(null, 'public/images')
//     },
//     filename: (req, file, cb) => {
//       cb(null,uuidv4() + '-' + Date.now() + path.extname(file.originalname))
//     }
// })
  
// //const upload = multer({ storage: storage })
// const fileFilter = (req, file, cb) => {
//     const allowedFileTypes = ['image/png', 'image/jpeg','image/jpg']
//     if(allowedFileTypes.includes(file.mimetype)){
//         cb(null,true)
//     }else{
//         cb(null, false)
//     }
// }
// const upload = multer({storage, fileFilter})

// module.exports = upload

const multer = require('multer')
const multerS3 = require('multer-s3')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const {S3} = require('@aws-sdk/client-s3')
const s3Client = require('../../AWS/aws-config') // Import the AWS SDK v3 S3 client from aws.config.js

// Create an S3 bucket or use an existing one
const bucketName = 'mernstackproject'

// Create a Multer-S3 storage instance
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: bucketName, // Replace with your S3 bucket name
    acl: 'public-read', // Set the appropriate ACL (Access Control List)
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname)
      const filename = uuidv4() + ext
      cb(null, 'public/images/' + filename) // Specify your desired S3 path
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedFileTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(null, false)
    }
  },
})
module.exports = upload