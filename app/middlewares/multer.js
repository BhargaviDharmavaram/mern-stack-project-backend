const multer = require('multer')
const path = require('path')
const {v4 : uuidv4} = require('uuid')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/images')
    },
    filename: (req, file, cb) => {
      cb(null,uuidv4() + '-' + Date.now() + path.extname(file.originalname))
    }
})
  
//const upload = multer({ storage: storage })
const fileFilter = (req, file, cb) => {
    const allowedFileTypes = ['image/png', 'image/jpeg','image/jpg']
    if(allowedFileTypes.includes(file.mimetype)){
        cb(null,true)
    }else{
        cb(null, false)
    }
}
const upload = multer({storage, fileFilter})

module.exports = upload