import { gsap } from 'gsap';
// Import the Shopify Buy SDK
import ShopifyBuy from 'shopify-buy'; // Or: import Client from 'shopify-buy';

// --- Configuration ---
// IMPORTANT: Replace with your actual credentials.
// Consider loading these from environment variables or a config file instead of hardcoding.
const SHOPIFY_DOMAIN = 'ri1ysg-yt.myshopify.com'; // e.g., 'my-cool-store.myshopify.com'
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = '5a1b261e3850235223c65a48cb1b3be3'; // Your Storefront API access token
// -------------------

class Cart {
  constructor() {
    // --- DOM Element Selections ---
    this.cart = document.querySelector('.cart');
    if (!this.cart) {
        console.error("Cart Error: '.cart' element not found in the DOM.");
        // Optional: Prevent further initialization if the main cart element is missing
        // return;
    }
    this.cartItems = [];

    this.cartButton = document.querySelector('.cart-button');
    this.cartButtonLabel = document.querySelector('.cart-button__label-wrap');
    this.cartButtonNumber = document.querySelector('.cart-button__number');
    this.cartButtonBg = document.querySelector('.cart-button__number-bg');
    this.cartClose = document.querySelector('.cart__inner-close');
    this.cartTotal = document.querySelector('.cart-total__amount');
    this.cartItemsList = document.querySelector('.cart-items');
    this.cartCheckout = document.querySelector('.cart__checkout');

    // --- State Variables ---
    this.cartOpened = false;
    this.isAnimating = false;
    this.isCheckingOut = false; // State for checkout process

    // --- Elements for Animation ---
    // Ensure cart exists before querying its children
    this.animatingElements = this.cart ? {
      bg: this.cart.querySelector('.cart__bg'),
      innerBg: this.cart.querySelector('.cart__inner-bg'),
      close: this.cart.querySelector('.cart__inner-close'),
      items: [], // Populated dynamically before animation
      total: [...this.cart.querySelectorAll('.cart-total > *')],
    } : {}; // Provide empty object if cart doesn't exist

    // --- Shopify Buy SDK Client ---
    this.shopifyClient = null;
    if (!SHOPIFY_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN || SHOPIFY_DOMAIN === 'your-shop-name.myshopify.com') {
      console.error("Shopify domain or storefront access token is missing or not configured. Checkout will not function.");
    } else {
      try {
        this.shopifyClient = ShopifyBuy.buildClient({
          domain: SHOPIFY_DOMAIN,
          storefrontAccessToken: SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        });
      } catch (error) {
          console.error("Failed to initialize Shopify Buy SDK Client:", error);
      }
    }

    // Check if essential elements exist before initializing fully
    if (this.cart && this.cartButton && this.cartClose && this.cartCheckout) {
        this.init();
    } else {
        console.error("Cart Error: One or more essential cart elements (.cart-button, .cart__inner-close, .cart__checkout) not found.");
    }
  }

  init() {
    this.cartButtonAnimationSetup();
    this.cartAnimationSetup();
    this.loadCartFromStorage(); // Load cart data from localStorage

    // --- Event Listeners ---
    this.cartButton.addEventListener('click', () => {
      if (this.isAnimating) return;
      document.body.classList.add('locked');
      this.isAnimating = true;

      this.cartAnimationEnter().then(() => {
        this.cartOpened = true;
        this.isAnimating = false;
      });
    });

    this.cartClose.addEventListener('click', () => {
      if (this.isAnimating) return;
      document.body.classList.remove('locked');
      this.isAnimating = true;

      this.cartAnimationLeave().then(() => {
        this.cartOpened = false;
        this.isAnimating = false;
      });
    });

    // Updated Checkout Listener
    this.cartCheckout.addEventListener('click', async () => {
      if (this.isCheckingOut || !this.shopifyClient) {
        if (!this.shopifyClient) console.warn("Checkout initiated but Shopify client is not available.");
        return; // Prevent multiple clicks or if client failed to init
      }
      if (this.cartItems.length === 0) {
          alert("Your cart is empty.");
          return;
      }

      // Indicate loading state
      this.isCheckingOut = true;
      const originalButtonText = this.cartCheckout.textContent;
      this.cartCheckout.disabled = true;
      this.cartCheckout.textContent = 'Processing...';

      try {
        await this.checkout();
        // If checkout() redirects successfully, code below this might not execute.
      } catch (error) {
        console.error("Checkout failed:", error);
        alert(`Sorry, we couldn't proceed to checkout. Error: ${error.message || 'Unknown error'}`);
        // Reset button state only on error
        this.cartCheckout.disabled = false;
        this.cartCheckout.textContent = originalButtonText;
        this.isCheckingOut = false; // Reset checkout state on error
      }
      // Do NOT reset isCheckingOut in a finally block here, as successful redirection means we don't want to reset yet.
    });
  }

