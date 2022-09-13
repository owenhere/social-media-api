import ResponseMessages from "../../../../contants/responseMessages.js";
import catchAsyncError from "../../../../helpers/catchAsyncError.js";
import ErrorHandler from "../../../../helpers/errorHandler.js";
import models from "../../../../models/index.js";
import utility from "../../../../utils/utility.js";

const getLikedUsers = catchAsyncError(async (req, res, next) => {
    if (!req.query.id) {
        return next(new ErrorHandler(ResponseMessages.INVALID_QUERY_PARAMETERS, 400));
    }

    const post = await models.Post.findById(req.query.id).select("_id likes");

    if (!post) {
        return next(new ErrorHandler(ResponseMessages.POST_NOT_FOUND, 404));
    }

    const postLikes = post.likes;

    let currentPage = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    let totalLikes = postLikes.length;
    let totalPages = Math.ceil(totalLikes / limit);

    if (currentPage < 1) {
        currentPage = 1;
    }

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    let skip = (currentPage - 1) * limit;

    let prevPageIndex = null;
    let hasPrevPage = false;
    let prevPage = null;
    let nextPageIndex = null;
    let hasNextPage = false;
    let nextPage = null;

    if (currentPage < totalPages) {
        nextPageIndex = currentPage + 1;
        hasNextPage = true;
    }

    if (currentPage > 1) {
        prevPageIndex = currentPage - 1;
        hasPrevPage = true;
    }

    const baseUrl = `${req.protocol}://${req.get("host")}${req.originalUrl
        }`.split("?")[0];

    if (hasPrevPage) {
        prevPage = `${baseUrl}?page=${prevPageIndex}&limit=${limit}`;
    }

    if (hasNextPage) {
        nextPage = `${baseUrl}?page=${nextPageIndex}&limit=${limit}`;
    }

    const slicedPostLikers = postLikes.slice(skip, skip + limit);

    slicedPostLikers.sort((a, b) => {
        return new Date(b.likedAt) - new Date(a.likedAt);
    });

    const results = [];

    for (let i = 0; i < slicedPostLikers.length; i++) {
        const postLiker = slicedPostLikers[i];
        const postLikerData = await utility.getUserData(postLiker.likedBy, req.user);

        results.push({
            _id: postLiker._id,
            likedBy: postLikerData,
            likedAt: postLiker.likedAt,
        });
    }

    res.status(200).json({
        success: true,
        currentPage,
        totalPages,
        limit,
        hasPrevPage,
        prevPage,
        hasNextPage,
        nextPage,
        results,
    });
});

export default getLikedUsers;
