import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import { customerCreateSchema, type CustomerCreateInput } from "@bandhan/shared";
import { customerApi } from "@/services/api";
import {
  AdminSeo,
  EmptyState,
  FormError,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  TextField,
  formatDate,
} from "@/components/admin/AdminUI";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/utils/cn";

export default function AdminCustomersPage() {
  const { can } = useAuth();
  const canWrite = can("customers:write");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ["customers", search],
    queryFn: () => customerApi.list({ search: search || undefined, limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerCreateInput>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: { name: "", phone: "", email: "", address: "", notes: "", confirmDuplicate: false },
  });

  const createCustomer = useMutation({
    mutationFn: (values: CustomerCreateInput) => customerApi.create(values),
    onSuccess: (customer) => {
      setNotice(`${customer.name} added to the customer list.`);
      setFormOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const onSubmit = handleSubmit((values) => {
    setNotice(null);
    createCustomer.mutate(values);
  });

  return (
    <>
      <AdminSeo title="Customers" />
      <PageHeading
        eyebrow="Relationships"
        title="Customers"
        description="Everyone Bandhan Events has quoted or booked. A customer is created once and referenced by every quotation, event and invoice."
        actions={
          canWrite ? (
            <button type="button" className="btn-solid" onClick={() => setFormOpen((open) => !open)}>
              <UserPlus className="h-4 w-4" aria-hidden="true" /> New customer
            </button>
          ) : undefined
        }
      />

      {notice && (
        <p role="status" className="mt-5 border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-forest">
          {notice}
        </p>
      )}

      {formOpen && canWrite && (
        <Panel title="Add a customer" className="mt-6">
          <form onSubmit={onSubmit} className="space-y-5 p-5" noValidate>
            <FormError
              message={
                createCustomer.isError
                  ? (createCustomer.error as Error).message ||
                    "That customer could not be saved. Please try again."
                  : null
              }
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                id="customer-name"
                label="Name"
                required
                autoComplete="name"
                error={errors.name?.message}
                {...register("name")}
              />
              <TextField
                id="customer-phone"
                label="Phone"
                required
                inputMode="tel"
                placeholder="98765 43210"
                hint="Used to prevent duplicate customer records."
                error={errors.phone?.message}
                {...register("phone")}
              />
              <TextField
                id="customer-email"
                label="Email"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register("email")}
              />
              <TextField
                id="customer-address"
                label="Address"
                error={errors.address?.message}
                {...register("address")}
              />
            </div>
            <div>
              <label htmlFor="customer-notes" className="block font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                Notes
              </label>
              <textarea
                id="customer-notes"
                rows={3}
                {...register("notes")}
                className="mt-2 w-full border border-forest/15 bg-ivory-soft px-3.5 py-2.5 text-sm text-charcoal focus:border-forest focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-solid" disabled={isSubmitting || createCustomer.isPending}>
                {createCustomer.isPending ? "Saving…" : "Save customer"}
              </button>
              <button type="button" className="btn-outline" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Panel>
      )}

      <div className="relative mt-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or phone…"
          aria-label="Search customers"
          className="w-full border border-forest/15 bg-ivory-soft py-2.5 pl-9 pr-3 text-sm text-charcoal focus:border-forest focus:outline-none"
        />
      </div>

      <div className="mt-6 border border-forest/10 bg-ivory-soft">
        {customers.isLoading ? (
          <LoadingRows rows={6} columns={4} />
        ) : customers.isError ? (
          <RetryState message="Customers could not be loaded." onRetry={() => customers.refetch()} />
        ) : !customers.data || customers.data.items.length === 0 ? (
          <EmptyState
            title="No customers yet"
            description="Customers are created here or automatically when a lead is converted."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-forest/10">
                  <th className="px-5 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">Name</th>
                  <th className="px-5 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">Phone</th>
                  <th className="px-5 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">Email</th>
                  <th className="px-5 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">Added</th>
                  <th className="px-5 py-3 text-right font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">Documents</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y divide-forest/5")}>
                {customers.data.items.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-5 py-3.5">
                      <Link to={`/admin/quotations?customer=${customer.id}`} className="font-medium text-forest hover:underline">
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-charcoal">{customer.phone}</td>
                    <td className="px-5 py-3.5 text-charcoal-muted">{customer.email || "—"}</td>
                    <td className="px-5 py-3.5 text-charcoal-muted">{formatDate(customer.createdAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link to={`/admin/quotations?customer=${customer.id}`} className="text-xs text-forest hover:underline">
                        View quotations
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
