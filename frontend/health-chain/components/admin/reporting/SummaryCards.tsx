'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Droplet, ShoppingCart, AlertTriangle } from 'lucide-react';

interface SummaryData {
  donors: number;
  units: number;
  orders: number;
  disputes: number;
}

interface SummaryCardsProps {
  data?: SummaryData;
  isLoading?: boolean;
}

export function SummaryCards({ data, isLoading }: SummaryCardsProps) {
  const cards = [
    { title: 'Total Donors', value: data?.donors || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Blood Units', value: data?.units || 0, icon: Droplet, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Market Orders', value: data?.orders || 0, icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Active Disputes', value: data?.disputes || 0, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, i) => (
        <Card key={i} className="border-none shadow-xl bg-white/40 backdrop-blur-md overflow-hidden dark:bg-slate-800/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</CardTitle>
            <div className={`p-2 rounded-xl ${card.bg} dark:bg-slate-700`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-200 animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {card.value.toLocaleString()}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">Based on current filters</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
