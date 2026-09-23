import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Check,
  CreditCard,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { financeApi, type PaymentDto } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";
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
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/utils/cn";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

interface PaymentForm {
  amount: number;
  paymentDate: string;
  method: string;
  reference: string;
  notes: string;
  status: string;
}

export default function AdminPaymentsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = can("payments:write");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const payments = useQuery({
    queryKey: ["payments", search],
    queryFn: () => financeApi.listPayments({ search: search || undefined, limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentForm>({
    defaultValues: {
      amount: 0,
      paymentDate: new Date().toISOString().split("T")[0],
      method: "cash",
      reference: "",
      notes: "",
      status: "RECEIVED",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: PaymentForm) => financeApi.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setShowForm(false);
      reset();
      setFormError(null);
    },
    onError: (err: any) => setFormError(err?.message || "Failed to create payment."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deletePayment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });

  const onSubmit = (data: PaymentForm) => {
    if (editingId) {
      // TODO: Implement update
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <>
      <AdminSeo title="Payments" />
      <PageHeading
        eyebrow="Finance"
        title="Payments"
        description="Track all customer payments received. Payments are linked to bookings when available."
        actions={
          canWrite ? (
            <button onClick={() => { setShowForm(true); setEditingId(null); }} className="btn-solid">
              <Plus className="h-4 w-4" /> New Payment
            </button>
          ) : undefined
        }
      />

      {/* Search */}
      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
          <input
            type="text"
            placeholder="Search by reference or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-forest/15 bg-white py-2 pl-9 pr-3 text-sm text-charcoal outline-none focus:border-forest/40"
          />
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mt-6">
          <Panel title={editingId ? "Edit Payment" : "Record Payment"} description="All fields are validated server-side.">
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 sm:p-6 space-y-4">
              <FormError message={formError} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={adminLabelClass}>Amount (₹)</label>
                  <input
                    type="number"
                    {...register("amount", { required: "Amount is required", min: { value: 1, message: "Minimum ₹1" } })}
                    className={cn(adminInputClass, "mt-1")}
                  />
                  {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
                </div>
                <div>
                  <label className={adminLabelClass}>Payment Date</label>
                  <input
                    type="date"
                    {...register("paymentDate", { required: "Date is required" })}
                    className={cn(adminInputClass, "mt-1")}
                  />
                  {errors.paymentDate && <p className="mt-1 text-xs text-red-600">{errors.paymentDate.message}</p>}
                </div>
                <div>
                  <label className={adminLabelClass}>Payment Method</label>
                  <select {...register("method")} className={cn(adminInputClass, "mt-1")}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={adminLabelClass}>Status</label>
                  <select {...register("status")} className={cn(adminInputClass, "mt-1")}>
                    <option value="RECEIVED">Received</option>
                    <option value="PENDING">Pending</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>
              </div>
              <TextField id="reference" label="Transaction Reference" {...register("reference")} />
              <TextField id="notes" label="Notes" {...register("notes")} />
              <div className="flex gap-3">
                <button type="submit" disabled={createMutation.isPending} className="btn-solid">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editingId ? "Update" : "Record"} Payment
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); reset(); }} className="btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      {/* Payments Table */}
      <div className="mt-6">
        {payments.isLoading ? (
          <LoadingRows rows={5} columns={6} />
        ) : payments.isError ? (
          <RetryState message="Failed to load payments." onRetry={() => payments.refetch()} />
        ) : !payments.data || payments.data.items.length === 0 ? (
          <div className="border border-forest/10 bg-ivory-soft p-8 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-charcoal-muted" />
            <p className="mt-2 text-sm text-charcoal-muted">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-forest/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-forest/10 bg-ivory/50">
                  <th className="px-4 py-3 text-left font-medium text-forest">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Customer</th>
                  <th className="px-4 py-3 text-right font-medium text-forest">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Method</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Reference</th>
                  {canWrite && <th className="px-4 py-3 text-right font-medium text-forest">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {payments.data?.items.map((p: PaymentDto) => (
                  <tr key={p.id} className="border-b border-forest/5 hover:bg-ivory/30">
                    <td className="px-4 py-3">{new Date(p.paymentDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3">{p.customer?.name || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 capitalize">{p.method.replace("-", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        p.status === "RECEIVED" && "bg-green-100 text-green-800",
                        p.status === "PENDING" && "bg-yellow-100 text-yellow-800",
                        p.status === "REFUNDED" && "bg-red-100 text-red-800",
                      )}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-charcoal-muted">{p.reference || "—"}</td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm("Void this payment? This will affect financial reports.")) {
                              deleteMutation.mutate(p.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
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
