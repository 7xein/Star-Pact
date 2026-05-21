"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RESOURCE_PRICES } from "@/lib/resource-prices";

type PurchaseItem = {
  resourceType: string;
  quantity: number;
};

type BuyPanelProps = {
  teamId: string;
  sessionId: string;
  doubloons: number;
  cargoCapacity: number;
  locationType: string;
  onPurchase: (items: PurchaseItem[]) => void;
};

export function BuyPanel({
  teamId,
  sessionId,
  doubloons,
  cargoCapacity,
  locationType,
  onPurchase,
}: BuyPanelProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  if (locationType !== "HOME_PORT" && locationType !== "TRADING_POST") {
    return null;
  }

  const isTrading = locationType === "TRADING_POST";

  const availableResources = Object.entries(RESOURCE_PRICES).filter(
    ([, entry]) => {
      if (isTrading) return entry.tradingPost !== null;
      return true;
    }
  );

  const getUnitPrice = (key: string) => {
    const entry = RESOURCE_PRICES[key];
    if (!entry) return 0;
    return isTrading ? (entry.tradingPost ?? 0) : entry.homePort;
  };

  const totalCost = availableResources.reduce((sum, [key]) => {
    const qty = quantities[key] || 0;
    return sum + qty * getUnitPrice(key);
  }, 0);

  const totalWeight = availableResources.reduce((sum, [key]) => {
    const qty = quantities[key] || 0;
    return sum + qty * RESOURCE_PRICES[key].weight;
  }, 0);

  const overBudget = totalCost > doubloons;
  const overCapacity = totalWeight > cargoCapacity;

  function adjustQuantity(resourceType: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[resourceType] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [resourceType]: next };
    });
  }

  async function handlePurchase() {
    const items: PurchaseItem[] = availableResources
      .map(([key]) => ({ resourceType: key, quantity: quantities[key] || 0 }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/game/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, teamId, items }),
      });

      if (res.ok) {
        onPurchase(items);
        setQuantities({});
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isTrading ? "Trading Post" : "Home Port"} Supplies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {availableResources.map(([key, entry]) => {
          const qty = quantities[key] || 0;
          const price = getUnitPrice(key);

          return (
            <div
              key={key}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize">
                  {key.toLowerCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {price} db / {entry.weight}t
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => adjustQuantity(key, -1)}
                  disabled={qty <= 0}
                >
                  -
                </Button>
                <span className="w-8 text-center text-sm font-mono">
                  {qty}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => adjustQuantity(key, 1)}
                >
                  +
                </Button>
              </div>
            </div>
          );
        })}

        <div className="border-t pt-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Total Cost</span>
            <span className={overBudget ? "text-red-500 font-bold" : ""}>
              {totalCost} / {doubloons} db
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Weight</span>
            <span className={overCapacity ? "text-red-500 font-bold" : ""}>
              {totalWeight} / {cargoCapacity} t
            </span>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={
            submitting || overBudget || overCapacity || totalCost === 0
          }
          onClick={handlePurchase}
        >
          {submitting ? "Purchasing..." : "Purchase Supplies"}
        </Button>
      </CardContent>
    </Card>
  );
}
