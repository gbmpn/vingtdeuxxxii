import '../scss/reset.scss';
import '../scss/base.scss';
import '../scss/globals.scss';
import '../scss/products.scss';
import '../scss/cart.scss';

import { preloadImages } from './utils';
import Products from './products'; // Assumes this adds listeners to .products__item or .products__cta
import Slider from './slider';
import Cart from './cart'; // Assuming cart.js exports the Cart instance

import Draggable from 'gsap/Draggable';
import InertiaPlugin from 'gsap/InertiaPlugin';

import Swiper from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

gsap.registerPlugin(Draggable, InertiaPlugin);

window.addEventListener('load', async () => {
  new Slider();

  const fetchCollectionsAndProducts = async () => {
    const endpoint = `https://ri1ysg-yt.myshopify.com/api/2023-07/graphql.json`;
    // IMPORTANT: Use environment variables or a secure method for tokens in production!
    const storefrontAccessToken = "5a1b261e3850235223c65a48cb1b3be3";

    // --- Updated GraphQL Query ---
    const query = `
{
  collections(first: 5) {
    edges {
      node {
        id
        title
        products(first: 10) {
          edges {
            node {
              id # Product ID
              title
              description
              vendor
              productType
              tags
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 5) {
                edges {
                  node {
                    src
                  }
                }
              }
              availableForSale # Product level availability
              # --- Fetch the first variant's ID and Price ---
              variants(first: 1) {
                edges {
                  node {
                    id # <<< THIS IS THE VARIANT ID (GID format) we need
                    availableForSale # Variant specific availability
                    price { # Specific price of this variant
                        amount
                        currencyCode
                    }
                  }
                }
              }
              # --- End Variant Fetch ---
            }
          }
        }
        metafield(namespace: "custom", key: "banner") {
          reference {
            ... on MediaImage {
              image {
                url
              }
            }
          }
        }
      }
    }
  }
}
`; // --- End of Updated Query ---

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      if (response.ok && data.data) { // Check data.data exists
        populateCollections(data.data.collections.edges);
        // Initialize Products class AFTER content is populated
        // This class likely adds the event listeners to '.products__item' or '.products__cta'
        // which in turn call Cart.addItemToCart(element)
        new Products();
        // Initialize Swiper for all galleries after content is populated
        initSwipers();
        modalZoom();
        modalNav();
      } else {
        console.error("Error fetching data:", data.errors || 'Unknown API error');
      }
    } catch (error) {
      console.error("Fetch error:", error.message);
    }
  };

  // --- Modified populateCollections Function ---
  const populateCollections = (collections) => {
    const contentWrapper = document.querySelector('.content');
    if (!contentWrapper) {
      console.error("'.content' wrapper not found.");
      return;
    }
    contentWrapper.innerHTML = ''; // Clear previous content if refetching

    collections.forEach((collection) => {
      // Defensive check for node existence
      if (!collection || !collection.node) return;

      const { title, products, metafield } = collection.node;
      const bannerImageSrc = metafield?.reference?.image?.url || "./images/cover.png";

      // Collection Title
      const heading = document.createElement("div");
      heading.classList.add("heading");
      const collectionTitle = document.createElement("h2");
      collectionTitle.textContent = title || 'Untitled Collection';
      heading.appendChild(collectionTitle);
      contentWrapper.appendChild(heading);

      const productsWrapper = document.createElement("div");
      productsWrapper.classList.add("products");

      const productList = document.createElement("ul");
      productList.classList.add("products-list", "products__list");

      // Defensive check for products edges
      if (!products || !products.edges) return;

      products.edges.forEach((productEdge) => {
        // Defensive check for product node existence
        if (!productEdge || !productEdge.node) return;

        const {
            id: productId, // Keep product ID if needed elsewhere (e.g., modal)
            title,
            description,
            vendor,
            productType,
            tags,
            priceRange,
            images,
            availableForSale: productAvailable, // Product-level availability
            variants // <<< Get variants data
        } = productEdge.node;

        // --- Get the first variant's data ---
        const firstVariantEdge = variants?.edges?.[0];
        const firstVariantNode = firstVariantEdge?.node;
        const variantId = firstVariantNode?.id; // <<< The crucial Variant GID
        const variantPrice = firstVariantNode?.price?.amount;
        const variantAvailable = firstVariantNode?.availableForSale;
        // --- End Variant Data Extraction ---

        // Determine effective availability and price
        const isAvailable = productAvailable && variantAvailable; // Must be available at both levels
        const displayPrice = variantPrice !== undefined ? variantPrice : priceRange?.minVariantPrice?.amount; // Use variant price if available
        const coverImageSrc = images?.edges?.[0]?.node?.src || "./images/default.jpg";

        // Create List Item
        const productItem = document.createElement("li");
        productItem.classList.add("products__item");

        // --- Set Data Attributes on the LI (for Cart.js to read) ---
        // Keep product ID if modal or other features use it
        productItem.setAttribute("data-id", productId);
        // CRITICAL: Set the VARIANT ID here
        if (variantId) {
            productItem.setAttribute("data-variant-id", variantId);
        } else {
            console.warn(`Product "${title}" (${productId}) missing variant ID. Add to cart will fail.`);
            // Optionally add a class to indicate it's unavailable for cart actions
            productItem.classList.add('products__item--unavailable');
        }
        // Use the specific variant price if available, otherwise fallback
        productItem.setAttribute("data-price", displayPrice !== undefined ? displayPrice : '0');
        productItem.setAttribute("data-name", title || 'Untitled Product');
        productItem.setAttribute("data-cover", coverImageSrc);
        // --- End Data Attributes ---


        // Product Image Section (Swiper setup remains the same)
        const productImages = document.createElement("div");
        productImages.classList.add("products__images");
        const mainImage = document.createElement("img");
        mainImage.classList.add("products__main-image");
        mainImage.setAttribute("src", coverImageSrc);
        mainImage.setAttribute("alt", title);
        const swiperContainer = document.createElement("div");
        swiperContainer.classList.add("swiper-container", "products__gallery-swiper");
        const swiperWrapper = document.createElement("div");
        swiperWrapper.classList.add("swiper-wrapper");
        images?.edges?.forEach((imgEdge) => {
          if (!imgEdge?.node?.src) return;
          const slide = document.createElement("div");
          slide.classList.add("swiper-slide");
          const img = document.createElement("img");
          img.classList.add("products__gallery-item");
          img.setAttribute("src", imgEdge.node.src);
          img.setAttribute("alt", `${title} gallery`);
          slide.appendChild(img);
          swiperWrapper.appendChild(slide);
        });
        swiperContainer.appendChild(swiperWrapper);
        const pagination = document.createElement("div");
        pagination.classList.add("swiper-pagination");
        swiperContainer.appendChild(pagination);
        const btnNext = document.createElement("div");
        btnNext.classList.add("swiper-button-next");
        swiperContainer.appendChild(btnNext);
        const btnPrev = document.createElement("div");
        btnPrev.classList.add("swiper-button-prev");
        swiperContainer.appendChild(btnPrev);
        productImages.appendChild(mainImage);
        productImages.appendChild(swiperContainer);

        // Product Info
        const productTitle = document.createElement("h3");
        productTitle.textContent = title;

        const productPriceElement = document.createElement("p");
        productPriceElement.classList.add("products__price");
        productPriceElement.textContent = displayPrice !== undefined ? `${parseFloat(displayPrice).toFixed(2)}€` : 'Price unavailable';

        const productDescription = document.createElement("p");
        productDescription.classList.add("products__description");
        productDescription.textContent = description || "No description available.";

        const productMeta = document.createElement("p");
        productMeta.classList.add("products__meta");
        productMeta.textContent = `Brand: ${vendor || 'N/A'} | Type: ${productType || 'N/A'}`;

        // Bottom Navigation
        const navBottom = document.createElement("nav");
        navBottom.classList.add("nav-bottom");

        const availabilityLabel = document.createElement("span");
        availabilityLabel.classList.add("available");
        availabilityLabel.textContent = isAvailable ? "Disponible" : "Sold Out";
        // Add class based on availability for styling
        availabilityLabel.classList.toggle("available--out-of-stock", !isAvailable);


        const addToCartButton = document.createElement("button");
        addToCartButton.type = "button";
        addToCartButton.classList.add("products__cta", "button");
        addToCartButton.textContent = "Acheter";

        // --- Disable button if unavailable or no variant ID ---
        if (!isAvailable || !variantId) {
            addToCartButton.disabled = true;
            addToCartButton.textContent = "Unavailable";
            addToCartButton.classList.add("button--disabled");
        }
        // --- End Disable Logic ---

        navBottom.appendChild(availabilityLabel);
        navBottom.appendChild(addToCartButton);

        // Append elements to product item
        productItem.appendChild(productTitle);
        productItem.appendChild(productPriceElement);
        productItem.appendChild(productDescription);
        productItem.appendChild(productMeta);
        productItem.appendChild(productImages);
        productItem.appendChild(navBottom);

        productList.appendChild(productItem);
      });

      productsWrapper.appendChild(productList);
      contentWrapper.appendChild(productsWrapper);
    });
  };
  // --- End of Modified populateCollections ---


  // Initialize all Swiper galleries after products are added
  const initSwipers = () => {
    const swiperContainers = document.querySelectorAll('.products__gallery-swiper');
    swiperContainers.forEach((container) => {
      // Ensure elements exist before initializing Swiper
      const paginationEl = container.querySelector('.swiper-pagination');
      const nextEl = container.querySelector('.swiper-button-next');
      const prevEl = container.querySelector('.swiper-button-prev');

      if (!paginationEl || !nextEl || !prevEl) {
          console.warn("Swiper elements missing for container:", container);
          return; // Skip initialization if controls are missing
      }

      new Swiper(container, {
        // loop: container.querySelectorAll('.swiper-slide').length > 1, // Enable loop only if more than one slide
        loop: false,
        slidesPerView: 1,
        spaceBetween: 10,
      });
    });
  };

  // --- Modal Zoom Function (ensure it works with new structure) ---
  const modalZoom = () => {
    const products__items = document.querySelectorAll('.products__item');
    const modal = document.querySelector('#productModal');
    const modalInner = modal.querySelector('.modal__inner');
    const closeModal = modal.querySelector('.modal__close');

    if (!modal || !modalInner || !closeModal) {
        console.error("Modal elements (.modal, .modal__inner, .modal__close) not found.");
        return;
    }

    products__items.forEach((item) => {
      item.addEventListener('click', (event) => {
        // Prevent modal opening if 'Add to Cart' button was clicked directly
        if (event.target.closest('.products__cta')) {
            return;
        }

        modal.classList.add('is-open');
        const galleryItems = item.querySelectorAll('.products__gallery-item');
        galleryItems.forEach((galleryItem) => {
          galleryItem.style.transform= "none";
          galleryItem.style.visibility= "visible";
          galleryItem.style.opacity = 1;
        });
        // Clone the item's content to avoid issues with Swiper re-initialization
        const itemContentClone = item.cloneNode(true);
        // Remove potentially problematic data attributes or IDs if cloning causes issues
        modalInner.innerHTML = ''; // Clear previous content
        modalInner.appendChild(itemContentClone);

        // Optionally, re-attach listener for add to cart button inside the modal
        const modalAddToCartBtn = modalInner.querySelector('.products__cta');
        if (modalAddToCartBtn && !modalAddToCartBtn.disabled) {
             // Ensure Cart is imported and available
             if (typeof Cart !== 'undefined' && Cart.addItemToCart) {
                 modalAddToCartBtn.addEventListener('click', () => {
                     // We need the original item's data attributes here.
                     // It's better if the button itself carries the necessary data.
                     // Let's assume Cart.addItemToCart expects the element with data attributes.
                     // Since we cloned the LI, the button's parent LI has the attributes.
                     Cart.addItemToCart(modalAddToCartBtn.closest('.products__item'));
                     // Optionally close modal after adding
                     // modal.classList.remove('is-open');
                     // modalInner.innerHTML = '';
                 }, { once: true }); // Use once to prevent multiple bindings if modal reopens
             }
        }

        console.log('Modal opened for product:', item.dataset.name, 'Variant ID:', item.dataset.variantId);
      });
    });

    closeModal.addEventListener('click', () => {
        modal.classList.remove('is-open');
        modalInner.innerHTML = ''; // Clear content on close
        
    });
  };

  const modalNav = () => {
    const nav__items = document.querySelectorAll('footer ul li');
    const modal = document.querySelector('#navigationModal');
    const modalInner = modal.querySelector('.modal__inner');
    const closeModal = modal.querySelector('.modal__close');

    if (!modal || !modalInner || !closeModal) {
        console.error("Modal elements (.modal, .modal__inner, .modal__close) not found.");
        return;
    }

    nav__items.forEach((item) => {
      item.addEventListener('click', (event) => {
        modal.classList.add('is-open');
        modalInner.innerHTML = item.innerHTML;

      });
       
    });

    closeModal.addEventListener('click', () => {
        modal.classList.remove('is-open');
        modalInner.innerHTML = ''; // Clear content on close
        
    });
  };
  // --- End Modal Zoom ---

  // Fetch data and initialize everything
  await fetchCollectionsAndProducts();

  // Preload images (consider doing this after fetch if images are dynamic)
  const images = [...document.querySelectorAll('img')];
  await preloadImages(images).then(() => {
    setTimeout(() => {
      document.body.classList.remove('loading');
    }, 1200); // Adjust timing as needed
  });

  // Navigation Trigger and Draggable (remains the same)
  const navTrigger = document.querySelector('.navTrigger');
  const navContainer = document.querySelector('.navigation');

  if (navTrigger && navContainer) {
      navTrigger.addEventListener('click', () => {
          navContainer.classList.toggle('is-open');
      });

      Draggable.create(navContainer, {
          // type: 'x', // Only drag horizontally
          bounds: { minX: 0, maxX: window.innerWidth }, // Adjust bounds as needed
          inertia: true,
        //   throwProps: true, // InertiaPlugin handles throw behavior
          edgeResistance: 0.65,
      });
  }

}); // End window.addEventListener('load')