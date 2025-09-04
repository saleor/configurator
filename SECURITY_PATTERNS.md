# Security Patterns Guide

Comprehensive security guide covering token management, access control, secure configuration practices, and security monitoring for the Saleor Configurator. This guide ensures safe operation in all environments.

## Token Management Best Practices

### Token Lifecycle Management

**Token Creation and Distribution:**
```bash
# 1. Create app-specific tokens in Saleor Dashboard
# Navigate to: Apps → Create App → Generate Token

# 2. Token naming convention
# Format: {environment}-{purpose}-{team}-{date}
# Examples:
# - prod-configurator-devops-2024-01
# - dev-testing-qa-2024-01  
# - staging-deployment-ci-2024-01
```

**Token Storage Patterns:**
```bash
# ✅ Environment Variables (Recommended)
export SALEOR_URL="https://store.saleor.cloud/graphql/"
export SALEOR_TOKEN="your-secure-token-here"

# ✅ Encrypted Secret Management
# AWS Secrets Manager, Azure Key Vault, HashiCorp Vault
aws secretsmanager get-secret-value --secret-id "saleor/prod/token"

# ✅ Local Development (.env.local - gitignored)
echo "SALEOR_TOKEN=dev-token" >> .env.local

# ❌ Never store in code
const token = "hardcoded-token"; // NEVER DO THIS

# ❌ Never commit to version control
git add .env # DANGEROUS if contains secrets
```

### Token Security Requirements

**Token Validation Service:**
```typescript
export class TokenSecurityService {
  async validateToken(token: string, environment: string): Promise<TokenValidation> {
    const validation: TokenValidation = {
      isValid: false,
      issues: [],
      recommendations: []
    };
    
    // 1. Check token format
    if (!this.isValidTokenFormat(token)) {
      validation.issues.push('Invalid token format');
      return validation;
    }
    
    // 2. Check token strength
    if (token.length < 32) {
      validation.issues.push('Token too short (minimum 32 characters)');
    }
    
    // 3. Check for development tokens in production
    if (environment === 'production' && this.isDevelopmentToken(token)) {
      validation.issues.push('Development token used in production environment');
    }
    
    // 4. Test token permissions
    const permissions = await this.testTokenPermissions(token);
    if (!permissions.hasRequiredPermissions) {
      validation.issues.push('Token missing required permissions');
      validation.recommendations.push(
        'Required permissions: MANAGE_PRODUCTS, MANAGE_CHANNELS, MANAGE_SETTINGS'
      );
    }
    
    validation.isValid = validation.issues.length === 0;
    return validation;
  }
  
  private async testTokenPermissions(token: string): Promise<PermissionTest> {
    try {
      // Test basic read permission
      const client = createGraphQLClient(process.env.SALEOR_URL!, token);
      
      const query = graphql(`
        query TestPermissions {
          shop {
            name
            permissions {
              code
            }
          }
        }
      `);
      
      const result = await client.query(query, {});
      
      if (result.error) {
        return { hasRequiredPermissions: false, error: result.error.message };
      }
      
      const permissions = result.data?.shop.permissions.map(p => p.code) || [];
      const requiredPermissions = [
        'MANAGE_PRODUCTS',
        'MANAGE_CHANNELS', 
        'MANAGE_SETTINGS'
      ];
      
      const hasAllPermissions = requiredPermissions.every(perm =>
        permissions.includes(perm)
      );
      
      return {
        hasRequiredPermissions: hasAllPermissions,
        availablePermissions: permissions,
        missingPermissions: requiredPermissions.filter(perm => 
          !permissions.includes(perm)
        )
      };
      
    } catch (error) {
      return { hasRequiredPermissions: false, error: error.message };
    }
  }
}
```

### Token Rotation Procedures

