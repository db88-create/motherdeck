"use client";

import { useState } from "react";
import { useFetch, useApi } from "@/lib/hooks";
import { Idea, Expense } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Lightbulb, Receipt, Trash2 } from "lucide-react";

const IDEA_STATUS_COLORS: Record<string, string> = {
  captured: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  exploring: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  planned: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  implemented: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  parked: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export function IdeasExpensesView() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Ideas & Expenses</h1>
      <Tabs defaultValue="ideas">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="ideas" className="data-[state=active]:bg-zinc-700">
            <Lightbulb className="w-4 h-4 mr-1.5" /> Ideas
          </TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-zinc-700">
            <Receipt className="w-4 h-4 mr-1.5" /> Expenses
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ideas">
          <IdeasTab />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpensesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IdeasTab() {
  const { data: ideas, loading, refetch } = useFetch<Idea[]>("/api/ideas");
  const { post, patch, del, submitting } = useApi();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newIdea, setNewIdea] = useState({
    title: "",
    description: "",
    priority: "medium",
    effort: "medium",
    impact: "medium",
    project: "",
  });

  const handleCreate = async () => {
    if (!newIdea.title.trim()) return;
    await post("/api/ideas", newIdea);
    setNewIdea({
      title: "",
      description: "",
      priority: "medium",
      effort: "medium",
      impact: "medium",
      project: "",
    });
    setDialogOpen(false);
    refetch();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await patch(`/api/ideas/${id}`, { status });
    refetch();
  };

  const handleDelete = async (id: string) => {
    await del(`/api/ideas/${id}`);
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Idea
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Capture Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Idea title"
                value={newIdea.title}
                onChange={(e) =>
                  setNewIdea({ ...newIdea, title: e.target.value })
                }
                className="bg-zinc-950 border-zinc-800 text-white"
              />
              <Textarea
                placeholder="Description"
                value={newIdea.description}
                onChange={(e) =>
                  setNewIdea({ ...newIdea, description: e.target.value })
                }
                className="bg-zinc-950 border-zinc-800 text-white"
              />
              <div className="grid grid-cols-3 gap-3">
                <Select
                  value={newIdea.priority}
                  onValueChange={(v) =>
                    v && setNewIdea({ ...newIdea, priority: v })
                  }
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={newIdea.effort}
                  onValueChange={(v) =>
                    v && setNewIdea({ ...newIdea, effort: v })
                  }
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue placeholder="Effort" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={newIdea.impact}
                  onValueChange={(v) =>
                    v && setNewIdea({ ...newIdea, impact: v })
                  }
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Project (optional)"
                value={newIdea.project}
                onChange={(e) =>
                  setNewIdea({ ...newIdea, project: e.target.value })
                }
                className="bg-zinc-950 border-zinc-800 text-white"
              />
              <Button
                onClick={handleCreate}
                disabled={submitting || !newIdea.title.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                Capture Idea
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(ideas || []).length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          <p>No ideas captured yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(ideas || []).map((idea) => (
            <Card
              key={idea.id}
              className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {idea.fields.Title}
                    </p>
                    {idea.fields.Description && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                        {idea.fields.Description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Select
                        value={idea.fields.Status}
                        onValueChange={(v) =>
                          v && handleStatusChange(idea.id, v)
                        }
                      >
                        <SelectTrigger className="h-6 text-xs bg-transparent border-zinc-700 text-zinc-300 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {Object.keys(IDEA_STATUS_COLORS).map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge
                        variant="outline"
                        className="text-xs bg-zinc-800/50 text-zinc-400 border-zinc-700"
                      >
                        {idea.fields.Effort} effort
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs bg-zinc-800/50 text-zinc-400 border-zinc-700"
                      >
                        {idea.fields.Impact} impact
                      </Badge>
                      {idea.fields.Project && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/20"
                        >
                          {idea.fields.Project}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(idea.id)}
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpensesTab() {
  const { data: expenses, loading, refetch } = useFetch<Expense[]>("/api/expenses");
  const { post, submitting } = useApi();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "Infrastructure",
    vendor: "",
    entity: "",
    date: new Date().toISOString().split("T")[0],
  });

  const handleCreate = async () => {
    if (!newExpense.description.trim() || !newExpense.amount) return;
    await post("/api/expenses", {
      ...newExpense,
      amount: parseFloat(newExpense.amount),
    });
    setNewExpense({
      description: "",
      amount: "",
      category: "Infrastructure",
      vendor: "",
      entity: "",
      date: new Date().toISOString().split("T")[0],
    });
    setDialogOpen(false);
    refetch();
  };

  const totalExpenses = (expenses || []).reduce(
    (sum, e) => sum + (e.fields.Amount || 0),
    0
  );

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">Total Expenses</p>
          <p className="text-2xl font-bold text-white tabular-nums">
            ${totalExpenses.toFixed(2)}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Expense
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Log Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Description"
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
                className="bg-zinc-950 border-zinc-800 text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, amount: e.target.value })
                  }
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
                <Select
                  value={newExpense.category}
                  onValueChange={(v) =>
                    v && setNewExpense({ ...newExpense, category: v })
                  }
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                    <SelectItem value="SaaS">SaaS</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Services">Services</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Vendor"
                  value={newExpense.vendor}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, vendor: e.target.value })
                  }
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
                <Input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, date: e.target.value })
                  }
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={
                  submitting ||
                  !newExpense.description.trim() ||
                  !newExpense.amount
                }
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                Log Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(expenses || []).length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          <p>No expenses logged yet</p>
        </div>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs text-zinc-500 font-medium p-3">
                    Description
                  </th>
                  <th className="text-left text-xs text-zinc-500 font-medium p-3">
                    Category
                  </th>
                  <th className="text-left text-xs text-zinc-500 font-medium p-3">
                    Vendor
                  </th>
                  <th className="text-left text-xs text-zinc-500 font-medium p-3">
                    Date
                  </th>
                  <th className="text-right text-xs text-zinc-500 font-medium p-3">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {(expenses || []).map((exp) => (
                  <tr
                    key={exp.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                  >
                    <td className="p-3 text-sm text-white">
                      {exp.fields.Description}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className="text-xs bg-zinc-800/50 text-zinc-400 border-zinc-700"
                      >
                        {exp.fields.Category}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-zinc-400">
                      {exp.fields.Vendor || "—"}
                    </td>
                    <td className="p-3 text-sm text-zinc-400">
                      {exp.fields.Date}
                    </td>
                    <td className="p-3 text-sm text-white text-right tabular-nums font-medium">
                      ${exp.fields.Amount?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
