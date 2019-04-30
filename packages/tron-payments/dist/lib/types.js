import * as t from 'io-ts';
import { extendCodec } from '@faast/ts-common';
import { BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, CreateTransactionOptions, } from '@faast/payments-common';
export { CreateTransactionOptions };
export var BaseTronPaymentsConfig = t.partial({
    fullNode: t.string,
    solidityNode: t.string,
    eventServer: t.string,
}, 'BaseTronPaymentsConfig');
export var HdTronPaymentsConfig = extendCodec(BaseTronPaymentsConfig, {
    hdKey: t.string,
}, {
    maxAddressScan: t.number,
}, 'HdTronPaymentsConfig');
export var KeyPairTronPaymentsConfig = extendCodec(BaseTronPaymentsConfig, {
    keyPairs: t.union([t.array(t.union([t.string, t.null, t.undefined])), t.record(t.number, t.string)]),
}, {}, 'KeyPairTronPaymentsConfig');
export var TronPaymentsConfig = t.union([HdTronPaymentsConfig, KeyPairTronPaymentsConfig]);
export var TronUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    id: t.string,
    amount: t.string,
    fee: t.string,
}, {}, 'TronUnsignedTransaction');
export var TronSignedTransaction = extendCodec(BaseSignedTransaction, {}, {}, 'TronSignedTransaction');
export var TronTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'TronTransactionInfo');
export var TronBroadcastResult = extendCodec(BaseBroadcastResult, {
    rebroadcast: t.boolean,
}, {}, 'TronBroadcastResult');
export var GetAddressOptions = t.partial({
    cacheIndex: t.boolean,
});
//# sourceMappingURL=types.js.map