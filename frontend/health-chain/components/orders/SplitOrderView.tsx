'use client';

import React, { useEffect, useState } from 'react';

interface FulfillmentLeg {
  id: string;
  legNumber: number;
  bloodBankName: string;
  quantityMl: number;
  status: string;
  riderName: string | null;
  estimatedDeliveryTime: number | null;
  actualDeliveryTime: number | null;
  failureReason: string | null;
}

interface OrderProgress {
  totalLegs: number;
  completedLegs: number;
  failedLegs: number;
  inProgressLegs: number;
  overallStatus: string;
  legs: FulfillmentLeg[];
}

interface SplitOrderViewProps {
  parentRequestId: string;
}

export default function SplitOrderView({ parentRequestId }: SplitOrderViewProps) {
  const [progress, setProgress] = useState<OrderProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderProgress();
    const interval = setInterval(fetchOrderProgress, 30000);
    return () => clearInterval(interval);
  }, [parentRequestId]);

  const fetchOrderProgress = async () => {
    try {
      const response = await fetch(
        `/api/v1/orders/split/${parentRequestId}/progress`
      );
      const data = await response.json();
      setProgress(data);
    } catch (error) {
      console.error('Failed to fetch order progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'IN_TRANSIT':
        return 'bg-blue-100 text-blue-800';
      case 'RIDER_ASSIGNED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading) {
    return <div className="p-4">Loading order details...</div>;
  }

  if (!progress) {
    return <div className="p-4">No order data available</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Split Order Progress</h2>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded">
          <div className="text-sm text-gray-600">Total Legs</div>
          <div className="text-2xl font-bold">{progress.totalLegs}</div>
        </div>
        <div className="p-4 bg-green-50 rounded">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {progress.completedLegs}
          </div>
        </div>
        <div className="p-4 bg-yellow-50 rounded">
          <div className="text-sm text-gray-600">In Progress</div>
          <div className="text-2xl font-bold text-yellow-600">
            {progress.inProgressLegs}
          </div>
        </div>
        <div className="p-4 bg-red-50 rounded">
          <div className="text-sm text-gray-600">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {progress.failedLegs}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-sm font-medium">Overall Status: </span>
        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(progress.overallStatus)}`}>
          {progress.overallStatus}
        </span>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Fulfillment Legs</h3>
        {progress.legs.map((leg) => (
          <div key={leg.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">
                  Leg {leg.legNumber} - {leg.bloodBankName}
                </h4>
                <p className="text-sm text-gray-600">
                  Quantity: {leg.quantityMl} ml
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(leg.status)}`}>
                {leg.status}
              </span>
            </div>
            
            {leg.riderName && (
              <p className="text-sm text-gray-600">Rider: {leg.riderName}</p>
            )}
            
            <div className="mt-2 text-sm">
              {leg.estimatedDeliveryTime && (
                <p>ETA: {formatTimestamp(leg.estimatedDeliveryTime)}</p>
              )}
              {leg.actualDeliveryTime && (
                <p className="text-green-600">
                  Delivered: {formatTimestamp(leg.actualDeliveryTime)}
                </p>
              )}
              {leg.failureReason && (
                <p className="text-red-600">
                  Failure Reason: {leg.failureReason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
