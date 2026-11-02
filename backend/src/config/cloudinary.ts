import { v2 as cloudinary } from 'cloudinary';
import { ENV } from './env';

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload an image (base64 string or data URI) to Cloudinary
 * @param imageBase64 Base64 string or data URI (e.g. data:image/jpeg;base64,...)
 * @param folder Cloudinary folder name (e.g. 'peerbridge/avatars', 'peerbridge/projects')
 */
export const uploadToCloudinary = async (
  imageBase64: string,
  folder: string = 'peerbridge'
): Promise<{ url: string; publicId: string }> => {
  try {
    const formattedData = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const isAvatar = folder.includes('avatar');
    const transformation = isAvatar
      ? [
          { width: 500, height: 500, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      : [
          { width: 1200, height: 675, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ];

    const result = await cloudinary.uploader.upload(formattedData, {
      folder,
      resource_type: 'image',
      transformation
    });

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error: any) {
    console.error('[Cloudinary Upload Error]:', error);
    throw new Error(error.message || 'Cloudinary upload failed');
  }
};

/**
 * Upload a video (base64 string or data URI) to Cloudinary (Max 10MB)
 * @param videoData Base64 string or data URI (e.g. data:video/mp4;base64,...)
 * @param folder Cloudinary folder name (e.g. 'peerbridge/videos')
 */
export const uploadVideoToCloudinary = async (
  videoData: string,
  folder: string = 'peerbridge/videos'
): Promise<{ url: string; publicId: string; duration?: number; thumbnail?: string }> => {
  try {
    const formattedData = videoData.startsWith('data:')
      ? videoData
      : `data:video/mp4;base64,${videoData}`;

    const result = await cloudinary.uploader.upload(formattedData, {
      folder,
      resource_type: 'video',
      chunk_size: 6000000
    });

    const thumbnail = result.secure_url
      ? result.secure_url.replace(/\.[^/.]+$/, '.jpg')
      : undefined;

    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      thumbnail
    };
  } catch (error: any) {
    console.error('[Cloudinary Video Upload Error]:', error);
    throw new Error(error.message || 'Cloudinary video upload failed');
  }
};

export default cloudinary;

