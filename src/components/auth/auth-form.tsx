"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFormProps =
  | {
      mode: "login";
    }
  | {
      mode: "register";
    };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload =
      mode === "register"
        ? {
            name: String(formData.get("name") ?? ""),
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
          }
        : {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
          };

    setIsPending(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: string; redirectTo?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Authentication failed.");
      }

      toast.success(mode === "login" ? "Logged in." : "Account created.");
      startTransition(() => {
        router.push(result.redirectTo ?? "/dashboard");
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md rounded-[32px]">
      <CardHeader className="space-y-3">
        <div className="section-kicker">{mode === "login" ? "Welcome back" : "Create account"}</div>
        <CardTitle className="text-3xl">{mode === "login" ? "Log in to AutoPrintFlow" : "Start building print layouts"}</CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Access your drafts, queue status, and protected sticker downloads."
            : "Create a private workspace for uploads, moderation, and print-ready exports."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Alex Johnson" required />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="At least 8 characters" required />
          </div>
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
