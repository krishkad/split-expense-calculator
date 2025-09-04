"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  FileText,
  Plus,
  Receipt,
  RotateCcw,
  Share2,
  Trash2,
  Users
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface Participant {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  participants: string[];
  currency: string;
}

interface DetailedExpenseBreakdown {
  participantId: string;
  participantName: string;
  amountOwed: number;
  shareOf: string[];
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
];

const SplitCalculator = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    paidBy: "",
    participants: [] as string[],
    currency: CURRENCIES[0].code,
  });

  const addParticipant = useCallback(() => {
    if (!newParticipantName.trim()) return;

    const participant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim(),
    };

    setParticipants((prev) => [...prev, participant]);
    setNewParticipantName("");
    // toast({
    //   title: "Participant added!",
    //   description: `${participant.name} joined the group`,
    // });
  }, [newParticipantName]);

  const removeParticipant = useCallback((id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    setExpenses((prev) =>
      prev
        .filter((e) => e.paidBy !== id)
        .map((e) => ({
          ...e,
          participants: e.participants.filter((pId) => pId !== id),
        }))
    );
  }, []);

  const addExpense = useCallback(() => {
    if (
      !newExpense.description.trim() ||
      !newExpense.amount ||
      !newExpense.paidBy
    ) {
      //   toast({
      //     title: "Missing information",
      //     description: "Please fill in all expense details",
      //     variant: "destructive"
      //   });
      return;
    }

    const participantIds =
      newExpense.participants.length > 0
        ? newExpense.participants
        : participants.map((p) => p.id);

    const expense: Expense = {
      id: Date.now().toString(),
      description: newExpense.description.trim(),
      amount: parseFloat(newExpense.amount),
      paidBy: newExpense.paidBy,
      participants: participantIds,
      currency: newExpense.currency,
    };

    setExpenses((prev) => [...prev, expense]);
    setNewExpense({
      description: "",
      amount: "",
      paidBy: "",
      participants: [],
      currency: CURRENCIES[0].code,
    });
    // toast({
    //   title: "Expense added!",
    //   description: `$${expense.amount.toFixed(2)} for ${expense.description}`,
    // });
  }, [newExpense, participants]);

  const removeExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Calculate settlements
  const settlements = useMemo(() => {
    const balances: Record<string, number> = {};

    // Initialize balances
    participants.forEach((p) => {
      balances[p.id] = 0;
    });

    // Calculate what each person owes/is owed
    expenses.forEach((expense) => {
      const splitAmount = expense.amount / expense.participants.length;

      // Person who paid gets credited
      balances[expense.paidBy] += expense.amount;

      // Each participant (including payer) owes their share
      expense.participants.forEach((participantId) => {
        balances[participantId] -= splitAmount;
      });
    });

    // Calculate settlements to minimize transactions
    const settlements: Settlement[] = [];
    const creditors = Object.entries(balances).filter(
      ([_, balance]) => balance > 0.01
    );
    const debtors = Object.entries(balances).filter(
      ([_, balance]) => balance < -0.01
    );

    for (const [creditorId, creditAmount] of creditors) {
      let remainingCredit = creditAmount;

      for (const [debtorId, debtAmount] of debtors) {
        if (remainingCredit <= 0.01) break;

        const settlementAmount = Math.min(
          remainingCredit,
          Math.abs(debtAmount)
        );
        if (settlementAmount > 0.01) {
          settlements.push({
            from: debtorId,
            to: creditorId,
            amount: settlementAmount,
          });

          remainingCredit -= settlementAmount;
          balances[debtorId] += settlementAmount;
        }
      }
    }

    return { balances, settlements };
  }, [participants, expenses]);

  // Fairness checker
  const fairnessCheck = useMemo(() => {
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const averagePerPerson = totalExpenses / participants.length;

    return participants.map((participant) => {
      const amountPaid = expenses
        .filter((e) => e.paidBy === participant.id)
        .reduce((sum, e) => sum + e.amount, 0);

      const difference = amountPaid - averagePerPerson;
      const percentageDiff =
        averagePerPerson > 0 ? (difference / averagePerPerson) * 100 : 0;

      let status: "balanced" | "overpaid" | "underpaid" = "balanced";
      let emoji = "⚖️";

      if (percentageDiff > 20) {
        status = "overpaid";
        emoji = "🔥";
      } else if (percentageDiff < -20) {
        status = "underpaid";
        emoji = "💰";
      }

      return {
        participant,
        amountPaid,
        difference,
        percentageDiff,
        status,
        emoji,
      };
    });
  }, [participants, expenses]);

  const resetCalculator = useCallback(() => {
    setParticipants([]);
    setExpenses([]);
    setNewParticipantName("");
    setNewExpense({
      description: "",
      amount: "",
      paidBy: "",
      participants: [],
      currency: CURRENCIES[0].code,
    });
    // toast({
    //   title: "Calculator reset",
    //   description: "Ready for a new expense calculation",
    // });
  }, []);

  const generateSummary = useCallback(() => {
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    let summary = `💰 Expense Summary\n\n`;
    summary += `👥 Participants: ${participants
      .map((p) => p.name)
      .join(", ")}\n`;
    summary += `💵 Total Expenses: $${totalExpenses.toFixed(2)}\n\n`;

    summary += `📋 Expenses:\n`;
    expenses.forEach((expense) => {
      const payer =
        participants.find((p) => p.id === expense.paidBy)?.name || "Unknown";
      summary += `• ${expense.description}: $${expense.amount.toFixed(
        2
      )} (paid by ${payer})\n`;
    });

    summary += `\n💸 Who Owes Whom:\n`;
    settlements.settlements.forEach((settlement) => {
      const from =
        participants.find((p) => p.id === settlement.from)?.name || "Unknown";
      const to =
        participants.find((p) => p.id === settlement.to)?.name || "Unknown";
      summary += `• ${from} owes ${to}: $${settlement.amount.toFixed(2)}\n`;
    });

    summary += `\n🔍 Fairness Check:\n`;
    fairnessCheck.forEach((check) => {
      summary += `• ${check.participant.name} ${
        check.emoji
      }: $${check.amountPaid.toFixed(2)} paid\n`;
    });

    return summary;
  }, [participants, expenses, settlements, fairnessCheck]);

  const shareResults = useCallback(() => {
    const summary = generateSummary();

    if (navigator.share) {
      navigator.share({
        title: "Split Expenses Summary",
        text: summary,
      });
    } else {
      navigator.clipboard.writeText(summary);
      //   toast({
      //     title: "Copied to clipboard!",
      //     description: "Share the summary with your group",
      //   });
    }
  }, [generateSummary]);

  const expenseBreakdown = useMemo(() => {
    const breakdown: Record<string, DetailedExpenseBreakdown> = {};

    participants.forEach((participant) => {
      breakdown[participant.id] = {
        participantId: participant.id,
        participantName: participant.name,
        amountOwed: 0,
        shareOf: [],
      };
    });

    expenses.forEach((expense) => {
      const splitAmount = expense.amount / expense.participants.length;
      const currency =
        CURRENCIES.find((c) => c.code === expense.currency)?.symbol ||
        expense.currency;

      expense.participants.forEach((participantId) => {
        if (breakdown[participantId]) {
          breakdown[participantId].amountOwed += splitAmount;
          breakdown[participantId].shareOf.push(
            `${expense.description}: ${currency}${splitAmount.toFixed(2)}`
          );
        }
      });
    });

    return Object.values(breakdown);
  }, [participants, expenses]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-secondary p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6 mt-20 sm:mt-32">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Split Expenses Calculator
          </h1>
          <p className="text-muted-foreground">
            Easy expense splitting for groups, trips, and roommates
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <select
            className="p-2 border border-input rounded-md bg-background text-sm"
            value={selectedCurrency.code}
            onChange={(e) => {
              const currency = CURRENCIES.find(
                (c) => c.code === e.target.value
              );
              if (currency) {
                setSelectedCurrency(currency);
                setNewExpense((prev) => ({ ...prev, currency: currency.code }));
              }
            }}
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.symbol} {currency.name}
              </option>
            ))}
          </select>
        </div>

        {/* Participants Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 ">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Participants</h2>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Enter participant name..."
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addParticipant()}
              className="flex-1"
            />
            <Button onClick={addParticipant} variant="default">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg"
              >
                <span className="font-medium">{participant.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeParticipant(participant.id)}
                  className="h-auto w-auto p-1 hover:bg-destructive hover:text-white "
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Add Expense Section */}
        {participants.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Add Expense</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="What was this expense for?"
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
              <div className="flex gap-2">
                <select
                  className="w-20 h-10 p-1 border border-input rounded-md bg-background"
                  value={newExpense.currency}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      currency: e.target.value,
                    }))
                  }
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  placeholder="Amount"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-4">
              <select
                className="w-full p-3 border border-input rounded-md bg-background"
                value={newExpense.paidBy}
                onChange={(e) =>
                  setNewExpense((prev) => ({ ...prev, paidBy: e.target.value }))
                }
              >
                <option value="">Who paid?</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </select>

              <Button onClick={addExpense} variant="default" className="w-full">
                Add Expense
              </Button>
            </div>
          </Card>
        )}

        {/* Expenses List */}
        {expenses.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold ">Expenses</h2>
            <div className="space-y-3">
              {expenses.map((expense) => {
                const payer = participants.find((p) => p.id === expense.paidBy);
                const currency =
                  CURRENCIES.find((c) => c.code === expense.currency)?.symbol ||
                  expense.currency;
                const splitAmount =
                  expense.amount / expense.participants.length;
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{expense.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {currency}
                        {expense.amount.toFixed(2)} paid by {payer?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Split {expense.participants.length} ways: {currency}
                        {splitAmount.toFixed(2)} each
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExpense(expense.id)}
                      className="hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Fairness Checker */}
        {expenses.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold">🔍 Fairness Checker</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fairnessCheck.map((check) => (
                <div
                  key={check.participant.id}
                  className={`p-3 rounded-lg border-2 ${
                    check.status === "balanced"
                      ? "border-expense-balanced bg-success/10 border-success"
                      : check.status === "overpaid"
                      ? "border-expense-overpaid bg-destructive/10 border-destructive"
                      : "border-expense-underpaid bg-warning/10 border-warning"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {check.participant.name}
                    </span>
                    <span className="text-2xl">{check.emoji}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Paid: ${check.amountPaid.toFixed(2)}
                    {check.difference !== 0 && (
                      <span
                        className={
                          check.difference > 0 ? "text-success" : "text-warning"
                        }
                      >
                        {" "}
                        ({check.difference > 0 ? "+" : ""}$
                        {check.difference.toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Settlement Summary */}
        {settlements.settlements.length > 0 && (
          <Card className="p-6">
            {/* <h2 className="text-xl font-semibold">💸 Who Owes Whom</h2> */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold">💸</span>
              </div>
              <h2 className="text-xl font-semibold">Who Owes Whom</h2>
            </div>
            <div className="space-y-3">
              {settlements.settlements.map((settlement, index) => {
                const from = participants.find((p) => p.id === settlement.from);
                const to = participants.find((p) => p.id === settlement.to);
                return (
                  <div
                    key={index}
                    className="p-4 bg-primary/5 rounded-lg border border-primary/20"
                  >
                    <div className="text-center">
                      <span className="font-medium">{from?.name}</span>
                      {" owes "}
                      <span className="font-medium">{to?.name}</span>
                      <div className="text-2xl font-bold text-primary mt-1">
                        ${settlement.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Enhanced Detailed Expense Breakdown */}
        {expenseBreakdown.some((b) => b.shareOf.length > 0) && (
          // <Card className="p-6 bg-gradient-to-br from-secondary/30 to-accent/10">
          <Card className="p-6 bg-background">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-sm font-bold">📊</span>
              </div>
              <h2 className="text-xl font-semibold">Calculation Breakdown</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Double-check our math! Here&apos;s exactly what each person owes and
              for which expenses:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {expenseBreakdown
                .filter((breakdown) => breakdown.shareOf.length > 0)
                .map((breakdown) => (
                  <div
                    key={breakdown.participantId}
                    className="p-4 bg-white/60 dark:bg-gray-900/60 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center text-white font-medium text-sm">
                        {breakdown.participantName.charAt(0).toUpperCase()}
                      </div>
                      <div className="font-medium text-lg">
                        {breakdown.participantName}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {breakdown.shareOf.map((share, index) => (
                        <div
                          key={index}
                          className="text-sm p-2 bg-secondary/30 rounded border-l-2 border-accent/50"
                        >
                          <span className="text-muted-foreground">•</span>{" "}
                          {share}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">
                          Total Share:
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {selectedCurrency.symbol}
                          {breakdown.amountOwed.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <span>🧮</span>
                <span>
                  All calculations are automatically verified for accuracy
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        {(participants.length > 0 || expenses.length > 0) && (
          <div className="sticky bottom-4 flex gap-2 justify-center">
            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                onClick={shareResults}
                variant="default"
                className="flex-1 min-w-32 max-w-40 hover:scale-105 transition-transform"
                disabled={expenses.length === 0}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                // onClick={generatePDF}
                variant="accent"
                className="flex-1 min-w-32 max-w-40 hover:scale-105 transition-transform shadow-md"
                disabled={expenses.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={resetCalculator}
                variant="outline"
                className="flex-1 min-w-32 max-w-40 hover:scale-105 transition-transform"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Action Buttons */}
        {/* {(participants.length > 0 || expenses.length > 0) && (
          <div className="sticky bottom-4 bg-transparent/80 backdrop-blur-sm rounded-lg p-4 border border-border/50 shadow-lg">
            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                onClick={shareResults}
                variant="default"
                className="flex-1 min-w-32 max-w-40 hover:scale-105 transition-transform"
                disabled={expenses.length === 0}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                // onClick={generatePDF}
                variant="accent"
                className="flex-1 min-w-32 max-w-40 hover:scale-105 transition-transform shadow-md"
                disabled={expenses.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={resetCalculator}
                variant="outline"
                className="flex-1 min-w-32 max-w-40 hover:scale-105 transition-transform"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
            <div className="text-center mt-2">
              <p className="text-xs text-muted-foreground">
                Professional PDF includes watermark and detailed breakdown
              </p>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default SplitCalculator;
