import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Check,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import { financeApi, type ExpenseDto } from "@/services/api";
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

const EXPENSE_CATEGORIES = [
  { value: "decoration", label: "Decoration" },
  { value: "flowers", label: "Flowers" },
  { value: "lighting", label: "Lighting" },
  { value: "furniture", label: "Furniture" },
  { value: "transport", label: "Transport" },
  { value: "labour", label: "Labour" },
  { value: "catering", label: "Catering" },
  { value: "venue", label: "Venue" },
  { value: "marketing", label: "Marketing" },
  { value: "printing", label: "Printing" },
  { value: "equipment", label: "Equipment" },
  { value: "vendor", label: "Vendor" },
  { value: "miscellaneous", label: "Miscellaneous" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

interface ExpenseForm {
  date: string;
  category: string;
  amount: number;
  description: string;
  vendorName: string;
  paymentMethod: string;
  paidBy: string;
  notes: string;
}

export default function AdminExpensesPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = can("expenses:write");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const expenses = useQuery({
    queryKey: ["expenses", search],
    queryFn: () => financeApi.listExpenses({ search: search || undefined, limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseForm>({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      category: "decoration",
      amount: 0,
      description: "",
      vendorName: "",
      paymentMethod: "cash",
      paidBy: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ExpenseForm) => financeApi.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowForm(false);
      reset();
      setFormError(null);
    },
    onError: (err: any) => setFormError(err?.message || "Failed to create expense."),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => financeApi.archiveExpense(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const onSubmit = (data: ExpenseForm) => {
    createMutation.mutate(data);
  };

  return (
    <>
      <AdminSeo title="Expenses" />
      <PageHeading
        eyebrow="Finance"
        title="Expenses"
        description="Track all business expenses. Link expenses to events for profit calculation."
        actions={
          canWrite ? (
            <button onClick={() => setShowForm(true)} className="btn-solid">
              <Plus className="h-4 w-4" /> New Expense
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
            placeholder="Search by description, vendor, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-forest/15 bg-white py-2 pl-9 pr-3 text-sm text-charcoal outline-none focus:border-forest/40"
          />
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mt-6">
          <Panel title="Record Expense" description="All fields are validated server-side.">
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
                  <label className={adminLabelClass}>Category</label>
                  <select {...register("category")} className={cn(adminInputClass, "mt-1")}>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
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
                  <label className={adminLabelClass}>Payment Method</label>
                  <select {...register("paymentMethod")} className={cn(adminInputClass, "mt-1")}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <TextField id="description" label="Description" {...register("description")} />
              <TextField id="vendorName" label="Vendor Name" {...register("vendorName")} />
              <TextField id="paidBy" label="Paid By" {...register("paidBy")} />
              <TextField id="notes" label="Notes" {...register("notes")} />
              <div className="flex gap-3">
                <button type="submit" disabled={createMutation.isPending} className="btn-solid">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Record Expense
                </button>
                <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      {/* Expenses Table */}
      <div className="mt-6">
        {expenses.isLoading ? (
          <LoadingRows rows={5} columns={7} />
        ) : expenses.isError ? (
          <RetryState message="Failed to load expenses." onRetry={() => expenses.refetch()} />
        ) : !expenses.data || expenses.data.items.length === 0 ? (
          <div className="border border-forest/10 bg-ivory-soft p-8 text-center">
            <Receipt className="mx-auto h-8 w-8 text-charcoal-muted" />
            <p className="mt-2 text-sm text-charcoal-muted">No expenses recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-forest/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-forest/10 bg-ivory/50">
                  <th className="px-4 py-3 text-left font-medium text-forest">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Description</th>
                  <th className="px-4 py-3 text-right font-medium text-forest">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Method</th>
                  {canWrite && <th className="px-4 py-3 text-right font-medium text-forest">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.data?.items.map((e: ExpenseDto) => (
                  <tr key={e.id} className="border-b border-forest/5 hover:bg-ivory/30">
                    <td className="px-4 py-3">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 capitalize">{e.category.replace("-", " ")}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{e.description || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3">{e.vendorName || e.vendor?.name || "—"}</td>
                    <td className="px-4 py-3 capitalize">{e.paymentMethod.replace("-", " ")}</td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm("Archive this expense? It will be hidden from normal views.")) {
                              archiveMutation.mutate(e.id);
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
