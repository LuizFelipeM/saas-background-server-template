import { FeatureType } from "@/lib/generated/prisma";

export interface Feature {
  type: FeatureType;
  metadata?: FeatureMetadata;
}

export interface FeatureMetadata {
  min?: number;
  max?: number;
}
