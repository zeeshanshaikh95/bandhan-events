import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, RefreshCw, Save, TestTube } from "lucide-react";
import { businessSettingsSchema, type BusinessSettingsInput } from "@bandhan/shared";
import {
  AdminSeo,
  FormError,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  TextField,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/AdminUI";
import { ApiClientError } from "@/lib/apiClient";
import { zodFormResolver } from "@/lib/formResolver";
import { settingsApi, syncApi } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/utils/cn";

function GoogleSheetsIntegrationPanel() {
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncStatus = useQuery({
    queryKey: ["sync", "status"],
    queryFn: () => syncApi.status(),
  });

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const result = await syncApi.test();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        connected: false,
        message: error instanceof ApiClientError ? error.message : "Test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const syncNow = async () => {
    setIsSyncing(true);
    try {
      await syncApi.syncNow();
      queryClient.invalidateQueries({ queryKey: ["sync"] });
    } catch (error) {
      // Error handled by UI
    } finally {
      setIsSyncing(false);
    }
  };

  if (syncStatus.isLoading) {
    return <LoadingRows rows={2} columns={2} />;
  }

  const status = syncStatus.data;
  const configured = status?.configured ?? false;

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            configured
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          )}>
            {configured ? "Configured" : "Not Configured"}
          </span>
          {status?.spreadsheetId && (
            <span className="text-xs text-charcoal-muted">
              Spreadsheet: {status.spreadsheetId.substring(0, 20)}…
            </span>
          )}
        </div>
      </div>

      {!configured && (
        <div className="mb-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          Google Sheets is not configured. Set the following environment variables on your server:
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li><code className="rounded bg-yellow-100 px-1">GOOGLE_SHEETS_SPREADSHEET_ID</code></li>
            <li><code className="rounded bg-yellow-100 px-1">GOOGLE_SHEETS_CLIENT_EMAIL</code></li>
            <li><code className="rounded bg-yellow-100 px-1">GOOGLE_SHEETS_PRIVATE_KEY</code></li>
          </ul>
          <p className="mt-2">
            Then share the spreadsheet with the service account email and restart the API.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={testConnection}
          disabled={isTesting}
          className="inline-flex items-center gap-2 rounded border border-forest/20 bg-white px-3 py-2 text-sm text-forest hover:bg-forest/5 disabled:opacity-50"
        >
          {isTesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <TestTube className="h-4 w-4" />
          )}
          Test Connection
        </button>

        <button
          type="button"
          onClick={syncNow}
          disabled={isSyncing || !configured}
          className="inline-flex items-center gap-2 rounded border border-forest/20 bg-white px-3 py-2 text-sm text-forest hover:bg-forest/5 disabled:opacity-50"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync Now
        </button>
      </div>

      {testResult && (
        <div className={cn(
          "mt-4 rounded border p-3 text-sm",
          testResult.connected
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-800"
        )}>
          {testResult.message}
        </div>
      )}

      {status?.lastSyncAt && (
        <p className="mt-4 text-xs text-charcoal-muted">
          Last successful sync: {new Date(status.lastSyncAt).toLocaleString()}
        </p>
      )}

      {status?.lastSyncError && (
        <p className="mt-1 text-xs text-red-600">
          Last sync error: {status.lastSyncError}
        </p>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = can("settings:write");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const settings = useQuery({ queryKey: ["settings"], queryFn: () => settingsApi.get() });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BusinessSettingsInput>({
    resolver: zodFormResolver<BusinessSettingsInput>(businessSettingsSchema),
    defaultValues: {
      brand: { name: "", tagline: "" },
      contact: {
        phoneDisplay: "",
        whatsappNumber: "",
        email: "",
        instagramUrl: "",
        instagramHandle: "",
      },
      address: { street: "", locality: "", area: "", city: "", state: "", postalCode: "", country: "" },
      onlinePresence: { googleBusinessUrl: "", justdialUrl: "" },
      internal: { enquiryNotifyEmail: "" },
    },
  });

  // Populate the form once the stored values arrive.
  useEffect(() => {
    if (settings.data) reset(settings.data);
  }, [settings.data, reset]);

  const mutation = useMutation({
    mutationFn: (values: BusinessSettingsInput) => settingsApi.update(values),
    onSuccess: (data) => {
      setFormError(null);
      reset(data);
      setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      // The public site reads these values, so drop its cached copy too.
      queryClient.invalidateQueries({ queryKey: ["public", "settings"] });
    },
    onError: (error) =>
      setFormError(error instanceof ApiClientError ? error.message : "We could not save the settings."),
  });

  if (settings.isLoading) {
    return (
      <>
        <AdminSeo title="Settings" />
        <PageHeading eyebrow="Configuration" title="Business settings" />
        <div className="mt-8 border border-forest/10 bg-ivory-soft">
          <LoadingRows rows={6} columns={3} />
        </div>
      </>
    );
  }

  if (settings.isError) {
    return (
      <>
        <AdminSeo title="Settings" />
        <PageHeading eyebrow="Configuration" title="Business settings" />
        <div className="mt-8">
          <RetryState
            message={
              settings.error instanceof ApiClientError
                ? settings.error.message
                : "We could not load the business settings."
            }
            onRetry={() => settings.refetch()}
          />
        </div>
      </>
    );
  }

  // Shared by required and optional fields: only the message ever matters here.
  const message = (field?: { message?: string }): string | undefined => field?.message;

  return (
    <>
      <AdminSeo title="Settings" />
      <PageHeading
        eyebrow="Configuration"
        title="Business settings"
        description="These values are stored in the database and rendered by the public website — no code change or redeploy is needed to update a contact detail."
      />

      <form
        className="mt-8 space-y-6"
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <FormError message={formError} />

        {!canWrite && (
          <p className="border border-forest/15 bg-cream/40 px-4 py-3 text-sm text-charcoal-muted">
            Your role can view these settings but not change them.
          </p>
        )}

        <Panel title="Brand" description="Shown in the header, footer and search results.">
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <TextField
              id="brand-name"
              label="Business name"
              required
              disabled={!canWrite}
              error={message(errors.brand?.name)}
              {...register("brand.name")}
            />
            <TextField
              id="brand-tagline"
              label="Tagline"
              required
              disabled={!canWrite}
              error={message(errors.brand?.tagline)}
              {...register("brand.tagline")}
            />
          </div>
        </Panel>

        <Panel
          title="Contact"
          description="Leave WhatsApp blank to keep the currently configured number. The website hides WhatsApp actions when no number is available."
        >
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <TextField
              id="contact-phone"
              label="Phone (displayed)"
              required
              disabled={!canWrite}
              hint="Use “Coming Soon” until the number is confirmed."
              error={message(errors.contact?.phoneDisplay)}
              {...register("contact.phoneDisplay")}
            />
            <TextField
              id="contact-whatsapp"
              label="WhatsApp number"
              disabled={!canWrite}
              inputMode="numeric"
              hint="Digits only, with country code — e.g. 919876543210."
              error={message(errors.contact?.whatsappNumber)}
              {...register("contact.whatsappNumber")}
            />
            <TextField
              id="contact-email"
              label="Email"
              required
              disabled={!canWrite}
              error={message(errors.contact?.email)}
              {...register("contact.email")}
            />
            <TextField
              id="contact-instagram-handle"
              label="Instagram handle"
              required
              disabled={!canWrite}
              error={message(errors.contact?.instagramHandle)}
              {...register("contact.instagramHandle")}
            />
            <div className="sm:col-span-2">
              <TextField
                id="contact-instagram-url"
                label="Instagram URL"
                disabled={!canWrite}
                placeholder="https://www.instagram.com/…"
                error={message(errors.contact?.instagramUrl)}
                {...register("contact.instagramUrl")}
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Venue address"
          description="Used on the contact page, the footer and in the venue's structured data."
        >
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <TextField
              id="address-street"
              label="Street"
              required
              disabled={!canWrite}
              error={message(errors.address?.street)}
              {...register("address.street")}
            />
            <TextField
              id="address-locality"
              label="Locality"
              required
              disabled={!canWrite}
              error={message(errors.address?.locality)}
              {...register("address.locality")}
            />
            <TextField
              id="address-area"
              label="Area"
              required
              disabled={!canWrite}
              error={message(errors.address?.area)}
              {...register("address.area")}
            />
            <TextField
              id="address-city"
              label="City"
              required
              disabled={!canWrite}
              error={message(errors.address?.city)}
              {...register("address.city")}
            />
            <TextField
              id="address-state"
              label="State"
              required
              disabled={!canWrite}
              error={message(errors.address?.state)}
              {...register("address.state")}
            />
            <TextField
              id="address-postal"
              label="Postal code"
              required
              disabled={!canWrite}
              error={message(errors.address?.postalCode)}
              {...register("address.postalCode")}
            />
            <TextField
              id="address-country"
              label="Country"
              required
              disabled={!canWrite}
              error={message(errors.address?.country)}
              {...register("address.country")}
            />
          </div>
        </Panel>

        <Panel
          title="Google Sheets Integration"
          description="Connect to Google Sheets for business reporting and data synchronization. The spreadsheet ID is configured via environment variables."
        >
          <GoogleSheetsIntegrationPanel />
        </Panel>

        <Panel
          title="Online presence"
          description="Links to the business's local listings. The dashboard uses the Google Business Profile link so the team can open and manage the listing directly; review counts and ratings are never pulled or displayed automatically."
        >
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <TextField
                id="presence-gbp"
                label="Google Business Profile URL"
                disabled={!canWrite}
                placeholder="https://share.google/…"
                hint="The share link from the Business Profile. Leave blank if none."
                error={message(errors.onlinePresence?.googleBusinessUrl)}
                {...register("onlinePresence.googleBusinessUrl")}
              />
            </div>
            <div className="sm:col-span-2">
              <TextField
                id="presence-justdial"
                label="Justdial listing URL"
                disabled={!canWrite}
                placeholder="https://www.justdial.com/…"
                hint="Leave blank until the listing is confirmed."
                error={message(errors.onlinePresence?.justdialUrl)}
                {...register("onlinePresence.justdialUrl")}
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Internal"
          description="Never published to the website or sent to public visitors."
        >
          <div className="p-5 sm:p-6">
            <label htmlFor="internal-email" className={adminLabelClass}>
              Enquiry notification email
            </label>
            <input
              id="internal-email"
              type="email"
              disabled={!canWrite}
              className={cn(adminInputClass, "mt-2 sm:max-w-md")}
              {...register("internal.enquiryNotifyEmail")}
            />
            {message(errors.internal?.enquiryNotifyEmail) && (
              <p role="alert" className="mt-1.5 text-xs text-red-800">
                {message(errors.internal?.enquiryNotifyEmail)}
              </p>
            )}
            <p className="mt-2 text-[11px] text-charcoal-muted">
              Notifications are only sent once an email provider is configured on the server.
            </p>
          </div>
        </Panel>

        {canWrite && (
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-solid disabled:opacity-70">
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" /> Save settings
                </>
              )}
            </button>
            {savedAt && (
              <span className="inline-flex items-center gap-2 text-xs text-forest" role="status">
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> Saved at {savedAt}
              </span>
            )}
            {isDirty && !mutation.isPending && (
              <span className="text-xs text-charcoal-muted">Unsaved changes</span>
            )}
          </div>
        )}
      </form>
    </>
  );
}
