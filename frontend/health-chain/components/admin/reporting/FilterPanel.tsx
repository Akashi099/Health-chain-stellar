'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Download, Search } from 'lucide-react';

interface FilterPanelProps {
  onSearch: (filters: any) => void;
  onExport: () => void;
  isLoading?: boolean;
}

export function FilterPanel({ onSearch, onExport, isLoading }: FilterPanelProps) {
  const [filters, setFilters] = React.useState({
    startDate: '',
    endDate: '',
    domain: 'all',
    status: '',
    bloodType: '',
    location: '',
  });

  const handleChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  return (
    <Card className="mb-8 border-none bg-white/50 backdrop-blur-xl shadow-2xl dark:bg-slate-900/50">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="bg-white/80 dark:bg-slate-800/80"
              />
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="bg-white/80 dark:bg-slate-800/80"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Search Domain</Label>
            <Select value={filters.domain} onValueChange={(v) => handleChange('domain', v)}>
              <SelectTrigger className="bg-white/80 dark:bg-slate-800/80">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Global Search</SelectItem>
                <SelectItem value="donors">Donors</SelectItem>
                <SelectItem value="units">Blood Units</SelectItem>
                <SelectItem value="orders">Orders</SelectItem>
                <SelectItem value="disputes">Disputes</SelectItem>
                <SelectItem value="organizations">Organizations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Blood Type</Label>
            <Select value={filters.bloodType} onValueChange={(v) => handleChange('bloodType', v)}>
              <SelectTrigger className="bg-white/80 dark:bg-slate-800/80">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="O+">O+</SelectItem>
                <SelectItem value="O-">O-</SelectItem>
                <SelectItem value="AB+">AB+</SelectItem>
                <SelectItem value="AB-">AB-</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Location / Region</Label>
            <Input
              placeholder="Filter by city or region..."
              value={filters.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="bg-white/80 dark:bg-slate-800/80"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={onExport} disabled={isLoading} className="hover:bg-blue-50">
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
          <Button onClick={handleSearch} disabled={isLoading} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700">
            <Search className="mr-2 h-4 w-4" /> {isLoading ? 'Searching...' : 'Search Records'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