  loadCartFromStorage() {
    const stored = localStorage.getItem('cartItems');
    if (stored) {
      try {
        this.cartItems = JSON.parse(stored);
        // Clear the current list before appending loaded items
        if (this.cartItemsList) this.cartItemsList.innerHTML = '';

        this.cartItems.forEach((item) => {
          // Ensure item has a variantId property for consistency.
          // Assume 'id' is the variantId if 'variantId' is missing (legacy).
          if (!item.variantId && item.id) {
            console.warn(`Loaded item "${item.name}" missing variantId. Using 'id' ("${item.id}") as variantId.`);
            item.variantId = item.id;
          } else if (!item.variantId) {
              console.error(`Loaded item "${item.name}" is missing a variantId and id. Cannot process.`);
              // Optionally skip this item or handle the error appropriately
              return; // Skip adding this invalid item
          }

          // Ensure price is a number
          item.price = parseFloat(item.price) || 0;

          const el = this.appendItem(item);
          if (this.cartItemsList && el) {
              this.cartItemsList.appendChild(el);
          }
        });
        this.updateCartVisuals(); // Update totals and counts after loading
      } catch (e) {
        console.error("Failed to parse cart items from localStorage:", e);
        localStorage.removeItem('cartItems'); // Clear potentially corrupted data
        this.cartItems = [];
      }
    }
     // Update visuals even if nothing was loaded (to show 0 items)
     if (!stored) {
        this.updateCartVisuals();
     }
  }

  saveCartToStorage() {
    try {
        localStorage.setItem('cartItems', JSON.stringify(this.cartItems));
    } catch (e) {
        console.error("Failed to save cart items to localStorage:", e);
        // Handle potential storage quota issues
        alert("Could not save cart changes. Local storage might be full.");
    }
  }

  updateCartVisuals() {
    if (!this.cartButtonNumber || !this.cartTotal || !this.cartItemsList) return;

    const totalQuantity = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
    this.cartButtonNumber.innerHTML = totalQuantity; // Show total quantity instead of number of unique items

    let cartAmount = 0;
    const cartElementsQuantities = [...this.cartItemsList.querySelectorAll('.cart-item__quantity')];

    this.cartItems.forEach((item, i) => {
      // Update quantity display in the DOM for the corresponding item
      // This relies on DOM order matching cartItems array order, which can be brittle.
      // A safer method would use data-attributes to find the element.
      const itemElement = this.cartItemsList.querySelector(`.cart-item[data-variant-id="${item.variantId}"]`);
      if (itemElement) {
          const quantitySpan = itemElement.querySelector('.cart-item__quantity');
          if (quantitySpan) quantitySpan.innerHTML = item.quantity;
      } else {
          // If element not found, might indicate inconsistency - consider re-rendering list
          console.warn(`Could not find DOM element for item ${item.variantId} to update quantity.`);
      }
      
      cartAmount += (item.price || 0) * item.quantity;
    });

    this.cartTotal.innerHTML = `€ ${cartAmount.toFixed(2)}`;

    // Optionally trigger button animation if items > 0 and it wasn't visible
    if (totalQuantity > 0 && gsap.getProperty(this.cartButtonNumber, 'scale') === 0) {
        this.cartButtonAnimationEnter();
    }
    // Optionally hide button animation if cart becomes empty (you'd need a hide animation)
    // else if (totalQuantity === 0 && gsap.getProperty(this.cartButtonNumber, 'scale') !== 0) {
    //     this.cartButtonAnimationLeave(); // You'd need to create this animation
    // }
  }

  // Combined update and save function
  updateCart() {
    this.updateCartVisuals();
    this.saveCartToStorage();
  }


