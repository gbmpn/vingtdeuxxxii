import { gsap } from 'gsap';
import { debounce } from './utils';
import Cart from './cart'; // Make sure Cart is imported and the path is correct

export default class Products {
  constructor() {
    // Get references to DOM elements. Use defensive querying.
    this.products = [...document.querySelectorAll('.products__item')];
    this.ctas = [...document.querySelectorAll('.products__cta')];
    this.cartButton = document.querySelector('.cart-button');

    // Initialize coordinates
    this.cartButtonCoords = { x: 0, y: 0 };

    // State variables, will be set dynamically
    this.currentProduct = null;
    this.currentGallery = [];
    this.otherProducts = [];
    this.isTopRow = false;

    // Basic checks for essential elements
    if (!this.cartButton) {
      console.error("Products Class Error: '.cart-button' element not found.");
    }
    if (this.products.length === 0) {
      console.warn("Products Class Warning: No '.products__item' elements found.");
    }
    if (this.ctas.length === 0) {
      console.warn("Products Class Warning: No '.products__cta' elements found.");
    }

    // Initialize only if essential elements are likely present
    if (this.cartButton && this.ctas.length > 0) {
        this.init();
    }
  }

  init() {
    // Set initial cart button coordinates
    this.setCartButtonCoords();

    // Attach event listeners to 'Add to Cart' buttons
    this.ctas.forEach((cta) => {
      // Skip buttons that are already disabled (e.g., sold out)
      if (cta.disabled) return;

      cta.addEventListener('click', (event) => {
        // --- Find the Correct Parent Product Element ---
        // Traverse up from the clicked button to find the '.products__item' LI
        const productLiElement = event.target.closest('.products__item');

        // --- Validate the Found Element and its Data ---
        if (!productLiElement) {
          console.error("Products Error: Could not find parent '.products__item' for clicked CTA button.");
          return; // Exit if the expected HTML structure is missing
        }

        // Check specifically for the variant ID needed for the cart
        if (!productLiElement.dataset.variantId) {
          console.error("Products Error: Product item is missing the required 'data-variant-id'. Cannot add to cart.", productLiElement);
          alert("Sorry, this item is missing configuration and cannot be added to the cart.");
          return; // Exit if critical data is absent
        }

        // --- Set Class Properties Based on the Clicked Product ---
        this.currentProduct = productLiElement; // Store the correct LI element

        // Filter 'otherProducts' excluding the currently selected one
        this.otherProducts = this.products.filter(prod => prod !== this.currentProduct);

        // Find gallery images within the current product LI for animation
        // Adjust selector if needed (e.g., '.products__main-image')
        this.currentGallery = [...this.currentProduct.querySelectorAll('.products__gallery-item')];

        // Determine if the product is in the 'top row' based on its index
        const productIndex = this.products.indexOf(this.currentProduct);
        this.isTopRow = window.innerWidth > 768 && productIndex !== -1 && productIndex < 3; // Assuming 3 items per row on wider screens

        console.log('Product action initiated for:', this.currentProduct.dataset.name, 'Variant ID:', this.currentProduct.dataset.variantId);

        // --- Trigger the Add to Cart Animation and Logic ---
        this.addToCart();
      });
    });

    // Update cart button coordinates on window resize (debounced)
    window.addEventListener('resize', debounce(() => {
      this.setCartButtonCoords();
    }, 150)); // Debounce timeout
  }

