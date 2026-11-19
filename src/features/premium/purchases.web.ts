/**
 * The web build is only a development tool (the app ships on iPhone and Android):
 * no store here, the purchase is simulated in development.
 */
export type Offer = { priceString: string; pkg: null };
export type BuyResult = 'bought' | 'cancelled' | 'pending';

export function watchPremium(_onChange: (active: boolean) => void): () => void {
  return () => {};
}

export async function loadOffer(): Promise<Offer | null> {
  return __DEV__ ? { priceString: '€14.99', pkg: null } : null;
}

export async function buy(_offer: Offer): Promise<BuyResult> {
  return 'bought';
}

export async function restore(): Promise<boolean> {
  return false;
}
