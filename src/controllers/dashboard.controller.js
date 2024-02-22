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
   
       const stats = {
          videos,
          subscribers,
          likes
       }

       res.status(200).json(
        new ApiResponse(201,stats,"Stats of the channel")
       )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    if(!req.user){
       throw new ApiError(404,"Not found! You need to signin")
    }
   const allVideos = await Video.find({owner:req.user?._id})
   
       res.status(200).json(
        new ApiResponse(
            201,allVideos,"All the videos of the channel"
        )
       )
})

export {
    getChannelStats, 
    getChannelVideos
    }