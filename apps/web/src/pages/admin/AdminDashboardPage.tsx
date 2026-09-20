import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, ExternalLink, Plug, XCircle } from "lucide-react";
import { LEAD_SOURCES, LEAD_STATUS_LABELS, LEAD_STATUSES, type LeadStatus } from "@bandhan/shared";
import { dashboardApi } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";
import {
  AdminSeo,
  EmptyState,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  StatCard,
  StatusPill,
  formatDate,
  humanizeSlug,
} from "@/components/admin/AdminUI";
import { ApiClientError } from "@/lib/apiClient";

export default function AdminDashboardPage() {
  const { user, can } = useAuth();

  const stats = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardApi.stats(),
  });

  const integrations = useQuery({
    queryKey: ["dashboard", "integrations"],
    queryFn: () => dashboardApi.integrations(),
    enabled: can("settings:read"),
  });

  const data = stats.data;
  const statusCounts = data?.leadsByStatus ?? {};
  const maxStatusCount = Math.max(1, ...Object.values(statusCounts));
  const sourceCounts = data?.leadsBySource ?? {};
  const maxSourceCount = Math.max(1, ...Object.values(sourceCounts));

  return (
    <>
      <AdminSeo title="Dashboard" />
      <PageHeading
        eyebrow="Overview"
        title={user ? `Welcome, ${user.name.split(" ")[0]}` : "Overview"}
        description="Live counts from the database. Nothing here is estimated or pre-filled."
        actions={
          can("leads:write") ? (
            <Link to="/admin/leads?new=1" className="btn-solid !text-[11px]">
              Record a lead
            </Link>
          ) : null
        }
      />

      {/* Counters */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Enquiries today"
          value={data?.todaysEnquiries ?? 0}
          loading={stats.isLoading}
          hint="Website + manually recorded, since midnight"
        />
        <StatCard
          label="New leads"
          value={data?.newLeads ?? 0}
          loading={stats.isLoading}
          hint="Not contacted yet"
        />
        <StatCard
          label="Follow-ups due"
          value={data?.followUpsDue ?? 0}
          loading={stats.isLoading}
          hint="Scheduled on or before today"
        />
        <StatCard
          label="Total leads"
          value={data?.totalLeads ?? 0}
          loading={stats.isLoading}
          hint="All time"
        />
      </div>

      {stats.isError && (
        <div className="mt-6">
          <RetryState
            message={
              stats.error instanceof ApiClientError
                ? stats.error.message
                : "We could not load the dashboard."
            }
            onRetry={() => stats.refetch()}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Lead pipeline */}
        <Panel title="Lead pipeline" description="Distribution of every lead by current status.">
          <div className="space-y-3 p-5">
            {stats.isLoading && <span className="block h-40 animate-pulse bg-cream" />}
            {!stats.isLoading &&
              LEAD_STATUSES.map((status: LeadStatus) => {
                const count = statusCounts[status] ?? 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-[11px] uppercase tracking-widest2 text-charcoal-muted">
                      {LEAD_STATUS_LABELS[status]}
                    </span>
                    <span className="h-2 flex-1 bg-cream">
                      <span
                        className="block h-2 bg-forest/70"
                        style={{ width: `${(count / maxStatusCount) * 100}%` }}
                      />
                    </span>
                    <span className="w-8 text-right text-sm text-forest">{count}</span>
                  </div>
                );
              })}
          </div>
        </Panel>

        {/* Lead sources */}
        <Panel title="Where leads come from" description="Attribution recorded on each lead.">
          <div className="space-y-3 p-5">
            {stats.isLoading && <span className="block h-40 animate-pulse bg-cream" />}
            {!stats.isLoading && Object.keys(sourceCounts).length === 0 && (
              <p className="text-sm text-charcoal-muted">
                No leads recorded yet. Website enquiries appear here with source “Website”.
              </p>
            )}
            {!stats.isLoading &&
              LEAD_SOURCES.filter((source) => (sourceCounts[source] ?? 0) > 0).map((source) => {
                const count = sourceCounts[source] ?? 0;
                return (
                  <div key={source} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-[11px] uppercase tracking-widest2 text-charcoal-muted">
                      {humanizeSlug(source)}
                    </span>
                    <span className="h-2 flex-1 bg-cream">
                      <span
                        className="block h-2 bg-gold/70"
                        style={{ width: `${(count / maxSourceCount) * 100}%` }}
                      />
                    </span>
                    <span className="w-8 text-right text-sm text-forest">{count}</span>
                  </div>
                );
              })}
          </div>
        </Panel>
      </div>

      {/* Recent enquiries */}
      <Panel
        className="mt-6"
        title="Recent enquiries"
        description="The latest website and manually recorded leads."
        actions={
          can("leads:read") ? (
            <Link
              to="/admin/leads"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest2 text-forest transition hover:text-gold-deep"
            >
              All leads <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null
        }
      >
        {stats.isLoading ? (
          <LoadingRows rows={5} columns={4} />
        ) : !data || data.recentLeads.length === 0 ? (
          <EmptyState
            title="No enquiries yet"
            description="Enquiries submitted on the website are stored here automatically."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <caption className="sr-only">Recent enquiries</caption>
              <thead>
                <tr className="border-b border-forest/10 text-left">
                  {["Received", "Name", "Event", "Source", "Status"].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-forest/5 last:border-0">
                    <td className="px-5 py-3 text-charcoal-muted">{formatDate(lead.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Link to={`/admin/leads/${lead.id}`} className="link-underline text-forest">
                        {lead.name}
                      </Link>
                      <span className="block text-[11px] text-charcoal-muted">{lead.phone}</span>
                    </td>
                    <td className="px-5 py-3 text-charcoal-muted">
                      {humanizeSlug(lead.eventType)}
                      {lead.eventDate && (
                        <span className="block text-[11px]">{formatDate(lead.eventDate)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-charcoal-muted">{humanizeSlug(lead.source)}</td>
                    <td className="px-5 py-3">
                      <StatusPill status={lead.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Integrations — honest connection status, never a fake "connected" */}
      {can("settings:read") && (
        <Panel
          className="mt-6"
          title="Integrations"
          description="External services are only marked connected when credentials are actually configured."
        >
          <ul className="divide-y divide-forest/5">
            {integrations.isLoading && <li className="px-5 py-4 text-sm text-charcoal-muted">Checking…</li>}
            {integrations.data?.map((integration) => (
              <li key={integration.key} className="flex items-start gap-3 px-5 py-4">
                {integration.connected ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-muted/60" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-forest">
                    {integration.label}
                    {integration.manualStatus === "LINKED" && (
                      <span className="ml-2 inline-flex items-center border border-forest/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest2 text-forest">
                        Linked
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-charcoal-muted">{integration.note}</p>
                </div>
                {integration.profileUrl && (
                  <a
                    href={integration.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 text-[11px] uppercase tracking-widest2 text-forest transition hover:text-gold-deep"
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
            {integrations.isError && (
              <li className="px-5 py-4 text-sm text-charcoal-muted">
                Integration status is unavailable right now.
              </li>
            )}
          </ul>
        </Panel>
      )}

      {!data?.upcomingEvents && !data?.confirmedBookings && (
        <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-charcoal-muted">
          <Plug className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Bookings, quotations, payments and expenses are not built yet, so no revenue or profit
          figures are shown — those screens arrive with the modules that own the data.
        </p>
      )}
    </>
  );
}
