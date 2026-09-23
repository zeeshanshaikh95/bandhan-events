import type { Request, Response } from "express";
import type { CustomerCreateInput, CustomerListQuery, CustomerUpdateInput } from "@bandhan/shared";
import { customerService } from "@/services/customerService";
import { validatedQuery } from "@/middleware/validate";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { clientIp, pathParam, requestId, sendSuccess } from "@/utils/http";

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) throw ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED");
  return req.auth;
}

function context(req: Request) {
  return { ip: clientIp(req), requestId: requestId(req) };
}

export const customerController = {
  /** GET /customers */
  async list(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await customerService.list(validatedQuery<CustomerListQuery>(req)));
  },

  /** GET /customers/:id */
  async get(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await customerService.getById(pathParam(req, "id")));
  },

  /** POST /customers */
  async create(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const customer = await customerService.create(
      req.body as CustomerCreateInput,
      auth,
      context(req)
    );
    sendSuccess(res, customer, 201);
  },

  /** PATCH /customers/:id */
  async update(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const customer = await customerService.update(
      pathParam(req, "id"),
      req.body as CustomerUpdateInput,
      auth,
      context(req)
    );
    sendSuccess(res, customer);
  },
};
