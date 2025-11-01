import { z } from 'zod'
import {
  AuthenticationResponseEnumSchema,
  ChallengeCancelEnumSchema,
  DirectoryResponseEnumSchema,
} from '.'

export const ThreeDSecureDataSchema = z.object({
  authenticationResponse: AuthenticationResponseEnumSchema.optional(),
  cavv: z.string().optional(),
  cavvAlgorithm: z.string().optional(),
  challengeCancel: ChallengeCancelEnumSchema.optional(),
  directoryResponse: DirectoryResponseEnumSchema.optional(),
  dsTransID: z.string().optional(),
  eci: z.string().optional(),
  riskScore: z.string().optional(),
  threeDSVersion: z.string().optional(),
  tokenAuthenticationVerificationValue: z.string().optional(),
  transStatusReason: z.string().optional(),
  xid: z.string().optional(),
})
