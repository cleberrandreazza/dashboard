import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      validatePasswordRequirements: (password: string) => {
        if (!password || password.length < 8) {
          throw new Error(
            "A senha deve ter no mínimo 8 caracteres."
          );
        }
      },
    }),
  ],
});
