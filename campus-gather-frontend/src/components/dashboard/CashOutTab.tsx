"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  Search,
  Building2,
  Trash2,
  X,
  ArrowUpRight,
  Receipt,
  PiggyBank,
  FileText,
} from "lucide-react";
import {
  expensesApi,
  committeesApi,
  getApiErrorMessage,
} from "@/lib/api";
import type { User } from "@/types/fest";

export function CashOutTab({ currentUser }: { currentUser: User }) {
  const queryClient = useQueryClient();

  const canManage =
    currentUser.role === "SUPER_ADMIN" || currentUser.role === "CONVENOR";

  const [searchTerm, setSearchTerm] = useState("");
  const [committeeFilter, setCommitteeFilter] = useState("ALL");
  const [isLogExpenseOpen, setIsLogExpenseOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({
    committeeId: "",
    itemTitle: "",
    amount: "",
    voucherNote: "",
  });

  // Queries
  const { data: expensesResponse, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => expensesApi.getAll({ limit: 2000 }),
  });

  const { data: committees, isLoading: committeesLoading } = useQuery({
    queryKey: ["committees"],
    queryFn: () => committeesApi.getAll(),
  });

  const expenses = expensesResponse?.data || [];
  const safeCommittees = committees || [];

  // Mutations
  const createExpenseMutation = useMutation({
    mutationFn: (data: {
      committeeId: number;
      itemTitle: string;
      amount: number;
      voucherNote?: string;
    }) => expensesApi.create(data),
    onSuccess: () => {
      toast.success("Expense voucher logged successfully!");
      setIsLogExpenseOpen(false);
      setExpenseData({
        committeeId: "",
        itemTitle: "",
        amount: "",
        voucherNote: "",
      });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["committees"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to log expense voucher"));
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => {
      toast.success("Expense voucher deleted");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["committees"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to delete expense voucher"));
    },
  });

  const handleLogExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const commId = Number(expenseData.committeeId);
    const amt = Number(expenseData.amount);

    if (!commId) {
      toast.error("Please select a committee");
      return;
    }
    if (!expenseData.itemTitle.trim()) {
      toast.error("Item title is required");
      return;
    }
    if (!amt || amt <= 0) {
      toast.error("Expense amount must be greater than 0");
      return;
    }

    createExpenseMutation.mutate({
      committeeId: commId,
      itemTitle: expenseData.itemTitle.trim(),
      amount: amt,
      voucherNote: expenseData.voucherNote.trim() || undefined,
    });
  };

  // Calculations
  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalAllocatedBudget = safeCommittees.reduce(
    (acc, c) => acc + c.allocatedBudget,
    0
  );
  const remainingBudget = Math.max(0, totalAllocatedBudget - totalExpenses);

  // Filtered expenses
  const filteredExpenses = expenses.filter((exp) => {
    const matchesComm =
      committeeFilter === "ALL" ||
      exp.committeeId.toString() === committeeFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      exp.itemTitle.toLowerCase().includes(q) ||
      (exp.voucherNote && exp.voucherNote.toLowerCase().includes(q)) ||
      (exp.spentBy?.name && exp.spentBy.name.toLowerCase().includes(q)) ||
      (exp.committee?.name && exp.committee.name.toLowerCase().includes(q));

    return matchesComm && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* ─── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Cash Out (Expenses)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dedicated ledger for all funds disbursed across the 13 fest committees with verified vouchers.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsLogExpenseOpen(true)}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Log Cash Out (Expense)
          </button>
        )}
      </div>

      {/* ─── TOP 4 SUMMARY CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Expenses (Cash Out) */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between opacity-90 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Expenses (Cash Out)
            </span>
            <Receipt className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold font-mono tracking-tight">
            {totalExpenses.toLocaleString()} <span className="text-xs font-normal">BDT</span>
          </div>
          <div className="text-[11px] opacity-85 mt-1">
            Disbursed across {expenses.length} committee voucher{expenses.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Card 2: Total Allocated Budget */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Allocated Budget
            </span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {totalAllocatedBudget.toLocaleString()} <span className="text-xs font-normal text-slate-500">BDT</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across all 13 working committees
          </div>
        </div>

        {/* Card 3: Remaining Unspent Budget */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Remaining Budget
            </span>
            <PiggyBank className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold text-[#059669] font-mono tracking-tight">
            {remainingBudget.toLocaleString()} <span className="text-xs font-normal text-slate-500">BDT</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            {totalAllocatedBudget > 0
              ? `${Math.round((remainingBudget / totalAllocatedBudget) * 100)}% budget unspent`
              : "—"}
          </div>
        </div>

        {/* Card 4: Total Vouchers Logged */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Vouchers
            </span>
            <FileText className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {expenses.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Verified receipts & cash disbursements
          </div>
        </div>
      </div>

      {/* ─── FILTERABLE EXPENSE VOUCHERS TABLE ───────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Committee Expense Vouchers Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtered audit table of all disbursements with item title, amount, and notes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search item, spender..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] font-mono text-slate-900 w-44"
              />
            </div>
            <select
              value={committeeFilter}
              onChange={(e) => setCommitteeFilter(e.target.value)}
              className="py-1.5 px-2 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-700 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">All Committees</option>
              {safeCommittees.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-slate-50/70 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Voucher #</th>
                <th className="py-2.5 px-3">Committee</th>
                <th className="py-2.5 px-3">Item / Description</th>
                <th className="py-2.5 px-3 text-right">Amount (BDT)</th>
                <th className="py-2.5 px-3">Authorized Spender</th>
                <th className="py-2.5 px-3">Memo / Voucher Note</th>
                <th className="py-2.5 px-3">Date</th>
                {canManage && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {expensesLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading expense vouchers...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No expense vouchers found matching filter.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                      #{exp.id}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                        {exp.committee?.name || "Committee"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {exp.itemTitle}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 text-sm">
                      {exp.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {exp.spentBy?.name || "Fest Authority"}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {exp.voucherNote || "—"}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {exp.createdAt ? new Date(exp.createdAt).toLocaleDateString() : "—"}
                    </td>
                    {canManage && (
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          disabled={deleteExpenseMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to delete expense voucher "${exp.itemTitle}" (${exp.amount.toLocaleString()} BDT)? This financial action cannot be undone.`
                              )
                            ) {
                              deleteExpenseMutation.mutate(exp.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: LOG EXPENSE ─────────────────────────────────────────── */}
      {isLogExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  Log Cash Out (Expense)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLogExpenseOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogExpenseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Responsible Committee *
                </label>
                <select
                  required
                  value={expenseData.committeeId}
                  onChange={(e) =>
                    setExpenseData((prev) => ({ ...prev, committeeId: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">Select Committee</option>
                  {safeCommittees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Budget: {c.allocatedBudget.toLocaleString()} BDT)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Item Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stage backdrop printing or Sound rent"
                  value={expenseData.itemTitle}
                  onChange={(e) =>
                    setExpenseData((prev) => ({ ...prev, itemTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Expense Amount (BDT) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="e.g. 8500"
                  value={expenseData.amount}
                  onChange={(e) =>
                    setExpenseData((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Voucher / Receipt Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Vendor name, receipt/invoice #, payment method"
                  value={expenseData.voucherNote}
                  onChange={(e) =>
                    setExpenseData((prev) => ({ ...prev, voucherNote: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsLogExpenseOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {createExpenseMutation.isPending ? "Logging..." : "Confirm Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
