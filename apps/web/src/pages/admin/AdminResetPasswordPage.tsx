import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { passwordStrengthIssues, resetPasswordSchema } from "@bandhan/shared";
import AuthShell from "@/components/admin/AuthShell";
import { FormError, TextField } from "@/components/admin/AdminUI";
import { zodFormResolver } from "@/lib/formResolver";
import { ApiClientError } from "@/lib/apiClient";
import { authApi } from "@/services/api";

interface ResetForm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AdminResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodFormResolver<ResetForm>(resetPasswordSchema),
    defaultValues: { token, newPassword: "", confirmPassword: "" },
  });

  const newPassword = watch("newPassword") ?? "";

  const mutation = useMutation({
    mutationFn: (values: ResetForm) =>
      authApi.resetPassword(values.token, values.newPassword, values.confirmPassword),
    onSuccess: () =>
      navigate("/admin/login", {
        replace: true,
        state: { notice: "Password updated. Please sign in with your new password." },
      }),
    onError: (error) =>
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : "That reset link could not be used. Request a new one."
      ),
  });

  if (!token) {
    return (
      <AuthShell
        seoTitle="Reset Password"
        title="Reset link incomplete"
        subtitle="This page needs the reset link from your email. Request a new one to continue."
      >
        <Link to="/admin/forgot-password" className="btn-solid w-full">
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      seoTitle="Set a New Password"
      title="Set a new password"
      subtitle="Reset links expire and can only be used once."
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
        {/* The token stays in the form state (never rendered as text). */}
        <input type="hidden" {...register("token")} />

        <TextField
          id="reset-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />

        {newPassword.length > 0 && passwordStrengthIssues(newPassword).length > 0 && (
          <ul className="space-y-1 border border-forest/10 bg-cream/40 px-4 py-3 text-xs text-charcoal-muted">
            {passwordStrengthIssues(newPassword).map((issue) => (
              <li key={issue}>· {issue}</li>
            ))}
          </ul>
        )}

        <TextField
          id="reset-confirm"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <button type="submit" disabled={mutation.isPending} className="btn-solid w-full disabled:opacity-70">
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
            </>
          ) : (
            "Set password"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
