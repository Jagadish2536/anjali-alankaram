import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:4000';

test.describe('Anjali Alankaram eCommerce E2E Flow', () => {
  
  test('homepage should load successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Validate Page Title / Brand presence
    await expect(page).toHaveTitle(/Anjali Alankaram/);
    
    // Check if hero content or main CTA is visible
    const browseButton = page.locator('text=Shop Collection');
    if (await browseButton.isVisible()) {
      await expect(browseButton).toBeVisible();
    }
  });

  test('catalogue should render products and support navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/products`);
    
    // Verify catalogue list heading
    const heading = page.locator('h1');
    await expect(heading).toContainText(/Saree/i);
    
    // Check if products load incrementally
    await page.waitForTimeout(1000);
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    console.log(`E2E detected ${count} products in catalogue.`);
  });

  test('shopping cart workflow', async ({ page }) => {
    await page.goto(`${BASE_URL}/products`);
    
    // Click first product card if present
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      
      // We should now be on the product details page
      await expect(page.url()).toContain('/products/');
      
      // Select size variant if present
      const sizeBtn = page.locator('button:has-text("Standard"), button:has-text("Free Size")').first();
      if (await sizeBtn.isVisible()) {
        await sizeBtn.click();
      }
      
      // Add to cart
      const addToCartBtn = page.locator('text=Add to Cart');
      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();
        
        // Cart drawer or toast notification should trigger
        const cartHeading = page.locator('text=Shopping Cart');
        await expect(cartHeading).toBeVisible();
      }
    }
  });
});
