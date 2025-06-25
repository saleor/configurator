export type DiffOperation = "CREATE" | "UPDATE" | "DELETE";

export interface DiffResult<T = unknown> {
  operation: DiffOperation;
  entityType: string;
  entityName: string;
  current?: T; // Current state from Saleor
  desired?: T; // Desired state from config
  changes?: DiffChange[];
}

export interface DiffChange {
  field: string;
  currentValue: unknown;
  desiredValue: unknown;
  description?: string;
}

export interface DiffSummary {
  totalChanges: number;
  creates: number;
  updates: number;
  deletes: number;
  results: DiffResult[];
}

export interface DiffOptions {
  configPath?: string;
}

export class DiffFormatter {
  static format(summary: DiffSummary): string {
    if (summary.totalChanges === 0) {
      return "✅ No differences found. Local configuration matches Saleor instance.";
    }

    const lines: string[] = [];
    lines.push("📊 Configuration Diff Results");
    lines.push("".padEnd(50, "═"));
    lines.push("");
    lines.push("The following changes would be applied to reconcile Saleor with your local configuration:");
    lines.push("");

    // Group results by entity type
    const grouped = this.groupByEntityType(summary.results);

    for (const [entityType, results] of grouped) {
      lines.push(`${this.getEntityIcon(entityType)} ${entityType}`);
      lines.push("".padEnd(entityType.length + 2, "─"));
      
      for (const result of results) {
        const opText = this.getOperationText(result.operation);
        const opIcon = this.getOperationIcon(result.operation);
        lines.push(`  ${opIcon} ${opText}: "${result.entityName}"`);
        
        if (result.changes && result.changes.length > 0) {
          for (const change of result.changes) {
            const desc = change.description || 
              `${change.field}: "${change.currentValue}" → "${change.desiredValue}"`;
            lines.push(`    │ ${desc}`);
          }
        }
        
        if (result.operation === "DELETE" && result.current) {
          lines.push(`    │ The ${entityType.toLowerCase()} exists on Saleor but is missing from the local configuration.`);
        }
        
        if (result.operation === "CREATE" && result.desired) {
          const entity = result.desired as any;
          if (entity.currencyCode) {
            lines.push(`    │ Currency: ${entity.currencyCode}`);
          }
          if (entity.defaultCountry) {
            lines.push(`    │ Country: ${entity.defaultCountry}`);
          }
        }
        lines.push("");
      }
    }

    lines.push("📈 Summary");
    lines.push("".padEnd(10, "─"));
    lines.push(`Total Changes: ${summary.totalChanges}`);
    lines.push(`• ${summary.creates} Creation${summary.creates !== 1 ? 's' : ''}`);
    lines.push(`• ${summary.updates} Update${summary.updates !== 1 ? 's' : ''}`);
    lines.push(`• ${summary.deletes} Deletion${summary.deletes !== 1 ? 's' : ''}`);
    
    return lines.join("\n");
  }

  static formatSummary(summary: DiffSummary): string {
    if (summary.totalChanges === 0) {
      return "✅ No differences found";
    }

    const lines: string[] = [];
    lines.push(`📊 Found ${summary.totalChanges} difference${summary.totalChanges !== 1 ? 's' : ''}`);
    
    if (summary.creates > 0) {
      lines.push(`➕ ${summary.creates} item${summary.creates !== 1 ? 's' : ''} to create`);
    }
    if (summary.updates > 0) {
      lines.push(`🔄 ${summary.updates} item${summary.updates !== 1 ? 's' : ''} to update`);
    }
    if (summary.deletes > 0) {
      lines.push(`➖ ${summary.deletes} item${summary.deletes !== 1 ? 's' : ''} to delete`);
    }

    // Group by entity type for summary
    const grouped = this.groupByEntityType(summary.results);
    if (grouped.size > 0) {
      lines.push("");
      lines.push("By entity type:");
      for (const [entityType, results] of grouped) {
        lines.push(`• ${entityType}: ${results.length} change${results.length !== 1 ? 's' : ''}`);
      }
    }

    return lines.join("\n");
  }

  private static groupByEntityType(results: DiffResult[]): Map<string, DiffResult[]> {
    const grouped = new Map<string, DiffResult[]>();
    
    for (const result of results) {
      const entityType = result.entityType;
      if (!grouped.has(entityType)) {
        grouped.set(entityType, []);
      }
      grouped.get(entityType)!.push(result);
    }
    
    return grouped;
  }

  private static getEntityIcon(entityType: string): string {
    const icons: Record<string, string> = {
      "Product Types": "📦",
      "Channels": "🌐",
      "Page Types": "📄",
      "Categories": "🏷️",
      "Shop Settings": "🏪",
    };
    return icons[entityType] || "🔧";
  }

  private static getOperationIcon(operation: DiffOperation): string {
    const icons: Record<DiffOperation, string> = {
      CREATE: "➕",
      UPDATE: "🔄",
      DELETE: "➖",
    };
    return icons[operation];
  }

  private static getOperationText(operation: DiffOperation): string {
    const texts: Record<DiffOperation, string> = {
      CREATE: "Create",
      UPDATE: "Update",
      DELETE: "Delete",
    };
    return texts[operation];
  }
} 