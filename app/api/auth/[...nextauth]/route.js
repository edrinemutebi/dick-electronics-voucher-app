import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "../../../lib/firebase.js";
import { collection, query, where, limit, getDocs } from "firebase/firestore";

const handler = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      try {
        if (!user?.email) return false;
        const q = query(
          collection(db, "adminEmails"),
          where("email", "==", user.email),
          where("approved", "==", true),
          limit(1)
        );
        const snap = await getDocs(q);
        return !snap.empty;
      } catch (e) {
        console.error("signIn allowlist check failed", e);
        return false;
      }
    },
    async jwt({ token }) {
      // Mark token as admin if email is approved; optional: cache it here
      // For simplicity, trust signIn check and set flag if token has email
      token.isAdmin = !!token.email;
      return token;
    },
    async session({ session, token }) {
      session.user = session.user || {};
      session.user.email = token.email;
      session.user.isAdmin = !!token.isAdmin;
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
