import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Plus, UserPlus, X } from "lucide-react";
import {
  ROLES,
  ROLE_LABELS,
  USER_STATUSES,
  passwordSchema,
  userCreateSchema,
  type Role,
  type UserStatus,
} from "@bandhan/shared";
import {
  AdminSeo,
  EmptyState,
  FormError,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  SuccessNotice,
  adminInputClass,
  adminLabelClass,
  formatDateTime,
  TextField,
} from "@/components/admin/AdminUI";
import { ApiClientError } from "@/lib/apiClient";
import { zodFormResolver } from "@/lib/formResolver";
import { userApi, type AdminUser } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/utils/cn";

/** Cryptographically random temporary password that satisfies the policy. */
function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%&*?";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  let password = "";
  for (let index = 0; index < 12; index += 1) password += alphabet[bytes[index] % alphabet.length];
  // Guarantee the four required character classes.
  password += "A";
  password += symbols[bytes[13] % symbols.length];
  password += String(bytes[14] % 10);
  return password;
}

interface CreateUserForm {
  name: string;
  email: string;
  role: Role;
  temporaryPassword: string;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const users = useQuery({ queryKey: ["users"], queryFn: () => userApi.list() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodFormResolver<CreateUserForm>(userCreateSchema),
    defaultValues: { name: "", email: "", role: "MANAGER", temporaryPassword: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateUserForm) => userApi.create(values),
    onSuccess: (created) => {
      setFormError(null);
      setNotice(
        `Account created for ${created.email}. Share the temporary password privately — they must change it at first sign-in.`
      );
      reset();
      setShowCreate(false);
      invalidate();
    },
    onError: (error) =>
      setFormError(error instanceof ApiClientError ? error.message : "We could not create that account."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      userApi.update(id, patch),
    onSuccess: (_data, variables) => {
      setFormError(null);
      setNotice(
        variables.patch.role || variables.patch.status === "INACTIVE"
          ? "Saved. That user's active sessions were signed out immediately."
          : "Saved."
      );
      invalidate();
    },
    onError: (error) =>
      setFormError(error instanceof ApiClientError ? error.message : "We could not save that change."),
  });

  const rows = users.data ?? [];

  return (
    <>
      <AdminSeo title="Users" />
      <PageHeading
        eyebrow="Governance"
        title="User accounts"
        description="Creates accounts, changes roles and resets passwords. Only owners can reach this screen."
        actions={
          <button type="button" onClick={() => setShowCreate((value) => !value)} className="btn-outline !text-[11px]">
            {showCreate ? (
              <>
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Close
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New user
              </>
            )}
          </button>
        }
      />

      <div className="mt-6 space-y-4">
        <FormError message={formError} />
        <SuccessNotice message={notice} />
      </div>

      {showCreate && (
        <div className="mt-6">
          <Panel
            title="Create an account"
            description="New accounts always start with a temporary password and must change it at first sign-in."
          >
            <form
              noValidate
              className="space-y-5 p-5 sm:p-6"
              onSubmit={handleSubmit((values) => {
                setFormError(null);
                setNotice(null);
                createMutation.mutate(values);
              })}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  id="user-name"
                  label="Full name"
                  required
                  error={errors.name?.message}
                  {...register("name")}
                />
                <TextField
                  id="user-email"
                  label="Email"
                  type="email"
                  required
                  error={errors.email?.message}
                  {...register("email")}
                />

                <div>
                  <label htmlFor="user-role" className={adminLabelClass}>
                    Role *
                  </label>
                  <select id="user-role" className={cn(adminInputClass, "mt-2")} {...register("role")}>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </div>

                <TextField
                  id="user-temp-password"
                  label="Temporary password"
                  required
                  error={errors.temporaryPassword?.message}
                  hint="At least 12 characters with upper, lower, number and symbol."
                  {...register("temporaryPassword")}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const generated = generateTemporaryPassword();
                  try {
                    passwordSchema.parse(generated);
                  } catch {
                    // Should never happen — the generator satisfies the policy.
                  }
                  setValue("temporaryPassword", generated, { shouldValidate: true });
                }}
                className="btn-outline !px-4 !py-2 !text-[10px]"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Generate a strong password
              </button>

              <div>
                <button type="submit" disabled={createMutation.isPending} className="btn-solid disabled:opacity-70">
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Creating…
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" aria-hidden="true" /> Create account
                    </>
                  )}
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      <Panel className="mt-6">
        {users.isLoading ? (
          <LoadingRows rows={4} columns={4} />
        ) : users.isError ? (
          <div className="p-5">
            <RetryState
              message={
                users.error instanceof ApiClientError
                  ? users.error.message
                  : "We could not load user accounts."
              }
              onRetry={() => users.refetch()}
            />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No accounts" description="Create the first staff account to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <caption className="sr-only">User accounts</caption>
              <thead>
                <tr className="border-b border-forest/10 text-left">
                  {["Name", "Role", "Status", "Last sign-in", "Sessions", ""].map((heading, index) => (
                    <th
                      key={heading || index}
                      scope="col"
                      className="px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: AdminUser) => (
                  <UserRow
                    key={row.id}
                    user={row}
                    isSelf={row.id === currentUser?.id}
                    pending={updateMutation.isPending}
                    onChange={(patch) => {
                      setNotice(null);
                      updateMutation.mutate({ id: row.id, patch });
                    }}
                    onResetPassword={(temporaryPassword) => {
                      userApi
                        .resetPassword(row.id, temporaryPassword, true)
                        .then(() => {
                          setFormError(null);
                          setNotice(`Password reset for ${row.email}. Their sessions were signed out.`);
                          invalidate();
                        })
                        .catch((error) =>
                          setFormError(
                            error instanceof ApiClientError
                              ? error.message
                              : "We could not reset that password."
                          )
                        );
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="mt-4 text-xs leading-relaxed text-charcoal-muted">
        Passwords are stored only as Argon2id hashes. Nobody — including owners — can read an
        existing password; a lost password is always replaced, never recovered.
      </p>
    </>
  );
}

function UserRow({
  user,
  isSelf,
  pending,
  onChange,
  onResetPassword,
}: {
  user: AdminUser;
  isSelf: boolean;
  pending: boolean;
  onChange: (patch: Record<string, unknown>) => void;
  onResetPassword: (temporaryPassword: string) => void;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);

  return (
    <>
      <tr className="border-b border-forest/5 last:border-0">
        <td className="px-5 py-3">
          <span className="text-forest">{user.name}</span>
          <span className="block text-[11px] text-charcoal-muted">{user.email}</span>
          {user.mustChangePassword && (
            <span className="mt-1 inline-block border border-gold/40 px-1.5 py-0.5 text-[10px] uppercase tracking-widest2 text-gold-deep">
              Must change password
            </span>
          )}
        </td>
        <td className="px-5 py-3">
          <label className="sr-only" htmlFor={`role-${user.id}`}>
            Role for {user.name}
          </label>
          <select
            id={`role-${user.id}`}
            value={user.role}
            disabled={pending || isSelf}
            onChange={(event) => onChange({ role: event.target.value })}
            className={cn(adminInputClass, "sm:w-36")}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          {isSelf && <span className="mt-1 block text-[10px] text-charcoal-muted">Your own role</span>}
        </td>
        <td className="px-5 py-3">
          <label className="sr-only" htmlFor={`status-${user.id}`}>
            Status for {user.name}
          </label>
          <select
            id={`status-${user.id}`}
            value={user.status}
            disabled={pending || isSelf}
            onChange={(event) => onChange({ status: event.target.value as UserStatus })}
            className={cn(adminInputClass, "sm:w-32")}
          >
            {USER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "ACTIVE" ? "Active" : "Inactive"}
              </option>
            ))}
          </select>
        </td>
        <td className="px-5 py-3 text-charcoal-muted">{formatDateTime(user.lastLoginAt, "Never")}</td>
        <td className="px-5 py-3 text-charcoal-muted">{user.activeSessions}</td>
        <td className="px-5 py-3 text-right">
          <button
            type="button"
            onClick={() => {
              setResetOpen((value) => !value);
              setResetError(null);
              setTemporaryPassword(generateTemporaryPassword());
            }}
            className="text-[11px] uppercase tracking-widest2 text-forest transition hover:text-gold-deep"
          >
            Reset password
          </button>
        </td>
      </tr>

      {resetOpen && (
        <tr className="border-b border-forest/5 bg-cream/30">
          <td colSpan={6} className="px-5 py-4">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                const parsed = passwordSchema.safeParse(temporaryPassword);
                if (!parsed.success) {
                  setResetError(parsed.error.issues[0]?.message ?? "Choose a stronger password.");
                  return;
                }
                setResetError(null);
                onResetPassword(parsed.data);
                setResetOpen(false);
              }}
            >
              <div className="flex-1">
                <label htmlFor={`reset-${user.id}`} className={adminLabelClass}>
                  Temporary password for {user.name}
                </label>
                <input
                  id={`reset-${user.id}`}
                  value={temporaryPassword}
                  aria-invalid={resetError ? true : undefined}
                  onChange={(event) => setTemporaryPassword(event.target.value)}
                  className={cn(adminInputClass, "mt-2")}
                />
                {resetError && (
                  <p role="alert" className="mt-1.5 text-xs text-red-800">
                    {resetError}
                  </p>
                )}
              </div>
              <button type="submit" className="btn-solid">
                Set temporary password
              </button>
              <button type="button" onClick={() => setResetOpen(false)} className="btn-outline">
                Cancel
              </button>
            </form>
            <p className="mt-2 text-[11px] text-charcoal-muted">
              The user will be required to choose a new password at next sign-in, and all their
              existing sessions are signed out.
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
