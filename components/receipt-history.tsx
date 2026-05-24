"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { POSReceipt } from "./pos-receipt";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import type { ReceiptDataPayload } from "@/lib/receipt-utils";

interface Receipt {
  id: string;
  receipt_number: string;
  created_at: string;
  receipt_data: ReceiptDataPayload;
  printed_count: number;
}

interface ReceiptHistoryProps {
  limit?: number;
}

export function ReceiptHistory({ limit = 10 }: ReceiptHistoryProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptDataPayload | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error("Error fetching receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrintCount = async (receiptId: string) => {
    try {
      const receipt = receipts.find(r => r.id === receiptId);
      if (!receipt) return;

      const { error } = await supabase
        .from("receipts")
        .update({
          printed_count: (receipt.printed_count || 0) + 1,
          last_printed: new Date().toISOString(),
        })
        .eq("id", receiptId);

      if (error) throw error;
      fetchReceipts();
    } catch (error) {
      console.error("Error updating print count:", error);
    }
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt.receipt_data);
    setShowPreview(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading receipts...</div>;
  }

  if (receipts.length === 0) {
    return <div className="text-center py-8 text-gray-500">No receipts found</div>;
  }

  return (
    <>
      <div className="space-y-4">
        {receipts.map((receipt) => (
          <Card key={receipt.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="font-semibold text-lg">
                    Receipt #{receipt.receipt_number}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(receipt.created_at), "PPP p")}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Items: {receipt.receipt_data.items.length} | Total: ₵
                    {receipt.receipt_data.total.toFixed(2)}
                  </p>
                  {receipt.printed_count > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      Printed {receipt.printed_count} time(s)
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewReceipt(receipt)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Receipt Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📋 Receipt Preview</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="py-4">
              <POSReceipt receipt={selectedReceipt} />
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Receipt ID: {selectedReceipt.receipt_number}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
