'use client';

import { PrivyProvider, type PrivyClientConfig } from '@privy-io/react-auth';
import { ReactNode, useMemo } from 'react';

type Props = {
  children: ReactNode;
};

const PRIVY_FALLBACK_MESSAGE =
  'Privy app ID is missing. Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local.';

export function PrivyClientProvider({ children }: Props) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console -- helpful during local setup
      console.warn(PRIVY_FALLBACK_MESSAGE);
    }
    return <>{children}</>;
  }

  const config = useMemo<PrivyClientConfig>(
    () => ({
      loginMethods: ['email', 'wallet'] as PrivyClientConfig['loginMethods'],
      embeddedWallets: {
        ethereum: {
          createOnLogin: 'users-without-wallets',
        },
      },
      appearance: {
        theme: 'light',
        accentColor: '#18181b' as `#${string}`,
        showWalletLoginFirst: false,
      },
    }),
    []
  );

  return (
    <PrivyProvider appId={appId} config={config}>
      {children}
    </PrivyProvider>
  );
}

