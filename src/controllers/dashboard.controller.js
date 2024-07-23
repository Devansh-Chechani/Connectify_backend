import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
       const videos = await Video.find({owner:req.user?._id})
       const subscribers = await Subscription.find({channel:req.user._id})
       const likes = await Like.find({likedBy:req.user._id})
       let views = 0;
       videos.map((video)=>{
         views+= video.views
       })
   
       const dashboard = {
         totalVideos:videos.length,
         totalSubscribers: subscribers.length,
         totalLikes:likes.length,
         totalViews: views
       }

       res.status(200).json(
        new ApiResponse(201,dashboard,"Stats of the channel")
       )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    if (!req.user) {
        throw new ApiError(404, "Not found! You need to sign in");
    }

    const videos = await Video.aggregate([
        {
            $match: {
                owner: req.user._id
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likesDetails"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                userDetails: {
                    $first: "$userDetails"
                },
                likesCount: {
                    $size: "$likesDetails"
                },
                day: {
                    $dayOfMonth: "$createdAt"
                },
                month: {
                    $month: "$createdAt"
                },
                year: {
                    $year: "$createdAt"
                }
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                duration: 1,
                views: 1,
                thumbnail: 1,
                createdAt: 1,
                isPublished: 1,
                userDetails: 1,
                likesCount: 1,
                day: 1,
                month: 1,
                year: 1
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);

    res.status(200).json(
        new ApiResponse(201, videos, "Stats of the channel")
    );
});

export {
    getChannelStats,
    getChannelVideos
};
