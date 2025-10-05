import { z } from 'zod'

export const StringDateUnionSchema = z.union([z.string(), z.date()])

export const StringArraySchema = z.array(z.string())

export const StringRecordSchema = z.record(z.string(), z.string())

export const AnyRecordSchema = z.record(z.string(), z.any())

export const UnknownRecordSchema = z.record(z.string(), z.unknown())
