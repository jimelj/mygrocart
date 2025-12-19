import { Search, Clock } from 'lucide-react';
import { RequestProductButton } from '@/components/ui/RequestProductButton';

interface EmptySearchStateProps {
  searchTerm: string;
}

export function EmptySearchState({ searchTerm }: EmptySearchStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Search className="w-16 h-16 text-gray-400 mb-6" />

      <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3">
        No products found for &quot;{searchTerm}&quot;
      </h2>

      <p className="text-base text-gray-600 mb-6 max-w-md">
        We don&apos;t have this product yet, but you can request it!
      </p>

      <RequestProductButton productName={searchTerm} />

      <p className="text-sm text-gray-600 mt-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        We&apos;ll add it within 24 hours
      </p>
    </div>
  );
}
