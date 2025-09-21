import crypto from 'crypto'

import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CreateAccountHolderInput,
  CreateAccountHolderOutput,
  DeleteAccountHolderInput,
  DeleteAccountHolderOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ListPaymentMethodsInput,
  ListPaymentMethodsOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  SavePaymentMethodInput,
  SavePaymentMethodOutput,
  UpdateAccountHolderInput,
  UpdateAccountHolderOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from '@medusajs/framework/types'
import {
  AbstractPaymentProvider,
  PaymentActions,
  PaymentSessionStatus,
} from '@medusajs/framework/utils'

export class SystemProviderService extends AbstractPaymentProvider {
  static identifier = 'system'

  async getStatus(_): Promise<string> {
    return 'authorized'
  }

  async getPaymentData(_): Promise<Record<string, unknown>> {
    return {}
  }

  /**
   ******* packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ************ packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   *********** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ********** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ********* packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   ******** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ******* packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ****** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ********* packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ******* packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ****** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ****** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/line-items/[line_id]/route.ts:DELETE
   ******* packages/core/core-flows/src/line-item/workflows/delete-line-items.ts:deleteLineItemsWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/line-items/[line_id]/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/update-line-item-in-cart.ts:updateLineItemInCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/update-cart.ts:updateCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/customer/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/transfer-cart-customer.ts:transferCartCustomerWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/line-items/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/add-to-cart.ts:addToCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/shipping-methods/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/add-shipping-method-to-cart.ts:addShippingMethodToCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ******* packages/medusa/src/api/store/carts/route.ts:POST
   ****** packages/core/core-flows/src/cart/workflows/create-carts.ts:createCartWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ****** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ***** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   *********** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ********** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ********* packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ******** packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   *
   ***** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createSession
   */
  async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    return { data: {}, id: crypto.randomUUID() }
  }

  /**
   * We don't see this method being used anywhere.
   * Are these assumptions correct?
   *
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.getStatus
   */
  async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    throw new Error('Method not implemented.')
  }

  /**
   * This method isn't defined in the
   * packages/modules/payment/src/services/payment-provider.ts.
   *
   * All we can see is the DB operation (`this.retrievePayment`)
   * being invoked in two places (mentioned below) in the
   * packages/modules/payment/src/services/payment-module.
   *
   * Are these assumptions correct? What are we missing here?
   *
   * packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.refundPayment
   */
  async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    return {}
  }

  /**
   ******** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ******* PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ****** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ***** packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   **** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.authorizePayment
   *
   ***** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   **** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.authorizePayment
   *
   ***** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   **** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.authorizePayment
   *
   ****** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ***** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   **** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.authorizePayment
   */
  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    return { data: {}, status: PaymentSessionStatus.AUTHORIZED }
  }

  /**
   * We don't see this method being used beyond the Payment Module.
   * Are these assumptions correct?
   *
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.updatePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.updateSession
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: {} }
  }

  /**
   ******* packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ************ packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   *********** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ********** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ********* packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   ******** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ******* packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ****** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ********* packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ******* packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ****** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ****** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/line-items/[line_id]/route.ts:DELETE
   ******* packages/core/core-flows/src/line-item/workflows/delete-line-items.ts:deleteLineItemsWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/line-items/[line_id]/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/update-line-item-in-cart.ts:updateLineItemInCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/update-cart.ts:updateCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/customer/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/transfer-cart-customer.ts:transferCartCustomerWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/line-items/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/add-to-cart.ts:addToCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/shipping-methods/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/add-shipping-method-to-cart.ts:addShippingMethodToCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******* packages/medusa/src/api/store/carts/route.ts:POST
   ****** packages/core/core-flows/src/cart/workflows/create-carts.ts:createCartWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ****** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ***** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   *********** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ********** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ********* packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ******** packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ***** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deletePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******* packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ************ packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   *********** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ********** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ********* packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   ******** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ******* packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ****** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ********* packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ******* packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ****** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ****** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/line-items/[line_id]/route.ts:DELETE
   ******* packages/core/core-flows/src/line-item/workflows/delete-line-items.ts:deleteLineItemsWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/line-items/[line_id]/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/update-line-item-in-cart.ts:updateLineItemInCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/update-cart.ts:updateCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/customer/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/transfer-cart-customer.ts:transferCartCustomerWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/line-items/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/add-to-cart.ts:addToCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/shipping-methods/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/add-shipping-method-to-cart.ts:addShippingMethodToCartWorkflow
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******* packages/medusa/src/api/store/carts/route.ts:POST
   ****** packages/core/core-flows/src/cart/workflows/create-carts.ts:createCartWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ****** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ***** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   *********** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ********** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ********* packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ******** packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   *
   ***** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteSession
   */
  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: {} }
  }

  /**
   ******* packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST.PaymentWebhookEvents.WebhookReceived
   ****** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ***** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   **** packages/core/core-flows/src/payment/workflows/capture-payment.ts:capturePaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/capture-payment.ts:capturePaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.capturePayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.capturePayment
   *
   ****** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ***** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   **** packages/core/core-flows/src/payment/workflows/capture-payment.ts:capturePaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/capture-payment.ts:capturePaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.capturePayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.capturePayment
   *
   ***** packages/medusa/src/api/admin/payments/[id]/capture/route.ts:POST
   **** packages/core/core-flows/src/payment/workflows/capture-payment.ts:capturePaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/capture-payment.ts:capturePaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.capturePayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.capturePayment
   */
  async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    return { data: {} }
  }

  /**
   ****** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ***** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createAccountHolder
   *
   *********** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ********** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ********* packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ******** packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createAccountHolder
   *
   ******** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createAccountHolder
   *
   ***** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.createAccountHolder
   */
  async createAccountHolder(
    input: CreateAccountHolderInput,
  ): Promise<CreateAccountHolderOutput> {
    return { id: input.context.customer.id }
  }

  /**
   ****** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ***** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deleteAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteAccountHolder
   *
   *********** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ********** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ********* packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ******** packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deleteAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteAccountHolder
   *
   ******** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deleteAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteAccountHolder
   *
   ***** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.deleteAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.deleteAccountHolder
   */
  async deleteAccountHolder(
    input: DeleteAccountHolderInput,
  ): Promise<DeleteAccountHolderOutput> {
    return { data: {} }
  }

  /**
   *********** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ********** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ********* packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ******** packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment/workflows/refund-payments.ts:refundPaymentsWorkflow
   *** packages/core/core-flows/src/payment/steps/refund-payments.ts:refundPaymentsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.refundPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.refundPayment
   *
   ******** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment/workflows/refund-payments.ts:refundPaymentsWorkflow
   *** packages/core/core-flows/src/payment/steps/refund-payments.ts:refundPaymentsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.refundPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.refundPayment
   *
   ******* packages/medusa/src/api/admin/orders/[id]/cancel/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/cancel-order.ts:cancelOrderWorkflow
   ***** packages/core/core-flows/src/order/workflows/payments/refund-captured-payments.ts:refundCapturedPaymentsWorkflow
   **** packages/core/core-flows/src/payment/workflows/refund-payments.ts:refundPaymentsWorkflow
   *** packages/core/core-flows/src/payment/steps/refund-payments.ts:refundPaymentsStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.refundPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.refundPayment
   *
   ***** packages/medusa/src/api/admin/payments/[id]/refund/route.ts:POST
   **** packages/core/core-flows/src/payment/workflows/refund-payment.ts:refundPaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/refund-payment.ts:refundPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.refundPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.refundPayment
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return { data: {} }
  }

  /**
   ******* packages/medusa/src/api/admin/draft-orders/[id]/edit/request/route.ts:POST
   ****** packages/core/core-flows/src/draft-order/workflows/request-draft-order-edit.ts:requestDraftOrderEditWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/draft-orders/[id]/edit/confirm/route.ts:POST
   ****** packages/core/core-flows/src/draft-order/workflows/confirm-draft-order-edit.ts:confirmDraftOrderEditWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/returns/[id]/receive/confirm/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/return/confirm-receive-return-request.ts:confirmReturnReceiveWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/returns/[id]/request/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/return/confirm-return-request.ts:confirmReturnRequestWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/order-edits/[id]/confirm/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/order-edit/confirm-order-edit-request.ts:confirmOrderEditRequestWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/exchanges/[id]/request/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/exchange/confirm-exchange-request.ts:confirmExchangeRequestWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/claims/[id]/request/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/claim/confirm-claim-request.ts:confirmClaimRequestWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ******* PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ****** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ***** packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   **** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ***** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   **** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ***** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   **** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ****** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ***** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   **** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ***** packages/medusa/src/api/admin/orders/[id]/cancel/route.ts:POST
   **** packages/core/core-flows/src/order/workflows/cancel-order.ts:cancelOrderWorkflow
   *** packages/core/core-flows/src/payment/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ******* PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ****** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   ***** packages/core/core-flows/src/payment/steps/complete-cart-after-payment.ts:completeCartAfterPaymentStep
   **** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ***** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   **** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ***** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   **** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ****** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   ***** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   **** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: {} }
  }

  /**
   **** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   *** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.getWebhookActionAndData
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.getWebhookActionAndData
   */
  async getWebhookActionAndData(
    data: ProviderWebhookPayload['payload'],
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  /** Added Methods */

  /**
   * We don't see this method being used beyond the Payment Module.
   * Are these assumptions correct?
   *
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.listAndCountPaymentMethods
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.listPaymentMethods
   *
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.listPaymentMethods
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.listPaymentMethods
   */
  public async listPaymentMethods(
    input: ListPaymentMethodsInput,
  ): Promise<ListPaymentMethodsOutput> {
    return []
  }

  /**
   * We don't see this method being used beyond the Payment Module.
   * Are these assumptions correct?
   *
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.createPaymentMethods
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.savePaymentMethod
   */
  public async savePaymentMethod(
    input: SavePaymentMethodInput,
  ): Promise<SavePaymentMethodOutput> {
    return { id: '' }
  }

  /**
   * We don't see this method being used beyond the Payment Module.
   * Are these assumptions correct?
   *
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.updateAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.updateAccountHolder
   */
  public async updateAccountHolder(
    input: UpdateAccountHolderInput,
  ): Promise<UpdateAccountHolderOutput> {
    return {}
  }
}

export default SystemProviderService
