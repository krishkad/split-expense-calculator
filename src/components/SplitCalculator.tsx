"use client"
import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Users, Receipt, Download, RotateCcw, Share2 } from 'lucide-react';

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
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

const SplitCalculator = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    paidBy: '',
    participants: [] as string[]
  });

  const addParticipant = useCallback(() => {
    if (!newParticipantName.trim()) return;
    
    const participant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim()
    };
    
    setParticipants(prev => [...prev, participant]);
    setNewParticipantName('');
    // toast({
    //   title: "Participant added!",
    //   description: `${participant.name} joined the group`,
    // });
  }, [newParticipantName]);

  const removeParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    setExpenses(prev => prev.filter(e => e.paidBy !== id).map(e => ({
      ...e,
      participants: e.participants.filter(pId => pId !== id)
    })));
  }, []);

  const addExpense = useCallback(() => {
    if (!newExpense.description.trim() || !newExpense.amount || !newExpense.paidBy) {
    //   toast({
    //     title: "Missing information",
    //     description: "Please fill in all expense details",
    //     variant: "destructive"
    //   });
      return;
    }

    const participantIds = newExpense.participants.length > 0 
      ? newExpense.participants 
      : participants.map(p => p.id);

    const expense: Expense = {
      id: Date.now().toString(),
      description: newExpense.description.trim(),
      amount: parseFloat(newExpense.amount),
      paidBy: newExpense.paidBy,
      participants: participantIds
    };

    setExpenses(prev => [...prev, expense]);
    setNewExpense({ description: '', amount: '', paidBy: '', participants: [] });
    // toast({
    //   title: "Expense added!",
    //   description: `$${expense.amount.toFixed(2)} for ${expense.description}`,
    // });
  }, [newExpense, participants]);

  const removeExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  // Calculate settlements
  const settlements = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Initialize balances
    participants.forEach(p => {
      balances[p.id] = 0;
    });

    // Calculate what each person owes/is owed
    expenses.forEach(expense => {
      const splitAmount = expense.amount / expense.participants.length;
      
      // Person who paid gets credited
      balances[expense.paidBy] += expense.amount;
      
      // Each participant (including payer) owes their share
      expense.participants.forEach(participantId => {
        balances[participantId] -= splitAmount;
      });
    });

    // Calculate settlements to minimize transactions
    const settlements: Settlement[] = [];
    const creditors = Object.entries(balances).filter(([_, balance]) => balance > 0.01);
    const debtors = Object.entries(balances).filter(([_, balance]) => balance < -0.01);

    for (const [creditorId, creditAmount] of creditors) {
      let remainingCredit = creditAmount;
      
      for (const [debtorId, debtAmount] of debtors) {
        if (remainingCredit <= 0.01) break;
        
        const settlementAmount = Math.min(remainingCredit, Math.abs(debtAmount));
        if (settlementAmount > 0.01) {
          settlements.push({
            from: debtorId,
            to: creditorId,
            amount: settlementAmount
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
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const averagePerPerson = totalExpenses / participants.length;
    
    return participants.map(participant => {
      const amountPaid = expenses
        .filter(e => e.paidBy === participant.id)
        .reduce((sum, e) => sum + e.amount, 0);
      
      const difference = amountPaid - averagePerPerson;
      const percentageDiff = averagePerPerson > 0 ? (difference / averagePerPerson) * 100 : 0;
      
      let status: 'balanced' | 'overpaid' | 'underpaid' = 'balanced';
      let emoji = '⚖️';
      
      if (percentageDiff > 20) {
        status = 'overpaid';
        emoji = '🔥';
      } else if (percentageDiff < -20) {
        status = 'underpaid';
        emoji = '💰';
      }
      
      return {
        participant,
        amountPaid,
        difference,
        percentageDiff,
        status,
        emoji
      };
    });
  }, [participants, expenses]);

  const resetCalculator = useCallback(() => {
    setParticipants([]);
    setExpenses([]);
    setNewParticipantName('');
    setNewExpense({ description: '', amount: '', paidBy: '', participants: [] });
    // toast({
    //   title: "Calculator reset",
    //   description: "Ready for a new expense calculation",
    // });
  }, []);

  const generateSummary = useCallback(() => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    let summary = `💰 Expense Summary\n\n`;
    summary += `👥 Participants: ${participants.map(p => p.name).join(', ')}\n`;
    summary += `💵 Total Expenses: $${totalExpenses.toFixed(2)}\n\n`;
    
    summary += `📋 Expenses:\n`;
    expenses.forEach(expense => {
      const payer = participants.find(p => p.id === expense.paidBy)?.name || 'Unknown';
      summary += `• ${expense.description}: $${expense.amount.toFixed(2)} (paid by ${payer})\n`;
    });
    
    summary += `\n💸 Who Owes Whom:\n`;
    settlements.settlements.forEach(settlement => {
      const from = participants.find(p => p.id === settlement.from)?.name || 'Unknown';
      const to = participants.find(p => p.id === settlement.to)?.name || 'Unknown';
      summary += `• ${from} owes ${to}: $${settlement.amount.toFixed(2)}\n`;
    });
    
    summary += `\n🔍 Fairness Check:\n`;
    fairnessCheck.forEach(check => {
      summary += `• ${check.participant.name} ${check.emoji}: $${check.amountPaid.toFixed(2)} paid\n`;
    });
    
    return summary;
  }, [participants, expenses, settlements, fairnessCheck]);

  const shareResults = useCallback(() => {
    const summary = generateSummary();
    
    if (navigator.share) {
      navigator.share({
        title: 'Split Expenses Summary',
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

  return (
    <div className="min-h-screen bg-secondary p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Split Expenses Calculator
          </h1>
          <p className="text-muted-foreground">
            Easy expense splitting for groups, trips, and roommates
          </p>
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
              onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
              className="flex-1"
            />
            <Button onClick={addParticipant} variant="default">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {participants.map(participant => (
              <div
                key={participant.id}
                className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg"
              >
                <span className="font-medium">{participant.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeParticipant(participant.id)}
                  className="h-auto p-1 hover:bg-destructive hover:text-white"
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
                onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Amount ($)"
                step="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-4">
              <select
                className="w-full p-3 border border-input rounded-md bg-background"
                value={newExpense.paidBy}
                onChange={(e) => setNewExpense(prev => ({ ...prev, paidBy: e.target.value }))}
              >
                <option value="">Who paid?</option>
                {participants.map(participant => (
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
            <h2 className="text-xl font-semibold">Expenses</h2>
            <div className="space-y-3">
              {expenses.map(expense => {
                const payer = participants.find(p => p.id === expense.paidBy);
                return (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{expense.description}</div>
                      <div className="text-sm text-muted-foreground">
                        ${expense.amount.toFixed(2)} paid by {payer?.name}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExpense(expense.id)}
                      className="hover:bg-destructive hover:text-white"
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
              {fairnessCheck.map(check => (
                <div
                  key={check.participant.id}
                  className={`p-3 rounded-lg border-2 ${
                    check.status === 'balanced' ? 'border-expense-balanced bg-success/10' :
                    check.status === 'overpaid' ? 'border-expense-overpaid bg-destructive/10' :
                    'border-expense-underpaid bg-warning/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{check.participant.name}</span>
                    <span className="text-2xl">{check.emoji}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Paid: ${check.amountPaid.toFixed(2)}
                    {check.difference !== 0 && (
                      <span className={check.difference > 0 ? 'text-success' : 'text-warning'}>
                        {' '}({check.difference > 0 ? '+' : ''}${check.difference.toFixed(2)})
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
            <h2 className="text-xl font-semibold">💸 Who Owes Whom</h2>
            <div className="space-y-3">
              {settlements.settlements.map((settlement, index) => {
                const from = participants.find(p => p.id === settlement.from);
                const to = participants.find(p => p.id === settlement.to);
                return (
                  <div key={index} className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="text-center">
                      <span className="font-medium">{from?.name}</span>
                      {' owes '}
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

        {/* Action Buttons */}
        {(participants.length > 0 || expenses.length > 0) && (
          <div className="sticky bottom-4 flex gap-2 justify-center">
            <Button
              onClick={shareResults}
              variant="default"
              className="flex-1 max-w-xs"
              disabled={expenses.length === 0}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Results
            </Button>
            <Button
              onClick={resetCalculator}
              variant="outline"
              className="flex-1 max-w-xs"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitCalculator;