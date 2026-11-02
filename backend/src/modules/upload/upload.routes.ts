import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';
import { uploadToCloudinary, uploadVideoToCloudinary } from '../../config/cloudinary';
import { User } from '../../models/User';

const router = Router();

/**
 * POST /api/v1/upload/avatar
 * Uploads user profile avatar to Cloudinary & saves to User profile
 */
router.post('/avatar', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { image } = req.body;
    const userId = req.user?.id;

    if (!image || typeof image !== 'string') {
      res.status(400).json({ success: false, message: 'Image base64 data is required.' });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { url } = await uploadToCloudinary(image, 'peerbridge/avatars');

    // Update user profile avatar in MongoDB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: url },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      res.status(401).json({
        success: false,
        message: 'Account not found or session expired. Please log in or register again.'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Profile image uploaded successfully to Cloudinary',
      data: {
        url,
        user: updatedUser
      }
    });
  } catch (error: any) {
    console.error('[Upload Avatar Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload profile image to Cloudinary'
    });
  }
});

/**
 * POST /api/v1/upload/project-image
 * Uploads project preview thumbnail to Cloudinary
 */
router.post('/project-image', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== 'string') {
      res.status(400).json({ success: false, message: 'Image base64 data is required.' });
      return;
    }

    const { url } = await uploadToCloudinary(image, 'peerbridge/projects');

    res.json({
      success: true,
      message: 'Project image uploaded successfully to Cloudinary',
      data: { url }
    });
  } catch (error: any) {
    console.error('[Upload Project Image Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload project image to Cloudinary'
    });
  }
});

/**
 * POST /api/v1/upload/image
 * Generic Cloudinary image uploader
 */
router.post('/image', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { image, folder } = req.body;

    if (!image || typeof image !== 'string') {
      res.status(400).json({ success: false, message: 'Image base64 data is required.' });
      return;
    }

    const { url } = await uploadToCloudinary(image, folder || 'peerbridge/general');

    res.json({
      success: true,
      message: 'Image uploaded successfully to Cloudinary',
      data: { url }
    });
  } catch (error: any) {
    console.error('[Upload Image Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image to Cloudinary'
    });
  }
});

/**
 * POST /api/v1/upload/video
 * Video uploader enforcing strict 10MB limit (for Chat media and Academic Post videos)
 */
router.post('/video', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { video, folder, fileSize } = req.body;

    if (!video || typeof video !== 'string') {
      res.status(400).json({ success: false, message: 'Video base64 data is required.' });
      return;
    }

    // 10MB limit enforcement: 10 * 1024 * 1024 = 10,485,760 bytes
    const MAX_VIDEO_BYTES = 10 * 1024 * 1024;
    // Base64 string length to approximate byte size: (length * 3) / 4
    const approxBytes = Math.round((video.length * 3) / 4);

    if ((fileSize && fileSize > MAX_VIDEO_BYTES) || approxBytes > MAX_VIDEO_BYTES * 1.35) {
      res.status(400).json({
        success: false,
        message: 'Video file size exceeds the maximum limit of 10MB. Please choose a smaller video clip.'
      });
      return;
    }

    const { url, duration, thumbnail } = await uploadVideoToCloudinary(
      video,
      folder || 'peerbridge/videos'
    );

    res.json({
      success: true,
      message: 'Video uploaded successfully to Cloudinary',
      data: {
        url,
        duration,
        thumbnail
      }
    });
  } catch (error: any) {
    console.error('[Upload Video Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload video to Cloudinary'
    });
  }
});

export default router;
