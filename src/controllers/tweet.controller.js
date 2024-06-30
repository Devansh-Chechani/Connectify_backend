import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body

    if(!content){
        throw new ApiError(401,"Tweet can't be empty")
    }

    const tweet = await Tweet.create({
       content,
       owner:req.user._id
    })

    if(!tweet){
        throw new ApiError(401,"Tweet not created")
    }

    return res.status(200).json(
        new ApiResponse(201,tweet,"Tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params

    if(!isValidObjectId(userId) ){
        throw new ApiError(401,"Invalid ObjectId")
    }

    const tweets = await Tweet.aggregate([
        {
            $match:{
              owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
          $lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"ownerdetails",
            pipeline:[
               {
                $project:{
                    username:1,
                    avatar:1
                }
               }
               
            ]
          }
        },
        {
            $addFields:{
                ownerdetails:{
                    $first:"$ownerdetails"
                 }
                }
        },
        {
           $lookup:{
             from:"likes",
            localField:"_id",
            foreignField:"tweet",
            as:"tweetLikes",
            pipeline:[
                {
                    $project:{
                        likedBy:1
                    }
                }
            ]
           }
        },
        {
           $addFields:{
             likescount:{
                $size: "$tweetLikes"
             },
             isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$tweetLikes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
           }
           
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project:{
                content:1,
                createdAt:1,
                ownerdetails:1,
                likescount:1,
                isLiked:1
                //tweetLikes:1
            }
        }
       

    ])

     return res.status(200).json(
        new ApiResponse(201,tweets,"All the tweets of a user")
     )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
       const {tweetId} = req.params
       const {content} = req.body

        if(!isValidObjectId(tweetId) ){
        throw new ApiError(401,"Invalid ObjectId")
    }
   
    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(404,"Tweet doesn't exists")
    }

   //  console.log(tweet.owner.toString())
   // console.log(req.user._id)

    if(tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"Unauthorized request,users can update tweets made by them only")
    }
   
  tweet.content = content
  await tweet.save()

   // Different approach to update the tweet
   /* const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            },
        },
        { new: true }
    );

    if (!newTweet) {
        throw new ApiError(500, "Failed to edit tweet please try again");
    }
    */

   return res.status(200).json(
        new ApiResponse(201,tweet,"Tweet updated Successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
     const {tweetId} = req.params

      if(!isValidObjectId(tweetId) ){
        throw new ApiError(401,"Invalid ObjectId")
    }

    const tweet = await Tweet.findById(tweetId)
    // This toString() method was required to make the code run
    if(tweet.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403,"Unauthorized request,users can delete tweets made by them only")
    }

    await Tweet.findByIdAndDelete(tweetId)

    // likes also needed to be deleted of the tweet
    await Like.deleteMany({ tweet: tweetId });


    return res.status(200).json(
        new ApiResponse(201,{},"Tweet deleted Successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
