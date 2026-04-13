import { createUserSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { jsonError, jsonSuccess } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
      return jsonError("Invalid email or password.", 401);
    }

    await createUserSession(user.id);

    return jsonSuccess({
      success: true,
      redirectTo: user.role === "ADMIN" ? "/admin" : "/dashboard",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return jsonError("Enter a valid email and password.", 422);
    }

    console.error(error);
    return jsonError("Login failed.", 500);
  }
}
