import { BaseRipplePayments } from './BaseRipplePayments';
import { xprvToXpub, generateNewKeys, deriveSignatory } from './bip44';
import { isValidXprv, isValidXpub } from './helpers';
export class HdRipplePayments extends BaseRipplePayments {
    constructor(config) {
        super(config);
        if (isValidXprv(config.hdKey)) {
            this.xprv = config.hdKey;
            this.xpub = xprvToXpub(this.xprv);
        }
        else if (isValidXpub(config.hdKey)) {
            this.xprv = null;
            this.xpub = config.hdKey;
        }
        else {
            throw new Error('Account must be a valid xprv or xpub');
        }
        this.hotSignatory = deriveSignatory(config.hdKey, 0);
        this.depositSignatory = deriveSignatory(config.hdKey, 1);
    }
    isReadOnly() {
        return this.xprv === null;
    }
    getPublicAccountConfig() {
        return {
            hdKey: xprvToXpub(this.config.hdKey),
        };
    }
    getAccountIds() {
        return [this.xpub];
    }
    getAccountId(index) {
        return this.xpub;
    }
    getHotSignatory() {
        return this.hotSignatory;
    }
    getDepositSignatory() {
        return this.depositSignatory;
    }
}
HdRipplePayments.generateNewKeys = generateNewKeys;
//# sourceMappingURL=HdRipplePayments.js.map