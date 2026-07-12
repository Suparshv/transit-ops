import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ok, fail } from '../utils/apiResponse';
import { SignupInput, LoginInput } from '../schemas/auth.schema';

const prisma = new PrismaClient();

const MAX_FAILED_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------------------

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as SignupInput;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json(fail('An account with this email already exists.'));
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });

    res.status(201).json(ok(user));
  } catch (err) {
    console.error('[auth.signup]', err);
    res.status(500).json(fail('Failed to create account. Please try again.'));
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Role is selected at login and embedded in the JWT (CLAUDE.md §5).
// Failed-login counter + account lockout after 5 attempts (Design.md Screen 0).
// ---------------------------------------------------------------------------

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body as LoginInput;

    const user = await prisma.user.findUnique({ where: { email } });

    // ── Account locked ──────────────────────────────────────────────────────
    if (user?.isLocked) {
      res.status(403).json(
        fail(
          'Account locked after 5 failed login attempts. ' +
            'Contact your administrator to unlock.'
        )
      );
      return;
    }

    // ── Invalid credentials ─────────────────────────────────────────────────
    // Check user existence and password together to prevent email enumeration.
    const passwordValid =
      user !== null && (await bcrypt.compare(password, user.passwordHash));

    if (!user || !passwordValid) {
      if (user) {
        // Increment failed attempt counter
        const newAttempts = user.failedLoginAttempts + 1;
        const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            isLocked: shouldLock,
          },
        });

        if (shouldLock) {
          res.status(403).json(
            fail(
              `Account locked. You have reached ${MAX_FAILED_ATTEMPTS} failed ` +
                'login attempts. Contact your administrator to unlock.'
            )
          );
          return;
        }

        const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
        res.status(401).json(
          fail(
            `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`
          )
        );
      } else {
        // User does not exist — same error message to prevent enumeration
        res.status(401).json(fail('Invalid credentials.'));
      }
      return;
    }

    // ── Successful login ────────────────────────────────────────────────────
    // Reset failed attempt counter on success
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, isLocked: false },
    });

    const secret = process.env.JWT_SECRET!;
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role, // Role selected at login — authoritative for this session
      },
      secret,
      { expiresIn: '8h' } // 8h covers the hackathon day
    );

    res.status(200).json(
      ok({
        token,
        user: {
          id: user.id,
          email: user.email,
          role,
        },
      })
    );
  } catch (err) {
    console.error('[auth.login]', err);
    res.status(500).json(fail('Login failed. Please try again.'));
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/me
// Returns the current user based on the JWT (req.user set by requireAuth).
// ---------------------------------------------------------------------------

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(fail('Unauthenticated.'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json(fail('User not found.'));
      return;
    }

    res.status(200).json(
      ok({
        ...user,
        role: req.user.role, // role comes from JWT, not DB
      })
    );
  } catch (err) {
    console.error('[auth.me]', err);
    res.status(500).json(fail('Failed to fetch user.'));
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
//
// Hackathon implementation:
//   - Generates a cryptographically random 32-byte hex token.
//   - Stores it + 1-hour expiry on the User row (resetToken, resetTokenExpiry).
//   - Logs the token to console so the demo can prove it works without SMTP.
//   - Always returns a generic 200 success — never leaks which emails exist.
//
// A real implementation would email `${FRONTEND_URL}/reset-password?token=...`
// instead of console.log. Swap that one line when email infra is available.
// ---------------------------------------------------------------------------

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };

    if (!email || typeof email !== 'string') {
      res.status(400).json(fail('email is required.'));
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Generate a cryptographically random token (64 hex chars = 32 bytes)
      const { randomBytes } = await import('crypto');
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      // ── Demo output ────────────────────────────────────────────────────────
      // In production, send an email with this link instead.
      // For the hackathon demo, paste this URL into the browser to simulate.
      const resetLink = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      console.log(`\n🔑 [forgot-password] Reset token for ${email}:`);
      console.log(`   Token : ${resetToken}`);
      console.log(`   Link  : ${resetLink}`);
      console.log(`   Expiry: ${resetTokenExpiry.toISOString()}\n`);
    }

    // Always return generic success — never reveal whether email is registered
    res.status(200).json(
      ok({
        message:
          'If an account with that email exists, a password reset link has been generated. Check the server console for the demo token.',
      })
    );
  } catch (err) {
    console.error('[auth.forgotPassword]', err);
    res.status(500).json(fail('Failed to process request. Please try again.'));
  }
};
