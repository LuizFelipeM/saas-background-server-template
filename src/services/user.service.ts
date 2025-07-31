import { type DatabaseManagerType, DITypes } from "@/lib/di.container/types";
import { Prisma, User } from "@/lib/generated/prisma";
import { UserSync } from "@/types/user.sync";
import { inject, injectable } from "tsyringe";

@injectable()
export class UserService {
  private readonly userDelegate: Prisma.UserDelegate;

  constructor(
    @inject(DITypes.DatabaseManager)
    private readonly dbManager: DatabaseManagerType
  ) {
    this.userDelegate = this.dbManager.client.user;
  }

  async sync(user: UserSync): Promise<User> {
    return await this.userDelegate.upsert({
      where: { clerkId: user.clerkId },
      update: {
        id: user.id,
        email: user.email,
        clerkId: user.clerkId,
        stripeId: user.stripeId,
        createdAt: user.createdAt,
        updatedAt: new Date(),
      },
      create: {
        id: user.id,
        email: user.email,
        clerkId: user.clerkId,
        stripeId: user.stripeId,
        createdAt: user.createdAt,
        updatedAt: new Date(),
      },
    });
  }

  async delete(clerkId: string): Promise<void> {
    await this.userDelegate.delete({
      where: { clerkId },
    });
  }

  async getByClerkId(clerkId: string): Promise<User | null> {
    return await this.userDelegate.findUnique({
      where: { clerkId },
    });
  }

  async getByEmail(email: string): Promise<User | null> {
    return await this.userDelegate.findUnique({
      where: { email },
    });
  }

  async getByStripeId(stripeId: string): Promise<User | null> {
    return await this.userDelegate.findUnique({
      where: { stripeId },
    });
  }

  async exists(clerkId: string): Promise<boolean> {
    const user = await this.userDelegate.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    return !!user;
  }
}
