import { CategoryFieldDefinition, Prisma } from "@prisma/client";
import { slugify } from "@/lib/slug";
import type {
  AdminCategoryFieldDefinitionInput,
  AdminProductAttributeInput,
  CategoryFieldDefinitionDTO
} from "@/types";
import {
  getDefinitionOptions,
  isAttributeValueEmpty,
  normalizeAttributeValue,
  type AttributePrimitiveValue,
  type CategoryFieldDefinitionLike
} from "@/lib/product-attributes";

const RESERVED_PRODUCT_FIELD_LABELS = new Map<string, string>([
  ["titulo", "Título"],
  ["title", "Título"],
  ["nombre", "Título"],
  ["descripcion", "Descripción"],
  ["description", "Descripción"],
  ["precio", "Precio"],
  ["price", "Precio"],
  ["stock", "Stock"],
  ["estado", "Estado"],
  ["imagen", "Imagen"],
  ["imagenes", "Imágenes"],
  ["foto", "Imagen"],
  ["fotos", "Imágenes"],
  ["categoria", "Categoría"],
  ["category", "Categoría"],
  ["coleccion", "Colección"],
  ["collection", "Colección"],
  ["slug", "Slug"]
]);

function uniqueFieldKey(baseLabel: string, usedKeys: Set<string>) {
  const baseKey = slugify(baseLabel) || "campo";
  let candidate = baseKey;
  let suffix = 2;

  while (usedKeys.has(candidate)) {
    candidate = `${baseKey}-${suffix}`;
    suffix += 1;
  }

  usedKeys.add(candidate);
  return candidate;
}

export function definitionToDTO(definition: CategoryFieldDefinitionLike): CategoryFieldDefinitionDTO {
  return {
    id: definition.id,
    key: definition.key,
    label: definition.label,
    type: definition.type,
    required: definition.required,
    unit: definition.unit,
    options: getDefinitionOptions(definition),
    showInCatalog: definition.showInCatalog,
    showInDetail: definition.showInDetail,
    sortOrder: definition.sortOrder,
    isActive: definition.isActive
  };
}

type SerializableCategory = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  fieldDefinitions: CategoryFieldDefinitionDTO[];
};

type CategoryWithDefinitionsAndCount = {
  id: string;
  name: string;
  slug: string;
  fieldDefinitions: CategoryFieldDefinition[];
  _count: {
    products: number;
  };
};

export function serializeAdminCategory(category: CategoryWithDefinitionsAndCount): SerializableCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    productCount: category._count.products,
    fieldDefinitions: category.fieldDefinitions.map(definitionToDTO)
  };
}

export function normalizeCategoryFieldDefinitions(
  inputDefinitions: AdminCategoryFieldDefinitionInput[],
  existingDefinitions: CategoryFieldDefinition[] = []
) {
  const existingById = new Map(existingDefinitions.map((definition) => [definition.id, definition]));
  const usedKeys = new Set(existingDefinitions.map((definition) => definition.key));

  return inputDefinitions.map((definition, index) => {
    const existing = definition.id ? existingById.get(definition.id) : null;
    const label = definition.label.trim();
    const options =
      definition.type === "SELECT"
        ? [...new Set((definition.options ?? []).map((option) => option.trim()).filter(Boolean))]
        : [];
    const key = existing?.key ?? uniqueFieldKey(label, usedKeys);

    return {
      id: existing?.id,
      key,
      label,
      type: definition.type,
      required: definition.required ?? false,
      unit: definition.unit?.trim() || null,
      optionsJson: options.length > 0 ? (options as Prisma.InputJsonValue) : Prisma.JsonNull,
      showInCatalog: definition.showInCatalog ?? false,
      showInDetail: definition.showInDetail ?? true,
      sortOrder: definition.sortOrder ?? index,
      isActive: definition.isActive ?? true
    };
  });
}

export function validateCategoryFieldDefinitions(definitions: AdminCategoryFieldDefinitionInput[]) {
  const seenLabels = new Set<string>();

  for (const definition of definitions) {
    const normalizedLabel = slugify(definition.label);

    if (!normalizedLabel) {
      throw new Error("Todos los campos de categoría necesitan una etiqueta válida.");
    }

    if (RESERVED_PRODUCT_FIELD_LABELS.has(normalizedLabel)) {
      throw new Error(
        `"${definition.label}" ya existe como campo base del producto. Usá solo características propias de la categoría.`
      );
    }

    if (seenLabels.has(normalizedLabel)) {
      throw new Error(`El campo "${definition.label}" está repetido. Usá una sola definición por atributo.`);
    }

    seenLabels.add(normalizedLabel);

    if (definition.type === "SELECT" && (!definition.options || definition.options.filter((option) => option.trim()).length === 0)) {
      throw new Error(`El campo "${definition.label}" necesita al menos una opción.`);
    }
  }
}

export function validateAndNormalizeProductAttributes(
  definitions: CategoryFieldDefinitionLike[],
  rawAttributes: AdminProductAttributeInput[]
): Array<{ fieldDefinitionId: string; value: AttributePrimitiveValue }> {
  const activeDefinitions = definitions.filter((definition) => definition.isActive);
  const activeDefinitionIds = new Set(activeDefinitions.map((definition) => definition.id));
  const rawByDefinitionId = new Map(rawAttributes.map((attribute) => [attribute.fieldDefinitionId, attribute.value]));

  for (const attribute of rawAttributes) {
    if (!activeDefinitionIds.has(attribute.fieldDefinitionId)) {
      throw new Error("Hay atributos que no pertenecen a la categoría seleccionada.");
    }
  }

  return activeDefinitions.map((definition) => {
    const normalizedValue = normalizeAttributeValue(definition, rawByDefinitionId.get(definition.id));

    if (definition.required && isAttributeValueEmpty(definition.type, normalizedValue)) {
      throw new Error(`Completá el campo "${definition.label}".`);
    }

    return {
      fieldDefinitionId: definition.id,
      value: normalizedValue
    };
  });
}
