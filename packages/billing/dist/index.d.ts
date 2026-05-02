export { consumeCredits, addCreditsToOrg, getCreditBalance, hasEnoughCredits, } from "./credit-manager";
export interface CreditConsumptionResult {
    success: boolean;
    error?: string;
}
export interface CreditInfo {
    balance: number;
    hasEnough: boolean;
}
