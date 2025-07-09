import { FeatureType } from "@saas-packages/database-manager";

export interface Feature {
  type: FeatureType;
  metadata?: FeatureMetadata;
}

export interface FeatureMetadata {
  min?: number;
  max?: number;
}
