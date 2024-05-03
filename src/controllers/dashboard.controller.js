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
    throw new ApiError(404, "Not found! You need to signin");
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
          foreignField: "video",
          localField: "_id",
          as: "likesDetails"
       }
    },
    {
        $addFields: {
            likesCount: {
                $size: "$likesDetails"
            },
            createdAt: {
                $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt"
                }
            },
            day: {
                $toInt: { $substr: ["$createdAt", 8, 2] }
            },
            month: {
                $toInt: { $substr: ["$createdAt", 5, 2] }
            },
            year: {
                $toInt: { $substr: ["$createdAt", 0, 4] }
            }
        }
    }
]);

res.status(200).json(
    new ApiResponse(201, videos, "Stats of the channel")
);

})

export {
    getChannelStats, 
    getChannelVideos
    }