**Automated Token Rotation:**
```typescript
export class TokenRotationService {
  async rotateToken(
    currentToken: string,
    environment: string
  ): Promise<TokenRotationResult> {
    
    console.log(`🔄 Starting token rotation for ${environment}...`);
    
    try {
      // 1. Generate new token (manual step in Saleor Dashboard)
      console.log('📝 Step 1: Generate new token in Saleor Dashboard');
      console.log('   Apps → Your App → Generate New Token');
      
      // 2. Validate new token
      const newToken = await this.promptForNewToken();
      const validation = await this.validateToken(newToken, environment);
      
      if (!validation.isValid) {
        throw new TokenRotationError('New token validation failed');
      }
      
      // 3. Test new token functionality
      await this.testTokenFunctionality(newToken);
      
      // 4. Update secret storage
      await this.updateSecretStorage(environment, newToken);
      
      // 5. Revoke old token (manual step)
      console.log('📝 Step 5: Revoke old token in Saleor Dashboard');
      console.log('   Apps → Your App → Revoke Previous Token');
      
      console.log('✅ Token rotation completed successfully');
      
      return {
        success: true,
        oldTokenRevoked: false, // Manual step
        newTokenActive: true,
        rotationDate: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Token rotation failed:', error);
      
      return {
        success: false,
        error: error.message,
        rollbackRequired: true
      };
    }
  }
  
  private async testTokenFunctionality(token: string): Promise<void> {
    // Test all major operations
    const tests = [
      () => this.testIntrospection(token),
      () => this.testDeployment(token),
      () => this.testDiff(token)
    ];
    
    for (const test of tests) {
      await test();
    }
  }
}
```

## Environment-Specific Security

### Development Environment Security

**Development Security Patterns:**
```bash
# Development environment setup
export NODE_ENV=development
export LOG_LEVEL=debug

# Use dedicated test credentials (safe to share)
export TEST_URL="https://store-rzalldyg.saleor.cloud/graphql/"
export TEST_TOKEN="YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs"

# Local development security
echo "# Development Environment - Safe for Testing" >> .env.local
echo "SALEOR_URL=https://dev-store.saleor.cloud/graphql/" >> .env.local
echo "SALEOR_TOKEN=dev-token-with-limited-scope" >> .env.local

# Security validation for development
pnpm configurator security-check --environment=development
```

**Development Security Checklist:**
- [ ] Use dedicated development Saleor instance
- [ ] Use tokens with minimal required permissions
- [ ] Never use production tokens in development
- [ ] Log security events for audit trail
- [ ] Regularly rotate development tokens
- [ ] Use HTTPS even in development

### Staging Environment Security

**Staging Security Configuration:**
```bash
# Staging environment setup
export NODE_ENV=staging
export LOG_LEVEL=info

# Staging credentials (restricted access)
export SALEOR_URL="https://staging-store.saleor.cloud/graphql/"
export SALEOR_TOKEN="${STAGING_SECRET_TOKEN}"

# Additional staging security
export REQUIRE_APPROVAL_FOR_DEPLOYMENT=true
export ENABLE_AUDIT_LOGGING=true
export MAX_DEPLOYMENT_SIZE=100

# Security validation for staging
pnpm configurator security-check --environment=staging --strict
```

**Staging Security Requirements:**
- Mimic production security model
- Require explicit approval for deployments
- Enable comprehensive audit logging
- Limit deployment size and frequency
- Use production-like token permissions
- Regular security testing and validation

### Production Environment Security

**Production Security Configuration:**
```bash
# Production environment setup
export NODE_ENV=production
export LOG_LEVEL=warn

# Production credentials (maximum security)
export SALEOR_URL="${PROD_SALEOR_URL}"
export SALEOR_TOKEN="${PROD_SECRET_TOKEN}"

# Production security controls
export REQUIRE_MFA_FOR_DEPLOYMENT=true
export ENABLE_DEPLOYMENT_APPROVAL=true
export REQUIRE_SECURITY_REVIEW=true
export ENABLE_REAL_TIME_MONITORING=true

# Production deployment restrictions
export MAX_DEPLOYMENT_WINDOW="02:00-04:00"
export REQUIRE_BACKUP_BEFORE_DEPLOYMENT=true
export ENABLE_ROLLBACK_CAPABILITY=true
```

**Production Security Requirements:**
- Multi-factor authentication required
- Deployment approval workflow
- Real-time security monitoring
- Automated backup before changes
- Change window restrictions
- Immediate rollback capability
- Comprehensive audit trail

## Access Control Patterns

### Role-Based Access Control (RBAC)

