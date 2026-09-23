import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Check,
  Loader2,
  PiggyBank,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { financeApi, type InvestmentDto } from "@/services/api";
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

const INVESTMENT_TYPES = [
  { value: "capital", label: "Capital Investment" },
  { value: "additional-contribution", label: "Additional Contribution" },
  { value: "withdrawal", label: "Withdrawal" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

interface InvestmentForm {
  date: string;
  partner: string;
  amount: number;
  type: string;
  purpose: string;
  paymentMethod: string;
  reference: string;
  notes: string;
}

export default function AdminInvestmentsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = can("partners:write");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const investments = useQuery({
    queryKey: ["investments", search],
    queryFn: () => financeApi.listInvestments({ search: search || undefined, limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvestmentForm>({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      partner: "",
      amount: 0,
      type: "capital",
      purpose: "",
      paymentMethod: "cash",
      reference: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InvestmentForm) => financeApi.createInvestment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setShowForm(false);
      reset();
      setFormError(null);
    },
    onError: (err: any) => setFormError(err?.message || "Failed to record investment."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteInvestment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investments"] }),
  });

  const onSubmit = (data: InvestmentForm) => {
    createMutation.mutate(data);
  };

  return (
    <>
      <AdminSeo title="Investments" />
      <PageHeading
        eyebrow="Finance"
        title="Investments"
        description="Track partner contributions and capital. Investments are kept separate from business expenses."
        actions={
          canWrite ? (
            <button onClick={() => setShowForm(true)} className="btn-solid">
              <Plus className="h-4 w-4" /> Record Investment
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
            placeholder="Search by partner or purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-forest/15 bg-white py-2 pl-9 pr-3 text-sm text-charcoal outline-none focus:border-forest/40"
          />
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mt-6">
          <Panel title="Record Investment" description="Track partner capital and contributions.">
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 sm:p-6 space-y-4">
              <FormError message={formError} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={adminLabelClass}>Date</label>
                  <input
                    type="date"
                    {...register("date", { required: "Date is required" })}
                    className={cn(adminInputClass, "mt-1")}
                  />
                  {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
                </div>
                <div>
                  <label className={adminLabelClass}>Partner Name</label>
                  <input
                    type="text"
                    {...register("partner", { required: "Partner name is required" })}
                    className={cn(adminInputClass, "mt-1")}
                  />
                  {errors.partner && <p className="mt-1 text-xs text-red-600">{errors.partner.message}</p>}
                </div>
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
                  <label className={adminLabelClass}>Type</label>
                  <select {...register("type")} className={cn(adminInputClass, "mt-1")}>
                    {INVESTMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={adminLabelClass}>Payment Method</label>
                  <select {...register("paymentMethod")} className={cn(adminInputClass, "mt-1")}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <TextField id="purpose" label="Purpose" placeholder="e.g. Equipment purchase, Working capital" {...register("purpose")} />
              <TextField id="reference" label="Reference" {...register("reference")} />
              <TextField id="notes" label="Notes" {...register("notes")} />
              <div className="flex gap-3">
                <button type="submit" disabled={createMutation.isPending} className="btn-solid">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Record Investment
                </button>
                <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      {/* Investments Table */}
      <div className="mt-6">
        {investments.isLoading ? (
          <LoadingRows rows={5} columns={6} />
        ) : investments.isError ? (
          <RetryState message="Failed to load investments." onRetry={() => investments.refetch()} />
        ) : !investments.data || investments.data.items.length === 0 ? (
          <div className="border border-forest/10 bg-ivory-soft p-8 text-center">
            <PiggyBank className="mx-auto h-8 w-8 text-charcoal-muted" />
            <p className="mt-2 text-sm text-charcoal-muted">No investments recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-forest/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-forest/10 bg-ivory/50">
                  <th className="px-4 py-3 text-left font-medium text-forest">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Partner</th>
                  <th className="px-4 py-3 text-right font-medium text-forest">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Purpose</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Method</th>
                  {canWrite && <th className="px-4 py-3 text-right font-medium text-forest">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {investments.data?.items.map((inv: InvestmentDto) => (
                  <tr key={inv.id} className="border-b border-forest/5 hover:bg-ivory/30">
                    <td className="px-4 py-3">{new Date(inv.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 font-medium">{inv.partner}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.amount)}</td>
                    <td className="px-4 py-3 capitalize">{inv.type.replace("-", " ")}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-charcoal-muted">{inv.purpose || "—"}</td>
                    <td className="px-4 py-3 capitalize">{inv.paymentMethod.replace("-", " ")}</td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm("Delete this investment record? This action is logged.")) {
                              deleteMutation.mutate(inv.id);
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
