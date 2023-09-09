const authorizeUser = (req,res,next)=>{
    console.log('request', req.user)
    //console.log('permittedRoles',req.permittedRoles) // permittedRoles [ 'pg_admin' ]
    if(req.permittedRoles.includes(req.user.role)){
        next()
    }
    else{
        res.status(403).json({
            errors:"Access denied"
        })
    }
}
module.exports = authorizeUser