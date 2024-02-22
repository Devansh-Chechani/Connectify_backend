import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
   //  console.log(channelId)
      if(!isValidObjectId(channelId)){
          throw new ApiError (402,"channelId id not valid!")
       }
       const channel = await User.findById(channelId)
      
       const existedSubscriber =  await Subscription.findOne({ channel: channelId, subscriber: req.user?._id });
       
       if(!existedSubscriber){
          const subscribe =  await Subscription.create({
              subscriber:req.user._id,
              channel: channelId
           })
       }
       else{
          await Subscription.findOneAndDelete({ channel: channelId, subscriber: req.user._id });
       }
     
       res.status(200).json(
        {message : "Subscription successfully "}
       )
      
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    
    let {channelId} = req.params


    channelId = new mongoose.Types.ObjectId(channelId)

   const userSubscribers =  await Subscription.aggregate([
          {
            $match: {
                channel: channelId,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber",
                        },
                    },
                    {
                        $addFields: {
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [
                                            channelId,
                                            "$subscribedToSubscriber.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                            subscribersCount: {
                                $size: "$subscribedToSubscriber",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscriber",
        },
        {
            $project: {
                _id: 0,
                subscriber: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                    subscribedToSubscriber: 1,
                    subscribersCount: 1,
                },
            },
        },
    ])

    res.status(200).json(
        new ApiResponse(201,{userSubscribers},"Subscribers of a channel")
    )

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
       const {subscriberId} = req.params
        
       const subscribedChannels= await Subscription.aggregate([
           {
               $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
             },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline:[
                    {
                        $project:{
                           username:1,
                           avatar:1,
                           coverImage:1,
                           fullName:1
                        }
                    }
                ]
            },
        },
        {
            $addFields:{
                subscribedChannel:{
                    $first:"$subscribedChannel"
                }
            }
        },
        {
            $project:{
                _id:0,
                subscribedChannel:1
               
            }
        }
       ])
       
      // console.log(count)
       res.status(200).json(
        new ApiResponse(201,{subscribedChannels},"SubscribedTo channels")
    )
        
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}