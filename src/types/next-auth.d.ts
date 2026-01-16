import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    role: "USER" | "ADMIN";
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: "USER" | "ADMIN";
    };
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: "USER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "ADMIN";
  }
}
