import { BasePayments, BalanceResult, FeeOption, ResolvedFeeOption, Payport, ResolveablePayport } from '@faast/payments-common';
import { Numeric } from '@faast/ts-common';
import { Prepare } from 'ripple-lib/dist/npm/transaction/types';
import { Adjustment } from 'ripple-lib/dist/npm/common/types/objects';
import { BaseRipplePaymentsConfig, RippleUnsignedTransaction, RippleSignedTransaction, RippleBroadcastResult, RippleTransactionInfo, RippleCreateTransactionOptions, FromToWithPayport, RippleSignatory } from './types';
import { RipplePaymentsUtils } from './RipplePaymentsUtils';
export declare abstract class BaseRipplePayments<Config extends BaseRipplePaymentsConfig> extends RipplePaymentsUtils implements BasePayments<Config, RippleUnsignedTransaction, RippleSignedTransaction, RippleBroadcastResult, RippleTransactionInfo> {
    config: Config;
    constructor(config: Config);
    getFullConfig(): Config;
    getPublicConfig(): Pick<Config, Exclude<keyof Config, "logger" | "server">> & Config;
    abstract getPublicAccountConfig(): Config;
    abstract getAccountIds(): string[];
    abstract getAccountId(index: number): string;
    abstract getHotSignatory(): RippleSignatory;
    abstract getDepositSignatory(): RippleSignatory;
    abstract isReadOnly(): boolean;
    private doGetPayport;
    private doResolvePayport;
    resolvePayport(payport: ResolveablePayport): Promise<Payport>;
    resolveFromTo(from: number, to: ResolveablePayport): Promise<FromToWithPayport>;
    getPayport(index: number): Promise<Payport>;
    requiresBalanceMonitor(): boolean;
    getAddressesToMonitor(): string[];
    isSweepableAddressBalance(balance: Numeric): boolean;
    isSweepableBalance(balance: string, payport?: ResolveablePayport): boolean;
    initAccounts(): Promise<{
        txId: string;
        unsignedTx: Prepare;
        signedTx: {
            signedTransaction: string;
            id: string;
        };
        broadcast: import("ripple-lib/dist/npm/transaction/submit").FormattedSubmitResponse;
    } | undefined>;
    getBalance(payportOrIndex: ResolveablePayport): Promise<BalanceResult>;
    getNextSequenceNumber(payportOrIndex: ResolveablePayport): Promise<number>;
    resolveIndexFromAdjustment(adjustment: Adjustment): number | null;
    getTransactionInfo(txId: string): Promise<RippleTransactionInfo>;
    resolveFeeOption(feeOption: FeeOption): Promise<ResolvedFeeOption>;
    private resolvePayportBalance;
    private doCreateTransaction;
    createTransaction(from: number, to: ResolveablePayport, amount: string, options?: RippleCreateTransactionOptions): Promise<RippleUnsignedTransaction>;
    createSweepTransaction(from: number, to: ResolveablePayport, options?: RippleCreateTransactionOptions): Promise<RippleUnsignedTransaction>;
    signTransaction(unsignedTx: RippleUnsignedTransaction): Promise<RippleSignedTransaction>;
    broadcastTransaction(signedTx: RippleSignedTransaction): Promise<RippleBroadcastResult>;
}
