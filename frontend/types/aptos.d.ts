interface Window {
  aptos?: {
    connect: () => Promise<{ address: string }>;
    disconnect: () => Promise<void>;
    account: () => Promise<{ address: string }>;
    signAndSubmitTransaction: (transaction: {
      data: {
        function: string;
        typeArguments?: string[];
        functionArguments?: any[];
      };
    }) => Promise<{ hash: string }>;
    signTransaction?: (transaction: any) => Promise<any>;
    submitTransaction?: (signedTransaction: any) => Promise<{ hash: string }>;
    waitForTransaction: (hash: string) => Promise<any>;
    signMessage: (message: { message: string }) => Promise<{ signature: string }>;
  };
}

