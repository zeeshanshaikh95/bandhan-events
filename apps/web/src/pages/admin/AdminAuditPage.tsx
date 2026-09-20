import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ROLE_LABELS } from "@bandhan/shared";
import {
  AdminSeo,
  EmptyState,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  adminInputClass,
  adminLabelClass,
  formatDateTime,
} from "@/components/admin/AdminUI";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { ApiClientError } from "@/lib/apiClient";
import { auditApi } from "@/services/api";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 50;

/**
 * Entity types the API currently records against. Kept explicit so the filter
 * never offers a value that cannot exist.
 */
const ENTITY_TYPES = ["Session", "User", "Lead", "SiteSetting"] as const;

export default function AdminAuditPage() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const debouncedAction = useDebouncedValue(action);

  const logs = useQuery({
    queryKey: ["audit", { entityType, action: debouncedAction, page }],
    queryFn: () =>
      auditApi.list({
        page,
        limit: PAGE_SIZE,
        entityType: entityType || undefined,
        action: debouncedAction || undefined,
      }),
  });

  const data = logs.data;

  return (
    <>
      <AdminSeo title="Audit Logs" />
      <PageHeading
        eyebrow="Governance"
        title="Audit logs"
        description="Sign-ins, account changes, lead changes and setting updates. Entries are append-only and never store passwords or tokens."
      />

      <div className="mt-6 flex flex-col gap-3 border border-forest/10 bg-ivory-soft p-4 sm:flex-row sm:items-end">
        <div>
          <label htmlFor="audit-entity" className={adminLabelClass}>
            Entity
          </label>
          <select
            id="audit-entity"
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              setPage(1);
            }}
            className={cn(adminInputClass, "mt-2 sm:w-44")}
          >
            <option value="">All entities</option>
            {ENTITY_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="audit-action" className={adminLabelClass}>
            Action contains
          </label>
          <input
            id="audit-action"
            type="search"
            value={action}
            placeholder="e.g. lead."
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            className={cn(adminInputClass, "mt-2")}
          />
        </div>
      </div>

      <Panel className="mt-4">
        {logs.isLoading ? (
          <LoadingRows rows={8} columns={4} />
        ) : logs.isError ? (
          <div className="p-5">
            <RetryState
              message={
                logs.error instanceof ApiClientError
                  ? logs.error.message
                  : "We could not load the audit log."
              }
              onRetry={() => logs.refetch()}
            />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No audit entries"
            description="Actions are recorded here as staff use the dashboard."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] border-collapse text-sm">
                <caption className="sr-only">
                  Audit log, page {data.page} of {data.totalPages}
                </caption>
                <thead>
                  <tr className="border-b border-forest/10 text-left">
                    {["When", "Who", "Action", "Entity", "IP"].map((heading) => (
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
                  {data.items.map((entry) => (
                    <tr key={entry.id} className="border-b border-forest/5 last:border-0">
                      <td className="whitespace-nowrap px-5 py-3 text-charcoal-muted">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        {entry.actor ? (
                          <>
                            <span className="text-forest">{entry.actor.name}</span>
                            <span className="block text-[11px] text-charcoal-muted">
                              {ROLE_LABELS[entry.actor.role]}
                            </span>
                          </>
                        ) : (
                          <span className="text-charcoal-muted">System</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-charcoal">{entry.action}</td>
                      <td className="px-5 py-3 text-charcoal-muted">
                        {entry.entityType}
                        {entry.entityId && (
                          <span className="block text-[11px] opacity-70">{entry.entityId}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-charcoal-muted">{entry.ip ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-forest/10 px-5 py-4">
              <p className="text-xs text-charcoal-muted">
                Showing {data.items.length} of {data.total}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={data.page <= 1}
                  className="btn-outline !px-4 !py-2 !text-[10px] disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-charcoal-muted">
                  Page {data.page} / {data.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => value + 1)}
                  disabled={data.page >= data.totalPages}
                  className="btn-outline !px-4 !py-2 !text-[10px] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
