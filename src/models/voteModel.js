import mongoose from "mongoose"
const voteSchema=new mongoose.Schema(
    {
        userId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        commentId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Comment",
            required:true,
        },
        value:{
            type:Number,
            enum:[-1,1],
            required:true,

        }
    },
    {timestamps:true}
)

voteSchema.index({userId:1,commentId:1},{unique:true})

export default mongoose.models.Vote || mongoose.model("Vote", voteSchema);