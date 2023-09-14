const mongoose = require('mongoose')

const configureDB = async () => {
    try{
        const db = await mongoose.connect('mongodb://127.0.0.1:27017/portfolio-project')
        //const db = await mongoose.connect('mongodb+srv://dharamavarambhargavi:Riya2022@cluster0.h8cxm1q.mongodb.net/?retryWrites=true&w=majority')
        console.log('connecting to db')
    }catch(e){
        console.log('error connecting to db')
    }
}
module.exports = configureDB


//mongodb+srv://dharamavarambhargavi:Riya2022@cluster0.h8cxm1q.mongodb.net/?retryWrites=true&w=majority