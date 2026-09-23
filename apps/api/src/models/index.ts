/**
 * ---------------------------------------------------------------------------
 * MODEL REGISTRY
 * ---------------------------------------------------------------------------
 * Mongoose resolves `ref: "Something"` through a global registry populated at
 * import time. A repository that calls `populate("vendor")` before anything has
 * imported the Vendor model throws `MissingSchemaError` — and because it throws
 * inside a query, the request 500s.
 *
 * That is not hypothetical: it is how the event detail, expense list and
 * payment list endpoints were failing. Importing every model once at startup
 * (see `config/db.ts`) removes the dependency on which repository happened to
 * load first, so a `populate()` can never be broken by import order.
 *
 * Adding a model to this file is not optional bookkeeping — it is what makes
 * cross-collection references work.
 */

import "./AuditLog";
import "./Counter";
import "./Customer";
import "./Event";
import "./Expense";
import "./Investment";
import "./Invoice";
import "./Lead";
import "./Payment";
import "./Quotation";
import "./RenderedDocument";
import "./Session";
import "./SiteSetting";
import "./SyncLog";
import "./User";
import "./Vendor";
import "./VendorPayment";
