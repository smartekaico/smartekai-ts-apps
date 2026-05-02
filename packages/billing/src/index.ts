// Re-export types and functions from credit-manager
// Note: This package needs access to the database schema from @smartekai/db
// For now, use this as a standalone credit tracking module

export {
  consumeCredits,
  addCreditsToOrg,
  getCreditBalance,
  hasEnoughCredits,
} from "./credit-manager";

// Types
export interface CreditConsumptionResult {
  success: boolean;
  error?: string;
}

export interface CreditInfo {
  balance: number;
  hasEnough: boolean;
}