  appendItem(item) {
    if (!item || !item.variantId || !item.name) {
        console.error("Cannot append invalid item:", item);
        return null; // Return null if item data is invalid
    }
    const cartItem = document.createElement('div');
    cartItem.classList.add('cart-item', 'cart-grid');
    // Add data-attribute for easier selection later
    cartItem.dataset.variantId = item.variantId;

    const price = parseFloat(item.price) || 0; // Ensure price is a number

    cartItem.innerHTML = `
      <img class="cart-item__img" src="${item.cover || ''}" alt="${item.name || 'Product Image'}">
      <div class="cart-item__details">
        <span class="cart-item__details-title">${item.name}</span>
        <button class="cart-item__remove-btn">Remove</button>
        <div class="cart-item__details-wrap">
          <span class="cart-item__details-label">Quantity:</span>
          <div class="cart-item__details-actions">
            <button class="cart-item__minus-button">-</button>
            <span class="cart-item__quantity">${item.quantity || 1}</span>
            <button class="cart-item__plus-button">+</button>
          </div>
          <span class="cart-item__details-price">€ ${price.toFixed(2)}</span>
        </div>
      </div>
    `;

    const removeButton = cartItem.querySelector('.cart-item__remove-btn');
    const plusButton = cartItem.querySelector('.cart-item__plus-button');
    const minusButton = cartItem.querySelector('.cart-item__minus-button');

    // Add event listeners using the correct variantId
    if (removeButton) removeButton.addEventListener('click', () => this.removeItemFromCart(item.variantId));
    if (plusButton) plusButton.addEventListener('click', () => this.updateQuantity(item.variantId, 1));
    if (minusButton) minusButton.addEventListener('click', () => this.updateQuantity(item.variantId, -1));

    return cartItem;
  }

