import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { supabase } from '../server';
import { validateRequest } from '../middleware/validation';
import { generateTokens, verifyToken } from '../utils/auth';
import { ApiResponse } from '../../shared-types/src/index';
import { z } from 'zod';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

router.post(
  '/register',
  validateRequest(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.listUsers({
        email,
      });
      if (existingUser?.length && existingUser[0]?.email === email) {
        return res
          .status(400)
          .json({ success: false, error: 'User already exists' } as ApiResponse<null>);
      }

      // Create user in Supabase Auth
      const {
        data: { user },
        error,
      } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Automatically confirm email (we can change to false and implement verification)
        user_metadata: { name },
      });

      if (error) throw error;

      // Create user in our public schema (optional, but we can store additional info)
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name as string | null,
          emailVerified: user.email_confirmed_at ? new Date(user.email_confirmed_at) : null,
        },
      });

      // Generate tokens for immediate login
      const accessToken = generateTokens({ userId: user.id }).accessToken;
      const refreshToken = generateTokens({ userId: user.id }).refreshToken;

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name,
          },
          accessToken,
          refreshToken,
        },
      } as ApiResponse<{ user: any; accessToken: string; refreshToken: string }>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return tokens
 * @access  Public
 */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post(
  '/login',
  validateRequest(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // Authenticate with Supabase
      const {
        data: { user, session },
        error,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!user) {
        return res
          .status(401)
          .json({ success: false, error: 'Invalid credentials' } as ApiResponse<null>);
      }

      // Update last login time in our public schema (optional)
      await prisma.user.update({
        where: { id: user.id },
        data: {},
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name,
          },
          accessToken: session?.access_token,
          refreshToken: session?.refresh_token,
        },
      } as ApiResponse<{ user: any; accessToken: string; refreshToken: string }>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate session)
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Supabase handles logout by removing the session
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      res.status(200).json({ success: true, data: null } as ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

router.post(
  '/refresh-token',
  validateRequest(refreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token and generate new tokens
      // Note: We are using our own JWT for simplicity, but we can also use Supabase's refresh token.
      // For this example, we'll use our own token system.
      const payload = verifyToken(refreshToken);
      if (!payload) {
        return res
          .status(401)
          .json({ success: false, error: 'Invalid refresh token' } as ApiResponse<null>);
      }

      const newAccessToken = generateTokens({ userId: payload.userId }).accessToken;
      const newRefreshToken = generateTokens({ userId: payload.userId }).refreshToken;

      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      } as ApiResponse<{ accessToken: string; refreshToken: string }>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
const resendVerificationSchema = z.object({
  email: z.string().email(),
});

router.post(
  '/resend-verification',
  validateRequest(resendVerificationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const { data, error } = await supabase.auth.resend({
        type: 'email',
        email,
      });
      if (error) throw error;

      res.status(200).json({
        success: true,
        data: { message: 'Verification email sent' },
      } as ApiResponse<{ message: string }>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Send password reset email
 * @access  Public
 */
const resetPasswordSchema = z.object({
  email: z.string().email(),
});

router.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        // You can set a redirect here if you want to handle the reset in your app
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
      });
      if (error) throw error;

      res.status(200).json({
        success: true,
        data: { message: 'Password reset email sent' },
      } as ApiResponse<{ message: string }>);
    } catch (error) {
      next(error);
    }
  }
);

export default router;