from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto("http://localhost:5173/")

        # Wait for the app to load. The textarea might not be immediately available if there are overlays or loading states.
        page.wait_for_selector("#prompt-input", timeout=10000)

        # 1. Verify aria-label on textarea
        textarea = page.locator("#prompt-input")
        aria_label = textarea.get_attribute("aria-label")
        print(f"Textarea aria-label: {aria_label}")

        if aria_label and "Describe your scene" in aria_label:
            print("SUCCESS: Textarea has correct aria-label")
        else:
            print(f"FAILURE: Textarea aria-label mismatch. Expected 'Describe your scene...', got '{aria_label}'")

        # 2. Verify Generate button exists
        # The button has aria-label="Generate image"
        generate_button = page.get_by_role("button", name="Generate image")
        if generate_button.count() > 0:
            print("SUCCESS: Generate button found")
        else:
            print("FAILURE: Generate button not found")

        # Take screenshot of the prompt controls area if possible
        # Or just the whole page
        page.screenshot(path="verification/verification.png")

    except Exception as e:
        print(f"Error during verification: {e}")
        page.screenshot(path="verification/verification-error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
