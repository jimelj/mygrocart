'use client';

import { useMutation } from '@apollo/client/react';
import { REQUEST_PRODUCT } from '@/lib/graphql/mutations';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface RequestProductButtonProps {
  productName: string;
  onSuccess?: () => void;
}

export function RequestProductButton({ productName, onSuccess }: RequestProductButtonProps) {
  const { toast } = useToast();
  const [requestProduct, { loading }] = useMutation(REQUEST_PRODUCT, {
    variables: { productName },
    onCompleted: (data) => {
      toast({
        title: 'Product requested!',
        description: `We'll add "${productName}" within 24 hours. Check back tomorrow!`,
        variant: 'success',
        duration: 5000
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Request failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return (
    <Button
      onClick={() => requestProduct()}
      disabled={loading}
      size="lg"
      className="w-full max-w-sm"
    >
      {loading ? 'Requesting...' : `Request "${productName}"`}
    </Button>
  );
}