**Access Control Matrix:**
```typescript
interface AccessControlMatrix {
  [role: string]: {
    permissions: Permission[];
    environments: Environment[];
    restrictions: Restriction[];
  };
}

const ACCESS_CONTROL: AccessControlMatrix = {
  'developer': {
    permissions: ['READ_CONFIG', 'DEPLOY_DEV'],
    environments: ['development'],
    restrictions: [
      'no_production_access',
      'limited_entity_types',
      'require_code_review'
    ]
  },
  
  'devops': {
    permissions: ['READ_CONFIG', 'DEPLOY_ALL', 'MANAGE_TOKENS'],
    environments: ['development', 'staging', 'production'],
    restrictions: [
      'require_mfa',
      'require_approval_for_production',
      'audit_all_actions'
    ]
  },
  
  'security': {
    permissions: ['READ_CONFIG', 'AUDIT_ACCESS', 'REVOKE_TOKENS'],
    environments: ['all'],
    restrictions: [
      'read_only_config',
      'full_audit_trail',
      'security_review_required'
    ]
  },
  
  'ci_cd': {
    permissions: ['READ_CONFIG', 'DEPLOY_STAGING'],
    environments: ['staging'],
    restrictions: [
      'automated_only',
      'no_interactive_access',
      'limited_time_window'
    ]
  }
};
```

**Access Control Validation:**
```typescript
export class AccessControlService {
  async validateAccess(
    user: UserContext,
    operation: Operation,
    environment: Environment
  ): Promise<AccessValidation> {
    
    const userRole = await this.getUserRole(user);
    const permissions = ACCESS_CONTROL[userRole];
    
    if (!permissions) {
      return { allowed: false, reason: 'Unknown user role' };
    }
    
    // Check environment access
    if (!permissions.environments.includes(environment) && 
        !permissions.environments.includes('all')) {
      return { 
        allowed: false, 
        reason: `No access to ${environment} environment` 
      };
    }
    
    // Check operation permissions
    if (!this.hasRequiredPermission(permissions.permissions, operation)) {
      return {
        allowed: false,
        reason: `Insufficient permissions for ${operation}`
      };
    }
    
    // Check restrictions
    const restrictionCheck = await this.validateRestrictions(
      permissions.restrictions,
      user,
      operation,
      environment
    );
    
    if (!restrictionCheck.passed) {
      return {
        allowed: false,
        reason: restrictionCheck.reason
      };
    }
    
    return { allowed: true, reason: 'Access granted' };
  }
}
```

### Multi-Factor Authentication (MFA)

**MFA Integration:**
```typescript
export class MFAService {
  async requireMFA(
    operation: Operation,
    environment: Environment
  ): Promise<boolean> {
    
    // Always require MFA for production
    if (environment === 'production') {
      return true;
    }
    
    // Require MFA for sensitive operations
    const sensitiveOperations = [
      'DELETE_ENTITIES',
      'MASS_UPDATE',
      'SCHEMA_MIGRATION',
      'TOKEN_MANAGEMENT'
    ];
    
    return sensitiveOperations.includes(operation);
  }
  
  async verifyMFA(user: UserContext): Promise<MFAResult> {
    // Integration with MFA providers (Auth0, Okta, etc.)
    const mfaToken = await this.promptForMFAToken();
    
    try {
      const verification = await this.mfaProvider.verify(user.id, mfaToken);
      
      return {
        verified: verification.success,
        validUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        method: verification.method
      };
      
    } catch (error) {
      return {
        verified: false,
        error: 'MFA verification failed'
      };
    }
  }
}
```

## Audit Trail Requirements

### Comprehensive Audit Logging

**Audit Event Structure:**
```typescript
interface AuditEvent {
  eventId: string;
  timestamp: Date;
  user: {
    id: string;
    role: string;
    email: string;
    ipAddress: string;
  };
  operation: {
    type: OperationType;
    target: string;
    environment: Environment;
    details: Record<string, any>;
  };
  result: {
    success: boolean;
    duration: number;
    error?: string;
  };
  security: {
    mfaUsed: boolean;
    tokenUsed: string; // Hashed/truncated
    riskScore: number;
  };
}

export class AuditLogger {
  async logEvent(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      eventId: generateEventId(),
      timestamp: new Date(),
      ...event
    };
    
    // Log to multiple destinations for redundancy
    await Promise.all([
      this.logToDatabase(auditEvent),
      this.logToFile(auditEvent),
      this.logToSIEM(auditEvent), // Security Information and Event Management
      this.logToCloudWatch(auditEvent) // If using AWS
    ]);
    
    // Alert on high-risk events
    if (auditEvent.security.riskScore > 8) {
      await this.sendSecurityAlert(auditEvent);
    }
  }
  
  private calculateRiskScore(event: AuditEvent): number {
    let score = 0;
    
    // Base score by operation type
    const operationRisk = {
      'DELETE_ENTITIES': 9,
      'MASS_UPDATE': 7,
      'DEPLOY_PRODUCTION': 8,
      'TOKEN_MANAGEMENT': 9,
      'READ_CONFIG': 1
    };
    
    score += operationRisk[event.operation.type] || 5;
    
    // Environment risk
    if (event.operation.environment === 'production') {
      score += 2;
    }
    
    // MFA usage
    if (!event.security.mfaUsed && score > 5) {
      score += 3;
    }
    
    // Failure increases risk
    if (!event.result.success) {
      score += 2;
    }
    
    return Math.min(score, 10);
  }
}
```

