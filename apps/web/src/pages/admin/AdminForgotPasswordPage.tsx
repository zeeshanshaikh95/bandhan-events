import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { forgotPasswordSchema } from "@bandhan/shared";
import AuthShell from "@/components/admin/AuthShell";
import { FormError, SuccessNotice, TextField } from "@/components/admin/AdminUI";
import { zodFormResolver } from "@/lib/formResolver";
import { ApiClientError } from "@/lib/apiClient";
import { authApi } from "@/services/api";

interface ForgotForm {
  email: string;
}

export default function AdminForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodFormResolver<ForgotForm>(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotForm) => authApi.forgotPassword(values.email),
    onSuccess: (result) => {
      setFormError(null);
      setSent(result.message);
    },
    onError: (error) =>
      setFormError(error instanceof ApiClientError ? error.message : "We could not send that request."),
  });

  return (
    <AuthShell
      seoTitle="Reset Password"
      title="Reset your password"
      subtitle="Enter your account email and we will send reset instructions if the account exists."
    >
      <form
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          mutation.mutate(values);
        })}
        noValidate
        className="space-y-5"
      >
        <FormError message={formError} />
        {sent ? (
          <SuccessNotice message={sent} />
        ) : (
          <>
            <TextField
              id="forgot-email"
              label="Email"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <button type="submit" disabled={mutation.isPending} className="btn-solid w-full disabled:opacity-70">
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending…
                </>
              ) : (
                "Send reset instructions"
              )}
            </button>
          </>
        )}

        <p className="text-center text-xs text-charcoal-muted">
          <Link to="/admin/login" className="link-underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
