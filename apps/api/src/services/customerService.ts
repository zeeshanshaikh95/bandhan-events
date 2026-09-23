import type { CustomerCreateInput, CustomerDto, CustomerListQuery, CustomerUpdateInput, Paginated } from "@bandhan/shared";
import { normalizePhone } from "@/models/Customer";
import { customerRepository } from "@/repositories/customerRepository";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { buildPaginated } from "@/utils/http";

/**
 * ---------------------------------------------------------------------------
 * CUSTOMER SERVICE
 * ---------------------------------------------------------------------------
 * The guard here matters: a duplicate customer silently splits a customer's
 * history across two records, and every quotation, event and payment then
 * links to the wrong half. So creation refuses a phone number that already
 * exists unless the caller explicitly confirms it.
 */

function toCustomerDto(customer: any): CustomerDto {
  return {
    id: String(customer._id),
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? null,
    address: customer.address || "",
    notes: customer.notes || "",
    createdAt: customer.createdAt?.toISOString() || "",
    updatedAt: customer.updatedAt?.toISOString() || "",
  };
}

export const customerService = {
  async create(
    input: CustomerCreateInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<CustomerDto> {
    const phoneNormalized = normalizePhone(input.phone);

    if (!input.confirmDuplicate) {
      const existing = await customerRepository.findByPhoneNormalized(phoneNormalized);
      if (existing.length > 0) {
        throw ApiError.conflict(
          `A customer with this phone number already exists (${existing[0]!.name}). Link the existing customer instead, or confirm that this is a different person.`,
          "CUSTOMER_PHONE_EXISTS"
        );
      }
    }

    const customer = await customerRepository.create({
      name: input.name,
      phone: input.phone,
      phoneNormalized,
      email: input.email,
      address: input.address ?? "",
      notes: input.notes ?? "",
      createdBy: actor.user.id,
      updatedBy: actor.user.id,
    });

    await auditService.record({
      action: AUDIT_ACTIONS.leadCreated,
      entityType: "Customer",
      entityId: String(customer._id),
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { source: "customer.created" },
    });

    return toCustomerDto(customer);
  },

  async update(
    id: string,
    patch: CustomerUpdateInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<CustomerDto> {
    const update: Record<string, unknown> = { ...patch, updatedBy: actor.user.id };
    if (patch.phone) update.phoneNormalized = normalizePhone(patch.phone);

    const customer = await customerRepository.updateById(id, update);
    if (!customer) throw ApiError.notFound("That customer could not be found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadUpdated,
      entityType: "Customer",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { fields: Object.keys(patch) },
    });

    return toCustomerDto(customer);
  },

  async getById(id: string): Promise<CustomerDto> {
    const customer = await customerRepository.findById(id);
    if (!customer) throw ApiError.notFound("That customer could not be found.");
    return toCustomerDto(customer);
  },

  async list(query: CustomerListQuery): Promise<Paginated<CustomerDto>> {
    const { items, total } = await customerRepository.list(query);
    return buildPaginated(items.map(toCustomerDto), total, query.page, query.limit);
  },
};