### Audit Trail Analysis

**Security Analytics:**
```typescript
export class SecurityAnalytics {
  async analyzeAuditTrail(
    timeRange: TimeRange,
    filters?: AuditFilter[]
  ): Promise<SecurityAnalysisReport> {
    
    const events = await this.getAuditEvents(timeRange, filters);
    
    const analysis = {
      totalEvents: events.length,
      failureRate: this.calculateFailureRate(events),
      highRiskEvents: events.filter(e => e.security.riskScore > 8),
      suspiciousPatterns: await this.detectSuspiciousPatterns(events),
      userActivitySummary: this.summarizeUserActivity(events),
      recommendations: await this.generateSecurityRecommendations(events)
    };
    
    return analysis;
  }
  
  private async detectSuspiciousPatterns(events: AuditEvent[]): Promise<SuspiciousPattern[]> {
    const patterns: SuspiciousPattern[] = [];
    
    // Detect repeated failures
    const failuresByUser = this.groupEventsByUser(
      events.filter(e => !e.result.success)
    );
    
    for (const [userId, failures] of Object.entries(failuresByUser)) {
      if (failures.length > 5) {
        patterns.push({
          type: 'repeated_failures',
          userId,
          severity: 'high',
          description: `User ${userId} has ${failures.length} failed operations`
        });
      }
    }
    
    // Detect unusual access patterns
    const accessPatterns = this.analyzeAccessPatterns(events);
    patterns.push(...accessPatterns);
    
    return patterns;
  }
}
```

## Sensitive Data Handling

### Configuration Sanitization

**Data Classification:**
```typescript
enum DataClassification {
  PUBLIC = 'public',           // Can be shared openly
  INTERNAL = 'internal',       // Within organization only
  CONFIDENTIAL = 'confidential', // Restricted access
  SECRET = 'secret'            // Highest protection required
}

interface FieldClassification {
  [fieldPath: string]: {
    classification: DataClassification;
    handling: SensitiveDataHandling;
    examples?: string[];
  };
}

const FIELD_CLASSIFICATIONS: FieldClassification = {
  'shop.defaultMailSenderAddress': {
    classification: DataClassification.INTERNAL,
    handling: 'mask_domain',
    examples: ['admin@*****.com']
  },
  
  'shop.customerServiceEmail': {
    classification: DataClassification.INTERNAL, 
    handling: 'mask_domain',
    examples: ['support@*****.com']
  },
  
  'attributes.*.values.*.name': {
    classification: DataClassification.PUBLIC,
    handling: 'no_masking'
  },
  
  'integrations.*.apiKey': {
    classification: DataClassification.SECRET,
    handling: 'full_redaction',
    examples: ['[REDACTED]']
  }
};
```

**Configuration Sanitizer:**
```typescript
export class ConfigurationSanitizer {
  sanitizeConfiguration(
    config: Configuration,
    context: SanitizationContext
  ): SanitizedConfiguration {
    
    const sanitized = JSON.parse(JSON.stringify(config));
    
    for (const [fieldPath, classification] of Object.entries(FIELD_CLASSIFICATIONS)) {
      const values = this.getFieldValues(sanitized, fieldPath);
      
      for (const { path, value } of values) {
        const sanitizedValue = this.sanitizeValue(
          value,
          classification,
          context
        );
        
        this.setFieldValue(sanitized, path, sanitizedValue);
      }
    }
    
    return {
      configuration: sanitized,
      sanitizedFields: this.getSanitizedFieldPaths(config),
      sanitizationLevel: context.level
    };
  }
  
  private sanitizeValue(
    value: any,
    classification: FieldClassification[string],
    context: SanitizationContext
  ): any {
    
    switch (classification.handling) {
      case 'full_redaction':
        return '[REDACTED]';
        
      case 'mask_domain':
        if (typeof value === 'string' && value.includes('@')) {
          const [local, domain] = value.split('@');
          return `${local}@${'*'.repeat(domain.length)}`;
        }
        return value;
        
      case 'mask_partial':
        if (typeof value === 'string' && value.length > 8) {
          const visible = value.slice(0, 4) + '...' + value.slice(-2);
          return visible;
        }
        return value;
        
      case 'no_masking':
      default:
        return value;
    }
  }
}
```

