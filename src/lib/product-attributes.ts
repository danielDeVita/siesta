import { CategoryFieldType, Prisma } from "@prisma/client";

export type AttributePrimitiveValue = string | number | boolean | null;

export type CategoryFieldDefinitionLike = {
  id: string;
  key: string;
  label: string;
  type: CategoryFieldType;
  required: boolean;
  unit: string | null;
  optionsJson: Prisma.JsonValue | null;
  showInCatalog: boolean;
  showInDetail: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type ProductFieldValueLike = {
  categoryFieldDefinitionId: string;
  valueJson: Prisma.JsonValue;
};

export type BuiltProductAttribute = {
  fieldDefinitionId: string;
  key: string;
  label: string;
  type: CategoryFieldType;
  unit: string | null;
  rawValue: AttributePrimitiveValue;
  displayValue: string;
  showInCatalog: boolean;
  showInDetail: boolean;
  sortOrder: number;
};

function isStringArray(value: Prisma.JsonValue | null): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function getDefinitionOptions(definition: Pick<CategoryFieldDefinitionLike, "optionsJson">): string[] {
  return isStringArray(definition.optionsJson) ? definition.optionsJson : [];
}

export function extractAttributePrimitiveValue(value: Prisma.JsonValue | null | undefined): AttributePrimitiveValue {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return null;
}

export function isAttributeValueEmpty(type: CategoryFieldType, value: AttributePrimitiveValue): boolean {
  if (type === "BOOLEAN") {
    return value === null;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  return value === null;
}

export function formatAttributeDisplayValue(
  definition: Pick<CategoryFieldDefinitionLike, "type" | "unit">,
  rawValue: AttributePrimitiveValue
): string {
  if (definition.type === "BOOLEAN") {
    return rawValue === true ? "Sí" : rawValue === false ? "No" : "";
  }

  if (rawValue === null) {
    return "";
  }

  if (definition.type === "NUMBER") {
    const numeric = typeof rawValue === "number" ? rawValue : Number(rawValue);
    if (!Number.isFinite(numeric)) {
      return "";
    }

    const formatted = Number.isInteger(numeric) ? String(numeric) : String(numeric);
    return definition.unit ? `${formatted} ${definition.unit}` : formatted;
  }

  const text = String(rawValue).trim();
  if (!text) {
    return "";
  }

  return definition.unit ? `${text} ${definition.unit}` : text;
}

export function normalizeAttributeValue(
  definition: Pick<CategoryFieldDefinitionLike, "type" | "optionsJson">,
  rawValue: unknown
): AttributePrimitiveValue {
  if (rawValue === undefined) {
    return null;
  }

  if (rawValue === null) {
    return null;
  }

  if (definition.type === "BOOLEAN") {
    if (typeof rawValue === "boolean") {
      return rawValue;
    }

    if (typeof rawValue === "string") {
      const normalized = rawValue.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
      if (normalized === "") return null;
    }

    return null;
  }

  if (definition.type === "NUMBER") {
    if (typeof rawValue === "number") {
      return Number.isFinite(rawValue) ? rawValue : null;
    }

    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim().replace(",", ".");
      if (!trimmed) {
        return null;
      }

      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  const stringValue = String(rawValue).trim();
  if (!stringValue) {
    return null;
  }

  if (definition.type === "SELECT") {
    const options = getDefinitionOptions(definition);
    return options.includes(stringValue) ? stringValue : null;
  }

  return stringValue;
}

export function buildProductAttributes(
  definitions: CategoryFieldDefinitionLike[],
  fieldValues: ProductFieldValueLike[],
  legacyMeasurements?: string | null
): BuiltProductAttribute[] {
  const valuesByDefinitionId = new Map(
    fieldValues.map((fieldValue) => [fieldValue.categoryFieldDefinitionId, extractAttributePrimitiveValue(fieldValue.valueJson)])
  );

  const attributes = definitions
    .filter((definition) => definition.isActive)
    .map((definition) => {
      const rawValue = valuesByDefinitionId.get(definition.id) ?? null;
      const displayValue = formatAttributeDisplayValue(definition, rawValue);

      return {
        fieldDefinitionId: definition.id,
        key: definition.key,
        label: definition.label,
        type: definition.type,
        unit: definition.unit,
        rawValue,
        displayValue,
        showInCatalog: definition.showInCatalog,
        showInDetail: definition.showInDetail,
        sortOrder: definition.sortOrder
      };
    })
    .filter((attribute) => attribute.displayValue.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  if (!legacyMeasurements?.trim()) {
    return attributes;
  }

  const hasDimensionAttributes = attributes.some((attribute) => attribute.key === "largo" || attribute.key === "alto");
  if (hasDimensionAttributes) {
    return attributes;
  }

  return [
    {
      fieldDefinitionId: "legacy-measurements",
      key: "measurements",
      label: "Medidas",
      type: CategoryFieldType.TEXT,
      unit: null,
      rawValue: legacyMeasurements,
      displayValue: legacyMeasurements,
      showInCatalog: true,
      showInDetail: true,
      sortOrder: 9999
    },
    ...attributes
  ];
}

export function parseLegacyMeasurements(measurements: string | null | undefined): { largo: number; alto: number } | null {
  if (!measurements) {
    return null;
  }

  const match = measurements.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i);
  if (!match) {
    return null;
  }

  const largo = Number(match[1].replace(",", "."));
  const alto = Number(match[2].replace(",", "."));

  if (!Number.isFinite(largo) || !Number.isFinite(alto)) {
    return null;
  }

  return { largo, alto };
}

export function summarizeAttributes(attributes: Array<Pick<BuiltProductAttribute, "label" | "displayValue">>, limit = 3): string {
  return attributes
    .filter((attribute) => attribute.displayValue.trim().length > 0)
    .slice(0, limit)
    .map((attribute) => `${attribute.label}: ${attribute.displayValue}`)
    .join(" · ");
}
