"use client";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Clock, Shield, Droplet } from "lucide-react";

export interface TransactionAction {
  type: 'authorize_release' | 'log_supply_arrival' | 'stake_for_audit' | 'verify_organization' | 'transfer_blood' | 'custom';
  title: string;
  description: string;
  details: Record<string, any>;
  contractCall: string;
  rawData?: string;
}

interface TransactionSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onReject: () => void;
  action: TransactionAction | null;
  isLoading?: boolean;
}

export function TransactionSigningModal({
  isOpen,
  onClose,
  onConfirm,
  onReject,
  action,
  isLoading = false,
}: TransactionSigningModalProps) {
  if (!action) return null;

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'authorize_release':
        return <Droplet className="w-8 h-8 text-red-500" />;
      case 'log_supply_arrival':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'stake_for_audit':
        return <Shield className="w-8 h-8 text-blue-500" />;
      case 'verify_organization':
        return <CheckCircle className="w-8 h-8 text-purple-500" />;
      case 'transfer_blood':
        return <Droplet className="w-8 h-8 text-orange-500" />;
      default:
        return <Clock className="w-8 h-8 text-gray-500" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'authorize_release':
        return 'border-red-200 bg-red-50';
      case 'log_supply_arrival':
        return 'border-green-200 bg-green-50';
      case 'stake_for_audit':
        return 'border-blue-200 bg-blue-50';
      case 'verify_organization':
        return 'border-purple-200 bg-purple-50';
      case 'transfer_blood':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const renderActionDetails = () => {
    switch (action.type) {
      case 'authorize_release':
        return (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Blood Type:</span>
              <Badge variant="outline">{action.details.bloodType}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Quantity:</span>
              <span className="font-medium">{action.details.quantity} mL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Destination:</span>
              <span className="font-medium">{action.details.hospitalName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Urgency:</span>
              <Badge className="bg-red-100 text-red-800">{action.details.urgency}</Badge>
            </div>
          </div>
        );

      case 'log_supply_arrival':
        return (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Supply Type:</span>
              <span className="font-medium">{action.details.supplyType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Quantity:</span>
              <span className="font-medium">{action.details.quantity} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Source:</span>
              <span className="font-medium">{action.details.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Arrival Time:</span>
              <span className="font-medium">{new Date(action.details.arrivalTime).toLocaleString()}</span>
            </div>
          </div>
        );

      case 'stake_for_audit':
        return (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Stake Amount:</span>
              <span className="font-medium">{action.details.amount} XLM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Audit Period:</span>
              <span className="font-medium">{action.details.period} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Purpose:</span>
              <span className="font-medium">{action.details.purpose}</span>
            </div>
          </div>
        );

      case 'verify_organization':
        return (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Organization:</span>
              <span className="font-medium">{action.details.organizationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <Badge variant="outline">{action.details.organizationType}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">{action.details.location}</span>
            </div>
          </div>
        );

      case 'transfer_blood':
        return (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Unit ID:</span>
              <span className="font-medium font-mono text-sm">{action.details.unitId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">From:</span>
              <span className="font-medium">{action.details.fromBank}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">To:</span>
              <span className="font-medium">{action.details.toHospital}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Blood Type:</span>
              <Badge variant="outline">{action.details.bloodType}</Badge>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Contract Call:</span>
              <span className="font-medium font-mono text-sm">{action.contractCall}</span>
            </div>
            {Object.entries(action.details).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getActionIcon(action.type)}
            <span>Confirm Blockchain Transaction</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Summary Card */}
          <Card className={getActionColor(action.type)}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {action.title}
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Transaction Details</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              {renderActionDetails()}
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Security Notice</p>
              <p>This action will be recorded on the Stellar blockchain and cannot be undone. Please verify all details are correct.</p>
            </div>
          </div>

          {/* Raw Contract Call (Collapsible) */}
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              Show Raw Contract Call
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded font-mono text-xs overflow-x-auto">
              {action.contractCall}
              {action.rawData && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="text-gray-600 mb-1">Raw Data:</div>
                  {action.rawData}
                </div>
              )}
            </div>
          </details>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onReject}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing...
                </div>
              ) : (
                'Confirm & Sign'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for using the modal
export function useTransactionModal() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [action, setAction] = React.useState<TransactionAction | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const openModal = (transactionAction: TransactionAction) => {
    setAction(transactionAction);
    setIsOpen(true);
    setIsLoading(false);
  };

  const closeModal = () => {
    setIsOpen(false);
    setAction(null);
    setIsLoading(false);
  };

  const confirmTransaction = async () => {
    if (!action) return;

    setIsLoading(true);
    try {
      // Here you would integrate with your Soroban/Stellar wallet
      // For now, we'll just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      closeModal();
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  return {
    isOpen,
    action,
    isLoading,
    openModal,
    closeModal,
    confirmTransaction,
  };
}