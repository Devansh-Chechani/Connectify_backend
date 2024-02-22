import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
     
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if (!req.files.thumbnail || !req.files?.videoFile) {
        throw new ApiError(400, "All files are required")
    }
    const videoFileLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path
    

    if (!videoFileLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "All files are required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    console.log(videoFile)

    if (!videoFile || !thumbnail) {
        throw new ApiError(400, "Video or thumbnail is missing")
    }
   

    const createdVideo = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail?.url || "",
        title,
        description,
        duration:videoFile.duration,
        owner: req.user._id
    })

 return res.status(201).json(
        new ApiResponse(200, createdVideo, "Video Uploaded Successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    // let userId = req.body;
    
    // userId = new mongoose.Types.ObjectId(userId)
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    if (!isValidObjectId(req.user?._id)) {
        throw new ApiError(400, "Invalid userId");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    if (!video) {
        throw new ApiError(500, "failed to fetch video");
    }

    // increment views if video fetched successfully
   const user = await User.findById(req.user?._id);

if (user) {
    const videoAlreadyWatched = user.watchHistory.includes(videoId);
    
    if (!videoAlreadyWatched) {
        // If the videoId is not present in the watchHistory, then update the views count
        await Video.findByIdAndUpdate(videoId, {
            $inc: { views: 1 }
        });

        // Optionally, you can also update the watchHistory for the user
        // This assumes watchHistory is a unique list of videoIds
        await User.findByIdAndUpdate(userId, {
            $addToSet: { watchHistory: videoId }
        });
    }
}


    return res
        .status(200)
        .json(
            new ApiResponse(200, video[0], "video details fetched successfully")
        );
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    
     const updateThumbnailLocalPath = req.files?.thumbnail?.path
     const updateParams = req.body

    const video = await Video.findById(videoId)
    if(req.user._id !== video.owner){
        throw new ApiError(400,"Only the owner of the video can edit the video")
    }
        let updateThumbnail;
    if(updateThumbnailLocalPath){
          updateThumbnail = await uploadOnCloudinary(updateThumbnailLocalPath)
    }
     
   
     if (updateParams.title) {
      video.title = updateParams.title;
    }
    if (updateParams.description) {
      video.description = updateParams.description;
    }


    if (updateThumbnail) {
      video.thumbnail = updateParams.thumbnail;
    }

    // Save changes
    await video.save();
    
   
    return res.status(200).json(
        new ApiResponse(201, video ,"Details updated Successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

     if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

     const video =  await Video.findById(videoId)
     if(!video){
        throw new ApiError(404,"Video not found")
     }
  
    if(req.user._id.toString() !== video.owner.toString()){
        throw new ApiError(400,"Only the owner of the video can delete the video")
    }

      await Video.findByIdAndDelete(videoId)

        return res.status(201).json(
            new ApiResponse(201,{},"Video deleted Successfully")    
        )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
     
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"Video not found!")
    }
 
    if(req.user?._id.toString() !== video?.owner.toString()){
        throw new ApiError(400,"Only the owner of the video can toggle the publish status the video")
    }

     video.isPublished = !video.isPublished;
   
   //  save the the changes
     await video.save()

     return res.status(200).json(
        new ApiResponse(201,video.isPublished,"Video publish toggled successfully")
     )
     

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
