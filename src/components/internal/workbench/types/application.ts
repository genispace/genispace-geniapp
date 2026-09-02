export type ApplicationStatus = string;

export interface Application {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface ApplicationFilter {
  [key: string]: unknown;
}

export interface CreateApplicationData {
  [key: string]: unknown;
}

export interface ApplicationCategory {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface ApplicationTemplate {
  id: string;
  [key: string]: unknown;
}

export interface ApplicationDeployment {
  id: string;
  [key: string]: unknown;
}

export interface ApplicationReview {
  id: string;
  [key: string]: unknown;
}

export interface ApplicationOrder {
  id: string;
  [key: string]: unknown;
}

export interface ApplicationApiKey {
  id: string;
  [key: string]: unknown;
}
