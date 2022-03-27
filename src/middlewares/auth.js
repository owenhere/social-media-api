import jwt from "jsonwebtoken";
import ErrorHandler from "../helpers/errorHandler.js";
import catchAsyncError from "../helpers/catchAsyncError.js";
import User from "../modules/user/models/user.js";


export const isAuthenticatedUser = catchAsyncError(async (req, res, next) => {

    const bearerHeader = req.headers['authorization'];

    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];

        const token = bearerToken;

        if (!token) {
            return next(new ErrorHandler("Please login to account.", 400));
        }

        const userData = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(userData.id);

        next();
    }
    else {
        return next(new ErrorHandler("Auth token not found in headers.", 400));
    }

})


// AUthorize Roles
export function authorizeRoles(...roles) {

    return (req, res, next) => {

        if (!roles.includes(req.user.role)) {
            return next(new ErrorHandler(`User is not allowed to access this resource.`, 403));
        }

        next();

    }

}