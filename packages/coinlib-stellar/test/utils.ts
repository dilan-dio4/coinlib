import fetch from 'node-fetch'
import util from 'util'
import path from 'path'
import fs from 'fs'
import { AccountStellarPayments } from '../src'
import { AccountStellarPaymentsConfig, StellarAccountConfig } from '../src/types'
import { Logger, assertType } from '@faast/ts-common'
import { TransactionStatus, NetworkType } from '@bitaccess/coinlib-common'
import { omit } from 'lodash'
import * as Stellar from 'stellar-sdk'
import { PACKAGE_NAME } from '../src/constants'
import { TestLogger } from '../../../common/testUtils'

export * from '../../../common/testUtils'
export const logger = new TestLogger(PACKAGE_NAME)

const TESTNET_SERVER = 'https://horizon-testnet.stellar.org'
const TEST_ACCOUNT_FILE = path.resolve(__dirname, 'keys/testnet.accounts.key')
export const END_TRANSACTION_STATES = [TransactionStatus.Confirmed, TransactionStatus.Failed]

async function generateTestnetAccount(): Promise<StellarAccountConfig> {
  const pair = Stellar.Keypair.random()
  const address = pair.publicKey()
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`)
  const result: any = await res.json()
  if (typeof result !== 'object' || result === null || !result.hash) {
    throw new Error(`Unexpected testnet faucet result for ${address} ${util.inspect(result)}`)
  }
  return {
    address,
    secret: pair.secret(),
  }
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generatePaymentsConfig(): Promise<AccountStellarPaymentsConfig> {
  logger.log('Generating testnet payments accounts using faucet')
  const hotAccount = await generateTestnetAccount()
  await delay(1000)
  const depositAccount = await generateTestnetAccount()
  const config: AccountStellarPaymentsConfig = {
    hotAccount,
    depositAccount,
  }
  fs.mkdirSync(path.dirname(TEST_ACCOUNT_FILE), { recursive: true })
  fs.writeFileSync(TEST_ACCOUNT_FILE, JSON.stringify(config), { encoding: 'utf8' })
  await delay(5000) // Give the funds time to clear to avoid conflicting with test cases
  return config
}

export async function setupTestnetPayments(): Promise<AccountStellarPayments> {
  let config: AccountStellarPaymentsConfig | undefined
  // Load saved testnet accounts
  if (fs.existsSync(TEST_ACCOUNT_FILE)) {
    const stringContents = fs.readFileSync(TEST_ACCOUNT_FILE, { encoding: 'utf8' })
    try {
      const jsonContents = JSON.parse(stringContents)
      config = assertType(AccountStellarPaymentsConfig, jsonContents)
    } catch (e) {
      logger.log(`Failed to parse testnet account file: ${TEST_ACCOUNT_FILE}`)
      config = await generatePaymentsConfig()
    }
  } else {
    config = await generatePaymentsConfig()
  }

  const DEFAULT_CONFIG = {
    network: NetworkType.Testnet,
    server: TESTNET_SERVER,
    logger,
  }
  let payments = new AccountStellarPayments({
    ...DEFAULT_CONFIG,
    ...config,
  })
  await payments.init()
  // Ensure accounts still exist, testnet can be wiped
  async function regenerate() {
    config = await generatePaymentsConfig()
    payments = new AccountStellarPayments({
      ...DEFAULT_CONFIG,
      ...config,
    })
  }
  let hotBalance
  let depositBalance
  try {
    hotBalance = await payments.getBalance(0)
    depositBalance = await payments.getBalance(1)
  } catch (e) {
    if (e.toString().toLowerCase().includes('not found')) {
      logger.warn('Cached testnet accounts are not found, will regenerate')
      await regenerate()
      return payments
    } else {
      throw new Error(`Unable to get balances of testnet accounts during setup - ${e.toString()}`)
    }
  }
  if (hotBalance.confirmedBalance === '0' || depositBalance.confirmedBalance === '0') {
    logger.warn('Cached testnet accounts have no balance, will regenerate')
    await regenerate()
  }
  return payments
}