### Secret Detection and Prevention

**Pre-commit Secret Scanning:**
```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "🔍 Scanning for secrets before commit..."

# Use git-secrets or similar tool
git secrets --scan

# Custom secret patterns
if grep -r "AKIAIOSFODNN7EXAMPLE" . --exclude-dir=.git; then
    echo "❌ AWS access key detected in commit"
    exit 1
fi

if grep -r "sk_live_" . --exclude-dir=.git; then
    echo "❌ Stripe secret key detected in commit"
    exit 1
fi

if grep -r "Bearer [A-Za-z0-9]\\{32,\\}" . --exclude-dir=.git; then
    echo "❌ Bearer token detected in commit"
    exit 1
fi

echo "✅ No secrets detected"
exit 0
```

**Runtime Secret Detection:**
```typescript
export class SecretDetectionService {
  private secretPatterns = [
    // AWS Keys
    /AKIA[0-9A-Z]{16}/,
    // Stripe Keys
    /sk_(test|live)_[0-9a-zA-Z]{24}/,
    // JWT Tokens
    /eyJ[0-9a-zA-Z+/]{10,}/,
    // API Keys (generic)
    /[aA][pP][iI][_-]?[kK][eE][yY].*['\"][0-9a-zA-Z]{32,}['\"]/, 
    // Bearer Tokens
    /[bB]earer\s+[A-Za-z0-9\-\._~\+\/]+=*/
  ];
  
  scanConfiguration(config: Configuration): SecretScanResult {
    const violations: SecretViolation[] = [];
    const configString = JSON.stringify(config, null, 2);
    
    for (const [index, pattern] of this.secretPatterns.entries()) {
      const matches = configString.match(pattern);
      
      if (matches) {
        violations.push({
          pattern: index,
          match: this.maskSecret(matches[0]),
          location: this.findSecretLocation(config, matches[0]),
          severity: 'critical'
        });
      }
    }
    
    return {
      clean: violations.length === 0,
      violations,
      recommendations: this.generateRecommendations(violations)
    };
  }
}
```

## CI/CD Security

### Secure Pipeline Configuration

**GitHub Actions Security:**
```yaml
# .github/workflows/secure-deployment.yml
name: Secure Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Secret scanning
      - name: Run secret scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
          
      # Dependency vulnerability scan
      - name: Run npm audit
        run: npm audit --audit-level high
        
      # License compliance check
      - name: Check licenses
        run: npx license-checker --onlyAllow 'MIT;Apache-2.0;BSD-3-Clause'

  deploy:
    needs: [security-scan]
    runs-on: ubuntu-latest
    environment: production # Requires approval
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      # Secure token usage
      - name: Deploy to staging
        env:
          SALEOR_URL: ${{ secrets.STAGING_SALEOR_URL }}
          SALEOR_TOKEN: ${{ secrets.STAGING_SALEOR_TOKEN }}
          LOG_LEVEL: warn  # Avoid debug logs in CI
        run: |
          pnpm install
          pnpm build
          pnpm test
          pnpm configurator deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN --ci
          
      # Security verification
      - name: Post-deployment security check
        run: pnpm configurator security-check --environment=staging
```

### Pipeline Security Controls