 // Inside Cart.js
  addItemToCart(el) {
    // --- START DEBUG LOGGING ---
    console.log('%c[addItemToCart] Received element:', 'color: blue; font-weight: bold;', el);
    if (el && el.dataset) {
        console.log('%c[addItemToCart] Element dataset:', 'color: blue;', JSON.stringify(el.dataset));
    } else {
        console.error('[addItemToCart] Received invalid element or element without dataset!');
        return; // Stop if element is bad
    }

    // Prioritize data-variant-id
    const variantId = el.dataset.variantId; // ONLY check variantId for now
    console.log('%c[addItemToCart] Extracted variantId:', 'color: blue; font-weight: bold;', variantId);

    // --- ADD VALIDATION ---
    if (!variantId || typeof variantId !== 'string' || !variantId.startsWith('gid://shopify/ProductVariant/')) {
        console.error(`%c[addItemToCart] INVALID or MISSING Variant ID: "${variantId}". Must be a valid GID string.`, 'color: red; font-weight: bold;');
        alert("Sorry, this item cannot be added to the cart (invalid configuration).");
        return; // Stop processing
    }
    // --- END VALIDATION ---

    const { price, name, cover } = el.dataset;
    // ... rest of the function should be okay if variantId is correct here ...

    // --- LOG ITEM BEING STORED ---
    const newItem = {
        // ... (id, price, name, cover, quantity) ...
        variantId: variantId, // Ensure this is set correctly
        // ...
    };
    console.log('%c[addItemToCart] Storing newItem:', 'color: green;', JSON.stringify(newItem));
    // --- END DEBUG LOGGING ---

    // Original logic continues...
    if (!name || !price) { /* ... error handling ... */ return; }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) { /* ... error handling ... */ return; }
    const index = this.cartItems.findIndex((item) => item.variantId === variantId);
    if (index < 0) {
        this.cartItems.push({
            id: variantId, // Optional: keep if needed, primary key is variantId
            variantId: variantId,
            price: parsedPrice,
            name: name,
            cover: cover,
            quantity: 1
        });
        const newCartItemElement = this.appendItem(this.cartItems[this.cartItems.length - 1]);
        if (this.cartItemsList && newCartItemElement) {
            this.cartItemsList.append(newCartItemElement);
        }
    } else {
        this.cartItems[index].quantity += 1;
    }
    this.updateCart();
    if (this.cartButtonNumber && gsap.getProperty(this.cartButtonNumber, 'scale') === 0) {
        this.cartButtonAnimationEnter();
    }
  }

  updateQuantity(variantId, change) { // Renamed quantity parameter to 'change' for clarity
    const index = this.cartItems.findIndex((el) => el.variantId === variantId);
    if (index < 0) {
        console.warn(`Attempted to update quantity for non-existent variantId: ${variantId}`);
        return;
    }

    const newQuantity = this.cartItems[index].quantity + change;

    if (newQuantity > 0) {
      this.cartItems[index].quantity = newQuantity;
      this.updateCart(); // Update visuals and save
    } else {
      // Quantity is 0 or less, remove the item
      this.removeItemFromCart(variantId);
      // removeItemFromCart already calls updateCart, so no need to call it again here.
    }
  }

  removeItemFromCart(variantId) {
    const index = this.cartItems.findIndex((el) => el.variantId === variantId);
    if (index < 0) {
        console.warn(`Attempted to remove non-existent variantId: ${variantId}`);
        return;
    }

    // Remove item from the array
    this.cartItems.splice(index, 1);

    // Remove item from the DOM using the data-attribute selector (safer than index)
    if (this.cartItemsList) {
        const itemToRemove = this.cartItemsList.querySelector(`.cart-item[data-variant-id="${variantId}"]`);
        if (itemToRemove) {
            itemToRemove.remove();
        } else {
            console.warn("Could not find corresponding DOM element to remove for variantId:", variantId);
            // If DOM is out of sync, might need a full re-render of the list from cartItems array
        }
    }

    this.updateCart(); // Update visuals and save
  }

  // --- Shopify Checkout Method ---
  async checkout() {
    if (!this.shopifyClient) {
      throw new Error("Shopify client is not initialized. Cannot proceed to checkout.");
    }
    if (this.cartItems.length === 0) {
      // This case should ideally be handled by the button's click listener already
      throw new Error("Cart is empty. Cannot checkout.");
    }

    console.log("Starting Shopify checkout process...");

    try {
      // 1. Create a new checkout
      const checkout = await this.shopifyClient.checkout.create();
      console.log("Created Shopify checkout with ID:", checkout.id);

      // 2. Prepare line items (ensure variantId is used)
      const lineItemsToAdd = this.cartItems.map(item => {
        if (!item.variantId) {
            console.error(`Item "${item.name}" is missing a variantId! Cannot add to checkout.`);
            return null; // Skip items without a valid variantId
        }
        return {
          variantId: item.variantId,
          quantity: item.quantity,
        };
      }).filter(item => item !== null); // Remove any null entries from mapping failure

      // Check if there are any valid items left to add
      if (lineItemsToAdd.length === 0) {
          throw new Error("No valid items with variant IDs found in the cart to checkout.");
      }

      // 3. Add line items to the created checkout
      console.log("Adding line items to checkout:", lineItemsToAdd);
      const updatedCheckout = await this.shopifyClient.checkout.addLineItems(checkout.id, lineItemsToAdd);
      console.log("Line items added. Checkout updated:", updatedCheckout);

      // 4. Redirect the user to Shopify's secure checkout page
      console.log("Redirecting user to Shopify checkout:", updatedCheckout.webUrl);
      if (updatedCheckout.webUrl) {
        window.location.href = updatedCheckout.webUrl;
      } else {
          throw new Error("Shopify did not provide a checkout URL.");
      }

      // --- IMPORTANT ---
      // DO NOT CLEAR CART HERE.
      // Cart should be cleared *after* successful payment confirmation,
      // typically on a "Thank You" page or via server-side webhooks.
      // Removing the old logic:
      // this.cartItems = [];
      // this.cartItemsList.innerHTML = '';
      // this.updateCart(); // Clears visuals and storage
      // localStorage.removeItem('cartItems');
      // this.cartAnimationLeave()... etc.

    } catch (error) {
      console.error("Error during Shopify checkout process:", error);
      // Re-throw the error so the event listener's catch block can handle UI updates
      throw error;
    }
  }

  // --- GSAP Animation Methods ---
  cartButtonAnimationSetup() {
      if (!this.cartButtonNumber || !this.cartButtonBg) return;
      gsap.set([this.cartButtonNumber, this.cartButtonBg], { scale: 0 });
  }

  cartButtonAnimationEnter() {
      if (!this.cartButtonLabel || !this.cartButtonNumber || !this.cartButtonBg) return gsap.timeline(); // Return empty timeline if elements missing
      const tl = gsap.timeline();
      tl.addLabel('start');

      tl.to(this.cartButtonLabel, { x: -35, duration: 0.4, ease: 'power2.out' }, 'start');
      tl.to([this.cartButtonNumber, this.cartButtonBg], {
      scale: 1, stagger: 0.1, duration: 0.8, ease: 'elastic.out(1.3, 0.9)',
      }, 'start');
      return tl;
  }

  // You might want a cartButtonAnimationLeave for when the cart becomes empty
  // cartButtonAnimationLeave() { ... }

  cartAnimationSetup() {
      if (!this.cart || !this.animatingElements.bg) return; // Check elements exist
      gsap.set(this.cart, { xPercent: 100 });
      gsap.set([this.animatingElements.bg, this.animatingElements.innerBg], { xPercent: 110 });
      gsap.set(this.animatingElements.close, { x: 30, autoAlpha: 0 });
      gsap.set(this.animatingElements.total, { scale: 0.9, autoAlpha: 0 });
  }

  cartAnimationEnter() {
      if (!this.cart || !this.animatingElements.bg) return gsap.timeline(); // Check elements exist

      // Dynamically get current cart items for animation just before opening
      this.animatingElements.items = this.cartItemsList ? [...this.cartItemsList.querySelectorAll('.cart-item')] : [];
      if (this.animatingElements.items.length > 0) {
          gsap.set(this.animatingElements.items, { x: 30, autoAlpha: 0 });
      }

      const tl = gsap.timeline({ onStart: () => gsap.set(this.cart, { xPercent: 0 }) });
      tl.addLabel('start');

      // Animate background elements
      if (this.animatingElements.bg && this.animatingElements.innerBg) {
          tl.to([this.animatingElements.bg, this.animatingElements.innerBg], {
          xPercent: 0, stagger: 0.1, duration: 2.2, ease: 'expo.inOut',
          }, 'start');
      }

      // Animate close button
      if (this.animatingElements.close) {
          tl.to(this.animatingElements.close, {
          x: 0, autoAlpha: 1, duration: 1, ease: 'power2.out',
          }, 'start+=1.3');
      }

      // Animate cart items if they exist
      if (this.animatingElements.items.length > 0) {
          tl.to(this.animatingElements.items, {
          x: 0, autoAlpha: 1, stagger: 0.1, duration: 1, ease: 'power2.out',
          }, 'start+=1.4');
      }

      // Animate total section
      if (this.animatingElements.total.length > 0) {
          tl.to(this.animatingElements.total, {
          scale: 1, autoAlpha: 1, stagger: 0.1, duration: 1, ease: 'power2.out',
          }, 'start+=1.6');
      }

      return tl;
  }

  cartAnimationLeave() {
      if (!this.cart || !this.animatingElements.bg) return gsap.timeline(); // Check elements exist

      // Note: Uses the items present when the cart was last opened.
      // If items were added/removed while open, this might animate incorrectly.
      // For perfect sync, re-query items here or update this.animatingElements.items on cart changes.
      const tl = gsap.timeline({
        onComplete: () => {
            gsap.set(this.cart, { xPercent: 100 });
            // Optional: Reset item positions after closing animation completes
            if (this.animatingElements.items.length > 0) {
                gsap.set(this.animatingElements.items, { clearProps: "all" });
            }
        }
      });
      tl.addLabel('start');

      // Animate background elements
      if (this.animatingElements.bg && this.animatingElements.innerBg) {
          tl.to([this.animatingElements.bg, this.animatingElements.innerBg], {
          xPercent: 110, stagger: -0.1, duration: 1.5, ease: 'expo.inOut', // Stagger reversed
          }, 'start');
      }

      // Animate cart items if they exist
      if (this.animatingElements.items.length > 0) {
          tl.to(this.animatingElements.items, {
          x: 30, autoAlpha: 0, stagger: -0.05, duration: 0.8, ease: 'power2.in', // Stagger reversed, ease in
          }, 'start');
      }

      // Animate close button
      if (this.animatingElements.close) {
          tl.to(this.animatingElements.close, {
          x: 30, autoAlpha: 0, duration: 0.8, ease: 'power2.in', // Ease in
          }, 'start');
      }

      // Animate total section
      if (this.animatingElements.total.length > 0) {
          tl.to(this.animatingElements.total, {
          scale: 0.9, autoAlpha: 0, duration: 0.8, ease: 'power2.in', // Ease in
          }, 'start');
      }

      return tl;
  }
}

// Export a single instance (Singleton pattern)
// Ensure this script runs after the DOM is ready or wrap instantiation if needed:
// let cartInstance;
// document.addEventListener('DOMContentLoaded', () => {
//   if (!cartInstance) {
//     cartInstance = new Cart();
//   }
// });
// export default cartInstance; // This approach is more complex for imports

// Using the simple singleton export:
export default new Cart();