  // Calculates and stores the cart button's position relative to the document
  setCartButtonCoords() {
    if (!this.cartButton) return; // Guard clause
    const rect = this.cartButton.getBoundingClientRect();
    // Add scroll offsets to get coordinates relative to the top-left of the document
    this.cartButtonCoords = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY
    };
  }

  // Handles the animation and logic for adding an item to the cart
  addToCart() {
    // Ensure currentProduct has been set correctly
    if (!this.currentProduct) {
      console.error("Products Error: addToCart called but 'this.currentProduct' is not set.");
      return;
    }

    // Check if there are gallery items to animate
    if (this.currentGallery.length === 0) {
      console.warn("Products Warning: No gallery items found for animation in product:", this.currentProduct.dataset.name, ". Adding to cart without animation.");
      // Directly add to cart if no items to animate
      const needsButtonAnimation = Cart.cartItems.length === 0;
      Cart.addItemToCart(this.currentProduct); // Pass the correct LI element
      if (needsButtonAnimation) Cart.cartButtonAnimationEnter();
      this.resetAnimationState(); // Reset state variables
      return;
    }

    // Get coordinates of the first gallery image for animation calculations
    const firstGalleryImage = this.currentGallery[0];
    const imgRect = firstGalleryImage.getBoundingClientRect();

    // Calculate image coordinates relative to the document
    const docImgTop = imgRect.top + window.scrollY;
    const docImgLeft = imgRect.left + window.scrollX;
    const docImgRight = imgRect.right + window.scrollX; // Right edge relative to document
    const imgHeight = imgRect.height;

    // --- GSAP Animation Timeline ---
    const tl = gsap.timeline({
      onComplete: () => {
        // Thoroughly reset styles applied during animation
        gsap.set(this.currentGallery, { clearProps: "all" });
        gsap.set(this.otherProducts, { clearProps: "scale,autoAlpha" });
        gsap.set(this.currentProduct, { clearProps: "scale" });
        this.resetAnimationState(); // Clear instance variables
      },
    });
    tl.addLabel('start'); // Label for sequencing

    // 1. Fade and scale down other products
    tl.to(this.otherProducts, {
      scale: 0.8,
      autoAlpha: 0.05, // Make them barely visible
      duration: 0.6,
      stagger: 0.04,
      ease: 'power2.out',
    }, 'start');

    // 2. Slightly scale up the current product (briefly highlights it)
    tl.to(this.currentProduct, {
      scale: 1.05,
      duration: 1,
      ease: 'power2.out',
    }, 'start+=0.1'); // Start slightly after others fade

    // 3. Animate gallery images flying towards the cart button
    tl.to(this.currentGallery, {
      keyframes: {
        // Mid-point: images move up/down and scale slightly
        '40%': {
          y: this.isTopRow ? imgHeight * 1.5 : -imgHeight * 1.5, // Vertical movement
          scale: this.isTopRow ? 0.8 : 0.5, // Scaling effect
          autoAlpha: 1, // Ensure visible
          zIndex: 100 // Bring images to the front
        },
        // End-point: images arrive at cart button coordinates and disappear
        '100%': {
          // Target X based on document coordinates and alignment preference
          x: this.isTopRow ? (this.cartButtonCoords.x - docImgRight) : (this.cartButtonCoords.x - docImgLeft - 12), // Adjust offset as needed
          // Target Y based on document coordinates and alignment preference
          y: this.isTopRow ? (this.cartButtonCoords.y - docImgTop) : (this.cartButtonCoords.y - docImgTop - imgHeight + 25), // Adjust offset as needed
          scale: 0, // Shrink to nothing
          autoAlpha: 0, // Fade out completely
        },
      },
      stagger: {
        from: 'start', // Animate first image first
        each: 0.04,
      },
      duration: 1.8,
      ease: 'power2.inOut',
    }, 'start'); // Start this animation immediately

    // 4. Add item to the actual cart data structure (logically)
    // This happens while the animation is running
    tl.add(() => {
      const needsButtonAnimation = Cart.cartItems.length === 0; // Check *before* adding
      // *** Ensure the correct element (the LI) is passed ***
      Cart.addItemToCart(this.currentProduct);
      // Trigger cart button animation only if it was initially empty
      if (needsButtonAnimation) {
        Cart.cartButtonAnimationEnter();
      }
    }, 'start+=0.6'); // Delay slightly so user sees initial animation

    // 5. Restore the scale and visibility of all products
    tl.to([this.currentProduct, ...this.otherProducts], { // Target current and others
      scale: 1,
      autoAlpha: 1,
      duration: 0.8,
      stagger: 0.03,
      ease: 'power2.out',
      overwrite: true // Ensure this overrides previous scale/alpha animations
    }, 'start+=1.6'); // Start after the gallery animation is well underway
  }

  // Resets the state variables related to the current product animation
  resetAnimationState() {
    this.currentProduct = null;
    this.currentGallery = [];
    this.otherProducts = [];
    this.isTopRow = false; // Reset the row flag
    console.log('Animation state reset.');
  }
}