**Deployment Approval Workflow:**
```typescript
export class DeploymentApprovalService {
  async requiresApproval(deployment: DeploymentRequest): Promise<ApprovalRequirement> {
    const requirements: ApprovalRequirement = {
      required: false,
      approvers: [],
      criteria: []
    };
    
    // Always require approval for production
    if (deployment.environment === 'production') {
      requirements.required = true;
      requirements.approvers.push('devops-team', 'security-team');
      requirements.criteria.push('production_deployment');
    }
    
    // Require approval for large changes
    if (deployment.changes.length > 50) {
      requirements.required = true;
      requirements.approvers.push('lead-developer');
      requirements.criteria.push('large_change_set');
    }
    
    // Require approval for breaking changes
    if (deployment.hasBreakingChanges) {
      requirements.required = true;
      requirements.approvers.push('architecture-team');
      requirements.criteria.push('breaking_changes');
    }
    
    return requirements;
  }
  
  async validateApprovals(
    deployment: DeploymentRequest,
    approvals: Approval[]
  ): Promise<ApprovalValidation> {
    
    const requirement = await this.requiresApproval(deployment);
    
    if (!requirement.required) {
      return { valid: true, reason: 'No approval required' };
    }
    
    // Check all required approvers have approved
    const approvedBy = approvals.map(a => a.approver);
    const missingApprovals = requirement.approvers.filter(approver =>
      !approvedBy.includes(approver)
    );
    
    if (missingApprovals.length > 0) {
      return {
        valid: false,
        reason: `Missing approvals from: ${missingApprovals.join(', ')}`
      };
    }
    
    // Check approval freshness (within 24 hours)
    const staleApprovals = approvals.filter(approval =>
      Date.now() - approval.timestamp.getTime() > 24 * 60 * 60 * 1000
    );
    
    if (staleApprovals.length > 0) {
      return {
        valid: false,
        reason: 'Some approvals are older than 24 hours'
      };
    }
    
    return { valid: true, reason: 'All approvals valid' };
  }
}
```

## Security Monitoring and Alerting

### Real-Time Security Monitoring

**Security Event Detection:**
```typescript
export class SecurityMonitoringService {
  private alertThresholds = {
    failedLogins: { count: 5, window: 300000 }, // 5 failures in 5 minutes
    suspiciousOperations: { count: 10, window: 600000 }, // 10 operations in 10 minutes
    highRiskOperations: { count: 1, window: 0 } // Any high-risk operation
  };
  
  async monitorSecurityEvents(): Promise<void> {
    setInterval(async () => {
      await this.checkSecurityThresholds();
    }, 60000); // Check every minute
  }
  
  private async checkSecurityThresholds(): Promise<void> {
    const recentEvents = await this.getRecentAuditEvents(
      new Date(Date.now() - 600000) // Last 10 minutes
    );
    
    // Check failed login attempts
    const failedLogins = recentEvents.filter(e => 
      e.operation.type === 'LOGIN' && !e.result.success
    );
    
    if (this.exceedsThreshold(failedLogins, this.alertThresholds.failedLogins)) {
      await this.sendSecurityAlert({
        type: 'authentication_failure',
        severity: 'high',
        description: `${failedLogins.length} failed login attempts detected`,
        events: failedLogins
      });
    }
    
    // Check suspicious operations
    const suspiciousOps = recentEvents.filter(e => e.security.riskScore > 7);
    
    if (this.exceedsThreshold(suspiciousOps, this.alertThresholds.suspiciousOperations)) {
      await this.sendSecurityAlert({
        type: 'suspicious_activity',
        severity: 'medium',
        description: `Unusual activity pattern detected`,
        events: suspiciousOps
      });
    }
  }
  
  private async sendSecurityAlert(alert: SecurityAlert): Promise<void> {
    // Send to multiple channels for redundancy
    await Promise.all([
      this.sendSlackAlert(alert),
      this.sendEmailAlert(alert),
      this.sendPagerDutyAlert(alert),
      this.logSecurityAlert(alert)
    ]);
  }
}
```

### Security Metrics and Dashboards

