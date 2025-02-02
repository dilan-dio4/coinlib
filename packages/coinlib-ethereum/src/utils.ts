import { isMatchingError, isString, Logger } from '@faast/ts-common'
import { BlockbookEthereum, NormalizedTxEthereum } from 'blockbook-client'
import promiseRetry from 'promise-retry'
import { EthereumBlockbookConnectedConfig } from './types'

const RETRYABLE_ERRORS = ['request failed or timed out']
const MAX_RETRIES = 2

export function retryIfDisconnected<T>(
  fn: () => Promise<T>,
  logger: Logger,
  additionalRetryableErrors: string[] = [],
): Promise<T> {
  return promiseRetry(
    (retry, attempt) => {
      return fn().catch(async e => {
        if (isMatchingError(e, [...RETRYABLE_ERRORS, ...additionalRetryableErrors])) {
          logger.log(
            `Retryable error during ethereum-payments call, retrying ${MAX_RETRIES - attempt} more times`,
            e.toString(),
          )
          retry(e)
        }
        throw e
      })
    },
    {
      retries: MAX_RETRIES,
    },
  )
}

export function resolveServer(
  { server, requestTimeoutMs, api }: EthereumBlockbookConnectedConfig,
  logger: Logger,
): {
  api: BlockbookEthereum
  server: string[] | null
} {
  if (api) {
    return {
      api: api,
      server: api.nodes,
    }
  }

  if (isString(server)) {
    return {
      api: new BlockbookEthereum({
        nodes: [server],
        logger,
        requestTimeoutMs: requestTimeoutMs,
      }),
      server: [server],
    }
  }

  if (server instanceof BlockbookEthereum) {
    return {
      api: server,
      server: server.nodes,
    }
  }

  if (Array.isArray(server)) {
    return {
      api: new BlockbookEthereum({
        nodes: server,
        logger,
        requestTimeoutMs: requestTimeoutMs,
      }),
      server,
    }
  }

  // null server arg -> offline mode
  return {
    api: new BlockbookEthereum({
      nodes: [''],
      logger,
      requestTimeoutMs,
    }),
    server: null,
  }
}

export function getBlockBookTxFromAndToAddress(tx: NormalizedTxEthereum) {
  if (tx.vin.length !== 1 || tx.vout.length !== 1) {
    throw new Error('transaction has less or more than one input or output')
  }

  const inputAddresses = tx.vin[0].addresses
  const outputAddresses = tx.vout[0].addresses
  let toAddress = ''

  if (!inputAddresses) {
    throw new Error(`txId = ${tx.txid} is missing input address`)
  }

  // for contract deploys, the outputAddress is usually null
  if (!outputAddresses) {
    toAddress = '0x'
  } else {
    toAddress = outputAddresses[0]
  }

  return {
    toAddress,
    fromAddress: inputAddresses[0],
  }
}
