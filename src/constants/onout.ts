import { GOERLI_ID, BSC_ID } from './'

export const onoutUrl = 'https://onout.org'
export const originUrl = 'https://noxon.wpmix.net'
export const onoutFeeAddress = '0xC7a7abBa0f0760b83FE8A2D6CC61FC52d519BE5E'

export const requiredPaymentNetworkId = process.env.NODE_ENV === 'production' ? BSC_ID : GOERLI_ID

export enum Addition {
  switchCopyright = 1,
  premiumVersion = 2,
}

export interface PaidAddition {
  id: Addition
  usdCost: number
}

export type AdditionName = 'switchCopyright' | 'premiumVersion'

export const paidAdditions: {
  [name in AdditionName]: PaidAddition
} = {
  switchCopyright: {
    id: Addition.switchCopyright,
    usdCost: 30,
  },
  premiumVersion: {
    id: Addition.premiumVersion,
    usdCost: 1_000,
  },
}
