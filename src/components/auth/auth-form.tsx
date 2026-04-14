"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NerdIcon } from "@/components/ui/nerd-icon";

type AuthFormProps =
  | {
      mode: "login";
    }
  | {
      mode: "register";
    };

export function AuthForm({ mode }: AuthFormProps) {
  const { t } = useI18n();
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
        throw new Error(result.error ?? t("auth.authenticationFailed"));
      }

      toast.success(mode === "login" ? t("auth.loggedIn") : t("auth.accountCreated"));
      startTransition(() => {
        router.push(result.redirectTo ?? "/dashboard");
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.authenticationFailed"));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md rounded-[32px]">
      <CardHeader className="space-y-3">
        <div className="section-kicker">{mode === "login" ? t("auth.welcomeBack") : t("auth.createAccountKicker")}</div>
        <CardTitle className="text-3xl">{mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</CardTitle>
        <CardDescription>
          {mode === "login"
            ? t("auth.loginDescription")
            : t("auth.registerDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <div className="space-y-2">
              <Label htmlFor="name">{t("auth.nameLabel")}</Label>
              <Input id="name" name="name" placeholder={t("auth.namePlaceholder")} required />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.emailLabel")}</Label>
            <Input id="email" name="email" type="email" placeholder={t("auth.emailPlaceholder")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
            <Input id="password" name="password" type="password" placeholder={t("auth.passwordPlaceholder")} required />
          </div>
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? <NerdIcon className="text-sm" name="spinner" spin /> : null}
            {mode === "login" ? t("auth.loginButton") : t("auth.registerButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
