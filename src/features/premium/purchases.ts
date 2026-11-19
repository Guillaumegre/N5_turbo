import { Platform } from 'react-native';
import Purchases, { PACKAGE_TYPE, PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { ENTITLEMENT } from '@/domain/premium';

import { REVENUECAT_KEYS } from './config';

/** The one-time unlock as the store sells it. `pkg` is null when simulated (no store keys, development only). */
export type Offer = { priceString: string; pkg: PurchasesPackage | null };
export type BuyResult = 'bought' | 'cancelled' | 'pending';

const apiKey = Platform.OS === 'ios' ? REVENUECAT_KEYS.ios : REVENUECAT_KEYS.android;
/** Store not set up yet: development builds pretend, release builds offer nothing. */
const simulated = !apiKey;

const isActive = (info: CustomerInfo) => info.entitlements.active[ENTITLEMENT] !== undefined;

let configured = false;
function configure(): boolean {
  if (simulated) return false;
  if (!configured) {
    Purchases.configure({ apiKey });
    configured = true;
  }
  return true;
}

/**
 * Starts the store connection and reports premium whenever the store knows it
 * (at launch, after a purchase, refund or restore). Returns the cleanup.
 */
export function watchPremium(onChange: (active: boolean) => void): () => void {
  if (!configure()) return () => {};
  const listener = (info: CustomerInfo) => onChange(isActive(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  // Offline: this fails and the saved value stays as it was.
  Purchases.getCustomerInfo().then(listener, () => {});
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

/** The unlock and its local price, or null when the store can't be reached. */
export async function loadOffer(): Promise<Offer | null> {
  if (simulated) return __DEV__ ? { priceString: '€14.99', pkg: null } : null;
  configure();
  try {
    const current = (await Purchases.getOfferings()).current;
    const pkg = current?.lifetime ?? current?.availablePackages.find((p) => p.packageType === PACKAGE_TYPE.LIFETIME) ?? current?.availablePackages[0];
    return pkg ? { priceString: pkg.product.priceString, pkg } : null;
  } catch {
    return null;
  }
}

/** Buys the unlock. Throws on a store error (the person was not charged). */
export async function buy(offer: Offer): Promise<BuyResult> {
  if (!offer.pkg) return 'bought'; // simulated
  try {
    const { customerInfo } = await Purchases.purchasePackage(offer.pkg);
    return isActive(customerInfo) ? 'bought' : 'pending';
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
    throw e;
  }
}

/** Restore purchases (from a button only): true when the store says premium was bought with this account. */
export async function restore(): Promise<boolean> {
  if (!configure()) return false;
  return isActive(await Purchases.restorePurchases());
}
