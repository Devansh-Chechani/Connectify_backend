import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

// get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    console.log(userId);
    const pipeline = [];

    // for using Full Text based search u need to create a search index in mongoDB atlas
    // you can include field mapppings in search index eg.title, description, as well
    // Field mappings specify which fields within your documents should be indexed for text search.
    // this helps in seraching only in title, desc providing faster search results
    // here the name of search index is 'search-videos'
    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"] //search only on title, desc
                }
            }
        });
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    // fetch videos only that are set isPublished as true
    pipeline.push({ $match: { isPublished: true } });

    //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Videos fetched successfully"));
});



const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    console.log(title)
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
                            avatar: 1,
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
                videoFile: 1,
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
        await User.findByIdAndUpdate(req.user._id, {
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
    if(req.user._id.toString() !== video.owner.toString()){
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
      await Like.deleteMany({ video: videoId });

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

const getUserVideos = asyncHandler(async (req, res) => {
    const { username } = req.params
     
     
    

})


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getUserVideos
}
