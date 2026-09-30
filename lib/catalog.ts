import catalogJson from "@/data/services.json";
import type { Locale } from "@/lib/i18n/locale";

export type Track = "medical" | "education" | "social";

export type CatalogDocument = {
  id: string;
  name: string;
  nameKk: string;
};

export type Service = {
  id: string;
  track: Track;
  title: string;
  titleKk: string;
  organization: string;
  organizationKk: string;
  description: string;
  descriptionKk: string;
  documents: string[];
  deadlineDays: number;
  dependsOn: string[];
  conditions: string;
  conditionsKk: string;
};

type Catalog = {
  documents: CatalogDocument[];
  services: Service[];
};

export const catalog = catalogJson as Catalog;

const serviceMap = new Map(catalog.services.map((service) => [service.id, service]));
const documentMap = new Map(catalog.documents.map((document) => [document.id, document]));

export const allServiceIds = catalog.services.map((service) => service.id) as [string, ...string[]];

export function isServiceId(id: string): boolean {
  return serviceMap.has(id);
}

export function getService(id: string): Service | undefined {
  return serviceMap.get(id);
}

export function requireService(id: string): Service {
  const service = serviceMap.get(id);
  if (!service) {
    throw new Error(`Услуги ${id} нет в справочнике`);
  }
  return service;
}

export function getDocument(id: string): CatalogDocument | undefined {
  return documentMap.get(id);
}

export function serviceIndex(id: string): number {
  return catalog.services.findIndex((service) => service.id === id);
}

export function serviceTitle(id: string, locale: Locale, fallback?: string): string {
  const service = serviceMap.get(id);
  if (!service) {
    return fallback ?? id;
  }
  return locale === "kk" ? service.titleKk : service.title;
}

export function serviceOrganization(id: string, locale: Locale, fallback?: string): string {
  const service = serviceMap.get(id);
  if (!service) {
    return fallback ?? "";
  }
  return locale === "kk" ? service.organizationKk : service.organization;
}

export function documentName(id: string, locale: Locale, fallback?: string): string {
  const document = documentMap.get(id);
  if (!document) {
    return fallback ?? id;
  }
  return locale === "kk" ? document.nameKk : document.name;
}
