import * as bitcoin from 'bitcoinjs-lib'
import {
  FeeRateType, FeeRate, AutoFeeLevels, UtxoInfo
} from '@faast/payments-common'

import { getBlockcypherFeeEstimate, toBitcoinishConfig } from './utils'
import {
  BaseBitcoinPaymentsConfig,
  BitcoinSignedTransaction,
  AddressType,
} from './types'
import {
  DEFAULT_SAT_PER_BYTE_LEVELS,
} from './constants'
import { isValidAddress, isValidPrivateKey, isValidPublicKey } from './helpers'
import { BitcoinishPayments, BitcoinishPaymentTx } from './bitcoinish'

export abstract class BaseBitcoinPayments<Config extends BaseBitcoinPaymentsConfig> extends BitcoinishPayments<Config> {

  readonly maximumFeeRate?: number

  constructor(config: BaseBitcoinPaymentsConfig) {
    super(toBitcoinishConfig(config))
    this.maximumFeeRate = config.maximumFeeRate
  }

  abstract getPaymentScript(index: number): bitcoin.payments.Payment
  abstract addressType: AddressType

  isValidAddress(address: string): boolean {
    return isValidAddress(address, this.bitcoinjsNetwork)
  }

  isValidPrivateKey(privateKey: string): boolean {
    return isValidPrivateKey(privateKey, this.bitcoinjsNetwork)
  }

  isValidPublicKey(publicKey: string): boolean {
    return isValidPublicKey(publicKey, this.bitcoinjsNetwork)
  }

  async getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate> {
    let satPerByte: number
    try {
      satPerByte = await getBlockcypherFeeEstimate(feeLevel, this.networkType)
    } catch (e) {
      satPerByte = DEFAULT_SAT_PER_BYTE_LEVELS[feeLevel]
      this.logger.warn(
        `Failed to get bitcoin ${this.networkType} fee estimate, using hardcoded default of ${feeLevel} sat/byte -- ${e.message}`
      )
    }
    return {
      feeRate: satPerByte.toString(),
      feeRateType: FeeRateType.BasePerWeight,
    }
  }

  async getPsbtInputData(
    utxo: UtxoInfo,
    paymentScript: bitcoin.payments.Payment,
    addressType: AddressType,
  ): Promise<any> {
    const utx = await this.getApi().getTx(utxo.txid)
    const result: any = {
      hash: utxo.txid,
      index: utxo.vout,
    }
    const isSegwit = (/p2wpkh|p2wsh/).test(addressType)
    if (isSegwit) {
      // for segwit inputs, you only need the output script and value as an object.
      const rawUtxo = utx.vout[utxo.vout]
      const { hex: scriptPubKey } = rawUtxo
      if (!scriptPubKey) {
        throw new Error(`Cannot get scriptPubKey for utxo ${utxo.txid}:${utxo.vout}`)
      }
      const utxoValue = this.toBaseDenominationNumber(utxo.value)
      if (String(utxoValue) !== rawUtxo.value) {
        throw new Error(`Utxo ${utxo.txid}:${utxo.vout} has mismatched value - ${utxoValue} sat expected but network reports ${rawUtxo.value} sat`)
      }
      result.witnessUtxo = {
        script: Buffer.from(scriptPubKey, 'hex'),
        value: utxoValue,
      }
    } else {
      // for non segwit inputs, you must pass the full transaction buffer
      if (!utx.hex) {
        throw new Error(`Cannot get raw hex of tx for utxo ${utxo.txid}:${utxo.vout}`)
      }
      result.nonWitnessUtxo = Buffer.from(utx.hex, 'hex')
    }
    if (addressType.startsWith('p2sh-p2wsh')) {
      result.witnessScript = paymentScript.redeem!.redeem!.output
      result.redeemScript = paymentScript.redeem!.output
    } else if (addressType.startsWith('p2sh')) {
      result.redeemScript = paymentScript.redeem!.output
    } else if (addressType.startsWith('p2wsh')) {
      result.witnessScript = paymentScript.redeem!.output
    }
    return result
  }

  get psbtOptions() {
    return {
      network: this.bitcoinjsNetwork,
      maximumFeeRate: this.maximumFeeRate,
    }
  }

  async buildPsbt(paymentTx: BitcoinishPaymentTx, fromIndex: number): Promise<bitcoin.Psbt> {
    const { inputs, outputs } = paymentTx
    const inputPaymentScript = this.getPaymentScript(fromIndex)

    let psbt = new bitcoin.Psbt(this.psbtOptions)
    for (let input of inputs) {
      psbt.addInput(await this.getPsbtInputData(
        input,
        inputPaymentScript,
        this.addressType,
      ))
    }
    for (let output of outputs) {
      psbt.addOutput({
        address: output.address,
        value: this.toBaseDenominationNumber(output.value)
      })
    }
    return psbt
  }

  async serializePaymentTx(tx: BitcoinishPaymentTx, fromIndex: number): Promise<string> {
    return (await this.buildPsbt(tx, fromIndex)).toHex()
  }

  decodePsbt(tx: BitcoinSignedTransaction): bitcoin.Psbt {
    if (!tx.data.partial) {
      throw new Error('Cannot decode psbt of a finalized tx')
    }
    return bitcoin.Psbt.fromHex(tx.data.hex, this.psbtOptions)
  }

}
