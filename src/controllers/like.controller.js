import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

// TODO: Toggle like on video
  if(!isValidObjectId(videoId)){
     throw new ApiError(401,"Invalid videoId")
  }

  const existingLike = await Like.findOne({ video: videoId ,likedby:req.user?._id});

if (existingLike) {
       await Like.findByIdAndDelete(existingLike?._id);
        return res.status(200).json(new ApiResponse(200, {}, "Unliked the video"));
    }
 else {
        const newLike = await Like.create({
            video: videoId, 
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

     const comment = await Like.findOne({comment : commentId,likedby:req.user?._id})
     
       if(comment){
          await Like.findByIdAndDelete(comment?._id);
       
       res.status(200).json(
         new ApiResponse(201,{isLiked:false},"Unliked the comment")
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

     const tweet = await Like.findOne({tweet:tweetId,likedby:req.user?._id})
     // console.log(tweet) tweet is an array
    if(tweet){
        await Like.findByIdAndDelete(tweet?._id);
       
       res.status(200).json(
         new ApiResponse(201,{isLiked:false},"Unliked the tweet")
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
  const likedVideosAggegate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
       
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideo",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        avatar: 1,
                    },
                },
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideosAggegate,
                "liked videos fetched successfully"
            )
        );
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
