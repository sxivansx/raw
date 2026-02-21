import mongoose from "mongoose";

const { Schema } = mongoose;

const NoteSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 10000,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

NoteSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.models.Note || mongoose.model("Note", NoteSchema);
