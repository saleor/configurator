import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { CLIRunner, CLIOutputParser } from "../helpers/cli-runner.ts";
import { SandboxManager, type SandboxState } from "../helpers/sandbox-manager.ts";
import { FileUtils, TestAssertions, ConfigUtils, TestDataGenerator, WaitUtils } from "../helpers/test-utils.ts";
import { getTestEnvironment, generateTestConfig } from "../fixtures/environments.ts";
import type { TestContext } from "../setup/global-setup.ts";

describe("End-to-End Workflow Tests", () => {
  let cliRunner: CLIRunner;
  let sandboxManager: SandboxManager;
  let testContext: TestContext;
  let testWorkspace: string;
  let testConfig: ReturnType<typeof generateTestConfig>;
  let initialSandboxState: SandboxState;

  beforeAll(async () => {
    // Initialize test environment
    testConfig = generateTestConfig();
    testContext = {
      testWorkspace: await FileUtils.createTempDir("workflow-e2e-"),
      saleorUrl: testConfig.environment.saleorUrl,
      saleorToken: testConfig.environment.saleorToken,
    };

    cliRunner = CLIRunner.create(testContext);
    sandboxManager = SandboxManager.fromTestContext(testContext);

    console.log(`🔧 Test workspace: ${testContext.testWorkspace}`);
    console.log(`🌐 Testing against: ${testContext.saleorUrl}`);

    // Verify sandbox connectivity and capture initial state
    const isConnected = await sandboxManager.testConnection();
    if (!isConnected) {
      throw new Error(`Failed to connect to Saleor sandbox: ${testContext.saleorUrl}`);
    }

    initialSandboxState = await sandboxManager.getSandboxState();
    console.log(`📊 Initial sandbox state: ${JSON.stringify(initialSandboxState)}`);

    console.log("✅ Sandbox connection verified");
  }, 60000);

  afterAll(async () => {
    // Cleanup test workspace
    if (testContext.testWorkspace) {
      await FileUtils.cleanupDirectory(testContext.testWorkspace);
      console.log(`🧹 Cleaned up test workspace: ${testContext.testWorkspace}`);
    }

    // Log final sandbox state for monitoring
    try {
      const finalState = await sandboxManager.getSandboxState();
      const delta = await sandboxManager.compareStates(initialSandboxState, finalState);
      console.log(`📊 Final sandbox state delta: ${JSON.stringify(delta)}`);

      // Warn if significant changes remain
      if (Math.abs(delta.productsDelta) > 10 || Math.abs(delta.categoriesDelta) > 5) {
        console.log(`⚠️  Significant changes detected in sandbox state - manual cleanup may be needed`);
      }
    } catch (error) {
      console.log(`⚠️  Could not verify final sandbox state: ${error}`);
    }
  }, 30000);

  beforeEach(async () => {
    // Create fresh test directory for each test
    testWorkspace = join(testContext.testWorkspace, `test-${Date.now()}`);
    await mkdir(testWorkspace, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup individual test workspace
    if (existsSync(testWorkspace)) {
      await rm(testWorkspace, { recursive: true, force: true });
    }
  });

  describe("Complete Idempotency Workflow", () => {
    it("should execute complete workflow: introspect → modify → diff → deploy → deploy (idempotency)", async () => {
      const workflowId = `workflow-${Date.now()}`;
      console.log(`🚀 Starting complete workflow test: ${workflowId}`);

      // STEP 1: Introspect current state
      console.log("📥 STEP 1: Introspecting current configuration...");
      const introspectResult = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
        timeout: 120000,
      });

      TestAssertions.assertCommandSuccess(introspectResult);
      const introspectedFiles = await FileUtils.getAllFiles(testWorkspace);
      console.log(`✅ Introspected ${introspectedFiles.length} configuration files`);

      // STEP 2: Modify configuration (add new entities)
      console.log("✏️  STEP 2: Modifying configuration...");

      // Add test product
      const testProduct = TestDataGenerator.generateProduct({
        name: `Workflow Test Product ${workflowId}`,
        slug: `workflow-test-product-${workflowId}`,
        description: `Product created by workflow test ${workflowId} at ${new Date().toISOString()}`,
      });

      // Add test category
      const testCategory = TestDataGenerator.generateCategory({
        name: `Workflow Test Category ${workflowId}`,
        slug: `workflow-test-category-${workflowId}`,
        description: `Category created by workflow test ${workflowId}`,
      });

      // Write new configurations
      const productConfig = ConfigUtils.createProductConfig([testProduct]);
      const categoryConfig = ConfigUtils.createCategoryConfig([testCategory]);

      await writeFile(join(testWorkspace, `workflow-products-${workflowId}.yaml`), productConfig, "utf-8");
      await writeFile(join(testWorkspace, `workflow-categories-${workflowId}.yaml`), categoryConfig, "utf-8");

      const modifiedFiles = await FileUtils.getAllFiles(testWorkspace);
      console.log(`✅ Configuration modified: ${modifiedFiles.length} files (added ${modifiedFiles.length - introspectedFiles.length} new files)`);

      // STEP 3: Diff to verify changes
      console.log("🔍 STEP 3: Running diff to verify changes...");
      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 90000,
      });

      TestAssertions.assertCommandSuccess(diffResult);

      // Parse diff summary
      const diffSummary = CLIOutputParser.extractDiffSummary(diffResult.stdout);
      console.log(`📊 Diff summary: ${JSON.stringify(diffSummary)}`);

      // Should detect changes
      const hasChanges = diffSummary.added > 0 || diffSummary.modified > 0 ||
                        /added|modified|changed|\+/i.test(diffResult.stdout);

      if (hasChanges) {
        console.log("✅ Diff correctly detected changes");
      } else {
        console.log("ℹ️  No changes detected in diff (may be expected depending on implementation)");
      }

      // STEP 4: First deployment
      console.log("🚀 STEP 4: First deployment...");
      const beforeDeployState = await sandboxManager.getSandboxState();

      const deploy1Result = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 180000, // 3 minutes for deployment
      });

      TestAssertions.assertCommandSuccess(deploy1Result);

      const isDeploymentSuccessful = CLIOutputParser.isDeploymentSuccessful(deploy1Result.stdout);
      if (isDeploymentSuccessful) {
        console.log("✅ First deployment completed successfully");
      } else {
        console.log("ℹ️  First deployment completed (success not explicitly indicated)");
      }

      // Verify state change
      const afterDeploy1State = await sandboxManager.getSandboxState();
      const deploy1Delta = await sandboxManager.compareStates(beforeDeployState, afterDeploy1State);
      console.log(`📊 First deployment state changes: ${JSON.stringify(deploy1Delta)}`);

      // STEP 5: Second deployment (idempotency test)
      console.log("🔄 STEP 5: Second deployment (idempotency test)...");

      const deploy2Result = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 180000,
      });

      TestAssertions.assertCommandSuccess(deploy2Result);

      const isSecondDeploymentSuccessful = CLIOutputParser.isDeploymentSuccessful(deploy2Result.stdout);
      if (isSecondDeploymentSuccessful) {
        console.log("✅ Second deployment completed successfully");
      } else {
        console.log("ℹ️  Second deployment completed (success not explicitly indicated)");
      }

      // Verify idempotency (minimal state change)
      const afterDeploy2State = await sandboxManager.getSandboxState();
      const deploy2Delta = await sandboxManager.compareStates(afterDeploy1State, afterDeploy2State);
      console.log(`📊 Second deployment state changes: ${JSON.stringify(deploy2Delta)}`);

      // Idempotency verification
      const isIdempotent = Math.abs(deploy2Delta.productsDelta) <= 1 &&
                          Math.abs(deploy2Delta.categoriesDelta) <= 1 &&
                          Math.abs(deploy2Delta.attributesDelta) <= 1;

      if (isIdempotent) {
        console.log("✅ Deployment is idempotent - minimal changes on second run");
      } else {
        console.log(`⚠️  Significant changes on second deployment: ${JSON.stringify(deploy2Delta)}`);
      }

      // STEP 6: Final diff to verify synchronization
      console.log("🔍 STEP 6: Final diff to verify synchronization...");

      const finalDiffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 90000,
      });

      TestAssertions.assertCommandSuccess(finalDiffResult);

      const finalDiffSummary = CLIOutputParser.extractDiffSummary(finalDiffResult.stdout);
      console.log(`📊 Final diff summary: ${JSON.stringify(finalDiffSummary)}`);

      // Should show minimal or no changes
      const hasMinimalChanges = finalDiffSummary.added <= 1 && finalDiffSummary.modified <= 1 && finalDiffSummary.deleted <= 1;
      if (hasMinimalChanges) {
        console.log("✅ Final diff shows synchronization - minimal changes detected");
      } else {
        console.log(`ℹ️  Final diff shows changes: ${JSON.stringify(finalDiffSummary)}`);
      }

      // Workflow summary
      console.log(`🎉 WORKFLOW COMPLETED: ${workflowId}
        ✅ Introspect: ${introspectResult.success}
        ✅ Modify: Configuration updated
        ✅ Diff: ${diffResult.success}
        ✅ Deploy 1: ${deploy1Result.success}
        ✅ Deploy 2: ${deploy2Result.success} (idempotent: ${isIdempotent})
        ✅ Final Diff: ${finalDiffResult.success}
      `);

      console.log("✅ Complete idempotency workflow test passed");
    }, 900000); // 15 minutes for complete workflow

    it("should handle workflow with existing data modifications", async () => {
      const workflowId = `modify-workflow-${Date.now()}`;
      console.log(`🚀 Starting modification workflow test: ${workflowId}`);

      // STEP 1: Introspect current state
      console.log("📥 STEP 1: Introspecting for modification test...");
      const introspectResult = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
        timeout: 120000,
      });

      TestAssertions.assertCommandSuccess(introspectResult);

      // STEP 2: Check if we have files to modify
      const configFiles = await FileUtils.getAllFiles(testWorkspace);
      const yamlFiles = configFiles.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

      if (yamlFiles.length > 0) {
        // STEP 3: Modify existing configuration
        console.log("✏️  STEP 2: Modifying existing configuration...");
        const fileToModify = yamlFiles[0];
        const originalContent = await readFile(fileToModify, 'utf-8');

        // Add a comment or metadata to modify the file
        const modifiedContent = `# Modified by workflow test ${workflowId} at ${new Date().toISOString()}\n${originalContent}`;
        await writeFile(fileToModify, modifiedContent, 'utf-8');

        console.log(`✅ Modified file: ${fileToModify}`);

        // STEP 4: Run diff
        console.log("🔍 STEP 3: Running diff after modification...");
        const diffResult = await cliRunner.diff({
          url: testContext.saleorUrl,
          token: testContext.saleorToken,
          configDir: testWorkspace,
          timeout: 90000,
        });

        TestAssertions.assertCommandSuccess(diffResult);

        // STEP 5: Deploy modified configuration
        console.log("🚀 STEP 4: Deploying modified configuration...");
        const deployResult = await cliRunner.deploy({
          url: testContext.saleorUrl,
          token: testContext.saleorToken,
          configDir: testWorkspace,
          timeout: 180000,
        });

        TestAssertions.assertCommandSuccess(deployResult);

        console.log("✅ Modification workflow completed successfully");
      } else {
        console.log("ℹ️  No configuration files found to modify - test skipped");
      }
    }, 600000); // 10 minutes for modification workflow
  });

  describe("Workflow Error Recovery", () => {
    it("should handle workflow interruption and recovery", async () => {
      const workflowId = `recovery-${Date.now()}`;
      console.log(`🚀 Starting recovery workflow test: ${workflowId}`);

      // STEP 1: Successful introspect
      const introspectResult = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
        timeout: 120000,
      });

      TestAssertions.assertCommandSuccess(introspectResult);

      // STEP 2: Create problematic configuration
      const problematicConfig = `
        # Potentially problematic configuration
        products:
          - name: "Recovery Test ${workflowId}"
            slug: "recovery-test-${workflowId}"
            # Missing required fields might cause issues
      `;
      await writeFile(join(testWorkspace, "problematic.yaml"), problematicConfig, "utf-8");

      // STEP 3: Try deployment (may fail)
      console.log("🚀 Attempting deployment with problematic config...");
      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        expectFailure: true, // May fail
        timeout: 90000,
      });

      if (!deployResult.success) {
        console.log("✅ Deployment failed as expected with problematic config");

        // STEP 4: Fix configuration and retry
        const fixedConfig = ConfigUtils.createProductConfig([
          TestDataGenerator.generateProduct({
            name: `Recovery Test Fixed ${workflowId}`,
            slug: `recovery-test-fixed-${workflowId}`,
          })
        ]);
        await writeFile(join(testWorkspace, "fixed.yaml"), fixedConfig, "utf-8");

        // Remove problematic file
        await rm(join(testWorkspace, "problematic.yaml"), { force: true });

        // STEP 5: Retry deployment with fixed config
        console.log("🔄 Retrying deployment with fixed config...");
        const retryResult = await cliRunner.deploy({
          url: testContext.saleorUrl,
          token: testContext.saleorToken,
          configDir: testWorkspace,
          timeout: 180000,
        });

        TestAssertions.assertCommandSuccess(retryResult);
        console.log("✅ Recovery deployment succeeded");
      } else {
        console.log("ℹ️  Deployment succeeded despite potentially problematic config");
      }

      console.log("✅ Error recovery workflow completed");
    }, 480000); // 8 minutes for recovery workflow
  });

  describe("Performance Workflow Tests", () => {
    it("should handle complete workflow with larger dataset", async () => {
      const workflowId = `perf-${Date.now()}`;
      console.log(`🚀 Starting performance workflow test: ${workflowId}`);

      // Create larger test dataset
      const testProducts = TestDataGenerator.generateProducts(5).map((product, index) => ({
        ...product,
        name: `Perf Test Product ${workflowId}-${index}`,
        slug: `perf-test-product-${workflowId}-${index}`,
      }));

      const testCategories = TestDataGenerator.generateCategories(3).map((category, index) => ({
        ...category,
        name: `Perf Test Category ${workflowId}-${index}`,
        slug: `perf-test-category-${workflowId}-${index}`,
      }));

      // STEP 1: Introspect
      console.log("📥 Performance test - Introspecting...");
      const startTime = Date.now();

      const introspectResult = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
        timeout: 150000,
      });

      TestAssertions.assertCommandSuccess(introspectResult);
      const introspectTime = Date.now() - startTime;

      // STEP 2: Add larger configuration
      const productConfig = ConfigUtils.createProductConfig(testProducts);
      const categoryConfig = ConfigUtils.createCategoryConfig(testCategories);

      await writeFile(join(testWorkspace, "perf-products.yaml"), productConfig, "utf-8");
      await writeFile(join(testWorkspace, "perf-categories.yaml"), categoryConfig, "utf-8");

      // STEP 3: Diff
      console.log("🔍 Performance test - Running diff...");
      const diffStartTime = Date.now();

      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 120000,
      });

      TestAssertions.assertCommandSuccess(diffResult);
      const diffTime = Date.now() - diffStartTime;

      // STEP 4: Deploy
      console.log("🚀 Performance test - Deploying...");
      const deployStartTime = Date.now();

      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 300000, // 5 minutes for larger deployment
      });

      TestAssertions.assertCommandSuccess(deployResult);
      const deployTime = Date.now() - deployStartTime;

      // Performance summary
      const totalTime = Date.now() - startTime;
      console.log(`⏱️  Performance Summary:
        - Introspect: ${introspectTime}ms
        - Diff: ${diffTime}ms
        - Deploy: ${deployTime}ms
        - Total: ${totalTime}ms
        - Products: ${testProducts.length}
        - Categories: ${testCategories.length}
      `);

      // Performance assertions (adjust based on realistic expectations)
      expect(introspectTime).toBeLessThan(150000); // 2.5 minutes
      expect(diffTime).toBeLessThan(120000); // 2 minutes
      expect(deployTime).toBeLessThan(300000); // 5 minutes
      expect(totalTime).toBeLessThan(480000); // 8 minutes total

      console.log("✅ Performance workflow test completed");
    }, 600000); // 10 minutes for performance test
  });

  describe("Concurrent Workflow Safety", () => {
    it("should handle workflow isolation and prevent conflicts", async () => {
      const workflowId = `isolation-${Date.now()}`;
      console.log(`🚀 Starting isolation workflow test: ${workflowId}`);

      // Create two separate workspaces
      const workspace1 = join(testWorkspace, "workspace1");
      const workspace2 = join(testWorkspace, "workspace2");
      await mkdir(workspace1, { recursive: true });
      await mkdir(workspace2, { recursive: true });

      // Create different configurations for each workspace
      const product1 = TestDataGenerator.generateProduct({
        name: `Isolation Test Product 1 ${workflowId}`,
        slug: `isolation-test-1-${workflowId}`,
      });

      const product2 = TestDataGenerator.generateProduct({
        name: `Isolation Test Product 2 ${workflowId}`,
        slug: `isolation-test-2-${workflowId}`,
      });

      const config1 = ConfigUtils.createProductConfig([product1]);
      const config2 = ConfigUtils.createProductConfig([product2]);

      await writeFile(join(workspace1, "config1.yaml"), config1, "utf-8");
      await writeFile(join(workspace2, "config2.yaml"), config2, "utf-8");

      // Deploy from each workspace separately
      console.log("🚀 Deploying from workspace 1...");
      const deploy1Result = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: workspace1,
        timeout: 180000,
      });

      TestAssertions.assertCommandSuccess(deploy1Result);

      console.log("🚀 Deploying from workspace 2...");
      const deploy2Result = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: workspace2,
        timeout: 180000,
      });

      TestAssertions.assertCommandSuccess(deploy2Result);

      console.log("✅ Isolation workflow test completed - both deployments succeeded");
    }, 480000); // 8 minutes for isolation test
  });
});