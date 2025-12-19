import { Check, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceFreshnessBadgeProps {
  priceAge?: string;
  lastPriceUpdate?: string;
  className?: string;
}

export function PriceFreshnessBadge({
  priceAge,
  lastPriceUpdate,
  className
}: PriceFreshnessBadgeProps) {
  // Determine badge variant based on age
  const getVariant = () => {
    if (!lastPriceUpdate || !priceAge || priceAge.includes('Never')) {
      return 'stale';
    }
    if (priceAge.includes('today') || priceAge.includes('hour')) {
      return 'fresh';
    }
    if (priceAge.includes('yesterday') || priceAge.match(/\d day/)) {
      return 'recent';
    }
    return 'stale';
  };

  const variant = getVariant();

  const styles = {
    fresh: {
      container: 'bg-green-100 border-green-200 text-green-700',
      icon: Check
    },
    recent: {
      container: 'bg-yellow-100 border-yellow-200 text-yellow-800',
      icon: Clock
    },
    stale: {
      container: 'bg-gray-100 border-gray-200 text-gray-700',
      icon: AlertTriangle
    }
  };

  const style = styles[variant];
  const Icon = style.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-md',
        style.container,
        className
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{priceAge || 'Never updated'}</span>
    </span>
  );
}
