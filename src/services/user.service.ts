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
      where: { id: user.id },
      update: {
        id: user.id,
        email: user.email,
        stripeId: user.stripeId,
        createdAt: user.createdAt,
        updatedAt: new Date(),
      },
      create: {
        id: user.id,
        email: user.email,
        stripeId: user.stripeId,
        createdAt: user.createdAt,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.userDelegate.delete({
      where: { id },
    });
  }

  async getById(id: string): Promise<User | null> {
    return await this.userDelegate.findUnique({
      where: { id },
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

  async exists(id: string): Promise<boolean> {
    const user = await this.userDelegate.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!user;
  }
}
