import type { Role, UserStatus } from "@bandhan/shared";
import { User, type UserDocument } from "@/models/User";

/**
 * Every User query goes through this module. Keeping data access here means
 * the rule "a password hash is only loaded when authentication needs it" has
 * exactly one place to hold.
 */

interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status?: UserStatus;
  mustChangePassword?: boolean;
  createdBy?: string | null;
}

export const userRepository = {
  async create(input: CreateUserInput): Promise<UserDocument> {
    return User.create({
      ...input,
      status: input.status ?? "ACTIVE",
      mustChangePassword: input.mustChangePassword ?? true,
      createdBy: input.createdBy ?? null,
    });
  },

  /** Includes the password hash — authentication only. */
  async findByEmailWithSecret(email: string): Promise<UserDocument | null> {
    return User.findOne({ email: email.toLowerCase().trim(), archivedAt: null }).select(
      "+passwordHash +resetTokenHash +resetTokenExpiresAt +resetTokenUsedAt"
    );
  },

  async findById(id: string): Promise<UserDocument | null> {
    return User.findOne({ _id: id, archivedAt: null });
  },

  async findByIdWithSecret(id: string): Promise<UserDocument | null> {
    return User.findById(id).select("+passwordHash");
  },

  async findByResetTokenHash(tokenHash: string): Promise<UserDocument | null> {
    return User.findOne({
      resetTokenHash: tokenHash,
      resetTokenUsedAt: null,
      resetTokenExpiresAt: { $gt: new Date() },
      archivedAt: null,
    }).select("+passwordHash +resetTokenHash +resetTokenExpiresAt");
  },

  async list(filter: { search?: string; role?: Role; status?: UserStatus }): Promise<UserDocument[]> {
    const query: Record<string, unknown> = { archivedAt: null };
    if (filter.role) query.role = filter.role;
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const term = filter.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [{ name: { $regex: term, $options: "i" } }, { email: { $regex: term, $options: "i" } }];
    }
    return User.find(query).sort({ createdAt: 1 });
  },

  async countActive(): Promise<number> {
    return User.countDocuments({ status: "ACTIVE", archivedAt: null });
  },

  async save(user: UserDocument): Promise<UserDocument> {
    return user.save();
  },

  async updateById(id: string, update: Record<string, unknown>): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  },
};
