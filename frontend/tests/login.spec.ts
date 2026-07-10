import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:4000';

test.describe('Login & OTP Error Handling Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  test('1. should show error on wrong password login and not reload the page', async ({ page }) => {
    // Fill credentials
    await page.locator('#login-email').fill('non_existing_user@example.com');
    await page.locator('#login-password').fill('WrongPassword123');

    // Click Sign In button inside the login form
    const signInBtn = page.locator('form').filter({ hasText: 'Sign In' }).locator('button[type="submit"]');
    await signInBtn.click();

    // Verify error container is shown
    const errorAlert = page.locator('div.text-red-700');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/Invalid email\/phone or password|Login failed/);

    // Verify the inputs were NOT cleared (indicating no page reload occurred)
    await expect(page.locator('#login-email')).toHaveValue('non_existing_user@example.com');
    await expect(page.locator('#login-password')).toHaveValue('WrongPassword123');
  });

  test('2. should show correct error for wrong OTP in OTP login', async ({ page }) => {
    // Click OTP Login tab
    await page.locator('button:has-text("OTP Login")').click();

    // Fill email and send OTP
    await page.locator('#otp-email').fill('invalid_otp_test@example.com');
    await page.locator('button:has-text("Send OTP")').click();

    // Wait for the OTP entering step
    await expect(page.locator('#otp-code')).toBeVisible();

    // Verify "Resend OTP" button is visible
    const resendBtn = page.locator('button:has-text("Resend OTP")');
    await expect(resendBtn).toBeVisible();

    // Enter wrong OTP and submit
    await page.locator('#otp-code').fill('111111');
    await page.locator('button:has-text("Verify & Sign In")').click();

    // Verify correct error message is shown
    const errorAlert = page.locator('div.text-red-700');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('OTP was incorrect. Please try again or resend OTP.');
  });

  test('3. should handle reset password wrong OTP error correctly', async ({ page }) => {
    // Click Forgot Password link
    await page.locator('button:has-text("Forgot Password?")').click();

    // Try invalid user first
    await page.locator('#forgot-email').fill('non_existing_user@example.com');
    await page.locator('button:has-text("Send Reset Code")').click();

    // Verify error is shown
    let errorAlert = page.locator('div.text-red-700');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/User with this email or phone number does not exist/);

    // Try a known user
    await page.locator('#forgot-email').fill('jagadishvarma99@gmail.com');
    await page.locator('button:has-text("Send Reset Code")').click();

    // Wait for the reset code screen
    await expect(page.locator('#forgot-otp')).toBeVisible();

    // Verify Resend OTP button is visible
    const resendBtn = page.locator('button:has-text("Resend OTP")');
    await expect(resendBtn).toBeVisible();

    // Enter incorrect details
    await page.locator('#forgot-otp').fill('123456');
    await page.locator('#forgot-new-password').fill('newpassword123');
    await page.locator('#forgot-confirm-password').fill('newpassword123');
    await page.locator('button:has-text("Reset Password")').click();

    // Verify incorrect OTP error is shown
    errorAlert = page.locator('div.text-red-700');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('OTP was incorrect. Please try again or resend OTP.');
  });
});
