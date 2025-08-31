import { Addon, Plan } from "@/lib/generated/prisma";
import { hasDuplicates } from "@/lib/utils";
import { Feature } from "@/types/feature";
import { injectable } from "tsyringe";

@injectable()
export class FeatureService {
  constructor() {}

  private mergeFeatures(
    planFeatures: Record<string, Feature>,
    addonFeatures: Record<string, Feature>
  ): Record<string, Feature> {
    const mergedFeatures: Record<string, Feature> = { ...planFeatures };

    for (const key in addonFeatures) {
      if (
        !planFeatures[key] ||
        planFeatures[key].type !== addonFeatures[key].type
      ) {
        mergedFeatures[key] = addonFeatures[key];
      } else {
        if (
          planFeatures[key].type === addonFeatures[key].type &&
          planFeatures[key].type === "METERED"
        ) {
          mergedFeatures[key] = {
            ...planFeatures[key],
            ...addonFeatures[key],
            metadata: {
              min:
                Math.max(0, planFeatures[key].metadata?.min ?? 0) +
                Math.max(0, addonFeatures[key].metadata?.min ?? 0),
              max:
                Math.max(0, planFeatures[key].metadata?.max ?? 0) +
                Math.max(0, addonFeatures[key].metadata?.max ?? 0),
            },
          };
        }
      }
    }

    return mergedFeatures;
  }

  generateSubscriptionFeatures(
    plan: Plan,
    addons: Addon[]
  ): { [key: string]: Feature } {
    if (hasDuplicates(addons.map((addon) => addon.key))) {
      console.error(
        "Only one addon of the same feature is allowed to be added, please remove the duplicate addon"
      );
      throw new Error(
        "Only one addon of the same feature is allowed to be added, please remove the duplicate addon"
      );
    }

    const planFeatures: Record<string, Feature> =
      plan.features as unknown as Record<string, Feature>;
    const addonFeatures: Record<string, Feature> = addons?.reduce(
      (acc, { key, feature }) => ({
        ...acc,
        [key]: feature,
      }),
      {}
    );

    return this.mergeFeatures(planFeatures, addonFeatures);
  }
}
