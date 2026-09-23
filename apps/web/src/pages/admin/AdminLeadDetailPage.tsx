import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  leadNoteSchema,
  stageChoiceLines,
  type LeadStatus,
} from "@bandhan/shared";
import {
  AdminSeo,
  EmptyState,
  FormError,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  StatusPill,
  adminInputClass,
  adminLabelClass,
  budgetLabel,
  eventTypeLabel,
  formatDate,
  formatDateTime,
  humanizeSlug,
  serviceLabel,
} from "@/components/admin/AdminUI";
import { ApiClientError } from "@/lib/apiClient";
import { leadApi } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/utils/cn";

export default function AdminLeadDetailPage() {
  const { leadId = "" } = useParams();
  const { can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [noteBody, setNoteBody] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const leadQuery = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => leadApi.get(leadId),
    enabled: Boolean(leadId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => leadApi.update(leadId, patch),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) =>
      setActionError(error instanceof ApiClientError ? error.message : "We could not save that change."),
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) => leadApi.addNote(leadId, body),
    onSuccess: () => {
      setNoteBody("");
      setNoteError(null);
      invalidate();
    },
    onError: (error) =>
      setNoteError(error instanceof ApiClientError ? error.message : "We could not save that note."),
  });

  const archiveMutation = useMutation({
    mutationFn: () => leadApi.archive(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/admin/leads", { replace: true });
    },
    onError: (error) =>
      setActionError(error instanceof ApiClientError ? error.message : "We could not archive that lead."),
  });

  const lead = leadQuery.data;

  return (
    <>
      <AdminSeo title="Lead" />

      <Link
        to="/admin/leads"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest2 text-charcoal-muted transition hover:text-forest"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All leads
      </Link>

      {leadQuery.isLoading && (
        <div className="mt-6 border border-forest/10 bg-ivory-soft">
          <LoadingRows rows={6} columns={3} />
        </div>
      )}

      {leadQuery.isError && (
        <div className="mt-6">
          <RetryState
            message={
              leadQuery.error instanceof ApiClientError && leadQuery.error.status === 404
                ? "That lead no longer exists."
                : "We could not load that lead."
            }
            onRetry={() => leadQuery.refetch()}
          />
        </div>
      )}

      {lead && (
        <>
          <div className="mt-4">
            <PageHeading
              eyebrow="Lead"
              title={lead.name}
              description={`Received ${formatDateTime(lead.createdAt)} · ${humanizeSlug(lead.source)}`}
              actions={
                can("leads:delete") ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Archive this lead? It will be hidden from the list.")) {
                        archiveMutation.mutate();
                      }
                    }}
                    disabled={archiveMutation.isPending}
                    className="btn-outline !text-[11px] disabled:opacity-60"
                  >
                    {archiveMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Archive
                  </button>
                ) : null
              }
            />
          </div>

          {actionError && (
            <div className="mt-6">
              <FormError message={actionError} />
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* Record */}
            <Panel title="Enquiry details" className="lg:col-span-2">
              <dl className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
                {[
                  { label: "Phone", value: lead.phone },
                  { label: "Email", value: lead.email || "—" },
                  { label: "Event type", value: eventTypeLabel(lead.eventType) },
                  { label: "Event date", value: formatDate(lead.eventDate, "Not set") },
                  { label: "Guest count", value: lead.guestCount ? String(lead.guestCount) : "Not given" },
                  { label: "Service required", value: serviceLabel(lead.serviceRequired) },
                  { label: "Budget", value: budgetLabel(lead.budget) },
                  { label: "Source", value: humanizeSlug(lead.source) },
                  { label: "Page", value: lead.pagePath || "—" },
                  { label: "Assigned to", value: lead.assignedTo?.name ?? "Unassigned" },
                ].map((row) => (
                  <div key={row.label}>
                    <dt className={adminLabelClass}>{row.label}</dt>
                    <dd className="mt-1.5 text-sm text-charcoal">{row.value}</dd>
                  </div>
                ))}

                {lead.message && (
                  <div className="sm:col-span-2">
                    <dt className={adminLabelClass}>Message</dt>
                    <dd className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-charcoal">
                      {lead.message}
                    </dd>
                  </div>
                )}
              </dl>
            </Panel>

            {/* Stage builder choices — present only on /build-your-stage enquiries */}
            {lead.stageConfiguration && (
              <Panel
                title="Stage configuration"
                description="Chosen in the Build Your Own Stage tool on the website."
                className="lg:col-span-3"
              >
                <dl className="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-2 sm:p-6">
                  {stageChoiceLines(lead.stageConfiguration).map((line) => (
                    <div key={line.label}>
                      <dt className={adminLabelClass}>{line.label}</dt>
                      <dd className="mt-1.5 text-sm text-charcoal">{line.value}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            )}

            {/* Pipeline controls */}
            <Panel title="Pipeline">
              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label htmlFor="lead-status" className={adminLabelClass}>
                    Status
                  </label>
                  <select
                    id="lead-status"
                    value={lead.status}
                    disabled={!can("leads:write") || updateMutation.isPending}
                    onChange={(event) =>
                      updateMutation.mutate({ status: event.target.value as LeadStatus })
                    }
                    className={cn(adminInputClass, "mt-2")}
                  >
                    {LEAD_STATUSES.map((value: LeadStatus) => (
                      <option key={value} value={value}>
                        {LEAD_STATUS_LABELS[value]}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <StatusPill status={lead.status} />
                  </div>
                </div>

                <div>
                  <label htmlFor="lead-follow-up" className={adminLabelClass}>
                    Next follow-up
                  </label>
                  <input
                    id="lead-follow-up"
                    type="date"
                    disabled={!can("leads:write") || updateMutation.isPending}
                    defaultValue={lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : ""}
                    onChange={(event) =>
                      updateMutation.mutate({ nextFollowUpAt: event.target.value || null })
                    }
                    className={cn(adminInputClass, "mt-2")}
                  />
                </div>

                {lead.lostReason && (
                  <div>
                    <p className={adminLabelClass}>Reason lost</p>
                    <p className="mt-1.5 text-sm text-charcoal-muted">{lead.lostReason}</p>
                  </div>
                )}

                {!can("leads:write") && (
                  <p className="text-xs text-charcoal-muted">
                    Your role can view leads but not change them.
                  </p>
                )}
              </div>
            </Panel>
          </div>

          {/* Notes timeline */}
          <Panel
            className="mt-6"
            title="Notes & activity"
            description="Notes are stored with the lead and attributed to the person who wrote them."
          >
            <div className="p-5 sm:p-6">
              {lead.notes.length === 0 ? (
                <EmptyState title="No notes yet" description="Record what was discussed so anyone can pick this up." />
              ) : (
                <ol className="space-y-5">
                  {[...lead.notes].reverse().map((note) => (
                    <li key={note.id} className="border-l-2 border-gold/40 pl-4">
                      <p className="text-[11px] uppercase tracking-widest2 text-charcoal-muted">
                        {note.authorName} · {formatDateTime(note.createdAt)}
                      </p>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-charcoal">
                        {note.body}
                      </p>
                    </li>
                  ))}
                </ol>
              )}

              {can("leads:write") && (
                <form
                  className="mt-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const parsed = leadNoteSchema.safeParse({ body: noteBody });
                    if (!parsed.success) {
                      setNoteError(parsed.error.issues[0]?.message ?? "Write a note first.");
                      return;
                    }
                    setNoteError(null);
                    noteMutation.mutate(parsed.data.body);
                  }}
                >
                  <label htmlFor="lead-note" className={adminLabelClass}>
                    Add a note
                  </label>
                  <textarea
                    id="lead-note"
                    rows={3}
                    maxLength={2000}
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    className={cn(adminInputClass, "mt-2 resize-y")}
                    placeholder="Called the family, discussing decor options for a December wedding…"
                    aria-invalid={noteError ? true : undefined}
                  />
                  {noteError && (
                    <p role="alert" className="mt-1.5 text-xs text-red-800">
                      {noteError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={noteMutation.isPending}
                    className="btn-solid mt-3 disabled:opacity-70"
                  >
                    {noteMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                      </>
                    ) : (
                      <>
                        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" /> Save note
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