**Key Security Metrics:**
```typescript
interface SecurityMetrics {
  authentication: {
    successfulLogins: number;
    failedLogins: number;
    mfaUsage: number;
    tokenRotations: number;
  };
  
  operations: {
    totalOperations: number;
    highRiskOperations: number;
    failedOperations: number;
    unauthorizedAttempts: number;
  };
  
  compliance: {
    auditCoverage: number; // Percentage of operations audited
    dataClassificationCoverage: number;
    secretScanCoverage: number;
    approvalCompliance: number;
  };
  
  incidents: {
    securityIncidents: number;
    meanTimeToDetection: number; // In minutes
    meanTimeToResponse: number; // In minutes
    falsePositiveRate: number;
  };
}

export class SecurityMetricsCollector {
  async collectMetrics(timeRange: TimeRange): Promise<SecurityMetrics> {
    const auditEvents = await this.getAuditEvents(timeRange);
    
    return {
      authentication: this.calculateAuthMetrics(auditEvents),
      operations: this.calculateOperationMetrics(auditEvents),
      compliance: await this.calculateComplianceMetrics(timeRange),
      incidents: await this.calculateIncidentMetrics(timeRange)
    };
  }
  
  async generateSecurityReport(timeRange: TimeRange): Promise<SecurityReport> {
    const metrics = await this.collectMetrics(timeRange);
    const analysis = await this.analyzeSecurityTrends(metrics);
    
    return {
      period: timeRange,
      metrics,
      trends: analysis.trends,
      recommendations: analysis.recommendations,
      complianceStatus: this.assessComplianceStatus(metrics),
      riskAssessment: this.assessSecurityRisk(metrics)
    };
  }
}
```

## Incident Response Procedures

### Security Incident Classification

**Incident Severity Levels:**
```typescript
enum IncidentSeverity {
  LOW = 'low',           // Minor security policy violation
  MEDIUM = 'medium',     // Suspicious activity detected
  HIGH = 'high',         // Unauthorized access attempt
  CRITICAL = 'critical'  // Confirmed security breach
}

interface SecurityIncident {
  id: string;
  timestamp: Date;
  severity: IncidentSeverity;
  category: IncidentCategory;
  description: string;
  affectedSystems: string[];
  indicators: SecurityIndicator[];
  response: IncidentResponse;
}
```

**Incident Response Playbook:**
```typescript
export class IncidentResponseService {
  async handleSecurityIncident(incident: SecurityIncident): Promise<IncidentResponse> {
    console.log(`🚨 Security incident detected: ${incident.severity} - ${incident.description}`);
    
    const response: IncidentResponse = {
      incidentId: incident.id,
      startTime: new Date(),
      actions: [],
      status: 'investigating'
    };
    
    try {
      // Step 1: Immediate containment
      if (incident.severity === IncidentSeverity.CRITICAL) {
        await this.performImmediateContainment(incident);
        response.actions.push('immediate_containment_executed');
      }
      
      // Step 2: Evidence collection
      await this.collectEvidence(incident);
      response.actions.push('evidence_collected');
      
      // Step 3: Impact assessment
      const impact = await this.assessImpact(incident);
      response.impact = impact;
      response.actions.push('impact_assessed');
      
      // Step 4: Notification
      await this.notifyStakeholders(incident, impact);
      response.actions.push('stakeholders_notified');
      
      // Step 5: Remediation
      const remediation = await this.performRemediation(incident);
      response.remediation = remediation;
      response.actions.push('remediation_completed');
      
      // Step 6: Recovery
      await this.performRecovery(incident);
      response.actions.push('recovery_completed');
      
      response.status = 'resolved';
      response.endTime = new Date();
      
    } catch (error) {
      response.status = 'failed';
      response.error = error.message;
      
      // Escalate if response fails
      await this.escalateIncident(incident, response);
    }
    
    // Post-incident review
    await this.schedulePostIncidentReview(incident, response);
    
    return response;
  }
  
  private async performImmediateContainment(incident: SecurityIncident): Promise<void> {
    console.log('🔒 Performing immediate containment...');
    
    // Revoke potentially compromised tokens
    if (incident.category === 'token_compromise') {
      await this.revokeAllTokens();
    }
    
    // Block suspicious IP addresses
    if (incident.indicators.some(i => i.type === 'suspicious_ip')) {
      const suspiciousIPs = incident.indicators
        .filter(i => i.type === 'suspicious_ip')
        .map(i => i.value);
        
      await this.blockIPAddresses(suspiciousIPs);
    }
    
    // Disable affected user accounts
    if (incident.category === 'account_compromise') {
      const affectedUsers = incident.indicators
        .filter(i => i.type === 'user_id')
        .map(i => i.value);
        
      await this.disableUserAccounts(affectedUsers);
    }
  }
}
```

---

**Related Documentation:**
- [COMMANDS.md](COMMANDS.md) - Security-related CLI commands and options
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Secure deployment procedures
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Security issue troubleshooting
- [DEVELOPMENT_WORKFLOWS.md](DEVELOPMENT_WORKFLOWS.md) - Secure development practices
- [CLAUDE.md](CLAUDE.md) - Main navigation hub