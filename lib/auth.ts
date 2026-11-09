import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { betaCompFieldsForNewUser } from "@/lib/beta-comp";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { trackEvent } from "@/lib/analytics";
import { cookies } from "next/headers";
import { attributeReferral, REF_COOKIE } from "@/lib/referrals";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user?.passwordHash) return null;
        const ok = await compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        // Block only users who signed up after email-verify was added and haven't verified yet.
        // Old users (emailVerified=false, emailVerifyToken=null) are grandfathered through.
        if (!user.emailVerified && user.emailVerifyToken !== null) throw new Error("EMAIL_NOT_VERIFIED");
        if (user.suspendedAt) throw new Error("ACCOUNT_SUSPENDED");
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (existing?.suspendedAt) return "/login?error=ACCOUNT_SUSPENDED";
        if (existing) {
          await prisma.account.upsert({
            where: { provider_providerAccountId: { provider: "google", providerAccountId: account.providerAccountId } },
            // Google sign-in tokens are never used after login, so we don't keep them (least privilege).
            update: {},
            create: {
              userId: existing.id,
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          });
          if (!existing.emailVerified) {
            await prisma.user.update({ where: { id: existing.id }, data: { emailVerified: true } });
          }
          user.id = existing.id;
        } else {
          const newUser = await prisma.user.create({
            data: {
              ...betaCompFieldsForNewUser(),
              email: user.email,
              name: user.name ?? null,
              avatarUrl: user.image ?? null,
              emailVerified: true,
              accounts: {
                create: {
                  provider: "google",
                  providerAccountId: account.providerAccountId,
                },
              },
            },
          });
          user.id = newUser.id;
          let refCode: string | undefined;
          try {
            refCode = (await cookies()).get(REF_COOKIE)?.value;
          } catch {
            /* not in a request scope */
          }
          const referred = await attributeReferral({ newUserId: newUser.id, newUserEmail: user.email, code: refCode });
          await trackEvent("signup", { userId: newUser.id, props: { method: "google", referred } });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.email = user.email; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.id as string;
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
