import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

// TODO: Toggle like on video
const existingLike = await Like.findOne({ video: videoId });

if (existingLike) {
    if (existingLike.likedBy.toString() !== req.user._id.toString()) {
        throw new ApiError(401, "Video can be unliked only by those who have liked the video");
    } else {
        await existingLike.remove();
        return res.status(200).json(new ApiResponse(200, {}, "Unliked the video"));
    }
} else {
    const newLike = await Like.create({
        video: videoId, // Assuming videoId is a valid ObjectId
        likedBy: req.user._id
    });
    return res.status(201).json(new ApiResponse(201, newLike, "Liked the video"));
}

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(401,"Invalid commentId")
     }

     const comment = await Like.find({comment : commentId})
     
    if(comment.length > 0){
        await Like.findByIdAndDelete(comment[0]._id)
       
       res.status(200).json(
         new ApiResponse(201,{},"Unliked the comment")
       )
    }
    else{
        const likedComment = await Like.create({
        comment: commentId,
        likedBy:req.user._id,
        
    })
       return res.status(200).json(
            new ApiResponse(201,likedComment,"Liked the comment")
        )

    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
     if(!isValidObjectId(tweetId)){
        throw new ApiError(401,"Invalid tweetId")
     }

     const tweet = await Like.find({tweet:tweetId})
     // console.log(tweet) tweet is an array
    if(tweet.length > 0){
        await Like.findByIdAndDelete(tweet[0]._id)
       
       res.status(200).json(
         new ApiResponse(201,{},"Unliked the tweet")
       )
    }
    else{
       const likedTweet = await Like.create({
        tweet:tweetId,
        likedBy:req.user._id,
        
    })
       return res.status(200).json(
            new ApiResponse(201,likedTweet,"Liked the tweet")
        )

    }

}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const videos = await Like.aggregate([
        {
          $match:{
             likedBy : new mongoose.Types.ObjectId(req.user?._id)
          }
        },
         {
            $lookup :{
                from:"videos",
                localField : "video",
                foreignField: "_id",
                as : "likedVideos",
                pipeline:[
                    {
                         $project:{
                             videoFile:1,
                            thumbnail:1,
                            title:1,
                            description:1,
                            views:1,
                            owner:1,
                            duration:1
                        }
                    }
                ]
            }
         },
         {
           $lookup:{
                from:"users",
                localField : "likedBy",
                foreignField: "_id",
                as : "ownerDetails",
                 pipeline:[
                    {
                         $project:{
                            _id:1,
                           username:1
                        }
                    }
                ]
           }
         },
         {
            $addFields:{
                ownerDetails : {
                    $first: "$ownerDetails"
                },
                likedVideos : {
                    $first: "$likedVideos"
                }
            }
         },
         {
           $project:{
              likedVideos:1,
              ownerDetails:1
           }
         }
    ])



    res.status(200).json(
         new ApiResponse(201,videos,"Liked videos")
       )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
