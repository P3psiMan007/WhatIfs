import ffmpegPathImport from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

export const ffmpegPath = process.env.FFMPEG_PATH || ffmpegPathImport;
export const ffprobePath = process.env.FFPROBE_PATH || ffprobeStatic.path;
