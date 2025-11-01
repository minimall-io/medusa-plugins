import { z } from 'zod'
import {
  ChallengeWindowSizeEnumSchema,
  DataOnlyEnumSchema,
  NativeThreeDSEnumSchema,
  ThreeDSVersionEnumSchema,
} from '.'

export const ThreeDSRequestDataSchema = z.object({
  challengeWindowSize: ChallengeWindowSizeEnumSchema.optional(),
  dataOnly: DataOnlyEnumSchema.optional(),
  nativeThreeDS: NativeThreeDSEnumSchema.optional(),
  threeDSVersion: ThreeDSVersionEnumSchema.optional(),
})
