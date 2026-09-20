import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, ShieldAlert } from "lucide-react";
import { changePasswordSchema, passwordStrengthIssues } from "@bandhan/shared";
import { AdminSeo, FormError, PageHeading, Panel, TextField } from "@/components/admin/AdminUI";
import { zodFormResolver } from "@/lib/formResolver";
import { ApiClientError } from "@/lib/apiClient";
import { authApi } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AdminChangePasswordPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodFormResolver<PasswordForm>(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const newPassword = watch("newPassword") ?? "";
  const remainingIssues = passwordStrengthIssues(newPassword);

  const mutation = useMutation({
    mutationFn: (values: PasswordForm) =>
      authApi.changePassword(values.currentPassword, values.newPassword, values.confirmPassword),
    onSuccess: async (result) => {
      setFormError(null);
      // Changing a password revokes every other session, including this one.
      if (result.signedOut) {
        queryClient.clear();
        navigate("/admin/login", {
          replace: true,
          state: { notice: "Password updated. Please sign in with your new password." },
        });
        return;
      }
      setDone(true);
      await refresh();
    },
    onError: (error) => {
      // The API answers with field-level messages (wrong current password, a
      // password that repeats personal details). Show them on the fields
      // instead of a generic banner.
      if (error instanceof ApiClientError && error.details) {
        let mapped = false;
        for (const [field, messages] of Object.entries(error.details)) {
          if (field === "currentPassword" || field === "newPassword" || field === "confirmPassword") {
            setError(field, { type: "server", message: messages[0] });
            mapped = true;
          }
        }
        if (mapped) {
          setFormError(null);
          return;
        }
      }
      setFormError(
        error instanceof ApiClientError ? error.message : "We could not update your password."
      );
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    clearErrors(["currentPassword", "newPassword", "confirmPassword"]);
    mutation.mutate(values);
  });

  return (
    <>
      <AdminSeo title="Change Password" />
      <PageHeading
        eyebrow="Account"
        title={user?.mustChangePassword ? "Set a new password" : "Change your password"}
        description={
          user?.mustChangePassword
            ? "You are signed in with a temporary password. Choose your own before continuing — you cannot use the dashboard until this is done."
            : "Choose a strong password you do not use anywhere else."
        }
      />

      <div className="mt-8 max-w-2xl">
        {user?.mustChangePassword && (
          <p className="mb-6 flex items-start gap-3 border border-gold/40 bg-gold/5 px-4 py-3 text-sm text-forest">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
            <span>
              Temporary credentials are for first sign-in only. Everything you do in this
              dashboard is recorded against your account.
            </span>
          </p>
        )}

        <Panel description="At least 12 characters with an uppercase letter, a lowercase letter, a number and a symbol.">
          <form onSubmit={onSubmit} noValidate className="space-y-5 p-5 sm:p-6">
            {done ? (
              <p className="flex items-center gap-2 border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-forest">
                <Check className="h-4 w-4" aria-hidden="true" /> Your password has been updated.
              </p>
            ) : (
              <>
                <FormError message={formError} />

                <TextField
                  id="current-password"
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  required
                  error={errors.currentPassword?.message}
                  {...register("currentPassword")}
                />

                <TextField
                  id="new-password"
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  required
                  error={errors.newPassword?.message}
                  {...register("newPassword")}
                />

                {newPassword.length > 0 && remainingIssues.length > 0 && (
                  <ul className="space-y-1 border border-forest/10 bg-cream/40 px-4 py-3 text-xs text-charcoal-muted">
                    {remainingIssues.map((issue) => (
                      <li key={issue}>· {issue}</li>
                    ))}
                  </ul>
                )}

                <TextField
                  id="confirm-password"
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  required
                  error={errors.confirmPassword?.message}
                  {...register("confirmPassword")}
                />

                <button
                  id="change-password-submit"
                  type="submit"
                  disabled={mutation.isPending}
                  className="btn-solid w-full disabled:opacity-70 sm:w-auto"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </button>
              </>
            )}
          </form>
        </Panel>
      </div>
    </>
  );
}
