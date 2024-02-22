import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const {name, description} = req.body
     
    if(!name){
        throw new ApiError(401,"Name of the playlist is required")
    }
     const videos = []

    const playlist  = await Playlist.create({
         name,
         description,
         videos,
        owner:req.user._id
    })

    if(!playlist){
        throw new ApiError(401,"Playlist not created! Please try again")
    }
   
    return res.status(200).json(
    new ApiResponse(201,playlist,"playlist created successfully")
    )
  
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

     if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1
            }
        }
    ]);

    return res
    .status(200)
    .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

       if(!isValidObjectId(playlistId)){
        throw new ApiError(401,"Invalid playlistId")
       }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    const playlistVideos = await Playlist.aggregate([
       {
         $match:{
            _id: new mongoose.Types.ObjectId(playlistId)
         }
       },
       {
         $lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"owner",
            pipeline:[
                {
                    $project:{
                        fullName:1,
                        username:1
                    }
                }
            ]
         }
       },
       {
          $addFields:{
            owner:{
                $first:"$owner"
            },
            totalVideos:{
                $size:"$videos"
            }
          }
       },
      
       {
         $lookup:{
             from:"videos",
            localField:"videos",
            foreignField:"_id",
            as:"videos",
            pipeline:[
                {
                    $project:{
                        title:1,
                        description:1,
                        views:1,
                        createdAt:1
                    }
                }
            ]
         }
       }
    ]);
    
    return res.status(200).json(
        new ApiResponse(201,playlistVideos,"This is the playlist")
    )

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    try{
        const {playlistId, videoId} = req.params
    //console.log(videoId)
      if(!isValidObjectId(playlistId)){
        throw new ApiError(401,"Invalid playlistId")
      }
      
       if(!isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid videoId")
      }

      const playlist = await Playlist.findById(playlistId);
       const video = await Video.findById(videoId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if (!video) {
        throw new ApiError(404, "video not found");
    }

      
       if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"Unauthorized request,only the owner can remove video from the playlist")
        }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
           
             $push: { 
                videos: videoId
             }
        }, 
        {
             new: true 
        }
  );

        // Check if the playlist exists
        if (!updatedPlaylist) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

    return res.status(200).json(
        new ApiResponse(201,updatedPlaylist,"Video added to the playlist successfully")
    )

    }
    catch(err){
       console.log(err.message)
    }
    
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
        if(!isValidObjectId(playlistId)){
            throw new ApiError(401,"Invalid playlistId")
        }
        
        if(!isValidObjectId(videoId)){
            throw new ApiError(401,"Invalid videoId")
        }

          const playlist = await Playlist.findById(playlistId)

        if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"Unauthorized request,only the owner can remove video from the playlist")
        }

      const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
              $pull: {
                   videos: videoId 
                }     
        },
        { 
            new: true 
        }
    );  


    //   const updatedPlaylist = await Playlist.findByIdAndUpdate(
    //     playlistId,
    //     {
    //         $pull: {
    //             videos: videoId,
    //         },
    //     },
    //     { new: true }
    // );

        // Check if the playlist exists
        if (!updatedPlaylist) {
            throw new ApiError(201,{},"Video not removed from playlist not found")
        }
        
        res.status(200).json(
         new ApiResponse(201,updatedPlaylist,"Video removed from the playlist successfully")
      );

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

     if(!isValidObjectId(playlistId)){
            throw new ApiError(401,"Invalid playlistId")
      }

       const playlist = await Playlist.findById(playlistId)

        if(playlist.owner.toString() !== req.user._id.toString()){
             throw new ApiError(403,"Unauthorized request,only the owner can remove video from the playlist")
        }

   const deletePlaylist = await Playlist.findByIdAndDelete(playlistId)
    if(!deletePlaylist){
        throw new ApiError(401,"Playlist not deleted ")
    }

    res.status(200).json(
        new ApiResponse(201,{},"Playlist deleted successfully")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    
         const playlist = await Playlist.findById(playlistId)
         if(!playlist){
            throw new APiError(404,"Not Found!,playlist doesn't exists")
         }

        if(playlist.owner.toString() !== req.user._id.toString()){
             throw new ApiError(403,"Unauthorized request,only the owner can remove video from the playlist")
        }
    
    if (!name || !description) {
        throw new ApiError(400, "Details are required to update the playlist!")
    }

    playlist.name = name
    playlist.description = description
    await playlist.save()

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist Updated Successfully"))

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
