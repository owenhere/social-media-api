import catchAsyncError from "../../../../helpers/catchAsyncError.js";
import ErrorHandler from "../../../../helpers/errorHandler.js";
import models from "../../../../models/index.js";
import ResponseMessages from "../../../../contants/responseMessages.js";
import utility from "../../../../utils/utility.js";
import { sendNotification } from "../../../../firebase/index.js";

/// FOLLOW/UNFOLLOW USER ///

const followUnfollowUser = catchAsyncError(async (req, res, next) => {
  if (!req.query.id) {
    return next(new ErrorHandler(ResponseMessages.INVALID_QUERY_PARAMETERS, 400));
  }

  if (req.query.id.toString() === req.user._id.toString()) {
    return next(new ErrorHandler(ResponseMessages.CANNOT_FOLLOW_YOURSELF, 400));
  }

  const userToFollow = await models.User.findById(req.query.id)
    .select("_id followersCount followingCount isPrivate");

  const user = await models.User.findById(req.user._id)
    .select("_id followersCount followingCount isPrivate");

  if (!userToFollow) {
    return next(new ErrorHandler(ResponseMessages.USER_NOT_FOUND, 404));
  }

  const isFollowing = await models.Follower
    .findOne({ user: userToFollow._id, follower: user._id }).select("_id");

  if (isFollowing) {
    await models.Follower.findByIdAndDelete(isFollowing._id);

    userToFollow.followersCount -= 1;
    user.followingCount -= 1;

    await userToFollow.save();
    await user.save();

    res.status(200).json({
      success: true,
      message: ResponseMessages.UNFOLLOWED_USER,
    });
  } else {
    if (userToFollow.isPrivate) {
      const followRequest = await models.FollowRequest
        .findOne({ from: user._id, to: userToFollow._id }).select("_id");

      if (followRequest) {
        return next(new ErrorHandler(ResponseMessages.FOLLOW_REQUEST_ALREADY_SENT, 400));
      }

      await models.FollowRequest.create({
        to: userToFollow._id,
        from: user._id,
      });

      const notification = await models.Notification.findOne({
        to: userToFollow._id,
        from: user._id,
        type: "followRequest",
      });

      if (notification) {
        notification.createdAt = Date.now();
        notification.isRead = false;
        await notification.save();
      }
      else {
        await models.Notification.create({
          to: userToFollow._id,
          from: user._id,
          body: "sent you a follow request",
          type: "followRequest",
        });
      }

      const notificationData = await utility.getNotificationData(notification._id, req.user);

      const fcmToken = await models.User.findOne(
        { _id: userToFollow._id },
        { fcmToken: 1 }
      );

      if (fcmToken.fcmToken) {
        await sendNotification(
          fcmToken.fcmToken,
          {
            title: "New Follow Request",
            body: `${notificationData.from.uname} sent you a follow request.`,
            type: "Follow Requests",
            image: notificationData.from.avatar.url,
          }
        );
      }

      res.status(200).json({
        success: true,
        message: ResponseMessages.FOLLOW_REQUEST_SENT,
      });
    } else {
      await models.Follower.create({
        user: userToFollow._id,
        follower: user._id,
      });

      userToFollow.followersCount += 1;
      user.followingCount += 1;

      await userToFollow.save();
      await user.save();

      const notification = await models.Notification.findOne({
        to: userToFollow._id,
        from: user._id,
        type: "follow",
      });

      if (notification) {
        notification.createdAt = Date.now();
        notification.isRead = false;
        await notification.save();
      }
      else {
        await models.Notification.create({
          to: userToFollow._id,
          from: user._id,
          body: "started following you",
          type: "follow",
        });
      }

      const notificationData = await utility.getNotificationData(notification._id, req.user);

      const fcmToken = await models.User.findOne(
        { _id: userToFollow._id },
        { fcmToken: 1 }
      );

      if (fcmToken.fcmToken) {
        await sendNotification(
          fcmToken.fcmToken,
          {
            title: "New Follower",
            body: `${notificationData.from.uname} started following you.`,
            type: "Followers",
            image: notificationData.from.avatar.url,
          }
        );
      }

      res.status(200).json({
        success: true,
        message: ResponseMessages.FOLLOWED_USER,
      });
    }
  }
});

export default followUnfollowUser;
