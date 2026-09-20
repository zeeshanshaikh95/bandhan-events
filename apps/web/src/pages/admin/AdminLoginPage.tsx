import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSchema } from "@bandhan/shared";
import AuthShell from "@/components/admin/AuthShell";
import { FormError, SuccessNotice, TextField } from "@/components/admin/AdminUI";
import { zodFormResolver } from "@/lib/formResolver";
import { ApiClientError } from "@/lib/apiClient";
import { useAuth } from "@/providers/AuthProvider";

interface LoginForm {
  email: string;
  password: string;
}

export default function AdminLoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodFormResolver<LoginForm>(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-forest">
        <Loader2 className="h-6 w-6 animate-spin text-gold-soft" aria-hidden="true" />
      </div>
    );
  }

  // Already signed in: nothing to do here.
  if (user) return <Navigate to="/admin" replace />;

  const fromState = (location.state as { from?: string } | null)?.from;
  const notice = (location.state as { notice?: string } | null)?.notice;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const signedIn = await login(values.email, values.password);
      // Users on a temporary password are redirected to the change-password
      // screen by the route guard, so one destination is enough here.
      if (signedIn.mustChangePassword) navigate("/admin/change-password", { replace: true });
      else navigate(fromState && fromState.startsWith("/admin") ? fromState : "/admin", { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : "We could not sign you in. Please try again."
      );
    }
  });

  return (
    <AuthShell
      seoTitle="Admin Login"
      title="Sign in"
      subtitle="Authorised Bandhan Events staff only. All sign-in attempts are logged."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <SuccessNotice message={notice} />

        <TextField
          id="login-email"
          label="Email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <div>
          <TextField
            id="login-password"
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Your password"
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest2 text-charcoal-muted transition hover:text-forest"
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {showPassword ? "Hide password" : "Show password"}
          </button>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-solid w-full disabled:opacity-70">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>

        <p className="text-center text-xs text-charcoal-muted">
          <Link to="/admin/forgot-password" className="link-underline">
            Forgot your password?
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
